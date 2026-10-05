/**
 * Star ratings. A barber's rating is the mean of their reviews' stars. A shop's
 * rating is the mean of its barbers' ratings, so each barber counts equally no
 * matter how many reviews they have. Barbers with no reviews are left out.
 */

export interface Rating {
  /** Mean stars, unrounded. Round only when displaying (see `formatStars`). */
  average: number;
  /** Reviews behind the rating. For a shop, the total across its barbers. */
  count: number;
}

export function shopRating(barbers: Array<Rating | null>): Rating | null {
  const rated = barbers.filter((r): r is Rating => r != null);
  if (rated.length === 0) return null;
  return {
    average: rated.reduce((sum, r) => sum + r.average, 0) / rated.length,
    count: rated.reduce((sum, r) => sum + r.count, 0),
  };
}

/** "4.7". Always one decimal, so 5 reads "5.0". */
export function formatStars(average: number): string {
  return (Math.round(average * 10) / 10).toFixed(1);
}
