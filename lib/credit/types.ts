export type CreditReferential =
  | "PCG"
  | "ASSURANCE"
  | "ASSOCIATION_FONDATION"
  | "INCONNU";

export type RiskLevel = "good" | "watch" | "warning" | "critical" | "neutral";

export type FinancialInput = {
  companyName: string;
  siren: string;
  closingYear: string;
  closingDate: string;
  referential: CreditReferential;

  operatingRevenue: number;
  operatingIncome: number;
  netIncome: number;
  financialExpenses: number;

  equity: number;
  financialDebt: number;
  cash: number;

  stocks: number;
  receivables: number;
  supplierDebt: number;
  totalAssets: number;
};

export type RatioAssessment = {
  key: string;
  label: string;
  value: number | null;
  formattedValue: string;
  level: RiskLevel;
  comment: string;
};

export type CreditRatios = {
  operatingMargin: RatioAssessment;
  netMargin: RatioAssessment;
  netDebt: RatioAssessment;
  gearing: RatioAssessment;
  interestCoverage: RatioAssessment;
  workingCapitalNeed: RatioAssessment;
  workingCapitalNeedToRevenue: RatioAssessment;
  equityToTotalAssets: RatioAssessment;
};

export type ScoreBreakdownItem = {
  category: string;
  points: number;
  maxPoints: number;
  level: RiskLevel;
  comment: string;
};

export type CreditScore = {
  score: number;
  level: RiskLevel;
  label: string;
  summary: string;
  breakdown: ScoreBreakdownItem[];
};

export type CreditRecommendation = {
  title: string;
  level: RiskLevel;
  detail: string;
};

export type CreditAnalysis = {
  input: FinancialInput;
  ratios: CreditRatios;
  score: CreditScore;
  strengths: string[];
  weaknesses: string[];
  recommendations: CreditRecommendation[];
  diagnostic: string;
};