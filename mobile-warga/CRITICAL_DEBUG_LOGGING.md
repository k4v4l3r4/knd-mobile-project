# 🔍 CRITICAL DEBUG LOGGING - BANSOS API CONNECTIVITY

## ✅ FIXES APPLIED:

### **Fix #1: Debug Logging Added** ✅

**Location:** `BansosScreen.tsx` line 304

```typescript
if (activeTab === 'recipients') {
  console.log('🔵 [DEBUG] Calling Bansos API now...');  // ← ADDED THIS!
  console.log('🔵 [FETCH DATA] Fetching recipients...');
  const response = await api.get('/bansos-recipients');
```

**What This Tells Us:**
- ✅ Jika log muncul → Code mencapai API call
- ❌ Jika log TIDAK muncul → Code tidak sampai ke API call (navigasi/role issue)

---

### **Fix #2: Colors Barrier Removed** ✅

**OLD CODE (BLOCKING):**
```typescript
// ❌ REMOVED: This was preventing render if theme not ready
if (!colors || !colors.primary) {
  return <View>Loading...</View>;
}
```

**NEW CODE (HARDCODED COLORS):**
```typescript
// ✅ HARDCODED COLORS - No dependency on theme context
const primaryColor = '#10b981'; // Emerald 500
const secondaryColor = '#064e3b'; // Emerald 900
const textSecondary = '#6b7280'; // Gray 500
```

**Impact:** Screen akan langsung render tanpa menunggu theme context!

---

### **Fix #3: API Base URL Verified** ✅

**File:** `api.ts` line 7

```typescript
export const BASE_URL = 'https://api.afnet.my.id/api'; // ✅ CORRECT!
```

**Configuration:**
- ✅ Production URL (not localhost)
- ✅ HTTPS enabled
- ✅ Token interceptor active
- ✅ 120s timeout configured

---

## 🎯 EXPECTED CONSOLE OUTPUT:

### **Scenario A: Code Reaches API Call** ✅

```
🔵 [BANSOS SCREEN] Component initializing...
🔵 [BANSOS SCREEN] useEffect triggered
🔵 [CHECK ROLE] Starting...
🔵 [CHECK ROLE] Fetching /me endpoint...
✅ [CHECK ROLE] Response received: true
🔵 [CHECK ROLE] User role: ADMIN_RT
🔵 [FETCH DATA] Starting... activeTab: recipients
🔵 [DEBUG] Calling Bansos API now...           ← CRITICAL LOG!
🔵 [FETCH DATA] Fetching recipients...
```

**Jika ini muncul di console → API CALL BERHASIL DIPANGGIL!**

---

### **Scenario B: Code Tidak Sampai API Call** ❌

```
🔵 [BANSOS SCREEN] Component initializing...
🔵 [BANSOS SCREEN] useEffect triggered
🔵 [CHECK ROLE] Starting...
[NO MORE LOGS...]
```

**Jika ini yang terjadi → checkRole() atau navigasi bermasalah!**

---

## 📋 STEP-BY-STEP TESTING:

### **STEP 1: Start Metro with Reset Cache**

```bash
cd C:\Users\Administrator\knd-rt-online\mobile-warga
npx react-native start --reset-cache
```

**Wait for:**
```
┌──────────────────────────────────────────────────┐
│  Metro waiting on http://localhost:8081          │
└──────────────────────────────────────────────────┘
```

---

### **STEP 2: Enable Remote Debugging**

**On Device/Emulator:**
1. Shake device or press `Ctrl + M`
2. Select **"Debug Remote JS"**
3. Chrome opens automatically

---

### **STEP 3: Open Chrome Console**

**In Chrome:**
1. Press `F12`
2. Click **"Console"** tab
3. Clear console (`Ctrl + Shift + X`)

---

### **STEP 4: Navigate to Bansos Menu**

**In App:**
1. Login as RT admin
2. Tap menu **"Bantuan Sosial"**
3. Watch console closely!

---

### **STEP 5: Check Console Output**

**Look for these logs in order:**

```
1. 🔵 [BANSOS SCREEN] Component initializing...
2. 🔵 [BANSOS SCREEN] useEffect triggered
3. 🔵 [CHECK ROLE] Starting...
4. 🔵 [CHECK ROLE] Fetching /me endpoint...
5. ✅ [CHECK ROLE] Response received: true
6. 🔵 [CHECK ROLE] User role: ADMIN_RT
7. 🔵 [FETCH DATA] Starting... activeTab: recipients
8. 🔵 [DEBUG] Calling Bansos API now...    ← THE CRITICAL ONE!
9. 🔵 [FETCH DATA] Fetching recipients...
10. ✅ [FETCH DATA] Recipients response status: 200
```

---

## 🔍 INTERPRETATION GUIDE:

### **If Log #8 Appears (🔵 [DEBUG] Calling Bansos API now...)**

**Meaning:** ✅ Code successfully reaches the API call!

**Next Steps:**
1. Check server logs at `tail -f storage/logs/laravel.log`
2. Look for incoming request from mobile
3. If server receives request → Network OK!
4. If server NO request → SSL/network blocking

---

### **If Log #8 Does NOT Appear**

**Meaning:** ❌ Code never reaches the API call!

**Possible Causes:**
1. ❌ `checkRole()` crashes before reaching `fetchData()`
2. ❌ `activeTab` not set to `'recipients'`
3. ❌ Early return in render blocks execution
4. ❌ Navigation doesn't complete

