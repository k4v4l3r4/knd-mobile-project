# ✅ Fix: Form Daftar Akun WARGA - RT & RW Menjadi Wajib

## 📋 Ringkasan Perubahan

Form Daftar Akun (WARGA) di aplikasi Mobile telah direvisi untuk membuat kolom **RT** dan **RW** menjadi **WAJIB** diisi, bukan lagi opsional.

---

## 🎯 Perubahan yang Dilakukan

### 1. Frontend (Mobile UI) - RegisterWargaScreen.tsx

**File**: `mobile-warga/src/screens/RegisterWargaScreen.tsx`

#### A. Validasi Form (Line 54-70)

**Sebelum**:
```typescript
if (!formData.name || !formData.phone || !formData.email || 
    !formData.password || !formData.inviteCode) {
  Alert.alert('Error', 'Mohon lengkapi data wajib (Nama, HP, Email, Password, Kode Undangan)');
  return;
}
```

**Sesudah**:
```typescript
// Validasi data wajib termasuk RT dan RW
if (!formData.name || !formData.phone || !formData.email || 
    !formData.password || !formData.inviteCode || !formData.rt || !formData.rw) {
  Alert.alert('Error', 'Mohon lengkapi semua data wajib (Nama, HP, Email, Password, Kode Undangan, RT, RW)');
  return;
}
```

#### B. Label Input RT (Line 173-190)

**Sebelum**:
```typescript
<Text style={[styles.label, { color: colors.textSecondary }]}>
  RT
  <Text style={{ fontSize: 12, fontWeight: 'normal' }}> (Opsional)</Text>
</Text>
```

**Sesudah**:
```typescript
<Text style={[styles.label, { color: colors.textSecondary }]}>
  RT
  <Text style={{ color: '#ef4444' }}> *</Text>
</Text>
```

#### C. Label Input RW (Line 192-209)

**Sebelum**:
```typescript
<Text style={[styles.label, { color: colors.textSecondary }]}>
  RW
  <Text style={{ fontSize: 12, fontWeight: 'normal' }}> (Opsional)</Text>
</Text>
```

**Sesudah**:
```typescript
<Text style={[styles.label, { color: colors.textSecondary }]}>
  RW
  <Text style={{ color: '#ef4444' }}> *</Text>
</Text>
```

---

### 2. Backend (API Laravel) - SaasAuthController.php

**File**: `api/app/Http/Controllers/Api/SaasAuthController.php`

#### Validasi Request (Line 288-297)

**Sebelum**:
```php
$validator = Validator::make($request->all(), [
    'name' => 'required|string',
    'phone' => 'required|string|unique:users,phone',
    'email' => 'required|email|unique:users,email',
    'password' => 'required|min:6',
    'invite_code' => 'required|exists:wilayah_rt,invite_code',
    'address_rt' => 'nullable|string|max:3',      // ❌ Opsional
    'address_rw' => 'nullable|string|max:3',      // ❌ Opsional
    'marital_status' => 'nullable|in:Belum Kawin,...',
]);
```

**Sesudah**:
```php
$validator = Validator::make($request->all(), [
    'name' => 'required|string',
    'phone' => 'required|string|unique:users,phone',
    'email' => 'required|email|unique:users,email',
    'password' => 'required|min:6',
    'invite_code' => 'required|exists:wilayah_rt,invite_code',
    'address_rt' => 'required|string|max:3',      // ✅ WAJIB
    'address_rw' => 'required|string|max:3',      // ✅ WAJIB
    'marital_status' => 'nullable|in:Belum Kawin,...',
]);
```

---

## 🔒 Keamanan & Validasi Berlapis

### Frontend Validation (Mobile)
- ✅ Validasi sebelum submit form
- ✅ Tombol "Daftar" disabled jika data tidak lengkap
- ✅ Alert error jika RT atau RW kosong
- ✅ Real-time validation saat user mengetik

### Backend Validation (Laravel API)
- ✅ Server-side validation dengan `required` rule
- ✅ Reject request jika RT/RW kosong
- ✅ Error message yang jelas dari server
- ✅ Database integrity terjaga

---

## 📱 User Experience

### Sebelum Perubahan:
```
[Form Daftar Akun]
├─ Kode Undangan RT *
├─ RT (Opsional) ← Tidak wajib
├─ RW (Opsional) ← Tidak wajib
├─ Nama Lengkap *
└─ ...
```

### Sesudah Perubahan:
```
[Form Daftar Akun]
├─ Kode Undangan RT *
├─ RT * ← WAJIB
├─ RW * ← WAJIB
├─ Nama Lengkap *
└─ ...
```

---

## 🧪 Testing Checklist

### Frontend Testing (Mobile App):

**Test Case 1: Submit dengan RT & RW Kosong**
```
1. Isi semua field kecuali RT dan RW
2. Tekan tombol "Daftar Sekarang"
Expected: Alert muncul "Mohon lengkapi semua data wajib (...RT, RW)"
```

**Test Case 2: Submit dengan RT Diisi, RW Kosong**
```
1. Isi RT tapi kosongkan RW
2. Tekan tombol "Daftar Sekarang"
Expected: Alert muncul "Mohon lengkapi semua data wajib (...RT, RW)"
```

**Test Case 3: Submit dengan RT & RW Diisi**
```
1. Isi semua field termasuk RT dan RW
2. Tekan tombol "Daftar Sekarang"
Expected: Request terkirim ke server
```

**Test Case 4: Visual Label Check**
```
1. Buka form Daftar Akun
2. Periksa label RT dan RW
Expected: Label menampilkan "*" merah, bukan "(Opsional)"
```

