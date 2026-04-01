# Supabase Deep Link Kurulum Rehberi

## Yapılan Değişiklikler

### 1. Şifremi Unuttum Özelliği Eklendi
- Giriş ekranına "🔑 Şifremi Unuttum" butonu eklendi
- Şifre sıfırlama e-postası gönderme özelliği eklendi
- E-posta ile gelen bağlantıdan yeni şifre belirleme ekranı eklendi

### 2. Deep Link Protokolü (`vulpax-dnd://`) Entegrasyonu
- Electron uygulaması artık `vulpax-dnd://` protokolünü destekliyor
- Şifre sıfırlama ve e-posta onaylama için bu protokol kullanılıyor
- Windows ve macOS için tek instance lock eklendi

### 3. Güncellenen Dosyalar
- ✅ `src/stores/authStore.js` - resetPassword ve updatePassword fonksiyonları eklendi
- ✅ `src/screens/AuthScreen.jsx` - Şifremi unuttum UI ve şifre sıfırlama akışı eklendi
- ✅ `electron/main.js` - Deep link handling ve protokol kaydı eklendi
- ✅ `electron/preload.js` - Deep link event handler expose edildi
- ✅ `src/main.jsx` - Deep link listener eklendi
- ✅ `src/lib/supabase.js` - detectSessionInUrl: true ve flowType: 'pkce' olarak güncellendi
- ✅ `package.json` - Protokol tanımlaması eklendi

---

## Supabase Admin Panelinde Yapılması Gerekenler

### 1. Redirect URL'i Ekle

Supabase Dashboard'a git:
1. Projenize giriş yapın
2. **Authentication** → **URL Configuration** sayfasına gidin
3. **Redirect URLs** bölümüne aşağıdaki URL'i ekleyin:
   ```
   vulpax-dnd://auth-callback
   ```
4. **Save** butonuna tıklayın

### 2. Email Template'lerini Kontrol Et (Opsiyonel)

Supabase Dashboard'da:
1. **Authentication** → **Email Templates** sayfasına gidin
2. Şu template'leri kontrol edin:
   - **Confirm signup** - E-posta onaylama
   - **Reset password** - Şifre sıfırlama

Template'lerde `{{ .ConfirmationURL }}` ve `{{ .ResetPasswordURL }}` değişkenleri doğru redirect URL'i kullanacaktır.

---

## Test Etme

### Geliştirme Ortamında Test

1. Uygulamayı geliştirme modunda çalıştırın:
   ```bash
   npm run dev
   ```

2. Giriş ekranında "🔑 Şifremi Unuttum" butonuna tıklayın

3. E-posta adresinizi girin ve şifre sıfırlama e-postası gönderin

4. E-postanızdaki bağlantıya tıklayın (deep link çalışmazsa URL'i manuel kopyalayıp tarayıcıda açın)

### Production Build'de Test

1. Build alın:
   ```bash
   npm run build:win
   ```

2. Kurulum dosyasını çalıştırın (`release/Vulpax DnD Setup X.X.X.exe`)

3. Uygulama kurulduğunda Windows registry'ye `vulpax-dnd://` protokolü otomatik kaydedilecektir

4. E-postadaki şifre sıfırlama bağlantısına tıkladığınızda uygulama otomatik açılmalı

---

## Deep Link Nasıl Çalışır?

1. Kullanıcı "Şifremi Unuttum" butonuna tıklar
2. Supabase, kullanıcının e-posta adresine şifre sıfırlama linki gönderir
3. Link şu formattadır: `vulpax-dnd://auth-callback#access_token=...&type=recovery`
4. Kullanıcı linke tıkladığında:
   - Windows, `vulpax-dnd://` protokolünü tanıyarak uygulamayı açar
   - Electron main process, URL'i yakalar
   - URL, renderer process'e iletilir
   - Hash parametreleri window.location.hash'e set edilir
   - AuthScreen.jsx, hash'i tespit eder ve şifre sıfırlama ekranını gösterir
   - Supabase Auth otomatik olarak session'ı günceller

---

## Sorun Giderme

### Deep Link Çalışmıyor
- Windows'ta registry'de protokolün kayıtlı olduğundan emin olun:
  - Registry editörde `HKEY_CURRENT_USER\Software\Classes\vulpax-dnd` kontrol edin
- Uygulamayı yeniden kurun
- Makineyi yeniden başlatın (bazı durumlarda gerekli olabilir)

### E-posta Gelmiyor
- Supabase Dashboard'da email settings'i kontrol edin
- Spam klasörünü kontrol edin
- Rate limiting'e takılmış olabilirsiniz (çok fazla e-posta gönderme)

### Şifre Sıfırlama Ekranı Açılmıyor
- Browser console'da hataları kontrol edin (F12)
- window.location.hash'in doğru set edildiğinden emin olun
- Supabase auth session'ının geçerli olduğunu kontrol edin

---

## Notlar

- **Production'da test edin**: Deep link özelliği sadece packaged (kurulum dosyası) uygulamada düzgün çalışır
- **Güvenlik**: PKCE flow kullanıyoruz, bu mobil ve desktop uygulamalar için önerilen yöntemdir
- **Session handling**: Supabase otomatik olarak URL'deki token'ları işler ve session oluşturur

---

## İleri Seviye: E-posta Template'lerini Özelleştirme

Supabase Dashboard'da email template'lerini Türkçeleştirebilirsiniz:

**Reset Password Template Örneği:**
```html
<h2>🔑 Şifre Sıfırlama Talebi</h2>
<p>Merhaba,</p>
<p>Hesabınız için şifre sıfırlama talebi aldık.</p>
<p>Yeni şifrenizi belirlemek için aşağıdaki bağlantıya tıklayın:</p>
<p><a href="{{ .ConfirmationURL }}">Şifremi Sıfırla</a></p>
<p>Bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
<p>⚔ Vulpax DnD Ekibi</p>
```

---

## Yayına Alma Checklist

- [ ] Supabase'de `vulpax-dnd://auth-callback` redirect URL'i eklendi
- [ ] package.json'da version güncellendi
- [ ] Production build alındı ve test edildi
- [ ] E-posta template'leri kontrol edildi
- [ ] Deep link işlevselliği test edildi
- [ ] Windows registry'de protokol kaydı kontrol edildi
