# 🔧 FIX: Pengaturan Sistem Menu Missing from HomeScreen

## Root Cause Analysis

**Masalah ditemukan:**

1. ✅ File `SystemSettingsScreen.tsx` sudah updated dengan benar (menu CCTV ada)
2. ❌ Menu "Pengaturan Sistem" **TIDAK ADA** di `allMenuItems` HomeScreen
3. ❌ Menu CCTV masih ada di dashboard utama (line 855) - belum dihapus

**Result:**
- User tidak bisa akses Pengaturan Sistem karena tidak ada menu-nya
- Menu CCTV masih muncul di dashboard (harusnya dipindah)

---

## 🛠️ Solution

### **Step 1: Add "Pengaturan Sistem" Menu to HomeScreen**

**File:** `mobile-warga/src/screens/HomeScreen.tsx`  
**Location:** Inside `allMenuItems` array (after line 856)

**ADD this menu item:**

```typescript
{ id: 'system_settings', title: '⚙️ Pengaturan Sistem', icon: 'settings-outline', library: Ionicons, action: () => onNavigate('SYSTEM_SETTINGS') },
```

**Full context (line ~857):**
```typescript
const allMenuItems = useMemo(() => {
  let items = [
    { id: 'bills', title: t('home.menus.bills'), icon: 'stats-chart-outline', library: Ionicons, action: () => checkRestriction(() => onNavigate('FINANCE_REPORT'), 'billing') },
    { id: 'contribution_report', title: t('home.menus.contributionReport'), icon: 'receipt-outline', library: Ionicons, action: () => checkRestriction(() => onNavigate('CONTRIBUTION_REPORT'), 'billing') },
    { id: 'report', title: t('home.menus.report'), icon: 'megaphone-outline', library: Ionicons, badgeCount: data?.unread_reports_count || 0, action: () => checkRestriction(() => onNavigate('REPORT'), 'write') },
    { id: 'letter', title: t('home.menus.letter'), icon: 'document-text-outline', library: Ionicons, action: () => checkRestriction(() => onNavigate('LETTER'), 'write') },
    { id: 'patrol', title: t('home.menus.patrol'), icon: 'shield-outline', library: Ionicons, action: () => onNavigate('PATROL') },
    { id: 'warga', title: t('home.menus.warga'), icon: 'people-outline', library: Ionicons, action: () => onNavigate('WARGA_LIST') },
    { id: 'boarding', title: t('home.menus.boarding'), icon: 'business-outline', library: Ionicons, action: () => checkRestriction(() => onNavigate('BOARDING'), 'write') },
    { id: 'inventory', title: t('home.menus.inventory'), icon: 'cube-outline', library: Ionicons, action: () => onNavigate('INVENTORY') },
    { id: 'guest', title: t('home.menus.guest'), icon: 'person-add-outline', library: Ionicons, action: () => checkRestriction(() => onNavigate('GUEST'), 'write') },
    { id: 'voting', title: t('home.menus.voting'), icon: 'vote-outline', library: MaterialCommunityIcons, action: () => checkRestriction(() => onNavigate('POLLING'), 'write') },
    { id: 'market', title: t('home.menus.market'), icon: 'storefront-outline', library: Ionicons, action: () => onNavigate('MARKET') },
    
    // 👇 ADD THIS LINE 👇
    { id: 'system_settings', title: '⚙️ Pengaturan Sistem', icon: 'settings-outline', library: Ionicons, action: () => onNavigate('SYSTEM_SETTINGS') },
    
    { id: 'announcement', title: t('home.menus.announcement'), icon: 'newspaper-outline', library: Ionicons, action: () => onNavigate('INFORMATION') },
  ];
```

---

### **Step 2: Remove CCTV Menu from Dashboard**

**REMOVE this line** (around line 855):
```typescript
{ id: 'cctv', title: t('home.menus.cctv'), icon: 'videocam-outline', library: Ionicons, action: () => onNavigate('CCTV') },
```

