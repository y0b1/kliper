/** Normalize a Philippine mobile number to +639XXXXXXXXX, or null if it isn't one. */
export function normalizePhMobile(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  const match = /^(?:\+?63|0)?(9\d{9})$/.exec(digits);
  return match ? `+63${match[1]}` : null;
}
