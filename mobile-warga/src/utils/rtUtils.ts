export const formatRTLabel = (addressRt: string | number | null | undefined): string => {
  if (addressRt === null || addressRt === undefined) return 'RT';
  const raw = String(addressRt).trim();
  const num = parseInt(raw.replace(/\D/g, ''), 10);
  if (Number.isNaN(num)) {
    return raw.toUpperCase().startsWith('RT') ? raw : `RT ${raw}`;
  }
  const padded = String(num).padStart(3, '0');
  return `RT ${padded}`;
};