**And comment out the filter logic** (lines 861-865):
```typescript
// CCTV Menu - Only for RT/Admin roles
// const isRTAdmin = userRole === 'ADMIN_RT' || userRole === 'RT' || userRole === 'admin_rt' || userRole === 'super_admin';
// if (!isRTAdmin) {
//   items = items.filter(item => item.id !== 'cctv');
// }
```

---

### **Step 3: Ensure SYSTEM_SETTINGS is NOT Filtered for RT**

Check line 869 - make sure `system_settings` is only filtered for WARGA, not RT:

**Current code (should be okay):**
```typescript
if (userRole === 'WARGA' || userRole === 'WARGA_TETAP' || userRole === 'WARGA TETAP') {
  items = items.filter(item => item.id !== 'announcement' && item.id !== 'voting' && item.id !== 'system_settings' && item.id !== 'bansos' && item.id !== 'contribution_report');
}
```

✅ This is correct - only WARGA roles have system_settings filtered out.
✅ ADMIN_RT and RT can see system_settings menu.

---

## 📝 Manual Edit Instructions

### **Quick Fix (Copy-Paste Ready):**

**Open:** `c:\Users\Administrator\knd-rt-online\mobile-warga\src\screens\HomeScreen.tsx`

**Find line ~842-857** and replace the `allMenuItems` array with:

```typescript
const allMenuItems = useMemo(() => {
  let items = [
    { id: 'bills', title: t('home.menus.bills'), icon: 'stats-chart-outline', library: Ionicons, action: () => checkRestriction(() => onNavigate('FINANCE_REPORT'), 'billing') },
    { id: 'contribution_report', title: t('home.menus.contributionReport'), icon: 'receipt-outline', library: Ionicons, action: () => checkRestriction(() => onNavigate('CONTRIBUTION_REPORT'), 'billing') },
    { id: 'report', title: t('home.menus.report'), icon: 'megaphone-outline', library: Ionicons, badgeCount: data?.unread_reports_count || 0, action: () => checkRestriction(() => onNavigate('REPORT'), 'write') },
    { id: 'letter', title: t('home.menus.letter'), icon: 'document-text-outline', library: Ionicons, action: () => checkRestriction(() => onNavigate('LETTER'), 'write') },
    { id: 'patrol', title: t('home.menus.patrol'), icon: 'shield-outline', library: Ionicons, action: () => onNavigate('PATROL') },
    { id: 'warga', title: t('home.menus.warga'), icon: 'people-outline', library: Ionicons, action: () => onNavigate('WARGA_LIST') },
    { id: 'boarding', title: t('home.menus.boarding'), icon: 'business-outline', library: Ionicons, action: () => checkRestriction(() => onNavigate('BOARDING'), 'write') },
    { id: 'inventory', title: t('home.menus.inventory'), icon: 'cube-outline', library: Ionicons, action: () => onNavigate('INVENTORY') },
    { id: 'guest', title: t('home.menus.guest'), icon: 'person-add-outline', library: Ionicons, action: () => checkRestriction(() => onNavigate('GUEST'), 'write') },
    { id: 'voting', title: t('home.menus.voting'), icon: 'vote-outline', library: MaterialCommunityIcons, action: () => checkRestriction(() => onNavigate('POLLING'), 'write') },
    { id: 'market', title: t('home.menus.market'), icon: 'storefront-outline', library: Ionicons, action: () => onNavigate('MARKET') },
    { id: 'system_settings', title: '⚙️ Pengaturan Sistem', icon: 'settings-outline', library: Ionicons, action: () => onNavigate('SYSTEM_SETTINGS') }, // 👈 ADDED
    { id: 'announcement', title: t('home.menus.announcement'), icon: 'newspaper-outline', library: Ionicons, action: () => onNavigate('INFORMATION') },
  ];

  const userRole = data?.user?.role?.toUpperCase() || '';

  // CCTV Menu removed - now in System Settings
  // Comment out old CCTV filter logic
  
  // Filter announcement and voting for WARGA/WARGA_TETAP
  if (userRole === 'WARGA' || userRole === 'WARGA_TETAP' || userRole === 'WARGA TETAP') {
    items = items.filter(item => item.id !== 'announcement' && item.id !== 'voting' && item.id !== 'system_settings' && item.id !== 'bansos' && item.id !== 'contribution_report');
  }
```

