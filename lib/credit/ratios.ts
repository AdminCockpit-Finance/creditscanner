import type {
  CreditRatios,
  FinancialInput,
  RatioAssessment,
  RiskLevel,
} from "./types";

import {
  formatMoney,
  formatMultiple,
  formatPercent,
  safeDivide,
} from "./formatting";

/**
 * Crée un objet ratio complet.
 *
 * Chaque ratio contient :
 * - sa clé technique ;
 * - son libellé affiché ;
 * - sa valeur brute ;
 * - sa valeur formatée ;
 * - son niveau de risque ;
 * - son commentaire métier.
 */
function assessment(
  key: string,
  label: string,
  value: number | null,
  formattedValue: string,
  level: RiskLevel,
  comment: string
): RatioAssessment {
  return {
    key,
    label,
    value,
    formattedValue,
    level,
    comment,
  };
}

/**
 * Analyse de la marge d'exploitation.
 */
function assessOperatingMargin(
  value: number | null
): Pick<RatioAssessment, "level" | "comment"> {
  if (value === null) {
    return {
      level: "neutral",
      comment: "Ratio non calculable faute de données suffisantes.",
    };
  }

  if (value < 0) {
    return {
      level: "critical",
      comment: "Résultat d’exploitation négatif.",
    };
  }

  if (value < 0.02) {
    return {
      level: "warning",
      comment: "Marge d’exploitation très faible, capacité bénéficiaire limitée.",
    };
  }

  if (value < 0.08) {
    return {
      level: "watch",
      comment: "Marge d’exploitation modérée, à surveiller selon le secteur.",
    };
  }

  return {
    level: "good",
    comment: "Marge d’exploitation satisfaisante.",
  };
}

/**
 * Analyse de la marge nette.
 */
function assessNetMargin(
  value: number | null
): Pick<RatioAssessment, "level" | "comment"> {
  if (value === null) {
    return {
      level: "neutral",
      comment: "Ratio non calculable faute de données suffisantes.",
    };
  }

  if (value < 0) {
    return {
      level: "critical",
      comment: "Résultat net déficitaire.",
    };
  }

  if (value < 0.01) {
    return {
      level: "warning",
      comment: "Rentabilité nette très fragile.",
    };
  }

  if (value < 0.05) {
    return {
      level: "watch",
      comment: "Rentabilité nette positive mais modérée.",
    };
  }

  return {
    level: "good",
    comment: "Rentabilité nette satisfaisante.",
  };
}

/**
 * Analyse de la dette nette.
 */
function assessNetDebt(
  value: number | null
): Pick<RatioAssessment, "level" | "comment"> {
  if (value === null) {
    return {
      level: "neutral",
      comment: "Dette nette non calculable.",
    };
  }

  if (value <= 0) {
    return {
      level: "good",
      comment: "Trésorerie supérieure ou égale aux dettes financières.",
    };
  }

  return {
    level: "watch",
    comment:
      "Dette nette positive : l’endettement financier dépasse la trésorerie disponible.",
  };
}

/**
 * Analyse du gearing.
 *
 * Le gearing est calculé ainsi :
 * Dette nette / Capitaux propres
 *
 * Règle importante :
 * - si les capitaux propres sont négatifs ou nuls, le ratio n'est pas calculé ;
 * - cela évite d'afficher un gearing faussement favorable.
 */
function assessGearing(
  value: number | null
): Pick<RatioAssessment, "level" | "comment"> {
  if (value === null) {
    return {
      level: "neutral",
      comment: "Ratio non calculable faute de capitaux propres exploitables.",
    };
  }

  if (value < 0.25) {
    return {
      level: "good",
      comment: "Endettement net limité au regard des capitaux propres.",
    };
  }

  if (value < 0.75) {
    return {
      level: "watch",
      comment: "Endettement maîtrisé mais à suivre.",
    };
  }

  if (value < 1.5) {
    return {
      level: "warning",
      comment: "Endettement significatif au regard des capitaux propres.",
    };
  }

  return {
    level: "critical",
    comment: "Dette nette élevée au regard des capitaux propres.",
  };
}

