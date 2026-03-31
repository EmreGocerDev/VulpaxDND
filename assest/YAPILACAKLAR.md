# VULPAX DND – KART & SIRA SİSTEMİ YAPILACAKLAR

## TAMAMEN ANLADIM – İŞTE PLAN:

---

## 1. KART KULLANIM AKIŞI (Onay Diyaloğu)
- Oyuncu karta tıklayınca **hemen DM'e gitmeyecek**
- Önce ekranda "Bu kartı kullanmak istiyor musun?" diyaloğu çıkacak
- Oyuncu **Evet** → hedef oyuncu seçimi yapılacak → DM'e istek gidecek
- Oyuncu **Hayır** → hiçbir şey olmaz, kart seçimi iptal

## 2. SIRA GEÇİŞİ (Kart Onay/Red Sonrası)
- DM kartı **onaylarsa** → efekt uygulanır → sıra otomatik DM'e geçer
- DM kartı **reddederse** → efekt uygulanmaz → sıra yine DM'e geçer
- Her iki durumda da oyuncunun sırası biter

## 3. DM DE KART ATABİLİR
- DM kendine sıra verebilir (mevcut sistem)
- Sıra DM'deyken DM de kart seçip hedef belirleyip kullanabilir
- DM'in attığı kart onay gerektirmez, direkt uygulanır

## 4. HER SIRADA SADECE 1 KART
- Sırası gelen kişi 1 kart seçtikten sonra kart paneli pasif olur (tıklanamaz)
- Kart seçimi yapıldıktan sonra (DM onayı beklenirken) başka kart seçilemez
- Kart kullanmak istemeyen oyuncu için **"Geç" butonu** olacak

## 5. LOG TEMİZLİĞİ (Mükerrer Engelleme)
- DM bir kart isteğini onaylayınca veya reddedince, o log mesajındaki "Onayla/Reddet" butonları kaybolacak
- Böylece aynı kart birden fazla kez onaylanamaz/reddedilemez

## 6. YENİ EFFECT TYPE'LAR
Eski tipler (damage, heal, buff, debuff, utility) kaldırılıyor. Yeni tipler:

| Effect Type      | Açıklama |
|------------------|----------|
| `zehir`          | 3 tur boyunca her tur value kadar hasar |
| `diriltme`       | Ölü karakteri hayata döndürür (DM'e gider) |
| `sersemletme`    | 3 tur boyunca kart atamaz, "Geç" butonu çıkar |
| `savunma`        | Hedefin defense değerini kalıcı olarak +value artırır |
| `atak`           | Hedefin attack değerini kalıcı olarak +value artırır |
| `can`            | Hedefin canını value kadar artırır |
| `savunmakirici`  | Hedefin defense değerini kalıcı olarak -value azaltır |
| `atakkirici`     | Hedefin attack değerini kalıcı olarak -value azaltır |
| `saldiri`        | Hasar = (kartı atan attack + effect_value) - hedef defense. Logda: "15+2-10=7 hasar vuruldu" |

## 7. HEDEF OYUNCU SEÇİMİ
- Kart kullanırken **hedef oyuncu seçilmeli** (kendisi de olabilir)
- Onay diyaloğunda oyuncu listesi dropdown olarak gösterilecek
- Seçilen hedefe göre efekt uygulanacak

## 8. STAT GÖSTERIMI (Base + Bonus)
- Oyuncu kartına tıklayınca açılan detayda:
  - Atak: 10+5 (base + oyun içi bonus) = 15
  - Savunma: 10+3 = 13
- Artık base değer + bonus ayrı gösterilecek

## 9. ZEHİR / SERSEMLETME TUR TAKİBİ
- Zehirlenen oyuncu: 3 tur boyunca her tur başında value kadar hasar
- Sersemletilen oyuncu: 3 tur boyunca kart atamaz, sadece "Geç" butonu
- Tur sayıları room_actions üzerinden broadcast ile takip edilecek

## 10. GEÇ BUTONU
- Her oyuncunun sırasında "Sıramı Geç" butonu olacak
- Sersemletilmiş oyuncular sadece bu butonu görecek (kart paneli pasif)
- Butona basınca sıra DM'e geçer

---

## DATABASE DEĞİŞİKLİKLERİ

### powers tablosu:
- `effect_type` CHECK constraint güncelle: `zehir, diriltme, sersemletme, savunma, atak, can, savunmakirici, atakkirici, saldiri`
- Mevcut kartlar silinecek, 30 yeni kart eklenecek

### room_members tablosu:
- `attack_bonus INTEGER NOT NULL DEFAULT 0` — oyun içi kalıcı atak bonusu
- `defense_bonus INTEGER NOT NULL DEFAULT 0` — oyun içi kalıcı savunma bonusu  
- `poison_turns INTEGER NOT NULL DEFAULT 0` — kalan zehir turu
- `poison_value INTEGER NOT NULL DEFAULT 0` — her tur alınacak zehir hasarı
- `stun_turns INTEGER NOT NULL DEFAULT 0` — kalan sersemletme turu
- `status` CHECK constraint güncelle: `alive, dead, stunned, poisoned, buffed` (mevcut)

### 30 YENİ GÜÇ KARTI
- Her effect type'dan dengeli dağılım
- common, uncommon, rare, epic, legendary rarity'ler

---

## DOSYA DEĞİŞİKLİKLERİ
1. `supabase/migration_fix.sql` — yeni sütunlar + constraint güncellemeleri
2. `supabase/powers_seed.sql` — 30 yeni kart (YENİ DOSYA)
3. `src/screens/GameScreen.jsx` — kart akışı, hedef seçimi, efekt sistemi, stat gösterimi
4. `src/stores/roomStore.js` — yeni member update fonksiyonları
5. `src/styles/global.css` — kart onay diyaloğu, pasif kart stili