---

## 🧪 Testing After Fix

### **Test sebagai ADMIN_RT:**

1. **Login** dengan akun RT Bram
2. **Buka Dashboard**
3. **Verify menus:**
   - ✅ Muncul menu "⚙️ Pengaturan Sistem"
   - ❌ TIDAK muncul menu "CCTV" di dashboard
4. **Click "⚙️ Pengaturan Sistem"**
5. **Inside System Settings:**
   - ✅ Section "Pengaturan Umum" (Profil + Notifikasi)
   - ✅ Section "Pengaturan Fitur" (7 menus including CCTV)
   - ✅ Menu "📹 Pengaturan CCTV" appears
6. **Click "Pengaturan CCTV"**
7. **Verify navigation:**
   - Opens CCTV monitoring/settings screen
   - Back button returns to System Settings

---

## 🎯 Expected Menu Structure

### **Dashboard (HOME) - ADMIN_RT:**
```
├── Iuran & Keuangan
├── Laporan Keuangan
├── Laporan Warga
├── Surat Pengantar
├── Jadwal Ronda
├── Data Warga
├── Data Kost
├── Inventaris
├── Tamu Berkunjung
├── Voting
├── Pasar Warga
├── ⚙️ Pengaturan Sistem ← NEW!
└── Pengumuman
```

### **Inside Pengaturan Sistem:**
```
📋 Pengaturan Umum
├── ⚙️ Pengaturan Profil RT
└── 🔔 Notifikasi

🔧 Pengaturan Fitur
├── 💰 Pengaturan Keuangan
├── 📝 Kategori Kegiatan
├── 👥 Manajemen Admin
├── 🛡️ Manajemen Role
├── 💵 Pengaturan Fee
├── 📄 Jenis Surat
└── 📹 Pengaturan CCTV ← MOVED HERE!
```

---

## 📊 Changes Summary

| Action | File | Line | Status |
|--------|------|------|--------|
| **Add Menu** | HomeScreen.tsx | ~857 | Add `system_settings` item |
| **Remove Menu** | HomeScreen.tsx | ~855 | Remove `cctv` item |
| **Comment Filter** | HomeScreen.tsx | ~861-865 | Comment out CCTV filter |
| **Already Done** | SystemSettingsScreen.tsx | ~98-102 | ✅ CCTV submenu added |

---

## 🚀 Deployment Checklist

- [ ] Edit HomeScreen.tsx (add system_settings menu)
- [ ] Remove CCTV menu from HomeScreen
- [ ] Save file
- [ ] Test locally: `npm start`
- [ ] Git commit: `git add .; git commit -m "fix: move CCTV to System Settings submenu"`
- [ ] Git push: `git push origin main`
- [ ] Build: `eas build --profile production`
- [ ] Deploy to stores
- [ ] Test on production (HP Bos Bram)

---

## ⏱️ Quick Test Command

After editing, test immediately:

```bash
cd mobile-warga
npm start

# Scan QR code atau run di emulator
# Login sebagai ADMIN_RT
# Check menu "⚙️ Pengaturan Sistem" appears
```

---

## ✅ Success Criteria

**Menu "Pengaturan Sistem" MUNCUL jika:**
- ✅ User role = `ADMIN_RT` or `RT` or `admin_rt` or `super_admin`
- ✅ Menu item exists in `allMenuItems` array
- ✅ Not filtered out by role-based logic
- ✅ Icon loads correctly (`settings-outline`)
- ✅ Navigation works (`onNavigate('SYSTEM_SETTINGS')`)

**All criteria sudah terpenuhi setelah Step 1!**

---

**Last Updated:** 2026-03-18  
**Priority:** CRITICAL - Bos Bram waiting!  
**ETA:** 10 minutes after manual edit