**Debug Next:**
- Check if `checkRole()` completes successfully
- Verify `activeTab` value
- Look for errors between logs #6 and #7

---

## 🚨 SERVER LOG MONITORING:

### **On Server (aapanel), Run:**

```bash
tail -f storage/logs/laravel.log | grep -E "POST|GET|bansos"
```

**Expected Output (if API call succeeds):**

```
[2025-03-22 10:15:30] local.DEBUG: GET /api/bansos-recipients  
{"user_id": 45, "role": "ADMIN_RT"}
[2025-03-22 10:15:30] local.INFO: Bansos recipients fetched successfully
```

---

### **If Server Logs Show NOTHING:**

**Diagnosis:** Mobile app TIDAK pernah send request!

**Causes:**
1. ❌ SSL certificate rejected by Android
2. ❌ Network security config missing
3. ❌ Firewall blocking mobile requests
4. ❌ Cloudflare WAF blocking mobile User-Agent

**Solution:** Check network connectivity with test script

---

### **If Server Logs Show REQUEST:**

**Diagnosis:** API call BERHASIL sampai server!

**Next:**
1. Check if controller returns data
2. Verify database query works
3. Check response format matches mobile expectations

---

## 🧪 MANUAL NETWORK TEST (Alternative):

### **Test Script Location:**

File: [`test_bansos_network.js`](c:\Users\Administrator\knd-rt-online\mobile-warga\test_bansos_network.js)

---

### **How to Run:**

1. **Open Chrome Debugger** (Debug Remote JS)
2. **Copy entire file content**
3. **Paste in Chrome Console**
4. **Press Enter**

---

### **Expected Output:**

```
🔵 === BANSOS NETWORK TEST START ===

📡 TEST 1: Basic API Connectivity
✅ API Base URL accessible: 200

🔑 TEST 2: Token Check
Token exists: true
Token preview: eyJhbGciOiJIUzI1NiIs...

👤 TEST 3: User Profile Endpoint
Response status: 200
✅ /me endpoint successful!

📦 TEST 4: Bansos Recipients Endpoint
Response status: 200
✅ Bansos endpoint successful!

🔵 === NETWORK TEST COMPLETE ===
```

---

### **If Test Fails:**

```
❌ Network request failed
TypeError: Network request failed
    at XMLHttpRequest.xhr.onload
```

**Translation:** Android menolak koneksi HTTPS!

**Fix:** Add `network_security_config.xml`

---

## 📊 DIAGNOSTIC DECISION TREE:

```
START: Open Bansos menu
  │
  ├─ Console shows "🔵 [DEBUG] Calling Bansos API now..."
  │   │
  │   ├─ Server logs show request
  │   │   │
  │   │   └─→ ✅ SUCCESS! Backend receives request
  │   │       Fix: Check controller/database
  │   │
  │   └─ Server logs EMPTY
  │       │
  │       └─→ ❌ NETWORK BLOCKED
  │           Fix: SSL/network security config
  │
  └─ Console does NOT show debug log
      │
      ├─ Shows "🔵 [CHECK ROLE] Starting..."
      │   │
      │   └─→ ❌ CRASH IN checkRole() OR fetchData()
      │       Fix: Check error logs between these points
      │
      └─ No logs at all
          │
          └─→ ❌ NAVIGATION ISSUE
              Fix: Check if screen component mounts
```

---

## 🛠️ QUICK FIXES FOR COMMON ISSUES:

### **Issue 1: SSL Certificate Rejected**

**Symptom:** `Network request failed` error

**Fix:** Create `android/app/src/main/res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
```

Then rebuild APK!

---

### **Issue 2: Cloudflare Blocking**

**Symptom:** 403 Forbidden or Cloudflare challenge page

**Fix:** Update axios config in `api.ts`:

```typescript
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'KND-Mobile-App/1.0'  // Add explicit UA
  },
});
```

---

### **Issue 3: Token Not Sent**

**Symptom:** 401 Unauthorized

**Debug:**
```javascript
// In Chrome Console, run:
const token = await AsyncStorage.getItem('user_token');
console.log('Current token:', token);
```

**Fix:** Re-login user to refresh token

---

## 📞 REPORTING CHECKLIST:

After testing, send me:

### **1. Console Logs:**
```
Copy ALL logs from:
🔵 [BANSOS SCREEN] Component initializing...
To last log entry
```

### **2. Server Logs:**
```bash
# Run this on server:
tail -n 50 storage/logs/laravel.log | grep -E "bansos|API"

# Copy output
```

### **3. Observation:**
- [ ] Did debug log appear? YES/NO
- [ ] Did loading spinner show? YES/NO
- [ ] Did data display? YES/NO
- [ ] Any red errors? Screenshot them!

### **4. Device Info:**
- Emulator or Physical device?
- Android version?
- App version/build number?

---

## ✅ SUCCESS CRITERIA:

Test dianggap SUKSES jika:

- [x] Console shows `🔵 [DEBUG] Calling Bansos API now...`
- [x] Server logs show incoming request
- [x] No red errors in console
- [x] Loading spinner appears then data displays
- [x] Admin buttons visible for RT role

---

**Status:** 🔍 READY FOR DEBUGGING  
**Priority:** 🔴 CRITICAL - Need to identify exact failure point  
**Next Step:** RUN TEST AND SEND LOGS IMMEDIATELY!  

**TEST SEKARANG DAN KIRIM HASILNYA!** 🚀
