# 🎮 VULPAX DND - SÜRÜM YAYINLAMA REHBERİ

## 📋 ÖN GEREKLER

### 1. GitHub Personal Access Token Oluştur
1. **GitHub.com** → Sağ üst köşe → **Settings**
2. Sol menüden: **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. **"Generate new token (classic)"** tıkla
4. İsim ver: `vulpax-release`
5. **Yetki seç:** `repo` (tüm repo yetkileri) ✅
6. **Generate token** → Çıkan kodu **KOPYALA ve sakla** (bir kez gösterilir!)

---

## 🚀 YENİ SÜRÜM YAYINLAMA ADIMLARI

### Adım 1: Sürüm Numarasını Güncelle
`package.json` dosyasındaki `version` alanını değiştir:

```json
{
  "version": "1.1.0"
}
```

**Sürüm formatı:** `BÜYÜK.KÜÇÜK.YAMA`
- **BÜYÜK** (1.x.x → 2.x.x): Çok büyük değişiklikler
- **KÜÇÜK** (1.0.x → 1.1.x): Yeni özellikler
- **YAMA** (1.0.0 → 1.0.1): Bug düzeltmeleri

### Adım 2: Token'ı Ayarla (Her Seferinde)
PowerShell'de şu komutu yaz:

```powershell
$env:GH_TOKEN = "ghp_BURAYA_TOKEN_KODUNU_YAZ"
```

> ⚠️ **ÖNEMLİ:** Bu komutu her yeni terminal açtığında tekrar yazman gerekir.
> Kalıcı yapmak istersen: Windows Ortam Değişkenleri'ne `GH_TOKEN` olarak ekle.

### Adım 3: Build + Yayınla (Tek Komut!)

```powershell
cd "W:\Vulpax Dnd"
npm run release
```

Bu komut otomatik olarak:
1. ✅ React kodunu derler (vite build)
2. ✅ Electron .exe oluşturur
3. ✅ `latest.yml` dosyası oluşturur (güncelleme bilgisi)
4. ✅ GitHub'a **Draft Release** olarak yükler

### Adım 4: GitHub'da Yayınla
1. **GitHub.com** → Repo sayfan → **Releases** sekmesi
2. En üstte **"Draft"** olarak gördüğün release'i tıkla
3. Sürüm notlarını yaz (ne değişti?)
4. **"Publish release"** butonuna bas ✅

---

## 🔄 OTOMATİK GÜNCELLEME NASIL ÇALIŞIR?

1. Kullanıcı oyunu açtığında, uygulama **5 saniye sonra** GitHub'daki `latest.yml` dosyasını kontrol eder
2. Yeni sürüm varsa **otomatik indirir** (kullanıcı indirme çubuğunu görür)
3. İndirme bitince **"Şimdi Yükle"** butonu çıkar
4. Kullanıcı tıklarsa uygulama kapanıp yeni sürüm yüklenir
5. Kullanıcı tıklamazsa, uygulama bir sonraki kapanışta otomatik güncellenir

---

## 📝 SÜRÜM NOTLARI (Patch Notes)

Sürüm notları **Supabase `app_versions` tablosunda** saklanır.
Bunları hâlâ Supabase Dashboard'dan elle eklemen gerekiyor:

1. **Supabase Dashboard** → **Table Editor** → `app_versions`
2. **Insert Row:**
   - `version`: `1.1.0`
   - `release_notes`: `Yeni özellikler: ...`
   - `is_active`: `true`
3. Kullanıcılar oyun içinde sol alttaki 📋 butonuna tıklayarak görebilir

---

## ⚡ HIZLI KOMUT ÖZETİ

```powershell
# 1. Token ayarla
$env:GH_TOKEN = "ghp_XXXXX"

# 2. Build + GitHub'a yükle
cd "W:\Vulpax Dnd"
npm run release

# 3. GitHub.com'da Draft Release'i "Publish" yap
```

---

## 🔧 SORUN GİDERME

### "GH_TOKEN is not set" hatası
Token'ı ayarlamadın. `$env:GH_TOKEN = "..."` komutunu yaz.

### "401 Unauthorized" hatası
Token süresi dolmuş veya yanlış. GitHub'dan yeni token oluştur.

### "Cannot publish" hatası
Token'da `repo` yetkisi yok. Yeni token oluştururken `repo` kutusunu işaretle.

### Güncelleme gelmiyor
- GitHub'da release'i "Draft" değil "Published" yaptığından emin ol
- `latest.yml` dosyasının release assets içinde olduğunu kontrol et
- Uygulamanın production build olduğundan emin ol (dev modda updater çalışmaz)

### Sürüm numarası uyuşmuyor
`package.json` içindeki `version` ile GitHub release tag'i aynı olmalı.

---

## 📁 DOSYA YAPISI

```
package.json          → version: "1.x.x" (SÜRÜM NUMARASI BURADAN)
electron/main.js      → autoUpdater (otomatik güncelleme motoru)
electron/preload.js   → IPC bridge (renderer ↔ main iletişimi)
src/components/
  UpdateChecker.jsx   → Güncelleme UI (indirme çubuğu, yükle butonu)
  PatchNotesModal.jsx → Sürüm notları modalı (Supabase'den çeker)
src/screens/
  LobbyScreen.jsx     → Sol alt: "Vulpax © 2026 v1.0.0" + 📋 butonu
```

---

## 🏷️ İLK KEZ YAYIN

İlk yayının öncesinde Supabase'de `app_versions` tablosunu oluşturman gerekir:
1. Supabase Dashboard → SQL Editor
2. `supabase/app_versions.sql` dosyasının içeriğini yapıştır ve çalıştır
