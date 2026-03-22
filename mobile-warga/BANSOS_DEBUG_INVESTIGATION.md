# 🔍 BANSOS BLANK SCREEN - DEBUGGING INVESTIGATION

## 📋 LANGKAH INVESTIGASI

### 1️⃣ API CONFIGURATION CHECK ✅

**File:** `mobile-warga/src/services/api.ts`

```typescript
export const BASE_URL = 'https://api.afnet.my.id/api';
```

✅ **Status:** API URL sudah benar, mengarah ke production server.

---

### 2️⃣ TOKEN HANDLING CHECK

**Interceptor di api.ts:**
```typescript
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('user_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    // Silent fail
  }
  return config;
});
```

✅ **Status:** Token otomatis dikirim dengan setiap request.

---

### 3️⃣ COMPREHENSIVE LOGGING ADDED 🔵

Saya telah menambahkan **SUPER DEBUG LOGS** di setiap titik kritis BansosScreen:

#### Component Initialization
```
🔵 [BANSOS SCREEN] Component initializing...
🔵 [BANSOS SCREEN] Hooks initialized, state setting up...
```

#### useEffect Execution
```
🔵 [BANSOS SCREEN] useEffect triggered
🔵 [BANSOS SCREEN] About to call checkRole() and fetchData()
🔵 [BANSOS SCREEN] Functions called successfully
```

#### Role Checking
```
🔵 [CHECK ROLE] Starting...
🔵 [CHECK ROLE] Fetching /me endpoint...
✅ [CHECK ROLE] Response received: true/success
🔵 [CHECK ROLE] User role: ADMIN_RT/WARGA
```

#### Data Fetching
```
🔵 [FETCH DATA] Starting... activeTab: recipients/history
🔵 [FETCH DATA] Fetching recipients/histories...
✅ [FETCH DATA] Response status: 200
📦 [FETCH DATA] Response structure: {...}
✅ [FETCH DATA] Setting X recipients/histories
```

---

## 🧪 CARA TESTING

### METODA 1: Debug Mode via Laptop

1. **Connect HP ke Laptop (USB Debugging)**
   ```bash
   cd mobile-warga
   npx react-native start
   ```

2. **Enable Remote JS Debugging**
   - Shake device atau tap 3x pada home indicator
   - Pilih "Debug Remote JS"
   - Chrome akan terbuka di `http://localhost:8081/debugger-ui`

3. **Buka Menu Bansos**
   - Navigate ke menu Bansos di HP
   - Lihat Console di Chrome DevTools (F12 → Console)

4. **Cari Log Ini:**
   ```
   🔵 [BANSOS SCREEN] Component initializing...
   🔵 [BANSOS SCREEN] useEffect triggered
   🔵 [CHECK ROLE] Starting...
   🔵 [FETCH DATA] Starting...
   ```

5. **Screenshot Error**
   - Jika ada error merah, screenshot seluruh layar
   - Copy console log dari Chrome

---

### METODA 2: Expo Go (Tanpa Kabel)

1. **Install Expo Go di HP**
2. **Scan QR Code dari laptop**
3. **Navigate ke Bansos**
4. **Shake device → Report Bug**
5. **Copy error log**

---

### METODA 3: Production Build Testing

1. **Build APK:**
   ```bash
   cd mobile-warga
   eas build --platform android --profile preview
   ```

2. **Install di HP**
3. **Buka menu Bansos**
4. **Screenshot blank screen**
5. **Check device logs:**
   ```bash
   adb logcat | grep -i "react\|expo\|bansos"
   ```

---

## 🎯 TITIK KRITIS YANG DI-LOG

### A. Component Level
- ✅ Component initialization
- ✅ Hook setup
- ✅ State initialization

### B. Async Operations
- ✅ `checkRole()` - Start & completion
- ✅ `fetchWarga()` - Start & completion  
- ✅ `fetchData()` - Start & completion
- ✅ API response status codes
- ✅ Data validation results

### C. Error Scenarios
- ❌ Network errors (dengan full config)
- ❌ 401/403 errors
- ❌ 500 server errors
- ❌ Invalid data structures
- ❌ Null/undefined values

---

## 📊 EXPECTED LOG FLOW

Jika一切正常 (Everything OK), log harusnya seperti ini:

