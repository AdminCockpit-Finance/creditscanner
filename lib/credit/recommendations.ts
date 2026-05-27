import type {
  CreditAnalysis,
  CreditRecommendation,
  CreditRatios,
  CreditScore,
  FinancialInput,
  RiskLevel,
} from "./types";

import { calculateRatios } from "./ratios";
import { calculateCreditScore } from "./scoring";

/**
 * Indique si un niveau constitue un point de risque.
 */
function isRisky(level: RiskLevel): boolean {
  return level === "warning" || level === "critical";
}

/**
 * Indique si un niveau constitue un point favorable.
 */
function isPositive(level: RiskLevel): boolean {
  return level === "good";
}

/**
 * Construit la liste des forces automatiquement détectées.
 */
function buildStrengths(ratios: CreditRatios): string[] {
  const strengths: string[] = [];

  if (isPositive(ratios.operatingMargin.level)) {
    strengths.push("Rentabilité d’exploitation satisfaisante.");
  }

  if (isPositive(ratios.netMargin.level)) {
    strengths.push("Résultat net positif avec une marge nette correcte.");
  }

  if (isPositive(ratios.gearing.level)) {
    strengths.push("Endettement net limité au regard des capitaux propres.");
  }

  if (isPositive(ratios.interestCoverage.level)) {
    strengths.push("Bonne capacité à couvrir les charges financières.");
  }

  if (isPositive(ratios.equityToTotalAssets.level)) {
    strengths.push("Structure bilancielle solide au regard du total actif.");
  }

  if (strengths.length === 0) {
    strengths.push(
      "Aucun point fort financier majeur ne ressort automatiquement des ratios calculés."
    );
  }

  return strengths;
}

/**
 * Construit la liste des points de vigilance automatiquement détectés.
 */
function buildWeaknesses(ratios: CreditRatios): string[] {
  const weaknesses: string[] = [];

  if (isRisky(ratios.operatingMargin.level)) {
    weaknesses.push(ratios.operatingMargin.comment);
  }

  if (isRisky(ratios.netMargin.level)) {
    weaknesses.push(ratios.netMargin.comment);
  }

  if (isRisky(ratios.gearing.level)) {
    weaknesses.push(ratios.gearing.comment);
  }

  if (isRisky(ratios.interestCoverage.level)) {
    weaknesses.push(ratios.interestCoverage.comment);
  }

  if (isRisky(ratios.workingCapitalNeedToRevenue.level)) {
    weaknesses.push(ratios.workingCapitalNeedToRevenue.comment);
  }

  if (isRisky(ratios.equityToTotalAssets.level)) {
    weaknesses.push(ratios.equityToTotalAssets.comment);
  }

  if (weaknesses.length === 0) {
    weaknesses.push(
      "Aucune faiblesse critique n’est détectée automatiquement, sous réserve d’une revue qualitative du dossier."
    );
  }

  return weaknesses;
}

/**
 * Construit les recommandations analyste à partir des ratios.
 */
