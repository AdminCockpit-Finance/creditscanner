import type { FinancialInput, RiskLevel } from "./types";

export type DataQualityResult = {
  score: number;
  level: RiskLevel;
  label: string;
  missingFields: string[];
  warnings: string[];
};

type RequiredField = {
  key: keyof FinancialInput;
  label: string;
};

/**
 * Champs nécessaires pour une première analyse crédit exploitable.
 */
const requiredFields: RequiredField[] = [
  { key: "companyName", label: "Raison sociale" },
  { key: "closingYear", label: "Exercice" },
  { key: "operatingRevenue", label: "Produits d’activité / CA" },
  { key: "operatingIncome", label: "Résultat d’exploitation" },
  { key: "netIncome", label: "Résultat net comptable" },
  { key: "equity", label: "Capitaux propres" },
  { key: "financialDebt", label: "Dettes financières" },
  { key: "cash", label: "Disponibilités" },
  { key: "totalAssets", label: "Total actif" },
];

/**
 * Détermine si une valeur est absente.
 *
 * Pour les nombres, 0 est accepté comme valeur possible,
 * mais certains contrôles métier plus bas émettent des alertes
 * si ce 0 rend un ratio difficile à interpréter.
 */
function isMissing(value: unknown): boolean {
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "number") return !Number.isFinite(value);
  return value === null || value === undefined;
}

/**
 * Évalue la qualité des données saisies.
 *
 * Ce bloc est important pour éviter qu’un diagnostic paraisse trop affirmatif
 * alors que les données de départ sont incomplètes.
 */
export function assessDataQuality(input: FinancialInput): DataQualityResult {
  const missingFields = requiredFields
    .filter((field) => isMissing(input[field.key]))
    .map((field) => field.label);

  const warnings: string[] = [];

  if (input.operatingRevenue <= 0) {
    warnings.push(
      "Les produits d’activité sont nuls ou absents : les marges ne seront pas calculables."
    );
  }

  if (input.equity <= 0) {
    warnings.push(
      "Les capitaux propres sont nuls ou absents : le gearing ne sera pas interprétable."
    );
  }

  if (input.totalAssets <= 0) {
    warnings.push(
      "Le total actif est nul ou absent : l’autonomie financière ne sera pas calculable."
    );
  }

  if (input.financialExpenses === 0) {
    warnings.push(
      "Les charges financières sont à zéro : la couverture des frais financiers peut être non significative ou très élevée."
    );
  }

  if (input.stocks === 0 && input.receivables === 0 && input.supplierDebt === 0) {
    warnings.push(
      "Les données de cycle d’exploitation sont incomplètes : le BFR doit être interprété avec prudence."
    );
  }

  const totalIssues = missingFields.length + warnings.length;

  if (totalIssues === 0) {
    return {
      score: 100,
      level: "good",
      label: "Données complètes",
      missingFields,
      warnings,
    };
  }

  if (totalIssues <= 2) {
    return {
      score: 75,
      level: "watch",
      label: "Données globalement exploitables",
      missingFields,
      warnings,
    };
  }

  if (totalIssues <= 5) {
    return {
      score: 50,
      level: "warning",
      label: "Données partielles",
      missingFields,
      warnings,
    };
  }

  return {
    score: 25,
    level: "critical",
    label: "Données insuffisantes",
    missingFields,
    warnings,
  };
}