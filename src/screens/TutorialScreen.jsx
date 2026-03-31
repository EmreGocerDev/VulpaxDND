import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CHAPTERS = [
  {
    id: 'intro',
    title: '📖 Giriş',
    content: `
# Vulpax DnD'ye Hoş Geldiniz!

**Vulpax DnD**, gerçek zamanlı çok oyunculu bir dijital masa üstü rol yapma oyunudur (RPG). 
Klasik Dungeons & Dragons deneyimini modern, karanlık ortaçağ temalı bir arayüzde sunar.

## Bu Oyunda Ne Yapabilirsiniz?

- 🎭 **Karakter Seçin** — Savaşçı, büyücü, okçu ve daha fazlası
- 🎲 **Zar Atın** — D4'ten D20'ye kadar tüm zar türleri
- ⚔️ **Savaşın** — Canavarlarla ve boss'larla karşılaşın
- ✨ **Güç Kartları** — Özel yetenekler ve büyüler kullanın
- 🗺️ **Savaş Haritası** — Grid tabanlı taktik savaş
- 💬 **Sohbet** — Gerçek zamanlı yazılı ve sesli iletişim
- 🛒 **Market** — Karakter, güç ve sandık satın alın
- 🏆 **Başarımlar** — Hedeflere ulaşarak ödüller kazanın
    `
  },
  {
    id: 'getting-started',
    title: '🏁 Başlangıç',
    content: `
# Başlangıç Rehberi

## 1. Hesap Oluşturma

Oyuna ilk girdiğinizde **Kayıt Ol** sekmesinden bir hesap oluşturun:
- E-posta adresinizi girin
- Güçlü bir şifre belirleyin
- Kullanıcı adınızı seçin
- **"Kayıt Ol"** butonuna tıklayın

## 2. Lobby (Ana Ekran)

Giriş yaptıktan sonra **Lobby** ekranına gelirsiniz. Burada:
- 📋 Mevcut odaları görebilirsiniz
- ➕ Yeni oda oluşturabilirsiniz
- 🔑 Oda koduyla katılabilirsiniz
- 🛒 Markete gidebilirsiniz
- 👤 Profilinizi düzenleyebilirsiniz

## 3. Oda Oluşturma

Bir oyun başlatmak için:
1. **"Oda Oluştur"** formuna oda ismi yazın
2. **"Oluştur"** butonuna tıklayın
3. Oda kodu otomatik oluşturulur — bunu arkadaşlarınıza paylaşın!

## 4. Odaya Katılma

Arkadaşınızın odasına katılmak için:
- Oda kodunu **"Kod ile Katıl"** alanına girin
- Veya oda listesinden **"Katıl"** butonuna tıklayın
    `
  },
  {
    id: 'characters',
    title: '🎭 Karakterler',
    content: `
# Karakter Sistemi

## Karakter Satın Alma

Marketten (**🛒** butonu) farklı karakterler satın alabilirsiniz:
- Her karakterin kendine özgü **sınıfı**, **sağlığı** ve **nadirliliği** var
- Altınlarınızla satın alın ve envanterinize ekleyin
- **Common** → **Rare** → **Epic** → **Legendary** nadirlik sırasına sahiptir

## Sınıflar

| Sınıf | İkon | Özellik |
|-------|------|---------|
| ⚔️ Savaşçı | Yüksek sağlık, orta saldırı |
| 🔮 Büyücü | Düşük sağlık, yüksek saldırı |
| 🏹 Okçu | Orta sağlık, orta saldırı |
| 💚 Şifacı | Orta sağlık, iyileştirme |
| 🗡️ Hırsız | Düşük sağlık, yüksek hasar |
| 🛡️ Paladin | Yüksek sağlık, orta savunma |

## Karakter Seçimi

Oyunda bir odaya girdiğinizde, **savaş başlamadan** önce envanterinizden bir karakter seçmeniz gerekir.
Seçtiğiniz karakter o oyun boyunca sağlık puanlarınızı ve yeteneklerinizi belirler.
    `
  },
  {
    id: 'combat',
    title: '⚔️ Savaş Sistemi',
    content: `
# Savaş Sistemi

## İnisiyatif

Savaş başladığında, DM **İnisiyatif** atar:
- Her oyuncu için D20 zarı otomatik atılır
- En yüksek sonuçtan en düşüğe doğru sıralanır
- Atacağınız sıra bu şekilde belirlenir

## Zar Atma

Zar tepsisinde 6 farklı zar türü var:
- 🔺 **D4** — 1-4 arası
- 🎯 **D6** — 1-6 arası
- 💎 **D8** — 1-8 arası
- 🔟 **D10** — 1-10 arası
- ⭐ **D12** — 1-12 arası
- 🎲 **D20** — 1-20 arası (en önemli zar!)

### Özel Sonuçlar (D20)
- **Doğal 20** = 💥 KRİTİK! — Çift hasar
- **Doğal 1** = 💨 Fumble! — Yarım hasar

## Hasar Hesaplama

Hasar formülü:
\`Temel Hasar = Saldırı - (Savunma / 2)\`
\`Toplam = (Temel + Güç Bonusu) × Zar Çarpanı\`

## Güç Kartları

Güç kartları savaşta kullandığınız özel yeteneklerdir:
- 🔥 **Hasar** — Düşmana doğrudan hasar
- 💚 **İyileştirme** — Sağlık puanı kazanma
- ⬆️ **Buff** — Geçici güçlenme
- ⬇️ **Debuff** — Düşmanı zayıflatma
- ✨ **Yardımcı** — Özel efektler

### Bekleme Süreleri
Her güç kartının bir bekleme süresi var:
- Common: 15 saniye
- Rare: 30 saniye
- Epic: 45 saniye
- Legendary: 60 saniye
    `
  },
  {
    id: 'battlemap',
    title: '🗺️ Savaş Haritası',
    content: `
# Savaş Haritası

## Grid Sistemi

Savaş haritası 16×16 kare ızgara üzerinde çalışır:
- Her kare bir birim alan temsil eder
- Oyuncular ve canavarlar birer **token** (jeton) olarak gösterilir
- DM arazi ve sis araçlarını kullanabilir

## Token Taşıma

1. Taşımak istediğiniz jetona tıklayın (🎯 seçili gösterilir)
2. Hedefteki hücreye tıklayın
3. Jeton otomatik olarak yeni konuma taşınır

## Arazi Türleri (Sadece DM)

DM aşağıdaki arazi tiplerini haritaya yerleştirebilir:
- 🌿 **Çimen** — Normal alan
- 🌊 **Su** — Engel alanı
- 🪨 **Taş** — Sert zemin
- 🔥 **Lava** — Tehlikeli alan
- 🏜️ **Kum** — Yavaşlatma alanı
- 🌲 **Orman** — Gizlenme alanı

## Sis Sistemi (Fog of War)

DM, **🌫️ Sis** aracıyla haritanın bir kısmını gizleyebilir:
- Oyuncular sisli alanları göremez
- DM sisli alanları yarı saydam görür
- Keşif ilerledikçe DM sisi kaldırabilir
    `
  },
  {
    id: 'monsters',
    title: '👹 Canavarlar',
    content: `
# Canavar Karşılaşma Sistemi

## Canavar Tipleri

| Tier | İsim | Sağlık | Saldırı | XP |
|------|-------|--------|---------|-----|
| 👺 Minion | Goblin | 30 | 8 | 15 |
| 👺 Minion | İskelet Savaşçı | 45 | 12 | 25 |
| 👺 Minion | Dev Örümcek | 40 | 14 | 20 |
| 👺 Minion | Kurt | 55 | 16 | 30 |
| 👹 Standard | Ork | 80 | 18 | 40 |
| 👹 Standard | Büyücü | 60 | 22 | 50 |
| 👹 Standard | Hayalet | 50 | 20 | 35 |
| 👹 Standard | Kaptan | 65 | 15 | 30 |
| 🧌 Elite | Trol | 120 | 20 | 60 |
| 🧌 Elite | Vampir Lord | 100 | 25 | 80 |
| 🧌 Elite | Ejderha Yavrusu | 90 | 24 | 70 |
| 🧌 Elite | Ateş Elementi | 70 | 22 | 55 |
| 👑 Boss | Lich Kral | 150 | 30 | 120 |
| 👑 Boss | Gölge İblisi | 110 | 28 | 90 |
| 👑 Boss | Minotor | 130 | 26 | 100 |

## Canavar Çağırma (DM)

1. Karşılaşma panelinden **tier** seçin (Minion/Standard/Elite/Boss)
2. Kaç canavar çıkacağını belirleyin (1-5)
3. **"⚡ Canavar Çağır"** butonuna tıklayın
4. Canavarlar haritada ve listede görünür

## Saldırma

1. Canavar listesinden hedefinize tıklayın
2. Hasar miktarını girin
3. **"⚔ Saldır"** butonuna tıklayın
4. Canavar savunma değerine göre hasar alır
5. Ölen canavarlar **"💀 Ölüleri Kaldır"** ile temizlenir ve XP kazanırsınız!
    `
  },
  {
    id: 'dm-guide',
    title: '👑 DM Rehberi',
    content: `
# Dungeon Master (DM) Rehberi

## DM Nedir?

**Dungeon Master** (DM), oyunun yöneticisidir. Hikayeyi anlatır, canavarları kontrol eder ve kuralları uygular.

## DM Yetkileri

DM olarak şunları yapabilirsiniz:

### 🎮 Oyun Kontrolü
- Oyunu başlatma ve bitirme
- İnisiyatif atma ve sıra yönetimi

### 👹 Canavar Yönetimi
- Canavar çağırma (tier ve sayı seçimi)
- Karşılaşmaları temizleme

### ❤️ Sağlık Yönetimi
- Oyuncu sağlığını artırma/azaltma
- Durum değiştirme (alive, dead, stunned, poisoned)

### 📋 Not Tutma
- Senaryo notları yazma
- Notları sabitleme ve silme
- Oyun sırasında hızlı not alma

### 🗺️ Harita Kontrolü
- Arazi yerleştirme
- Sis sistemi (fog of war) yönetimi
- Haritayı sıfırlama

### 💬 Anlatım
- DM mesajları gönderme (hikaye metni)
- NPC diyalogları yazma
- Olay açıklamaları

### 💎 Ganimet
- Parti ganimetleri bırakma
- Özel item ekleme
- Ganimet listesini yönetme

## DM İpuçları

1. **Hazırlıklı olun** — Notları önceden yazın
2. **Esnek olun** — Oyuncuların kararlarına uyum sağlayın
3. **Dengeli olun** — Çok kolay veya çok zor yapmayın
4. **Hikaye anlatın** — Sadece mekanik değil, atmosfer de yaratın
5. **Eğlenceyi öncelikli tutun** — Kurallar ikinci planda!
    `
  },
  {
    id: 'market',
    title: '🛒 Market',
    content: `
# Market Sistemi

## Sekmeler

### 🎭 Karakterler
- Farklı sınıf ve nadirlikteki karakterleri satın alın
- Her karakterin kendine özgü istatistikleri var
- Satın alınan karakter otomatik envanterinize eklenir

### ✨ Güç Kartları
- Savaşta kullanabileceğiniz özel yetenekler
- Hasar, iyileştirme, buff, debuff çeşitleri
- Nadirlik arttıkça güç artar

### 📦 Ganimet Sandıkları (Lootbox)
- Rastgele ödüller içerir
- Şans faktörü: %60 Altın, %25 Güç Kartı veya %15 Karakter
- Nadir sandıklar daha iyi ödüller verir

### 🎒 Envanter
- Sahip olduğunuz tüm itemleri görüntüleyin
- Ekipman durumunu değiştirebilirsiniz

## Altın Kazanma

- 🆕 **Kayıt Bonusu** — Yeni hesapta 500 altın
- ⚔️ **Canavar Öldürme** — XP ve altın ödülü
- 📦 **Sandık Açma** — Şansa bağlı altın
- 🎮 **Oyun Oynama** — Aktif katılım ödülleri
    `
  },
  {
    id: 'achievements',
    title: '🏆 Başarımlar',
    content: `
# Başarım Sistemi

## Tüm Başarımlar

| İkon | İsim | Açıklama | Koşul |
|------|------|----------|-------|
| 🗡️ | İlk Kan | İlk düşmanını yendin! | 1 düşman öldür |
| 🎲 | Zar Ustası | 50 zar attın | 50 zar at |
| 👑 | Kritik Kral | 5 doğal 20 attın! | 5 kritik at |
| 💰 | Altın Biriktirici | 1000 altın biriktirdin | 1000 altına ulaş |
| 🤝 | Takım Oyuncusu | 10 oyuna katıldın | 10 oyun oyna |
| 🛒 | Alışveriş Bağımlısı | 10 item satın aldın | 10 satın alma yap |
| 🐉 | Ejderha Avcısı | Boss tier düşman yendin | Boss canavar öldür |
| 💚 | Şifacı | 100 HP iyileştirdin | 100 HP şifa ver |
| 🩸 | Hayatta Kalan | Savaşta 10 HP altında kaldın | 10 HP altına düş |
| ⭐ | Savaş Gazisi | Seviye 10'a ulaştın | LVL 10 |
| 🍀 | Şanslı Avcı | Legendary item buldun! | Efsanevi item aç |
| 💬 | Sohbet Ustası | 100 mesaj gönderdin | 100 mesaj at |

## XP ve Seviye Sistemi

- Canavar öldürme, başarım tamamlama ve savaş katılımıyla XP kazanırsınız
- Her seviye için gereken XP artar: \`100 × 1.5^(seviye-1)\`
- Seviye ilerledikçe daha güçlü olursunuz!
    `
  },
  {
    id: 'voice',
    title: '🎙️ Sesli Sohbet',
    content: `
# Sesli Sohbet Sistemi

## Bağlanma

1. Oyun ekranında sağ alttaki **"🎙 Sesli Sohbet"** bölümünü bulun
2. **"🔌 Bağlan"** butonuna tıklayın
3. Mikrofon izni verin (tarayıcı soracaktır)
4. Bağlantı kurulduktan sonra konuşmaya başlayabilirsiniz

## Kontroller

- 🔇 **Sustur** — Mikrofonunuzu kapatır
- 🔈 **Sağır** — Başkalarının sesini duymazsınız
- 🔌 **Bağlantıyı Kes** — Sesli sohbetten çıkar

## İpuçları

- Gürültülü ortamlarda **sustur** butonunu kullanın
- Bağlantı sorunu yaşarsanız yeniden bağlanmayı deneyin
- Ses seviyesini ayarlar ekranından değiştirebilirsiniz
    `
  },
  {
    id: 'tips',
    title: '💡 İpuçları',
    content: `
# Genel İpuçları ve Stratejiler

## Yeni Oyuncular İçin

1. 🎓 **Marketten başlayın** — İlk karakterinizi ve güç kartlarınızı alın
2. 🎲 **D20'yi tanıyın** — Çoğu önemli karar bu zarla yapılır
3. 💬 **İletişim kurun** — Takım oyunu şarttır
4. 📖 **DM'yi dinleyin** — Hikayeye dikkat edin
5. 💰 **Altınlarınızı akıllıca harcayın** — Her şey hemen alınmaz

## İleri Seviye Taktikler

- ⚔️ **İnisiyatif önemli** — İlk hamle avantajını kullanın
- 🛡️ **Savunma dengesi** — Sadece saldırı değil, hayatta kalmak da önemli
- ✨ **Güç kartı zamanlaması** — Bekleme sürelerini iyi yönetin
- 🗺️ **Pozisyon** — Haritada konumlanma taktik avantaj sağlar
- 🤝 **Takım sinerjisi** — Şifacı + Tank + DPS kombinasyonu güçlüdür

## Sık Sorulan Sorular

**S: Nasıl DM olurum?**
C: Bir oda oluşturduğunuzda otomatik olarak DM olursunuz.

**S: Altın nasıl kazanırım?**
C: Canavar öldürerek, sandık açarak ve oyun oynayarak kazanırsınız.

**S: Karakter değiştirebilir miyim?**
C: Oyun sırasında değiştiremezsiniz, ama yeni oyunda farklı karakter seçebilirsiniz.

**S: Sesli sohbet çalışmıyor?**
C: Mikrofon izni verdiğinizden emin olun. Sorun devam ederse sohbetten çıkıp tekrar bağlanın.

**S: Başka bir dil seçeneği var mı?**
C: Ayarlar ekranından dil değiştirebilirsiniz (şimdilik Türkçe ve İngilizce).
    `
  },
];

