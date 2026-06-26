export function getScoreClass(score?: string | number) {
  const value = Number(score || 0);

  if (value >= 90) return "text-cyan-300";
  if (value >= 80) return "text-emerald-300";
  if (value >= 70) return "text-yellow-300";
  if (value > 0) return "text-red-300";

  return "text-zinc-500";
}