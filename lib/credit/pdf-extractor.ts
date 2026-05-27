import type { FinancialInput } from "./types";

/**
 * Résultat retourné après lecture d'un PDF.
 *
 * Ce résultat sert à pré-remplir le formulaire,
 * mais l'utilisateur doit toujours vérifier les données.
 */
export type PdfExtractionResult = {
  status: "success" | "scanned" | "partial" | "error";
  message: string;
  confidence: number;
  extractedInput: Partial<FinancialInput>;
  rawTextLength: number;
  warnings: string[];
  foundFields: string[];
  missingFields: string[];
};

type PdfTextLine = {
  page: number;
  text: string;
};

/**
 * Convertit un montant français en nombre.
 *
 * Exemples :
 * "5 268 490 042" -> 5268490042
 * "-10 806 787" -> -10806787
 * "(1 990 149)" -> -1990149
 */
function parseFrenchAmount(value: string): number | null {
  const isParenthesizedNegative = value.includes("(") && value.includes(")");

  const cleaned = value
    .replace(/\u00A0/g, " ")
    .replace(/\u202F/g, " ")
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[()]/g, "")
    .replace(/[^\d.-]/g, "");

  if (!cleaned) return null;

  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) return null;

  return isParenthesizedNegative ? -Math.abs(parsed) : parsed;
}

/**
 * Nettoie le texte pour faciliter les recherches.
 */
function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9€%.,()\- ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Évite de prendre des années ou des numéros isolés pour des montants.
 */
function looksLikeAccountingAmount(value: number): boolean {
  const absolute = Math.abs(value);

  if (absolute === 0) return true;

  // Évite les années : 2022, 2023, 2024...
  if (absolute >= 1900 && absolute <= 2100) return false;

  // Évite les petits numéros de page, notes, lignes.
  if (absolute > 0 && absolute < 100) return false;

  return true;
}

/**
 * Extrait les montants présents dans une ligne.
 */
function extractAmountsFromLine(line: string): number[] {
  const matches = line.match(
    /\(?-?\d{1,3}(?:[\s\u00A0\u202F]\d{3})+(?:,\d+)?\)?|\(?-?\d{4,}(?:,\d+)?\)?/g
  );

  if (!matches) return [];

  return matches
    .map(parseFrenchAmount)
    .filter((value): value is number => value !== null)
    .filter(looksLikeAccountingAmount);
}

/**
 * Pour un libellé donné, cherche la ligne la plus pertinente et prend
 * le montant le plus probable.
 *
 * Dans beaucoup de PDF comptables, la ligne contient plusieurs colonnes :
 * - brut / amortissements / net ;
 * - exercice N / exercice N-1 ;
 * - France / export / total.
 *
 * Pour une V2 simple, on prend le dernier montant exploitable de la ligne,
 * souvent la colonne nette ou la colonne total.
 */
function findAmountByLabels(
  lines: PdfTextLine[],
  labels: string[]
): number | null {
  const normalizedLabels = labels.map(normalizeLabel);

  for (const line of lines) {
    const normalizedLine = normalizeLabel(line.text);

    const hasLabel = normalizedLabels.some((label) =>
      normalizedLine.includes(label)
    );

    if (!hasLabel) continue;

    const amounts = extractAmountsFromLine(line.text);

    if (amounts.length === 0) continue;

    return amounts[amounts.length - 1];
  }

  return null;
}

/**
 * Additionne plusieurs lignes si nécessaire.
 *
 * Utile pour les dettes financières :
 * - emprunts établissements de crédit ;
 * - emprunts et dettes financières diverses.
 */
function sumAmountsByLabels(
  lines: PdfTextLine[],
  labelsGroups: string[][]
): number | null {
  let total = 0;
  let found = false;

  for (const labels of labelsGroups) {
    const amount = findAmountByLabels(lines, labels);

    if (amount !== null) {
      total += amount;
      found = true;
    }
  }

  return found ? total : null;
}

/**
 * Extrait une année de clôture.
 */
function extractClosingYear(rawText: string): string {
  const normalized = normalizeLabel(rawText);

  const closingMatch = normalized.match(
    /(?:exercice|clos|cloture).{0,80}?\b(20\d{2})\b/
  );

  if (closingMatch?.[1]) return closingMatch[1];

  const fallback = normalized.match(/\b(20\d{2})\b/);

  return fallback?.[1] ?? "";
}

/**
 * Extrait une date de clôture.
 */
function extractClosingDate(rawText: string): string {
  const match = rawText.match(/\b(\d{2}\/\d{2}\/20\d{2})\b/);
  return match?.[1] ?? "";
}

/**
 * Extrait un SIREN si visible.
 */
function extractSiren(rawText: string): string {
  const match = rawText.match(
    /\b(?:siren|siret)\s*[:\-]?\s*(\d{3}\s?\d{3}\s?\d{3})/i
  );

  if (!match?.[1]) return "";

  return match[1].replace(/\s/g, "");
}

