export const AGE_BUCKETS: { label: string; min: number; max: number | null }[] = [
  { label: "18-25", min: 18, max: 25 },
  { label: "26-35", min: 26, max: 35 },
  { label: "36-45", min: 36, max: 45 },
  { label: "46-55", min: 46, max: 55 },
  { label: "56-65", min: 56, max: 65 },
  { label: "66+", min: 66, max: null },
];

export function bucketAge(dob: string | null, asOf: Date): string | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let age = asOf.getFullYear() - d.getFullYear();
  const m = asOf.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < d.getDate())) age--;
  for (const b of AGE_BUCKETS) {
    if (age >= b.min && (b.max === null || age <= b.max)) return b.label;
  }
  return null;
}
