# Format Tanggal Announcement & Voting - Update Dokumentasi

## Ringkasan Perubahan
Telah berhasil mengupdate format tanggal pada komponen CardAnnouncement dan CardVoting di aplikasi mobile-warga dari format database ISO String menjadi format yang lebih manusiawi.

## Library yang Digunakan
**date-fns** - Library modern untuk manipulasi tanggal yang lightweight
- Install: `npm install date-fns`
- Locale Indonesia: Sudah include dalam package

## Lokasi File yang Diubah

### 1. Utility Function (BARU)
**File:** `mobile-warga/src/utils/dateFormatter.ts`

Fungsi yang tersedia:
- `formatDate(dateString)` → "16 Maret 2026"
- `formatDateTime(dateString)` → "16 Maret 2026, 23:38"
- `formatDateTimeWithWib(dateString)` → "16 Maret 2026, 23:38 WIB"
- `formatRelativeTime(dateString)` → "2 menit yang lalu", "1 jam yang lalu"
- `formatDateTimeFlexible(dateString, options)` → Fungsi fleksibel dengan options

### 2. Information Screen (Announcement)
**File:** `mobile-warga/src/screens/InformationScreen.tsx`

Perubahan:
- ✅ Import `formatDateTimeFlexible` dari utility
- ✅ Hapus fungsi `formatDate` dan `formatTime` lama
- ✅ Update tampilan tanggal announcement menggunakan relative time
  ```tsx
  <Text style={styles.cardDate}>
    {formatDateTimeFlexible(item.created_at, { showRelative: true })}
  </Text>
  ```
- ✅ Update tampilan end_date menggunakan date only
  ```tsx
  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8, fontStyle: 'italic' }}>
    Berakhir pada: {formatDateTimeFlexible(item.end_date, { showTime: false })}
  </Text>
  ```

### 3. Announcement Detail Screen
**File:** `mobile-warga/src/screens/AnnouncementDetailScreen.tsx`

Perubahan:
- ✅ Import `formatDateTimeFlexible`
- ✅ Update tanggal announcement detail
  ```tsx
  <Text style={styles.date}>
    {formatDateTimeFlexible(announcement.created_at)}
  </Text>
  ```
- ✅ Update tanggal komentar menggunakan relative time
  ```tsx
  <Text style={styles.commentDate}>
    {formatDateTimeFlexible(comment.created_at, { showRelative: true })}
  </Text>
  ```

### 4. Voting Screen
**File:** `mobile-warga/src/screens/VotingScreen.tsx`

Perubahan:
- ✅ Import `formatDateTimeFlexible`
- ✅ Hapus fungsi `formatDate` lama
- ✅ Update tanggal berakhir voting
  ```tsx
  <Text style={styles.pollDate}>
    Berakhir: {formatDateTimeFlexible(item.end_date, { showTime: false })}
  </Text>
  ```

### 5. Home Screen (Announcement Card)
**File:** `mobile-warga/src/screens/HomeScreen.tsx`

Perubahan:
- ✅ Import `formatDateTimeFlexible`
- ✅ Update tanggal announcement card di home
  ```tsx
  <Text style={styles.instaDate}>
    {formatDateTimeFlexible(item.created_at, { showRelative: true })}
  </Text>
  ```

### 6. Swipeable Announcement Modal
**File:** `mobile-warga/src/components/SwipeableAnnouncementModal.tsx`

Perubahan:
- ✅ Import `formatDateTimeFlexible`
- ✅ Hapus fungsi `formatDate` lama
- ✅ Update tanggal di modal
  ```tsx
  <Text style={styles.date}>
    <Feather name="clock" size={12} /> {formatDateTimeFlexible(item.created_at, { showRelative: true })}
  </Text>
  ```

## Format Tanggal Baru

### Sebelumnya (Format Database):
```
2026-03-16T23:38:00.000Z
2026-03-16 23:38:00
```

### Sesudah (Format Manusiawi):

**Relative Time (untuk created_at):**
- "2 menit yang lalu"
- "15 menit yang lalu"
- "1 jam yang lalu"
- "3 jam yang lalu"
- "1 hari yang lalu"
- "2 hari yang lalu"

**Full Date Time (untuk detail):**
- "16 Maret 2026, 23:38"

**Date Only (untuk end_date):**
- "16 Maret 2026"

**Dengan WIB (opsional):**
- "16 Maret 2026, 23:38 WIB"

## Usage Examples

```typescript
import { formatDateTimeFlexible } from '../utils/dateFormatter';

// Relative time (default: show time + relative)
formatDateTimeFlexible('2026-03-16T23:38:00', { showRelative: true })
// Output: "2 menit yang lalu"

// Full datetime
formatDateTimeFlexible('2026-03-16T23:38:00')
// Output: "16 Maret 2026, 23:38"

// Date only
formatDateTimeFlexible('2026-03-16T23:38:00', { showTime: false })
// Output: "16 Maret 2026"

// With WIB suffix
formatDateTimeFlexible('2026-03-16T23:38:00', { showWib: true })
// Output: "16 Maret 2026, 23:38 WIB"
```

## Testing

Untuk test fungsi formatter, jalankan:
```bash
cd mobile-warga
npx ts-node src/utils/testDateFormatter.ts
```

## Benefits

1. **User Experience Lebih Baik**: Tanggal mudah dibaca dan dipahami
2. **Relative Time**: Memberikan konteks waktu yang lebih baik ("baru saja", "5 menit lalu")
3. **Localized**: Menggunakan bahasa Indonesia secara konsisten
4. **Maintainable**: Semua fungsi format terpusat di satu utility file
5. **Flexible**: Mudah mengubah format di masa depan tanpa mengubah setiap component
6. **Lightweight**: date-fns lebih kecil ukurannya dibanding moment.js

## Files Structure

```
mobile-warga/src/
├── utils/
│   ├── dateFormatter.ts          # NEW: Date formatting utilities
│   └── testDateFormatter.ts      # NEW: Test file
├── screens/
│   ├── InformationScreen.tsx     # UPDATED
│   ├── AnnouncementDetailScreen.tsx  # UPDATED
│   ├── VotingScreen.tsx          # UPDATED
│   └── HomeScreen.tsx            # UPDATED
└── components/
    └── SwipeableAnnouncementModal.tsx  # UPDATED
```

## Next Steps (Optional Improvements)

1. **Add timezone support** jika diperlukan untuk user di luar WIB
2. **Custom locale** untuk support multi-language (English, etc.)
3. **Add unit tests** untuk memastikan semua edge cases tertangani
4. **Cache formatting** untuk performance optimization jika ada banyak dates

## Notes

- Semua perubahan backward compatible dengan format database yang ada
- Error handling sudah included untuk invalid dates
- Support berbagai format input dari backend (dengan/spasi, ISO string, etc.)
- Konsisten menggunakan locale Indonesia (`id`)

---
**Tanggal Update:** 16 Maret 2026
**Status:** ✅ SELESAI