export default function TutorialScreen() {
  const navigate = useNavigate();
  const [activeChapter, setActiveChapter] = useState('intro');

  const chapter = CHAPTERS.find((c) => c.id === activeChapter);

  return (
    <div className="screen" style={{ display: 'flex', height: '100%' }}>
      {/* Sidebar */}
      <div className="tutorial-sidebar">
        <div className="tutorial-sidebar__header">
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: 16 }}>
            📚 Oyun Rehberi
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
            ← Geri
          </button>
        </div>
        <div className="tutorial-sidebar__chapters">
          {CHAPTERS.map((ch) => (
            <button
              key={ch.id}
              className={`tutorial-chapter-btn ${activeChapter === ch.id ? 'tutorial-chapter-btn--active' : ''}`}
              onClick={() => setActiveChapter(ch.id)}
            >
              {ch.title}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="tutorial-content">
        {chapter && (
          <div className="tutorial-content__body">
            <SimpleMarkdown content={chapter.content} />
          </div>
        )}
      </div>
    </div>
  );
}

// Simple markdown renderer for the tutorial
function SimpleMarkdown({ content }) {
  const lines = content.trim().split('\n');
  const elements = [];
  let inTable = false;
  let tableRows = [];
  let tableHeaders = [];
  let listItems = [];
  let inList = false;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="tutorial-list">
          {listItems.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      elements.push(
        <table key={`table-${elements.length}`} className="tutorial-table">
          {tableHeaders.length > 0 && (
            <thead>
              <tr>
                {tableHeaders.map((h, i) => (
                  <th key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(h) }} />
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {tableRows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} dangerouslySetInnerHTML={{ __html: inlineFormat(cell) }} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
      tableRows = [];
      tableHeaders = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      flushList();
      flushTable();
      continue;
    }

    // Table
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').filter(Boolean).map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) continue; // separator row
      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Headings
    if (line.startsWith('# ')) {
      flushList();
      elements.push(<h1 key={i} className="tutorial-h1">{line.slice(2)}</h1>);
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={i} className="tutorial-h2">{line.slice(3)}</h2>);
      continue;
    }
    if (line.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={i} className="tutorial-h3">{line.slice(4)}</h3>);
      continue;
    }

    // List items
    if (/^[-*] /.test(line) || /^\d+\. /.test(line)) {
      inList = true;
      listItems.push(line.replace(/^[-*] |^\d+\. /, ''));
      continue;
    }

    flushList();

    // Paragraph
    elements.push(
      <p key={i} className="tutorial-p" dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
    );
  }

  flushList();
  flushTable();

  return <>{elements}</>;
}

function inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}
