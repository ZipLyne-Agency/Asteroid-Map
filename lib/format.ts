function stripTrailingDecimal(value: string): string {
  return value.endsWith('.0') ? value.slice(0, -2) : value;
}

export function formatBig(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);

  if (abs < 1_000_000) return Math.round(n).toLocaleString('en-US');

  if (abs < 999_500_000) {
    const millions = n / 1_000_000;
    const digits = Math.abs(millions) < 10 ? 1 : 0;
    return `${stripTrailingDecimal(millions.toFixed(digits))} million`;
  }

  const billions = n / 1_000_000_000;
  const digits = Math.abs(billions) < 10 ? 1 : 0;
  return `${stripTrailingDecimal(billions.toFixed(digits))} billion`;
}

export function formatRange(low: number, high: number): string {
  if (high <= 0) return '0';
  const formattedLow = formatBig(low);
  const formattedHigh = formatBig(high);
  if (formattedLow === formattedHigh) return formattedHigh;
  return `${formattedLow}-${formattedHigh}`;
}

export function formatRecurrence(years: number): string {
  if (years <= 1) return 'Every year';
  return `~every ${formatBig(years)} years`;
}
