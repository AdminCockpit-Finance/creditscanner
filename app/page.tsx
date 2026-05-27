"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { FinancialInput, RiskLevel } from "@/lib/credit/types";
import { analyzeCredit } from "@/lib/credit/recommendations";
import { assessDataQuality } from "@/lib/credit/data-quality";
import { buildCreditReport } from "@/lib/credit/report";

/**
 * Page principale de Creditscan — V1 publiable.
 *
 * Cette version est volontairement centrée sur l'essentiel :
 * - saisie manuelle des données financières ;
 * - exemple fictif de démonstration ;
 * - calcul des ratios ;
 * - scoring crédit ;
 * - contrôle de qualité des données ;
 * - diagnostic synthétique ;
 * - recommandations ;
 * - rapport analyste.
 *
 * L'import PDF est volontairement masqué pour cette V1 publique.
 * Il pourra revenir plus tard en V1.1 avec la mention "expérimental".
 */

type NumericFinancialKey =
  | "operatingRevenue"
  | "operatingIncome"
  | "netIncome"
  | "financialExpenses"
  | "equity"
  | "financialDebt"
  | "cash"
  | "stocks"
  | "receivables"
  | "supplierDebt"
  | "totalAssets";

/**
 * Données vides utilisées pour lancer une nouvelle analyse.
 */
const emptyInput: FinancialInput = {
  companyName: "",
  siren: "",
  closingYear: "2024",
  closingDate: "31/12/2024",
  referential: "PCG",

  operatingRevenue: 0,
  operatingIncome: 0,
  netIncome: 0,
  financialExpenses: 0,

  equity: 0,
  financialDebt: 0,
  cash: 0,

  stocks: 0,
  receivables: 0,
  supplierDebt: 0,
  totalAssets: 0,
};

/**
 * Société fictive de démonstration.
 *
 * Elle ne correspond à aucune société réelle.
 * Elle sert uniquement à montrer le fonctionnement de l'outil.
 */
const demoCompanyExample: FinancialInput = {
  companyName: "Entreprise Démo SAS",
  siren: "000000000",
  closingYear: "2024",
  closingDate: "31/12/2024",
  referential: "PCG",

  operatingRevenue: 12500000,
  operatingIncome: 720000,
  netIncome: 410000,
  financialExpenses: 95000,

  equity: 2800000,
  financialDebt: 2100000,
  cash: 650000,

  stocks: 850000,
  receivables: 1900000,
  supplierDebt: 1250000,
  totalAssets: 7800000,
};

/**
 * Convertit le niveau technique en libellé lisible.
 */
function levelLabel(level: RiskLevel): string {
  switch (level) {
    case "good":
      return "Favorable";
    case "watch":
      return "À suivre";
    case "warning":
      return "Vigilance";
    case "critical":
      return "Critique";
    default:
      return "Neutre";
  }
}

/**
 * Retourne les classes Tailwind pour colorer les badges.
 */
function levelClass(level: RiskLevel): string {
  switch (level) {
    case "good":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "watch":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    case "warning":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "critical":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    default:
      return "border-slate-600 bg-slate-800 text-slate-300";
  }
}

/**
 * Transforme une saisie française en nombre.
 *
 * Exemples :
 * "12 500 000" devient 12500000.
 * "12 500 000,50" devient 12500000.5.
 */