/**
 * Analyse de la couverture des frais financiers.
 */
function assessInterestCoverage(
  value: number | null
): Pick<RatioAssessment, "level" | "comment"> {
  if (value === null) {
    return {
      level: "neutral",
      comment: "Ratio non calculable faute de charges financières renseignées.",
    };
  }

  if (value < 1) {
    return {
      level: "critical",
      comment:
        "La couverture des charges financières est insuffisante : le résultat d’exploitation ne couvre pas les intérêts de l’exercice.",
    };
  }

  if (value < 2) {
    return {
      level: "warning",
      comment: "La couverture des charges financières reste fragile.",
    };
  }

  if (value < 4) {
    return {
      level: "watch",
      comment: "La couverture des charges financières est correcte.",
    };
  }

  return {
    level: "good",
    comment: "Bonne capacité à couvrir les charges financières.",
  };
}

/**
 * Analyse du BFR rapporté aux produits d'activité.
 */
function assessWorkingCapitalNeedToRevenue(
  value: number | null
): Pick<RatioAssessment, "level" | "comment"> {
  if (value === null) {
    return {
      level: "neutral",
      comment: "Ratio non calculable faute de données suffisantes.",
    };
  }

  if (value < 0) {
    return {
      level: "good",
      comment:
        "BFR négatif ou favorable : les fournisseurs financent une partie du cycle d’exploitation.",
    };
  }

  if (value < 0.1) {
    return {
      level: "good",
      comment: "Besoin en fonds de roulement limité au regard de l’activité.",
    };
  }

  if (value < 0.25) {
    return {
      level: "watch",
      comment: "Besoin en fonds de roulement modéré, à suivre.",
    };
  }

  if (value < 0.4) {
    return {
      level: "warning",
      comment: "Besoin en fonds de roulement élevé au regard de l’activité.",
    };
  }

  return {
    level: "critical",
    comment:
      "Besoin en fonds de roulement très élevé, pression potentielle sur la trésorerie.",
  };
}

/**
 * Analyse de l'autonomie financière.
 */
function assessEquityToTotalAssets(
  value: number | null
): Pick<RatioAssessment, "level" | "comment"> {
  if (value === null) {
    return {
      level: "neutral",
      comment: "Ratio non calculable faute de total actif renseigné.",
    };
  }

  if (value < 0.1) {
    return {
      level: "critical",
      comment: "Autonomie financière faible.",
    };
  }

  if (value < 0.2) {
    return {
      level: "warning",
      comment: "Autonomie financière limitée.",
    };
  }

  if (value < 0.35) {
    return {
      level: "watch",
      comment: "Autonomie financière correcte mais perfectible.",
    };
  }

  return {
    level: "good",
    comment: "Autonomie financière solide.",
  };
}

/**
 * Fonction centrale de calcul des ratios.
 *
 * Règles importantes :
 * - les pourcentages sont stockés en décimal ;
 * - 0.0065 = 0,65 % ;
 * - 0.918 = 91,8 % ;
 * - aucun calcul ne doit retourner NaN ou Infinity ;
 * - si une donnée manque, le ratio devient "Non calculable".
 */