### Backend Testing (API):

**Test Case 5: API Request tanpa RT**
```bash
POST /api/register-warga
{
  "name": "Test User",
  "phone": "628123456789",
  "email": "test@email.com",
  "password": "password123",
  "invite_code": "ABC123",
  "address_rt": "",        // Kosong
  "address_rw": "001"
}
Expected: HTTP 422, Error: "The address rt field is required."
```

**Test Case 6: API Request tanpa RW**
```bash
POST /api/register-warga
{
  "name": "Test User",
  "phone": "628123456789",
  "email": "test@email.com",
  "password": "password123",
  "invite_code": "ABC123",
  "address_rt": "001",
  "address_rw": ""         // Kosong
}
Expected: HTTP 422, Error: "The address rw field is required."
```

**Test Case 7: API Request dengan RT & RW Lengkap**
```bash
POST /api/register-warga
{
  "name": "Test User",
  "phone": "628123456789",
  "email": "test@email.com",
  "password": "password123",
  "invite_code": "ABC123",
  "address_rt": "001",     // Diisi
  "address_rw": "001"      // Diisi
}
Expected: HTTP 200, Registrasi berhasil
```

---

## 🚀 Deployment Instructions

### Mobile App (Frontend):

```bash
cd mobile-warga

# 1. Install dependencies (jika ada perubahan baru)
npm install

# 2. Build app
npx expo build:android  # Untuk Android
# atau
npx expo build:ios      # Untuk iOS

# 3. Test locally
npm start

# 4. Deploy ke production
# Upload ke Google Play Store / App Store
```

### Backend API (Laravel):

```bash
cd api

# 1. Clear cache
php artisan config:clear
php artisan cache:clear
php artisan route:clear

# 2. Test API endpoint
php artisan test --filter=RegisterWargaTest

# 3. Deploy to production
git push origin main
# atau upload via FTP/SFTP

# 4. Verify di production
curl -X POST https://api.afnet.my.id/register-warga \
  -d "name=Test&phone=628123456789&email=test@email.com&password=pass123&invite_code=ABC123"
```

---

## 📊 Impact Analysis

### Positive Impact:
- ✅ Data warga lebih lengkap dan akurat
- ✅ Memudahkan pendataan wilayah RT/RW
- ✅ Mengurangi data sampah/incomplete records
- ✅ User lebih aware dengan lokasi tempat tinggalnya

### Potential Breaking Changes:
- ⚠️ User yang terbiasa tidak mengisi RT/RW akan mendapat error
- ⚠️ Perlu sosialisasi bahwa RT/RW sekarang wajib
- ⚠️ Mungkin ada penurunan jumlah registrasi baru sementara waktu

### Mitigation:
- ℹ️ Tampilkan pesan error yang jelas
- ℹ️ Berikan placeholder contoh pengisian (e.g., "001")
- ℹ️ Update FAQ atau help text jika ada

---

## 🔍 Monitoring

### Metrics to Watch:

**Frontend Analytics**:
- Form abandonment rate (apakah user batal isi karena RT/RW wajib?)
- Error alert frequency (berapa sering alert validasi muncul?)
- Conversion rate (registrasi berhasil vs gagal)

**Backend Logs**:
```bash
# Monitor validation errors
tail -f storage/logs/laravel.log | grep "validation"

# Monitor registration attempts
tail -f storage/logs/laravel.log | grep "register-warga"
```

**Database Queries**:
```sql
-- Cek berapa banyak user baru dengan RT/RW lengkap
SELECT COUNT(*) as total, 
       COUNT(address_rt) as with_rt, 
       COUNT(address_rw) as with_rw
FROM users 
WHERE role = 'WARGA_TETAP'
AND created_at >= '2026-03-18';
```

---

## 🆘 Rollback Plan

Jika terjadi masalah critical:

### Frontend Rollback:
```bash
cd mobile-warga
git checkout HEAD~1 src/screens/RegisterWargaScreen.tsx
npm start
```

### Backend Rollback:
```bash
cd api
git checkout HEAD~1 app/Http/Controllers/Api/SaasAuthController.php
php artisan config:clear
```

---

## 📝 Related Files

### Modified Files:
1. `mobile-warga/src/screens/RegisterWargaScreen.tsx` - Frontend validation & UI
2. `api/app/Http/Controllers/Api/SaasAuthController.php` - Backend validation

### Related Models:
- `api/app/Models/User.php` - User model dengan field address_rt & address_rw
- `api/app/Models/WilayahRt.php` - RT model untuk validasi invite_code

### Related Routes:
- `api/routes/api.php` - Route untuk register-warga endpoint

---

## ✅ Verification

Setelah deployment, verifikasi:

**Mobile App**:
- [ ] Label RT menampilkan "*" (merah)
- [ ] Label RW menampilkan "*" (merah)
- [ ] Form tidak bisa submit jika RT/RW kosong
- [ ] Alert error muncul dengan pesan yang jelas

**Backend API**:
- [ ] Request tanpa RT ditolak dengan error 422
- [ ] Request tanpa RW ditolak dengan error 422
- [ ] Request dengan RT & RW lengkap diproses normal
- [ ] Data tersimpan ke database dengan benar

**Database**:
- [ ] Semua user baru memiliki address_rt dan address_rw
- [ ] Tidak ada NULL value untuk field tersebut

---

**Status**: ✅ READY FOR DEPLOYMENT  
**Risk Level**: 🟡 MEDIUM (Breaking change untuk UX)  
**Testing Required**: ⭐⭐⭐⭐⭐ (High priority testing)