/**
 * Détection simple du référentiel.
 */
function detectReferential(rawText: string): FinancialInput["referential"] {
  const text = normalizeLabel(rawText);

  if (
    text.includes("primes acquises") ||
    text.includes("provisions techniques") ||
    text.includes("code des assurances") ||
    text.includes("resultat technique")
  ) {
    return "ASSURANCE";
  }

  if (
    text.includes("fonds dedies") ||
    text.includes("contributions volontaires") ||
    text.includes("subventions d exploitation") ||
    text.includes("association") ||
    text.includes("fondation")
  ) {
    return "ASSOCIATION_FONDATION";
  }

  if (
    text.includes("bilan actif") ||
    text.includes("bilan passif") ||
    text.includes("compte de resultat") ||
    text.includes("chiffre d affaires")
  ) {
    return "PCG";
  }

  return "INCONNU";
}

/**
 * Reconstruit les lignes du PDF à partir des éléments texte.
 *
 * On groupe les fragments qui ont une coordonnée verticale proche.
 */
async function extractLinesFromPdf(file: File): Promise<PdfTextLine[]> {
  const pdfjsLib = await import("pdfjs-dist");

  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
  }).promise;

  const allLines: PdfTextLine[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const items = content.items
      .map((item) => {
        if (!("str" in item)) return null;

        const transform = "transform" in item ? item.transform : null;

        if (!Array.isArray(transform)) {
          return {
            text: item.str,
            x: 0,
            y: 0,
          };
        }

        return {
          text: item.str,
          x: Number(transform[4] ?? 0),
          y: Number(transform[5] ?? 0),
        };
      })
      .filter(
        (
          item
        ): item is {
          text: string;
          x: number;
          y: number;
        } => item !== null && item.text.trim().length > 0
      );

    const grouped = new Map<number, { text: string; x: number }[]>();

    for (const item of items) {
      const roundedY = Math.round(item.y / 3) * 3;

      const existing = grouped.get(roundedY) ?? [];
      existing.push({ text: item.text, x: item.x });
      grouped.set(roundedY, existing);
    }

    const pageLines = Array.from(grouped.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([, row]) => {
        const text = row
          .sort((a, b) => a.x - b.x)
          .map((part) => part.text)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        return {
          page: pageNumber,
          text,
        };
      })
      .filter((line) => line.text.length > 0);

    allLines.push(...pageLines);
  }

  return allLines;
}

/**
 * Ajoute une valeur extraite uniquement si elle est exploitable.
 */
function assignIfFound<K extends keyof FinancialInput>(
  target: Partial<FinancialInput>,
  key: K,
  value: FinancialInput[K] | null,
  foundFields: string[],
  label: string
) {
  if (value === null || value === undefined || value === "") return;

  target[key] = value;
  foundFields.push(label);
}

/**
 * Fonction principale d'extraction.
 *
 * Elle vise un pré-remplissage prudent, pas une décision automatique.
 */
