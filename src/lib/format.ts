/** Consistent number formatting for SSR (avoids tr-TR vs en-US hydration mismatch). */
export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

/** Deterministic pseudo-random in [0, 1) from index — same on server and client. */
export function seededUnit(index: number, salt = 0): number {
  const x = Math.sin((index + 1) * 9999 + salt * 1234) * 10000;
  return x - Math.floor(x);
}
