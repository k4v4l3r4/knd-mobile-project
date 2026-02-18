import api from './api';

export const settingService = {
  // Profil RT
  getProfile: () => api.get('/settings/profile'),
  updateProfile: (data: any) => api.post('/settings/profile', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Kas & Bank
  getWallets: () => api.get('/settings/wallets'),
  storeWallet: (data: any) => api.post('/settings/wallets', data),
  updateWallet: (id: number, data: any) => api.put(`/settings/wallets/${id}`, data),
  deleteWallet: (id: number) => api.delete(`/settings/wallets/${id}`),

  // Kategori Kegiatan
  getActivities: () => api.get('/settings/activities'),
  storeActivity: (data: any) => api.post('/settings/activities', data),
  updateActivity: (id: number, data: any) => api.put(`/settings/activities/${id}`, data),
  deleteActivity: (id: number) => api.delete(`/settings/activities/${id}`),

  // Manajemen Peran
  getRoles: () => api.get('/settings/roles'),
  storeRole: (data: any) => api.post('/settings/roles', data),
  updateRole: (id: number, data: any) => api.put(`/settings/roles/${id}`, data),
  deleteRole: (id: number) => api.delete(`/settings/roles/${id}`),

  // Manajemen Admin
  getAdmins: () => api.get('/settings/admins'),
  storeAdmin: (data: any) => api.post('/settings/admins', data),
  updateAdmin: (id: number, data: any) => api.put(`/settings/admins/${id}`, data),
  deleteAdmin: (id: number) => api.delete(`/settings/admins/${id}`),

  // Manajemen Iuran
  getFees: () => api.get('/fees'),
  storeFee: (data: any) => api.post('/fees', data),
  updateFee: (id: number, data: any) => api.put(`/fees/${id}`, data),
  deleteFee: (id: number) => api.delete(`/fees/${id}`),

  // Jenis Surat
  getLetterTypes: () => api.get('/letter-types'),
  storeLetterType: (data: any) => api.post('/letter-types', data),
  updateLetterType: (id: number, data: any) => api.put(`/letter-types/${id}`, data),
  deleteLetterType: (id: number) => api.delete(`/letter-types/${id}`),
};