export async function extractFinancialDataFromPdf(
  file: File
): Promise<PdfExtractionResult> {
  try {
    const lines = await extractLinesFromPdf(file);
    const rawText = lines.map((line) => line.text).join("\n");
    const rawTextLength = rawText.length;

    if (rawTextLength < 500 || lines.length < 20) {
      return {
        status: "scanned",
        message:
          "Le PDF semble être scanné ou non textuel. La saisie manuelle est recommandée.",
        confidence: 0,
        extractedInput: {},
        rawTextLength,
        warnings: [
          "Extraction texte insuffisante.",
          "Le document nécessite probablement une saisie manuelle ou un OCR.",
        ],
        foundFields: [],
        missingFields: [
          "Produits d’activité",
          "Résultat d’exploitation",
          "Résultat net",
          "Capitaux propres",
          "Total actif",
        ],
      };
    }

    const extractedInput: Partial<FinancialInput> = {};
    const foundFields: string[] = [];

    assignIfFound(
      extractedInput,
      "siren",
      extractSiren(rawText),
      foundFields,
      "SIREN"
    );

    assignIfFound(
      extractedInput,
      "closingYear",
      extractClosingYear(rawText),
      foundFields,
      "Exercice"
    );

    assignIfFound(
      extractedInput,
      "closingDate",
      extractClosingDate(rawText),
      foundFields,
      "Date de clôture"
    );

    assignIfFound(
      extractedInput,
      "referential",
      detectReferential(rawText),
      foundFields,
      "Référentiel"
    );

    const operatingRevenue = findAmountByLabels(lines, [
      "chiffre d affaires net",
      "chiffre d affaires",
      "produits d exploitation",
      "total des produits d exploitation",
      "primes acquises",
      "produits d activite",
    ]);

    const operatingIncome = findAmountByLabels(lines, [
      "resultat d exploitation",
      "resultat technique",
      "resultat operationnel",
    ]);

    const netIncome = findAmountByLabels(lines, [
      "benefice ou perte",
      "resultat de l exercice",
      "excedent ou deficit",
      "resultat net comptable",
    ]);

    const financialExpenses = findAmountByLabels(lines, [
      "charges financieres",
      "interets et charges assimilees",
      "interets verses",
    ]);

    const equity = findAmountByLabels(lines, [
      "total des capitaux propres",
      "capitaux propres",
      "fonds propres",
      "total i",
    ]);

    const financialDebt = sumAmountsByLabels(lines, [
      ["emprunts et dettes aupres des etablissements de credit"],
      ["emprunts et dettes financieres diverses"],
      ["dettes financieres"],
      ["passifs subordonnes"],
    ]);

    const cash = findAmountByLabels(lines, [
      "disponibilites",
      "avoirs en banque",
      "banques cheques postaux",
      "tresorerie",
    ]);

    const stocks = findAmountByLabels(lines, [
      "stocks et en cours",
      "stocks",
      "marchandises",
    ]);

    const receivables = sumAmountsByLabels(lines, [
      ["creances clients"],
      ["clients et comptes rattaches"],
      ["autres creances"],
    ]);

    const supplierDebt = findAmountByLabels(lines, [
      "dettes fournisseurs",
      "fournisseurs et comptes rattaches",
    ]);

    const totalAssets = findAmountByLabels(lines, [
      "total actif",
      "total general",
      "total de l actif",
    ]);

    assignIfFound(
      extractedInput,
      "operatingRevenue",
      operatingRevenue,
      foundFields,
      "Produits d’activité / CA"
    );

    assignIfFound(
      extractedInput,
      "operatingIncome",
      operatingIncome,
      foundFields,
      "Résultat d’exploitation"
    );

    assignIfFound(
      extractedInput,
      "netIncome",
      netIncome,
      foundFields,
      "Résultat net"
    );

    assignIfFound(
      extractedInput,
      "financialExpenses",
      financialExpenses,
      foundFields,
      "Charges financières"
    );

    assignIfFound(
      extractedInput,
      "equity",
      equity,
      foundFields,
      "Capitaux propres"
    );

    assignIfFound(
      extractedInput,
      "financialDebt",
      financialDebt,
      foundFields,
      "Dettes financières"
    );

    assignIfFound(
      extractedInput,
      "cash",
      cash,
      foundFields,
      "Disponibilités"
    );

    assignIfFound(
      extractedInput,
      "stocks",
      stocks,
      foundFields,
      "Stocks"
    );

    assignIfFound(
      extractedInput,
      "receivables",
      receivables,
      foundFields,
      "Créances"
    );

    assignIfFound(
      extractedInput,
      "supplierDebt",
      supplierDebt,
      foundFields,
      "Fournisseurs"
    );

    assignIfFound(
      extractedInput,
      "totalAssets",
      totalAssets,
      foundFields,
      "Total actif"
    );

    const mandatoryFields = [
      { label: "Produits d’activité", value: operatingRevenue },
      { label: "Résultat d’exploitation", value: operatingIncome },
      { label: "Résultat net", value: netIncome },
      { label: "Capitaux propres", value: equity },
      { label: "Total actif", value: totalAssets },
    ];

    const missingFields = mandatoryFields
      .filter((field) => field.value === null)
      .map((field) => field.label);

    const confidence = Math.max(
      10,
      Math.min(90, Math.round((foundFields.length / 14) * 100))
    );

    const warnings: string[] = [
      "Les données extraites doivent être vérifiées manuellement avant analyse.",
    ];

    if (missingFields.length > 0) {
      warnings.push(
        "Certains champs essentiels n’ont pas été détectés avec certitude."
      );
    }

    if (detectReferential(rawText) === "ASSURANCE") {
      warnings.push(
        "Le document semble relever d’un référentiel assurance : certains postes peuvent différer d’un bilan PCG classique."
      );
    }

    const status =
      confidence >= 60 && missingFields.length <= 2 ? "success" : "partial";

    return {
      status,
      message:
        status === "success"
          ? "Pré-remplissage réalisé. Vérification manuelle obligatoire."
          : "Pré-remplissage partiel. Plusieurs champs doivent être vérifiés ou complétés.",
      confidence,
      extractedInput,
      rawTextLength,
      warnings,
      foundFields,
      missingFields,
    };
  } catch (error) {
    console.error(error);

    return {
      status: "error",
      message:
        "Une erreur est survenue pendant la lecture du PDF. La saisie manuelle reste disponible.",
      confidence: 0,
      extractedInput: {},
      rawTextLength: 0,
      warnings: ["Erreur technique pendant l’extraction du PDF."],
      foundFields: [],
      missingFields: [],
    };
  }
}