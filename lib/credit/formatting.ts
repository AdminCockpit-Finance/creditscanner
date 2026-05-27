/**
 * Vérifie qu'une valeur est bien un nombre utilisable.
 * Cela évite NaN, Infinity et les valeurs non numériques.
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Division sécurisée.
 *
 * Retourne null si :
 * - le numérateur est invalide ;
 * - le dénominateur est invalide ;
 * - le dénominateur vaut zéro ;
 * - le résultat est NaN ou Infinity.
 */
export function safeDivide(
  numerator: number,
  denominator: number
): number | null {
  if (!isValidNumber(numerator)) return null;
  if (!isValidNumber(denominator)) return null;
  if (denominator === 0) return null;

  const result = numerator / denominator;

  return Number.isFinite(result) ? result : null;
}

/**
 * Formate un ratio décimal en pourcentage.
 *
 * Exemple :
 * 0.0065 devient 0,65 %
 * 0.918 devient 91,80 %
 */
export function formatPercent(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) {
    return "Non calculable";
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/**
 * Formate un multiple.
 *
 * Exemple :
 * 0.29 devient 0,29 x
 *
 * maxDisplay permet d'éviter les valeurs peu lisibles comme 23837,86 x.
 * Exemple :
 * formatMultiple(23837.86, 2, 100) affiche > 100 x
 */
export function formatMultiple(
  value: number | null,
  digits = 2,
  maxDisplay?: number
): string {
  if (value === null || !Number.isFinite(value)) {
    return "Non calculable";
  }

  if (maxDisplay !== undefined && value > maxDisplay) {
    return `> ${new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 0,
    }).format(maxDisplay)} x`;
  }

  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)} x`;
}

/**
 * Formate un montant en euros.
 */
export function formatMoney(value: number | null, digits = 0): string {
  if (value === null || !Number.isFinite(value)) {
    return "Non calculable";
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/**
 * Formate un nombre simple.
 */
export function formatNumber(value: number | null, digits = 0): string {
  if (value === null || !Number.isFinite(value)) {
    return "Non calculable";
  }

  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}