function numberFromInput(value: string): number {
  const cleaned = value
    .replace(/\s/g, "")
    .replace(/\u202F/g, "")
    .replace(/\u00A0/g, "")
    .replace(",", ".");

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Affiche les montants avec séparateurs de milliers dans les champs.
 *
 * Exemple :
 * 12500000 devient "12 500 000".
 */
function formatInputNumber(value: number): string {
  if (!value || !Number.isFinite(value)) return "";

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Home() {
  const [input, setInput] = useState<FinancialInput>(emptyInput);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  /**
   * Analyse recalculée automatiquement dès que les données changent.
   */
  const analysis = useMemo(() => analyzeCredit(input), [input]);

  /**
   * Contrôle de complétude et de cohérence des données.
   */
  const dataQuality = useMemo(() => assessDataQuality(input), [input]);

  /**
   * Rapport analyste construit à partir de l'analyse.
   */
  const report = useMemo(() => buildCreditReport(analysis), [analysis]);

  const ratios = Object.values(analysis.ratios);

  function updateTextField<K extends keyof FinancialInput>(
    key: K,
    value: FinancialInput[K]
  ) {
    setInput((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function updateNumberField(key: NumericFinancialKey, value: string) {
    setInput((previous) => ({
      ...previous,
      [key]: numberFromInput(value),
    }));
  }

  /**
   * Charge l'exemple fictif et lance directement l'analyse.
   */
  function loadDemoExample() {
    setInput(demoCompanyExample);
    setHasAnalyzed(true);
  }

  /**
   * Réinitialise entièrement la page pour démarrer une nouvelle analyse.
   */
  function resetAnalysis() {
    setInput(emptyInput);
    setHasAnalyzed(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-8 flex flex-col gap-4 border-b border-slate-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.35em] text-cyan-400">
              creditscan
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
              Analyse crédit assistée
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Structurez une première analyse crédit à partir des principaux
              postes comptables. L’outil calcule les ratios essentiels,
              identifie les points de vigilance et génère une note d’analyse
              synthétique.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={resetAnalysis}
              className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-900"
            >
              Nouvelle analyse
            </button>

            <button
              type="button"
              onClick={loadDemoExample}
              className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
            >
              Charger un exemple fictif
            </button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          {/* Colonne gauche : formulaire */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/30">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white">
                Données financières
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Les montants doivent être saisis en euros. Les ratios sont
                calculés uniquement à partir des données renseignées ici.
              </p>
            </div>

            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Raison sociale">
                  <input
                    value={input.companyName}
                    onChange={(event) =>
                      updateTextField("companyName", event.target.value)
                    }
                    className="input"
                    placeholder="Ex. Entreprise Démo SAS"
                  />
                </Field>

                <Field label="SIREN">
                  <input
                    value={input.siren}
                    onChange={(event) =>
                      updateTextField("siren", event.target.value)
                    }
                    className="input"
                    placeholder="Ex. 000000000"
                  />
                </Field>

                <Field label="Exercice">
                  <input
                    value={input.closingYear}
                    onChange={(event) =>
                      updateTextField("closingYear", event.target.value)
                    }
                    className="input"
                    placeholder="2024"
                  />
                </Field>

                <Field label="Date de clôture">
                  <input
                    value={input.closingDate}
                    onChange={(event) =>
                      updateTextField("closingDate", event.target.value)
                    }
                    className="input"
                    placeholder="31/12/2024"
                  />
                </Field>
              </div>

              <Field label="Type de référentiel">
                <select
                  value={input.referential}
                  onChange={(event) =>
                    updateTextField(
                      "referential",
                      event.target.value as FinancialInput["referential"]
                    )
                  }
                  className="input"
                >
                  <option value="PCG">PCG / Comptes sociaux français</option>
                  <option value="ASSURANCE">Assurance</option>
                  <option value="ASSOCIATION_FONDATION">
                    Association / Fondation
                  </option>
                  <option value="INCONNU">Inconnu</option>
                </select>
              </Field>

              <FormSection title="Compte de résultat / activité">
                <NumberField
                  label="Produits d’activité / CA"
                  value={input.operatingRevenue}
                  onChange={(value) =>
                    updateNumberField("operatingRevenue", value)
                  }
                />

                <NumberField
                  label="Résultat d’exploitation"
                  value={input.operatingIncome}
                  onChange={(value) =>
                    updateNumberField("operatingIncome", value)
                  }
                />

                <NumberField
                  label="Résultat net comptable"
                  value={input.netIncome}
                  onChange={(value) => updateNumberField("netIncome", value)}
                />

                <NumberField
                  label="Charges financières"
                  value={input.financialExpenses}
                  onChange={(value) =>
                    updateNumberField("financialExpenses", value)
                  }
                />
              </FormSection>

              <FormSection title="Masses du bilan">
                <NumberField
                  label="Capitaux propres"
                  value={input.equity}
                  onChange={(value) => updateNumberField("equity", value)}
                />

                <NumberField
                  label="Dettes financières"
                  value={input.financialDebt}
                  onChange={(value) =>
                    updateNumberField("financialDebt", value)
                  }
                />

                <NumberField
                  label="Disponibilités"
                  value={input.cash}
                  onChange={(value) => updateNumberField("cash", value)}
                />

                <NumberField
                  label="Total actif"
                  value={input.totalAssets}
                  onChange={(value) => updateNumberField("totalAssets", value)}
                />
              </FormSection>

              <FormSection title="Cycle d’exploitation">
                <NumberField
                  label="Stocks"
                  value={input.stocks}
                  onChange={(value) => updateNumberField("stocks", value)}
                />

                <NumberField
                  label="Créances"
                  value={input.receivables}
                  onChange={(value) => updateNumberField("receivables", value)}
                />

                <NumberField
                  label="Fournisseurs"
                  value={input.supplierDebt}
                  onChange={(value) =>
                    updateNumberField("supplierDebt", value)
                  }
                />
              </FormSection>

              <button
                type="button"
                onClick={() => setHasAnalyzed(true)}
                className="mt-3 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Lancer l’analyse
              </button>
            </div>
          </section>

          {/* Colonne droite : résultats */}
          <section className="space-y-6">
            {!hasAnalyzed ? (
              <ResultCard>
                <h2 className="text-xl font-semibold text-white">
                  Résultat de l’analyse
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Renseignez les données financières ou chargez l’exemple fictif
                  pour visualiser le fonctionnement du moteur d’analyse.
                </p>

                <div className="mt-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                  <p className="text-sm font-semibold text-cyan-200">
                    Aide à l’analyse
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Creditscan constitue une aide à la lecture financière. Il ne
                    remplace pas une instruction crédit complète ni une décision
                    formalisée.
                  </p>
                </div>
              </ResultCard>
            ) : (
              <>
                <ResultCard>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
                        Score de risque
                      </p>

                      <h2 className="mt-2 text-4xl font-semibold text-white">
                        {analysis.score.score}/100
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {analysis.score.summary}
                      </p>
                    </div>

                    <Badge level={analysis.score.level}>
                      {analysis.score.label}
                    </Badge>
                  </div>
                </ResultCard>

                <ResultCard>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
                        Qualité des données
                      </p>

                      <h2 className="mt-2 text-2xl font-semibold text-white">
                        {dataQuality.label}
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Score de complétude : {dataQuality.score}/100
                      </p>
                    </div>

                    <Badge level={dataQuality.level}>
                      {levelLabel(dataQuality.level)}
                    </Badge>
                  </div>

                  {(dataQuality.missingFields.length > 0 ||
                    dataQuality.warnings.length > 0) && (
                    <div className="mt-5 space-y-4">
                      {dataQuality.missingFields.length > 0 && (
                        <QualityList
                          title="Champs manquants"
                          items={dataQuality.missingFields}
                        />
                      )}

                      {dataQuality.warnings.length > 0 && (
                        <QualityList
                          title="Points de contrôle"
                          items={dataQuality.warnings}
                        />
                      )}
                    </div>
                  )}
                </ResultCard>

                <ResultCard>
                  <h2 className="text-xl font-semibold text-white">
                    Décomposition du score
                  </h2>

                  <div className="mt-4 space-y-3">
                    {analysis.score.breakdown.map((item) => (
                      <div
                        key={item.category}
                        className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-white">
                              {item.category}
                            </p>

                            <p className="mt-1 text-sm leading-6 text-slate-400">
                              {item.comment}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full border px-3 py-1 text-sm font-semibold ${levelClass(
                              item.level
                            )}`}
                          >
                            {item.points}/{item.maxPoints}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ResultCard>

                <div className="grid gap-4 md:grid-cols-2">
                  {ratios.map((ratio) => (
                    <div
                      key={ratio.key}
                      className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-slate-400">
                            {ratio.label}
                          </p>

                          <p className="mt-2 text-2xl font-semibold text-white">
                            {ratio.formattedValue}
                          </p>
                        </div>

                        <Badge level={ratio.level}>
                          {levelLabel(ratio.level)}
                        </Badge>
                      </div>

                      <p className="mt-4 text-sm leading-6 text-slate-400">
                        {ratio.comment}
                      </p>
                    </div>
                  ))}
                </div>

                <ResultCard>
                  <h2 className="text-xl font-semibold text-white">
                    Diagnostic synthétique
                  </h2>

                  <div className="mt-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                    <p className="text-sm font-semibold text-cyan-200">
                      Synthèse décisionnelle
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Cette analyse constitue une aide à la lecture financière.
                      Elle doit être complétée par l’étude du secteur, des flux
                      de trésorerie, des engagements hors bilan, de la qualité
                      du management et des perspectives d’activité.
                    </p>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-slate-300">
                    {analysis.diagnostic}
                  </p>
                </ResultCard>

                <div className="grid gap-6 md:grid-cols-2">
                  <ListBlock
                    title="Forces identifiées"
                    items={analysis.strengths}
                  />

                  <ListBlock
                    title="Points de vigilance"
                    items={analysis.weaknesses}
                  />
                </div>

                <ResultCard>
                  <h2 className="text-xl font-semibold text-white">
                    Recommandations analyste
                  </h2>

                  <div className="mt-4 space-y-4">
                    {analysis.recommendations.map((recommendation) => (
                      <div
                        key={recommendation.title}
                        className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-semibold text-white">
                            {recommendation.title}
                          </h3>

                          <Badge level={recommendation.level}>
                            {levelLabel(recommendation.level)}
                          </Badge>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {recommendation.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </ResultCard>

                <ResultCard>
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
                      Rapport
                    </p>

                    <h2 className="mt-2 text-xl font-semibold text-white">
                      {report.title}
                    </h2>

                    <p className="mt-2 text-sm text-slate-400">
                      {report.subtitle}
                    </p>
                  </div>

                  <div className="mt-6 space-y-5">
                    {report.sections.map((section) => (
                      <div
                        key={section.title}
                        className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                      >
                        <h3 className="font-semibold text-white">
                          {section.title}
                        </h3>

                        <p className="mt-2 text-sm leading-7 text-slate-400">
                          {section.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </ResultCard>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

/**
 * Champ générique : label + contenu.
 */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      {children}
    </label>
  );
}

/**
 * Regroupe visuellement les zones du formulaire.
 */
function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
        {title}
      </h3>

      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

/**
 * Champ numérique avec séparateur de milliers.
 *
 * Fonctionnement :
 * - pendant la saisie, on laisse l'utilisateur taper librement ;
 * - quand il sort du champ, on reformate proprement ;
 * - quand on charge l'exemple fictif ou une nouvelle analyse, l'affichage se synchronise.
 */
function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  const [displayValue, setDisplayValue] = useState(formatInputNumber(value));

  useEffect(() => {
    setDisplayValue(formatInputNumber(value));
  }, [value]);

  function handleChange(rawValue: string) {
    setDisplayValue(rawValue);
    onChange(rawValue);
  }

  function handleBlur() {
    setDisplayValue(formatInputNumber(value));
  }

  return (
    <Field label={label}>
      <input
        value={displayValue}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={handleBlur}
        inputMode="decimal"
        className="input"
        placeholder="0"
      />
    </Field>
  );
}

/**
 * Carte standard pour les résultats.
 */
function ResultCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/30">
      {children}
    </div>
  );
}

/**
 * Badge de niveau de risque.
 */
function Badge({ level, children }: { level: RiskLevel; children: ReactNode }) {
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${levelClass(
        level
      )}`}
    >
      {children}
    </span>
  );
}

/**
 * Liste simple pour la qualité des données.
 */
function QualityList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-300">{title}</p>

      <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-400">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Bloc de liste utilisé pour forces et points de vigilance.
 */
function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/30">
      <h2 className="text-xl font-semibold text-white">{title}</h2>

      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="text-sm leading-6 text-slate-400">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}