```
🔵 [BANSOS SCREEN] Component initializing...
🔵 [BANSOS SCREEN] Hooks initialized, state setting up...
🔵 [BANSOS SCREEN] useEffect triggered
🔵 [BANSOS SCREEN] About to call checkRole() and fetchData()
🔵 [CHECK ROLE] Starting...
🔵 [CHECK ROLE] Fetching /me endpoint...
✅ [CHECK ROLE] Response received: true
🔵 [CHECK ROLE] User role: ADMIN_RT/WARGA
🔵 [FETCH DATA] Starting... activeTab: recipients
🔵 [FETCH DATA] Fetching recipients...
✅ [FETCH DATA] Recipients response status: 200
📦 [FETCH DATA] Response structure: {hasData: true, hasSuccess: true, ...}
🔵 [FETCH DATA] Validated data count: 5
✅ [FETCH DATA] Setting 5 recipients
🔵 [FETCH DATA] Finally block - setting loading false
🔵 [BANSOS SCREEN] Functions called successfully
```

---

## 🚨 JIKA BLANK SCREEN MASIH MUNCUL

### Kemungkinan 1: Component Tidak Render
**Gejala:** Tidak ada log 🔵 `[BANSOS SCREEN]` sama sekali

**Solusi:**
- Masalah di navigation/routing
- Screen tidak ter-import dengan benar
- App crash sebelum render

**Test:** Import `BansosTestScreen.tsx` dan navigate ke sana

---

### Kemungkinan 2: Component Render Tapi useEffect Gagal
**Gejala:** Ada log initialization tapi tidak ada log useEffect

**Solusi:**
- Check dependency array `[activeTab]`
- Check apakah component unmount segera setelah mount
- Check memory leak

---

### Kemungkinan 3: API Call Timeout/Fail
**Gejala:** Ada log "Starting..." tapi tidak ada "Response received"

**Solusi:**
- Check internet connection di HP
- Check CORS policy
- Check SSL certificate (`https://api.afnet.my.id`)
- Test manual: `fetch("https://api.afnet.my.id/api")`

---

### Kemungkinan 4: Data Validation Fail
**Gejala:** Ada log response tapi tidak ada "Setting X items"

**Solusi:**
- Check response structure dari API
- Pastikan struktur JSON sesuai ekspektasi
- Check apakah `response.data.data.data` ada

---

### Kemungkinan 5: Render Crash
**Gejala:** Data sudah di-set tapi screen tetap blank

**Solusi:**
- Check render function (`renderRecipientItem`)
- Check null safety di JSX
- Check styles (mungkin color sama dengan background)

---

## 🛠️ DEBUG TOOLS

### 1. Manual API Test
Jalankan ini di Chrome Console:
```javascript
// Test API connectivity
fetch("https://api.afnet.my.id/api")
  .then(r => console.log("✅ API Status:", r.status))
  .catch(e => console.error("❌ API Error:", e));

// Test with token
const token = "YOUR_TOKEN_HERE";
fetch("https://api.afnet.my.id/api/bansos-recipients", {
  headers: {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/json"
  }
})
.then(r => r.json())
.then(d => console.log("📦 Response:", d))
.catch(e => console.error("❌ Error:", e));
```

### 2. Network Tab Inspection
1. Buka Chrome DevTools → Network tab
2. Filter: "bansos"
3. Click request `/bansos-recipients`
4. Check:
   - Request URL
   - Request Headers (terutama Authorization)
   - Response status
   - Response body

### 3. AsyncStorage Inspection
```javascript
// Di console
AsyncStorage.getItem('user_token')
  .then(token => console.log("🔑 Token:", token))
  .catch(e => console.error("❌ Error:", e));
```

---

## 📱 QUICK FIX TEST

### Test Screen Sederhana
File `BansosTestScreen.tsx` sudah dibuat. Cara test:

1. **Add to navigation:**
```typescript
// Di App.tsx atau navigation file
import BansosTestScreen from './src/screens/BansosTestScreen';

// Add route
<Stack.Screen name="BANSOS_TEST" component={BansosTestScreen} />
```

2. **Navigate:**
```typescript
navigation.navigate('BANSOS_TEST');
```

3. **Expected Result:**
   - Harus muncul teks "HALO BANSOS"
   - Jika muncul = Component rendering OK
   - Jika blank = Masalah di React Native / Navigation

---

## 🎯 NEXT STEPS

1. **Run app di debug mode**
2. **Buka menu Bansos**
3. **Copy SEMUA console log**
4. **Identifikasi di mana log berhenti**
5. **Screenshot error jika ada**
6. **Share log lengkap ke saya**

---

## 📞 EMERGENCY CONTACT

Jika masih blank setelah semua log dicek:

**Kirimkan:**
1. ✅ Screenshot blank screen
2. ✅ Full console log (copy paste text, bukan screenshot)
3. ✅ Device info (Android/iOS, versi OS)
4. ✅ App version (development/production build)
5. ✅ Network condition (WiFi/data, kuat/lemah)

**Jangan bilang "masih blank" tanpa lampiran log!**

---

**Status:** 🔍 INVESTIGATING - Waiting for debug logs  
**Priority:** 🔴 URGENT  
**Blocking:** Production release