export function calculateRatios(inputs: FinancialInput): CreditRatios {
  const operatingMargin = safeDivide(
    inputs.operatingIncome,
    inputs.operatingRevenue
  );

  const netMargin = safeDivide(inputs.netIncome, inputs.operatingRevenue);

  /**
   * Dette nette.
   *
   * Si la trésorerie est supérieure aux dettes financières,
   * on retient une dette nette à 0 pour l'analyse du risque d'endettement.
   */
  const rawNetDebt = inputs.financialDebt - inputs.cash;
  const netDebt = Number.isFinite(rawNetDebt) ? Math.max(rawNetDebt, 0) : null;

  /**
   * Gearing.
   *
   * Si les capitaux propres sont négatifs ou nuls, le ratio n'est pas fiable.
   */
  const gearing =
    netDebt === null || inputs.equity <= 0
      ? null
      : safeDivide(netDebt, inputs.equity);

  const interestCoverage = safeDivide(
    inputs.operatingIncome,
    inputs.financialExpenses
  );

  const rawWorkingCapitalNeed =
    inputs.stocks + inputs.receivables - inputs.supplierDebt;

  const workingCapitalNeed = Number.isFinite(rawWorkingCapitalNeed)
    ? rawWorkingCapitalNeed
    : null;

  const workingCapitalNeedToRevenue =
    workingCapitalNeed === null
      ? null
      : safeDivide(workingCapitalNeed, inputs.operatingRevenue);

  /**
   * Autonomie financière.
   *
   * Si le total actif est nul ou absent, le ratio n'est pas calculable.
   * Si les capitaux propres sont négatifs, le ratio sera négatif et donc critique.
   */
  const equityToTotalAssets =
    inputs.totalAssets <= 0
      ? null
      : safeDivide(inputs.equity, inputs.totalAssets);

  const operatingMarginAssessment = assessOperatingMargin(operatingMargin);
  const netMarginAssessment = assessNetMargin(netMargin);
  const netDebtAssessment = assessNetDebt(netDebt);
  const gearingAssessment = assessGearing(gearing);
  const interestCoverageAssessment = assessInterestCoverage(interestCoverage);
  const workingCapitalNeedToRevenueAssessment =
    assessWorkingCapitalNeedToRevenue(workingCapitalNeedToRevenue);
  const equityToTotalAssetsAssessment =
    assessEquityToTotalAssets(equityToTotalAssets);

  return {
    operatingMargin: assessment(
      "operatingMargin",
      "Marge d’exploitation",
      operatingMargin,
      formatPercent(operatingMargin),
      operatingMarginAssessment.level,
      operatingMarginAssessment.comment
    ),

    netMargin: assessment(
      "netMargin",
      "Marge nette",
      netMargin,
      formatPercent(netMargin),
      netMarginAssessment.level,
      netMarginAssessment.comment
    ),

    netDebt: assessment(
      "netDebt",
      "Dette nette",
      netDebt,
      formatMoney(netDebt),
      netDebtAssessment.level,
      netDebtAssessment.comment
    ),

    gearing: assessment(
      "gearing",
      "Gearing",
      gearing,
      formatPercent(gearing),
      gearingAssessment.level,
      gearingAssessment.comment
    ),

    interestCoverage: assessment(
      "interestCoverage",
      "Couverture des frais financiers",
      interestCoverage,
      formatMultiple(interestCoverage, 2, 100),
      interestCoverageAssessment.level,
      interestCoverageAssessment.comment
    ),

    workingCapitalNeed: assessment(
      "workingCapitalNeed",
      "Besoin en fonds de roulement",
      workingCapitalNeed,
      formatMoney(workingCapitalNeed),
      workingCapitalNeed === null ? "neutral" : "watch",
      workingCapitalNeed === null
        ? "BFR non calculable."
        : "Le BFR mesure les ressources mobilisées par le cycle d’exploitation."
    ),

    workingCapitalNeedToRevenue: assessment(
      "workingCapitalNeedToRevenue",
      "BFR / Produits d’activité",
      workingCapitalNeedToRevenue,
      formatPercent(workingCapitalNeedToRevenue),
      workingCapitalNeedToRevenueAssessment.level,
      workingCapitalNeedToRevenueAssessment.comment
    ),

    equityToTotalAssets: assessment(
      "equityToTotalAssets",
      "Autonomie financière",
      equityToTotalAssets,
      formatPercent(equityToTotalAssets),
      equityToTotalAssetsAssessment.level,
      equityToTotalAssetsAssessment.comment
    ),
  };
}