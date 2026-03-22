# 🚨 BANSOS BLANK SCREEN - CRITICAL DIAGNOSTIC REPORT

## 🔴 PROBLEM STATUS

**Masalah:** Blank screen di BansosScreen (RT role)  
**Level:** SYSTEM CRASH - Sebelum render  
**Suspect:** Navigation/Router configuration issue  

---

## ✅ FILES CREATED FOR DEBUGGING

### 1️⃣ **Hello World Test Screen**
File: `mobile-warga/src/screens/BansosScreenHelloWorld.tsx`

```typescript
import React from 'react';
import { View, Text, SafeAreaView, StyleSheet } from 'react-native';

export default function BansosScreenHelloWorld() {
  console.log('🔴 [HELLO WORLD] Component rendering...');
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>LAYAR MUNCUL!</Text>
        <Text style={styles.subtitle}>Jika ini muncul = Navigation OK</Text>
        <Text style={styles.info}>Masalahnya BUKAN di file Bansos</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ... more styles
});
```

**Purpose:** Test apakah navigation system bisa render component sama sekali.

---

### 2️⃣ **Humble Version (No Admin Buttons)**
File: `mobile-warga/src/screens/BansosScreenHumble.tsx`

**Status:** Created but ALSO BLANK  
**Conclusion:** Problem BUKAN di admin buttons atau UI components.

---

## 🔍 NAVIGATION CONFIGURATION CHECK

### App.tsx Import Statement:
```typescript
import BansosScreen from './src/screens/BansosScreen'; // ✅ CORRECT
```

### App.tsx Route Registration:
```typescript
{currentScreen === 'BANSOS' && <BansosScreen onNavigate={handleNavigate} />} // ✅ CORRECT
```

### Deep Linking Support:
```typescript
case 'BANSOS':
case 'AID':
  setCurrentScreen('BANSOS');
  return; // ✅ CORRECT
```

**Conclusion:** Navigation configuration tampak correct.

---

## 🎯 TESTING INSTRUCTIONS (WAJIB DILAKUKAN!)

### TEST A: Hello World Screen

**Option 1: Temporary Replace in App.tsx**

```typescript
// Line 47: Ganti import
// SEBELUM:
import BansosScreen from './src/screens/BansosScreen';

// SESUDAH:
import BansosScreenHelloWorld from './src/screens/BansosScreenHelloWorld';
```

**Option 2: Add New Route for Testing**

```typescript
// Tambahkan di App.tsx line 72 (ScreenState type):
type ScreenState = 'LOGIN' | 'HOME' | ... | 'BANSOS_HELLO' | ...

// Tambahkan route rendering di line ~353:
{currentScreen === 'BANSOS_HELLO' && <BansosScreenHelloWorld onNavigate={handleNavigate} />}
```

**Kemudian:**
1. Run app dengan debug mode
2. Login sebagai RT atau Warga
3. Navigate ke menu Bansos (atau BANSOS_HELLO jika pakai Option 2)
4. **LIHAT APAKAH LAYAR MERAH MUNCUL!**

---

### TEST B: Monitor Console Logs

**Terminal Command:**
```bash
cd mobile-warga
npx react-native start --reset-cache
```

**Second Terminal (Watch Logs):**
```bash
# Android
adb logcat | grep -E "ReactNativeJS|BANSOS|HELLO"

# iOS
react-native log-ios
```

**Expected Output jika Normal:**
```
🔴 [HELLO WORLD] Component rendering...
```

**Expected Output jika Crash:**
```
ERROR Invariant Violation: ...
OR
TypeError: Cannot read property '...' of undefined
OR
RedBox: ...
```

---

## 📊 INTERPRETASI HASIL

### Scenario A: Hello World BERHASIL ✅

**Gejala:**
- ✅ Layar merah muncul dengan teks "LAYAR MUNCUL!"
- ✅ Console log: `🔴 [HELLO WORLD] Component rendering...`
- ✅ No errors

**Kesimpulan:**
> **Navigation System OK!**
> **Problem ada di BansosScreen.tsx code!**
> **Ada sesuatu di code yang menyebabkan crash sebelum render.**

**Next Steps:**
1. Restore original BansosScreen import
2. Comment out code di BansosScreen.tsx secara bertahap
3. Identify exact line causing crash
4. Apply fix

---

### Scenario B: Hello World GAGAL ❌

**Gejala:**
- ❌ Tetap blank screen / putih
- ❌ Tidak ada console log sama sekali
- ❌ Atau ada error merah di console

**Kesimpulan:**
> **NAVIGATION SYSTEM YANG RUSAK!**
> **Problem BUKAN di file BansosScreen.tsx!**

