/** Prices are stored in centavos. ₱350 is 35000. */
export function peso(centavos: number): string {
  const whole = centavos % 100 === 0;
  return `₱${(centavos / 100).toLocaleString("en-PH", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function minutes(total: number): string {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}
