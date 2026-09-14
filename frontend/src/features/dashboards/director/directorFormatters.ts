export function formatETB(amount: number | string): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat("en-US").format(Math.round(num));
}

export function formatCompactM(amount: number | string): string {
  const num = Number(amount) || 0;
  if (Math.abs(num) >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B ETB`;
  }
  return `${(num / 1_000_000).toFixed(1)} M ETB`;
}

export function formatCompactMWithoutUnit(amount: number | string): string {
  const num = Number(amount) || 0;
  if (Math.abs(num) >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  }
  return `${(num / 1_000_000).toFixed(1)}M`;
}

export function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return "recently";
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "today";
    if (diffDays === 1) return "1 day ago";
    return `${diffDays} days ago`;
  } catch {
    return "recently";
  }
}
