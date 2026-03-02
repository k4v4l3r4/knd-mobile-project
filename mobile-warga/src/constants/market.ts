export const STORE_CATEGORIES = [
  { id: 'FOOD', label: 'Kuliner' },
  { id: 'FASHION', label: 'Fashion & Pakaian' },
  { id: 'ELECTRONIC', label: 'Elektronik & Gadget' },
  { id: 'HOUSEHOLD', label: 'Kebutuhan Rumah Tangga' },
  { id: 'SERVICE', label: 'Jasa & Layanan' },
  { id: 'BEAUTY', label: 'Kesehatan & Kecantikan' },
  { id: 'HOBBY', label: 'Hobi & Koleksi' },
  { id: 'AUTOMOTIVE', label: 'Otomotif' },
  { id: 'GOODS', label: 'Barang Lainnya' },
] as const;

export type StoreCategoryId = typeof STORE_CATEGORIES[number]['id'];
