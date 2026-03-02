export const formatPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return '';
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle 0-prefixed numbers (e.g. 0812...) -> 62812...
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  
  // Handle numbers that don't start with 62 (assuming they are local numbers missing the prefix)
  if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  
  return cleaned;
};