function buildRecommendations(
  ratios: CreditRatios,
  score: CreditScore
): CreditRecommendation[] {
  const recommendations: CreditRecommendation[] = [];

  if (ratios.interestCoverage.level === "critical") {
    recommendations.push({
      title: "Analyser la capacité réelle de remboursement",
      level: "critical",
      detail:
        "La couverture des charges financières est insuffisante. Il convient d’analyser les flux de trésorerie, les échéanciers de dette et la capacité de génération de cash-flow.",
    });
  }

  if (ratios.gearing.level === "warning" || ratios.gearing.level === "critical") {
    recommendations.push({
      title: "Approfondir l’analyse de l’endettement",
      level: ratios.gearing.level,
      detail:
        "L’endettement net est significatif au regard des capitaux propres. Il faut vérifier la maturité des dettes, les covenants éventuels et la dépendance aux financements bancaires.",
    });
  }

  if (
    ratios.operatingMargin.level === "warning" ||
    ratios.operatingMargin.level === "critical"
  ) {
    recommendations.push({
      title: "Examiner la qualité de la rentabilité d’exploitation",
      level: ratios.operatingMargin.level,
      detail:
        "La marge d’exploitation est faible ou négative. Une analyse des charges fixes, de la pression concurrentielle et de la récurrence du chiffre d’affaires est nécessaire.",
    });
  }

  if (ratios.workingCapitalNeedToRevenue.level === "warning") {
    recommendations.push({
      title: "Surveiller le besoin en fonds de roulement",
      level: "warning",
      detail:
        "Le BFR mobilise une part significative de l’activité. Il convient d’étudier les délais clients, les niveaux de stocks et les délais fournisseurs.",
    });
  }

  if (ratios.equityToTotalAssets.level === "critical") {
    recommendations.push({
      title: "Vérifier la capacité d’absorption des pertes",
      level: "critical",
      detail:
        "L’autonomie financière est faible. La société dispose d’une marge limitée pour absorber une dégradation de son résultat ou de ses actifs.",
    });
  }

  if (score.level === "good" || score.level === "watch") {
    recommendations.push({
      title: "Compléter l’analyse financière par une revue qualitative",
      level: "watch",
      detail:
        "Le diagnostic financier doit être complété par l’analyse du secteur, du modèle économique, de la qualité du management, du carnet de commandes et des perspectives d’activité.",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Approfondir le dossier avant décision",
      level: "watch",
      detail:
        "Les données disponibles ne suffisent pas à conclure seules. Une revue complémentaire des annexes, flux de trésorerie, dettes et perspectives est recommandée.",
    });
  }

  return recommendations;
}

/**
 * Rédige un diagnostic synthétique, prudent et lisible.
 */
function buildDiagnostic(
  input: FinancialInput,
  ratios: CreditRatios,
  score: CreditScore
): string {
  const company = input.companyName?.trim() || "La société";

  const sentences: string[] = [];

  sentences.push(
    `${company} présente un profil de risque classé « ${score.label.toLowerCase()} » selon les ratios financiers renseignés.`
  );

  sentences.push(
    `La marge d’exploitation ressort à ${ratios.operatingMargin.formattedValue}, tandis que la marge nette ressort à ${ratios.netMargin.formattedValue}.`
  );

  sentences.push(
    `L’endettement net s’établit à ${ratios.netDebt.formattedValue}, soit un gearing de ${ratios.gearing.formattedValue}.`
  );

  sentences.push(
    `La couverture des frais financiers ressort à ${ratios.interestCoverage.formattedValue}. ${ratios.interestCoverage.comment}`
  );

  sentences.push(
    `L’autonomie financière s’élève à ${ratios.equityToTotalAssets.formattedValue}, ce qui permet d’apprécier le poids des capitaux propres dans la structure du bilan.`
  );

  if (score.level === "critical") {
    sentences.push(
      "Le dossier doit être considéré avec une grande prudence et nécessite une analyse approfondie de la trésorerie, des dettes et de la capacité de remboursement."
    );
  } else if (score.level === "warning") {
    sentences.push(
      "Le dossier présente des fragilités significatives qui justifient des conditions de financement prudentes et une revue qualitative complémentaire."
    );
  } else if (score.level === "watch") {
    sentences.push(
      "Le dossier apparaît analysable, avec plusieurs points de vigilance à documenter avant toute décision."
    );
  } else {
    sentences.push(
      "Le profil ressort favorable sur les données disponibles, sous réserve de la cohérence des comptes et des éléments qualitatifs du dossier."
    );
  }

  return sentences.join(" ");
}

/**
 * Fonction principale appelée par l’interface.
 *
 * Elle orchestre :
 * - le calcul des ratios ;
 * - le scoring ;
 * - les forces ;
 * - les faiblesses ;
 * - les recommandations ;
 * - le diagnostic rédigé.
 */
export function analyzeCredit(input: FinancialInput): CreditAnalysis {
  const ratios = calculateRatios(input);
  const score = calculateCreditScore(ratios);

  return {
    input,
    ratios,
    score,
    strengths: buildStrengths(ratios),
    weaknesses: buildWeaknesses(ratios),
    recommendations: buildRecommendations(ratios, score),
    diagnostic: buildDiagnostic(input, ratios, score),
  };
}