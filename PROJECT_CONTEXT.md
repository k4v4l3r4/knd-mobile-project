# PROJECT CONTEXT: RT ONLINE SUPER APP (SaaS Edition)

## 1. SYSTEM OVERVIEW
Platform SaaS Multi-tenant untuk manajemen lingkungan RT/RW, keamanan (IoT), dan keuangan (Fintech).
- **Backend:** Laravel 11 (API Only)
- **Database:** PostgreSQL + PostGIS Extension
- **Architecture:** Monolith Modular (Service Repository Pattern)

## 2. KEY ENTITIES & RELATIONSHIPS
- **Wilayah (Tenants):**
  - `wilayah_rw` (Parent Tenant): Memiliki status langganan (subscription_status).
  - `wilayah_rt` (Child Tenant): Terhubung ke RW. Memiliki saldo kas sendiri.
- **Users:**
  - Roles: SUPER_ADMIN, ADMIN_RW, ADMIN_RT, WARGA_TETAP, JURAGAN_KOST, WARGA_KOST, SECURITY.
  - Relasi: User milik RT tertentu (`rt_id`).
- **Hunian (Properties):**
  - Types: RUMAH_TINGGAL, KOST, TEMPAT_USAHA.
  - Jika KOST, relasi ke `pemilik_id` (Juragan).
- **Keuangan (Multi-Wallet):**
  - Akun Keuangan tidak hanya satu per RT.
  - Tabel `finance_accounts` menyimpan dompet ("Kas Utama", "Kas PKK", "Kas Ronda").

## 3. SPECIAL FEATURES LOGIC
- **Ronda GPS:** Tabel `ronda_logs` wajib menggunakan tipe data `GEOGRAPHY(POINT)` untuk koordinat akurat.
- **Emergency Contacts:** 3 Layer (Nasional [rw_id=null], Wilayah [rw_id set], Lokal [rt_id set]).
- **SaaS Middleware:** Setiap request API harus mengecek apakah `wilayah_rw` statusnya ACTIVE.

## 4. TECH CONSTRAINTS
- Gunakan `Bcrypt` untuk password.
- Gunakan `Sanctum` untuk token API.
- Gunakan `SoftDeletes` untuk data penting.
- Return Response Format: `{ meta: {...}, data: {...} }`.