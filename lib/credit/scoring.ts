import type {
  CreditRatios,
  CreditScore,
  RiskLevel,
  ScoreBreakdownItem,
} from "./types";

/**
 * Convertit un score numérique en niveau de risque global.
 *
 * Plus le score est élevé, plus le risque est important.
 */
function getRiskLevel(score: number): {
  level: RiskLevel;
  label: string;
  summary: string;
} {
  if (score <= 30) {
    return {
      level: "good",
      label: "Risque faible",
      summary:
        "Le profil financier ressort globalement favorable, sous réserve de la qualité des données et de l’analyse sectorielle.",
    };
  }

  if (score <= 55) {
    return {
      level: "watch",
      label: "Risque modéré",
      summary:
        "Le profil financier présente des équilibres globalement acceptables, avec plusieurs points à suivre.",
    };
  }

  if (score <= 75) {
    return {
      level: "warning",
      label: "Risque élevé",
      summary:
        "Le profil financier présente des fragilités significatives nécessitant une analyse approfondie.",
    };
  }

  return {
    level: "critical",
    label: "Risque critique",
    summary:
      "Le profil financier présente des fragilités importantes pouvant remettre en cause la capacité de remboursement.",
  };
}

/**
 * Transforme un niveau de risque en points.
 *
 * Exemple :
 * - good = 0 point de risque ;
 * - critical = totalité des points de risque.
 */
function levelToPoints(level: RiskLevel, maxPoints: number): number {
  switch (level) {
    case "good":
      return 0;
    case "watch":
      return Math.round(maxPoints * 0.35);
    case "warning":
      return Math.round(maxPoints * 0.7);
    case "critical":
      return maxPoints;
    case "neutral":
    default:
      return Math.round(maxPoints * 0.45);
  }
}

/**
 * Crée une ligne de décomposition du score.
 */
function buildItem(
  category: string,
  maxPoints: number,
  level: RiskLevel,
  comment: string
): ScoreBreakdownItem {
  return {
    category,
    maxPoints,
    points: levelToPoints(level, maxPoints),
    level,
    comment,
  };
}

/**
 * Calcule le score de risque crédit.
 *
 * Le score est volontairement explicable :
 * chaque famille de risque contribue à une partie du score.
 */
export function calculateCreditScore(ratios: CreditRatios): CreditScore {
  const breakdown: ScoreBreakdownItem[] = [
    buildItem(
      "Rentabilité d’exploitation",
      18,
      ratios.operatingMargin.level,
      ratios.operatingMargin.comment
    ),
    buildItem(
      "Rentabilité nette",
      12,
      ratios.netMargin.level,
      ratios.netMargin.comment
    ),
    buildItem("Endettement", 22, ratios.gearing.level, ratios.gearing.comment),
    buildItem(
      "Couverture des frais financiers",
      24,
      ratios.interestCoverage.level,
      ratios.interestCoverage.comment
    ),
    buildItem(
      "Cycle d’exploitation",
      12,
      ratios.workingCapitalNeedToRevenue.level,
      ratios.workingCapitalNeedToRevenue.comment
    ),
    buildItem(
      "Structure bilancielle",
      12,
      ratios.equityToTotalAssets.level,
      ratios.equityToTotalAssets.comment
    ),
  ];

  const score = breakdown.reduce((total, item) => total + item.points, 0);
  const risk = getRiskLevel(score);

  return {
    score,
    level: risk.level,
    label: risk.label,
    summary: risk.summary,
    breakdown,
  };
}