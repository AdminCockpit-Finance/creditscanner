import type { CreditAnalysis } from "./types";

export type CreditReportSection = {
  title: string;
  content: string;
};

export type CreditReport = {
  title: string;
  subtitle: string;
  sections: CreditReportSection[];
};

/**
 * Construit une note d’analyse crédit structurée.
 *
 * Cette note est affichée dans l’application et servira plus tard
 * de base pour l’export PDF.
 */
export function buildCreditReport(analysis: CreditAnalysis): CreditReport {
  const { input, ratios, score, strengths, weaknesses, recommendations } =
    analysis;

  const companyName = input.companyName?.trim() || "Société analysée";

  return {
    title: `Note d’analyse crédit — ${companyName}`,
    subtitle: `Exercice ${input.closingYear || "non renseigné"} · Référentiel ${
      input.referential
    }`,

    sections: [
      {
        title: "1. Synthèse du dossier",
        content:
          `${companyName} présente un profil classé « ${score.label.toLowerCase()} » avec un score de ${score.score}/100. ` +
          `${score.summary}`,
      },
      {
        title: "2. Lecture de la rentabilité",
        content:
          `La marge d’exploitation ressort à ${ratios.operatingMargin.formattedValue} et la marge nette à ${ratios.netMargin.formattedValue}. ` +
          `${ratios.operatingMargin.comment} ${ratios.netMargin.comment}`,
      },
      {
        title: "3. Structure financière et endettement",
        content:
          `La dette nette ressort à ${ratios.netDebt.formattedValue}, pour un gearing de ${ratios.gearing.formattedValue}. ` +
          `L’autonomie financière s’établit à ${ratios.equityToTotalAssets.formattedValue}. ` +
          `${ratios.gearing.comment}`,
      },
      {
        title: "4. Capacité à supporter les charges financières",
        content:
          `La couverture des frais financiers ressort à ${ratios.interestCoverage.formattedValue}. ` +
          `${ratios.interestCoverage.comment}`,
      },
      {
        title: "5. Cycle d’exploitation",
        content:
          `Le besoin en fonds de roulement ressort à ${ratios.workingCapitalNeed.formattedValue}, soit ${ratios.workingCapitalNeedToRevenue.formattedValue} des produits d’activité. ` +
          `${ratios.workingCapitalNeedToRevenue.comment}`,
      },
      {
        title: "6. Forces identifiées",
        content: strengths.join(" "),
      },
      {
        title: "7. Points de vigilance",
        content: weaknesses.join(" "),
      },
      {
        title: "8. Recommandations",
        content: recommendations
          .map((recommendation) => recommendation.detail)
          .join(" "),
      },
      {
        title: "9. Limites de l’analyse",
        content:
          "Cette note constitue une aide à l’analyse financière. Elle ne remplace pas une décision de crédit formalisée. L’analyse doit être complétée par l’étude du secteur, des flux de trésorerie, des engagements hors bilan, de la qualité du management, des garanties et des perspectives d’activité.",
      },
    ],
  };
}