**Possible Causes:**
1. ❌ State management crash (currentScreen state issue)
2. ❌ Conditional rendering bug (`currentScreen === 'BANSOS'`)
3. ❌ App.tsx logic error
4. ❌ Context provider issue
5. ❌ Font loading crash (Ionicons, MaterialIcons, Feather)

**Next Steps:**
1. Check App.tsx untuk logic errors
2. Verify currentScreen state initialization
3. Test conditional rendering syntax
4. Check context providers (ThemeContext, LanguageContext, TenantContext)
5. Verify font loading doesn't crash

---

## 🔥 CRITICAL DEBUGGING COMMANDS

### 1. Metro Bundler dengan Reset Cache
```bash
cd mobile-warga
npx react-native start --reset-cache
```

**Watch for errors saat app launch.**

---

### 2. Clear All Caches
```bash
# Clear metro cache
npx react-native start --reset-cache

# Clear watchman (Mac/Linux only)
watchman watch-del-all

# Clear node_modules (if needed)
rm -rf node_modules
npm install
```

---

### 3. Inspect RedBox Error
Jika muncul error merah di laptop/Chrome:
1. **Screenshot seluruh error**
2. **Copy stack trace lengkap**
3. **Note file name dan line number**

Contoh error yang mungkin muncul:
```
Error: Invariant Violation: TurboModuleRegistry.getEnforcing(...): 
'ReactNativeGetFontWeight' could not be found.

Error: TypeError: Cannot read property 'map' of undefined

Error: Invariant Violation: mainModulePrefixes is not defined
```

---

## 🎯 LIKELY CULPRITS (Berdasarkan Gejala)

### 1. Font Loading Crash
File: `App.tsx` lines 75-79

```typescript
const [fontsLoaded] = useFonts({
  ...Ionicons.font,
  ...MaterialIcons.font,
  ...Feather.font,
});
```

**Test:** Comment out sementara dan lihat apakah app load.

---

### 2. Context Provider Issue
File: `App.tsx` structure

```typescript
<ThemeProvider>
  <LanguageProvider>
    <TenantProvider>
      {/* ... */}
    </TenantProvider>
  </LanguageProvider>
</ThemeProvider>
```

**Test:** Check apakah contexts initialize correctly.

---

### 3. State Initialization Bug
File: `App.tsx` line 83

```typescript
const [currentScreen, setCurrentScreen] = useState<ScreenState>('LOGIN');
```

**Test:** Verify ScreenState type includes 'BANSOS'.

---

### 4. Conditional Rendering Crash
File: `App.tsx` line ~353

```typescript
{currentScreen === 'BANSOS' && <BansosScreen onNavigate={handleNavigate} />}
```

**Test:** Change to ternary operator:
```typescript
{currentScreen === 'BANSOS' ? <BansosScreen onNavigate={handleNavigate} /> : null}
```

---

## 📋 ACTION PLAN

### Phase 1: Hello World Test (NOW!)

1. ✅ Apply Test A (replace with HelloWorld)
2. ✅ Run app in debug mode
3. ✅ Monitor console logs
4. ✅ Document result (screenshot + logs)

---

### Phase 2: Analyze Results

**If HelloWorld works:**
- Problem di BansosScreen.tsx code
- Start commenting out sections
- Find exact crash line

**If HelloWorld fails:**
- Problem di navigation system
- Debug App.tsx logic
- Check context providers
- Verify state management

---

### Phase 3: Apply Fix

Based on findings:
- Fix typo/typo in imports
- Fix conditional rendering
- Fix state initialization
- Fix context provider order
- Remove problematic code

---

## 🚨 URGENT REQUEST

**SETELAH TEST HELLO WORLD, KIRIMKAN:**

1. ✅ **Screenshot Layar:**
   - Merah (berhasil) ATAU
   - Putih (gagal)

2. ✅ **Console Log Lengkap:**
   ```
   Copy-paste semua text dari terminal
   ```

3. ✅ **Error Message (jika ada):**
   - Screenshot RedBox error
   - Copy stack trace
   - Note timestamp

4. ✅ **Behavior Observation:**
   - Apakah app crash total?
   - Apakah masih bisa navigate ke screen lain?
   - Apakah login berhasil?

---

## 📞 ESCALATION

Jika setelah Hello World test masih belum ketemu masalahnya:

**Required Information:**
- Full console log (wajib!)
- Screenshot behavior (wajib!)
- Error messages (wajib!)
- Test results (berhasil/gagal?)

**Contact dengan informasi lengkap, JANGAN hanya bilang "masih blank"!**

---

**Status:** 🔴 WAITING FOR HELLO WORLD TEST RESULTS  
**Priority:** 🔴 CRITICAL - Blocking production  
**Next Step:** Run Hello World test → Collect logs → Analyze → Fix

**WAKTUNYA TEST SEKARANG! Jangan build lagi sebelum tahu persis masalahnya!** 🚀
