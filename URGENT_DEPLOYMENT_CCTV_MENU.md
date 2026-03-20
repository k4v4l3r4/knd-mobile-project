# 🚨 URGENT DEPLOYMENT - CCTV Menu Structure Update

## Status: PENDING MANUAL DEPLOYMENT ⚠️

**Perubahan BELUM di-deploy ke production!** 

File sudah diedit di session tapi **BELUM ter-save ke filesystem** dan **BELUM di-commit ke Git**.

---

## 📋 Yang Perlu Dilakukan

### **Step 1: Verify Local Changes**

Cek apakah file sudah berubah di local:

```bash
cd c:\Users\Administrator\knd-rt-online\mobile-warga\src\screens
notepad SystemSettingsScreen.tsx
```

**Cari text ini:**
- "Pengaturan CCTV" ← harus ada di line ~98
- "videocam-outline" ← harus ada di line ~99
- "#ef4444" ← harus ada di line ~100

**Jika TIDAK ADA**, berarti perubahan belum ter-save. Lanjut ke Step 2.

---

### **Step 2: Manual File Edit (REQUIRED)**

**File:** `mobile-warga/src/screens/SystemSettingsScreen.tsx`

**Line 40-88** - Ganti seluruh const menuGroups dengan ini:

```typescript
const menuGroups = [
  {
    title: 'Pengaturan Umum',
    items: [
      { 
        title: t('home.menus.rtProfile'), 
        icon: 'business-outline', 
        color: '#3b82f6',
        action: () => handleAction(() => onNavigate('RT_PROFILE'))
      },
      { 
        title: 'Notifikasi', 
        icon: 'notifications-outline', 
        color: '#f59e0b',
        action: () => handleAction(() => onNavigate('NOTIFICATION_SETTINGS'))
      },
    ]
  },
  {
    title: 'Pengaturan Fitur',
    items: [
      { 
        title: t('home.menus.financeSettings'), 
        icon: 'wallet-outline', 
        color: '#10b981',
        action: () => handleAction(() => onNavigate('WALLET_SETTINGS'))
      },
      { 
        title: t('home.menus.activityCategories'), 
        icon: 'list-outline', 
        color: '#f59e0b',
        action: () => handleAction(() => onNavigate('ACTIVITY_SETTINGS'))
      },
      { 
        title: t('home.menus.adminManagement'), 
        icon: 'people-outline', 
        color: '#8b5cf6',
        action: () => handleAction(() => onNavigate('ADMIN_SETTINGS'))
      },
      { 
        title: t('home.menus.roleManagement'), 
        icon: 'shield-checkmark-outline', 
        color: '#ec4899',
        action: () => handleAction(() => onNavigate('ROLE_SETTINGS'))
      },
      { 
        title: t('home.menus.feeManagement'), 
        icon: 'cash-outline', 
        color: '#06b6d4',
        action: () => handleAction(() => onNavigate('FEE_SETTINGS'))
      },
      { 
        title: t('home.menus.letterTypes'), 
        icon: 'document-text-outline', 
        color: '#f97316',
        action: () => handleAction(() => onNavigate('LETTER_TYPE_SETTINGS'))
      },
      { 
        title: 'Pengaturan CCTV', 
        icon: 'videocam-outline', 
        color: '#ef4444',
        action: () => handleAction(() => onNavigate('CCTV'))
      },
    ]
  }
];
```

**Save file!**

---

### **Step 3: Commit & Push to Git**

```bash
cd c:\Users\Administrator\knd-rt-online

# Add changes
git add mobile-warga/src/screens/SystemSettingsScreen.tsx

# Commit
git commit -m "feat(system-settings): move CCTV settings to submenu under Pengaturan Fitur"

# Push to remote
git push origin main
```

---

### **Step 4: Build Mobile App**

```bash
cd mobile-warga

# Install dependencies (if needed)
npm install

# Build for production
eas build --profile production --platform all

# OR build for specific platform
eas build --profile production --platform android
eas build --profile production --platform ios
```

---

### **Step 5: Deploy to Production Server**

**Option A: Auto Deploy via EAS Submit**
```bash
eas submit --profile production --platform all
```

