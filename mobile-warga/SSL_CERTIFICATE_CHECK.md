# 🔒 SSL CERTIFICATE CHECK - api.afnet.my.id

## 🚨 MENGAPAH INI PENTING?

Di Web browser (Chrome/Firefox), sertifikat HTTPS otomatis trusted.  
Tapi di **Android**, sertifikat harus **EXPLICITLY TRUSTED** atau app akan crash dengan "Network request failed".

---

## ✅ **CHECK SSL CERTIFICATE ONLINE**

### Step 1: Test Certificate Validity

Buka browser dan test:
```
https://www.ssllabs.com/ssltest/analyze.html?d=api.afnet.my.id
```

**Expected Result:**
- Rating: A atau A+
- Certificate Trusted: Yes
- Chain Issues: None
- Android Compatibility: OK

---

### Step 2: Manual Check via Browser

1. **Buka Chrome**
2. **Visit:** `https://api.afnet.my.id/api`
3. **Click icon gembok** di address bar
4. **Check Certificate:**
   - Issuer: Let's Encrypt, DigiCert, atau trusted CA
   - Valid From: Date in the past
   - Valid To: Date in the future
   - Subject: `api.afnet.my.id`

**Jika certificate valid → Browser akan show "Connection is secure"**

---

## 🤖 **ANDROID NETWORK SECURITY CONFIG**

Android memerlukan network security configuration untuk trust certificate tertentu.

### Option A: Trust System Certificates (RECOMMENDED)

File: `android/app/src/main/res/xml/network_security_config.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    
    <!-- Specific domain config -->
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">api.afnet.my.id</domain>
        <pin-set expiration="2025-12-31">
            <!-- Add certificate pins if needed -->
        </pin-set>
    </domain-config>
</network-security-config>
```

### Apply di AndroidManifest.xml:

File: `android/app/src/main/AndroidManifest.xml`

```xml
<application
    android:name=".MainApplication"
    android:label="@string/app_name"
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
    ...
</application>
```

---

### Option B: Allow User-Installed Certificates (For Testing)

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </base-config>
</network-security-config>
```

⚠️ **WARNING:** Only use this for development! Remove before production.

---

## 🧪 **TEST SSL CONNECTIVITY**

### Test 1: Via Terminal (Laptop)

```bash
# Check certificate chain
openssl s_client -connect api.afnet.my.id:443 -showcerts

# Expected output:
# Certificate chain
#  0 s:/CN=api.afnet.my.id
#    i:/C=US/O=Let's Encrypt/CN=R3
# Verify return code: 0 (ok)
```

**If "Verify return code: 0 (ok)" → Certificate valid**  
**If error → Certificate issue**

---

### Test 2: Via Android Device

Install app "HTTP Shortcuts" atau "Postman" di Android, lalu:

1. **Create GET request:** `https://api.afnet.my.id/api/me`
2. **Add header:** `Authorization: Bearer YOUR_TOKEN`
3. **Execute**

**Result:**
- ✅ Success (200 OK) → SSL OK
- ❌ "Unexpected response code" or "Network error" → SSL issue

---

## 🔍 **SYMPTOMS OF SSL ISSUES**

### Android Logcat Output:

```
E/ReactNativeJS: Network request failed
E/ReactNativeJS: TypeError: Network request failed
    at XMLHttpRequest.xhr.onload
W/System.err: javax.net.ssl.SSLHandshakeException: 
    java.security.cert.CertPathValidatorException: 
    Trust anchor for certification path not found.
```

**Translation:** Android tidak trust certificate!

---

## 🛠️ **QUICK FIX FOR TESTING**

### Temporary Disable SSL Verification (DEVELOPMENT ONLY!)

File: `mobile-warga/src/services/api.ts`

```typescript
// ⚠️ WARNING: ONLY FOR TESTING! REMOVE BEFORE PRODUCTION!
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.afnet.my.id/api',
  timeout: 120000,
  headers: {
    'Accept': 'application/json',
  },
});

// ⚠️ DISABLE SSL VALIDATION (TEMPORARY!)
api.defaults.validateStatus = () => true;
api.defaults.httpAgent = new (require('http').Agent)({ rejectUnauthorized: false });
api.defaults.httpsAgent = new (require('https').Agent)({ rejectUnauthorized: false });
```

⚠️ **DANGER:** Ini membuat app vulnerable to MITM attacks!  
✅ **Hanya gunakan untuk testing di development!**

---

## ✅ **PRODUCTION SOLUTION**

### Get Trusted Certificate

1. **Use Let's Encrypt** (FREE & Trusted by Android)
   ```bash
   # Install certbot
   sudo apt-get install certbot
   
   # Get certificate
   certbot certonly --standalone -d api.afnet.my.id
   ```

2. **Or Use Cloudflare SSL** (Already configured if using Cloudflare)
   - Go to Cloudflare Dashboard
   - SSL/TLS → Overview
   - Set to "Full" or "Full (Strict)"

3. **Or Use Commercial Certificate** (DigiCert, Comodo, etc.)

---

## 📋 **VERIFICATION CHECKLIST**

After fixing SSL config:

- [ ] Rebuild Android app
- [ ] Install on device
- [ ] Open Bansos menu
- [ ] Check logcat for SSL errors
- [ ] Verify data loads successfully

**Expected Logcat (No SSL Issues):**
```
🔵 [CHECK ROLE] Fetching /me endpoint...
✅ [CHECK ROLE] Response received: true
🔵 [CHECK ROLE] User role: ADMIN_RT
```

**If Still SSL Issue:**
```
❌ [CHECK ROLE] Error checking role: Network request failed
E/ReactNativeJS: SSLHandshakeException
```

---

## 🎯 **NEXT STEPS**

1. ✅ Test certificate validity online
2. ✅ Add network_security_config.xml
3. ✅ Rebuild Android app
4. ✅ Test on device
5. ✅ Monitor logcat for errors

**Jika masih blank setelah fix ini → Problem bukan SSL, tapi di component rendering.**

---

**Status:** 🔍 WAITING FOR SSL VERIFICATION  
**Priority:** 🔴 HIGH - Common cause of mobile network failures