**Option B: Manual Upload**

1. Download build artifacts dari EAS Build console
2. Upload ke:
   - Google Play Console (Android)
   - App Store Connect (iOS)

---

### **Step 6: Force Update Users**

Setelah app published:

```bash
# Di mobile-warga/src/config/app.ts atau file serupa
export const FORCE_UPDATE_VERSION = '2.1.0'; // Increment version
export const MINIMUM_VERSION = '2.0.0';
```

---

## 🧪 Testing Setelah Deploy

### **Test di HP:**

1. **Update App** dari Play Store / App Store
2. **Login sebagai ADMIN_RT**
3. **Buka Dashboard** → Scroll menu grid
4. **Verify:**
   - ❌ Menu "CCTV" TIDAK ADA di dashboard utama
   - ✅ Menu "⚙️ Pengaturan Sistem" ADA
5. **Click "⚙️ Pengaturan Sistem"**
6. **Scroll ke bawah** → Section "Pengaturan Fitur"
7. **Verify:** Menu "📹 Pengaturan CCTV" MUNCUL
8. **Click menu** → Navigate ke screen CCTV
9. **Test Back Button:**
   - Back dari CCTV → Kembali ke "Pengaturan Sistem"
   - Back dari "Pengaturan Sistem" → Kembali ke Dashboard

---

## 🔍 Troubleshooting

### **Problem: Menu belum muncul setelah update**

**Solution:**
1. **Clear app cache:**
   - Settings → Apps → RT Online → Storage → Clear Cache
   
2. **Force stop app:**
   - Settings → Apps → RT Online → Force Stop
   
3. **Re-open app**

4. **Check version:**
   - Pastikan version sudah sesuai dengan build yang baru di-deploy

---

### **Problem: Build failed**

**Common Issues:**

1. **TypeScript Error:**
   ```bash
   npm run type-check
   # Fix any errors reported
   ```

2. **Dependencies Issue:**
   ```bash
   npm install --force
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **EAS Build Error:**
   ```bash
   eas build --local --platform android
   # Check detailed error logs
   ```

---

## 📊 Deployment Checklist

- [ ] File edited & saved locally
- [ ] Git commit successful
- [ ] Git push to origin/main
- [ ] EAS Build started
- [ ] Build completed successfully
- [ ] App submitted to stores
- [ ] Review approved (Google/Apple)
- [ ] Users can download update
- [ ] Tested on real device
- [ ] CCTV menu appears in System Settings
- [ ] Back navigation works correctly

---

## ⏱️ Estimated Timeline

| Step | Time |
|------|------|
| Manual Edit | 5 min |
| Commit & Push | 2 min |
| EAS Build | 10-15 min |
| Store Review | 1-2 days (Google), 1-3 days (Apple) |
| User Update | Varies |

**Total:** ~30 min technical + store review time

---

## 🎯 Expected Result

**SETELAH DEPLOY:**

```
Dashboard (HOME)
└── ⚙️ Pengaturan Sistem
    ├── 📋 Pengaturan Umum
    │   ├── Pengaturan Profil RT
    │   └── Notifikasi
    │
    └── 🔧 Pengaturan Fitur
        ├── Pengaturan Keuangan
        ├── Kategori Kegiatan
        ├── Manajemen Admin
        ├── Manajemen Role
        ├── Pengaturan Fee
        ├── Jenis Surat
        └── 📹 Pengaturan CCTV ← NEW LOCATION!
```

---

## 📞 Contact Person

Jika ada masalah dalam deployment:
- **Developer:** [Your Name]
- **DevOps:** [DevOps Contact]
- **Emergency:** Bram (Project Owner)

---

## ✅ Status

**CURRENT STATUS:** ⏳ PENDING MANUAL EDIT

**NEXT ACTION REQUIRED:**
1. ✏️ Edit file manually (Step 2)
2. 💾 Save file
3. 📦 Commit & push
4. 🚀 Build & deploy

**Priority:** HIGH - Bos Bram menunggu!

---

**Last Updated:** 2026-03-18
**Build Version:** Pending
**Deployment Target:** Production
