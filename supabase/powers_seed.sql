-- ============================================================
-- VULPAX DND – 30 YENİ GÜÇ KARTI (Kart Sistemi V2)
-- Önce mevcut kartları sil, sonra yenilerini ekle.
-- effect_type: zehir, diriltme, sersemletme, savunma, atak, can, savunmakirici, atakkirici, saldiri
-- ============================================================

-- Mevcut kartları temizle
DELETE FROM public.powers;

INSERT INTO public.powers (name, description, effect_type, effect_value, cost, rarity, image_placeholder) VALUES

-- ===== SALDİRİ KARTLARI (saldiri) =====
('Kılıç Darbesi',       'Düşmana güçlü bir kılıç darbesi indirir.',                     'saldiri', 5,  10, 'common',    '/assets/powers/default.png'),
('Ateş Topu',           'Hedef alana büyük bir ateş topu fırlatır.',                     'saldiri', 12, 20, 'rare',      '/assets/powers/default.png'),
('Yıldırım Çarpması',   'Gökten yıldırım çağırarak hedefe büyük hasar verir.',           'saldiri', 18, 30, 'epic',      '/assets/powers/default.png'),
('Gölge Saldırısı',     'Karanlıktan fırlayan gölge bıçakları ile saldırır.',            'saldiri', 8,  15, 'uncommon',  '/assets/powers/default.png'),
('Ejderha Nefesi',      'Ejderha ateşi ile düşmanı kavurur.',                            'saldiri', 25, 40, 'legendary', '/assets/powers/default.png'),

-- ===== ZEHİR KARTLARI (zehir – 3 tur value hasar) =====
('Zehirli Ok',          'Zehir sürülmüş okla hedefi vurur. 3 tur boyunca hasar verir.',  'zehir', 4, 12, 'common',    '/assets/powers/default.png'),
('Yılan Zehri',         'Ölümcül yılan zehri ile düşmanı zehirler.',                     'zehir', 7, 18, 'uncommon',  '/assets/powers/default.png'),
('Karanlık Veba',       'Büyülü bir veba ile hedefi sarar. 3 tur ağır hasar.',            'zehir', 10, 25, 'rare',     '/assets/powers/default.png'),
('Ölüm Sisi',           'Mor bir sis hedefe yapışır, her tur canını emer.',               'zehir', 14, 35, 'epic',     '/assets/powers/default.png'),

-- ===== SERSEMLETME KARTLARI (sersemletme – 3 tur kart atamaz) =====
('Şok Dalgası',         'Elektrik dalgası ile hedefi 3 tur sersemletir.',                'sersemletme', 0, 15, 'common',    '/assets/powers/default.png'),
('Buz Hapsi',           'Buzdan bir kafese hapseder. 3 tur boyunca hareket edemez.',      'sersemletme', 0, 20, 'uncommon',  '/assets/powers/default.png'),
('Zihin Kontrolü',      'Hedefin zihnini ele geçirir. 3 tur boyunca sersemler.',          'sersemletme', 0, 28, 'rare',      '/assets/powers/default.png'),

-- ===== DİRİLTME KARTLARI (diriltme) =====
('Diriltme Duası',      'Ölmüş bir müttefiki tekrar hayata döndürür.',                   'diriltme', 50, 25, 'rare',      '/assets/powers/default.png'),
('Kutsal Diriliş',      'Tanrısal güçle düşmüş kahramanı tam canla diriltir.',           'diriltme', 100, 40, 'legendary', '/assets/powers/default.png'),

-- ===== CAN KARTLARI (can – hedefin canını artırır) =====
('İyileştirme Işığı',   'Şifalı ışık ile müttefikin canını artırır.',                    'can', 15, 10, 'common',    '/assets/powers/default.png'),
('Doğanın Dokunuşu',    'Doğanın gücü ile derin yaraları iyileştirir.',                  'can', 25, 18, 'uncommon',  '/assets/powers/default.png'),
('Hayat Pınarı',        'Mistik bir pınarın suyuyla büyük iyileşme sağlar.',             'can', 40, 28, 'rare',      '/assets/powers/default.png'),
('Melek Dokunuşu',      'Bir meleğin eli ile hedefi tam sağlığa kavuşturur.',            'can', 60, 38, 'epic',      '/assets/powers/default.png'),

-- ===== SAVUNMA KARTLARI (savunma – kalıcı defense artışı) =====
('Kalkan Duvarı',       'Sihirli kalkan ile savunmayı kalıcı olarak artırır.',           'savunma', 5,  12, 'common',    '/assets/powers/default.png'),
('Demir Zırh',          'Büyülü demir zırh ile savunmayı güçlendirir.',                  'savunma', 8,  18, 'uncommon',  '/assets/powers/default.png'),
('Ejderha Kabuğu',      'Ejderha pullarından zırh oluşturur. Kalıcı savunma.',           'savunma', 12, 30, 'epic',      '/assets/powers/default.png'),

-- ===== ATAK KARTLARI (atak – kalıcı attack artışı) =====
('Savaş Çığlığı',      'Savaş narasıyla müttefikin saldırı gücünü artırır.',            'atak', 5,  12, 'common',    '/assets/powers/default.png'),
('Berserker Öfkesi',    'Kontrolsüz öfke ile saldırı gücü kalıcı artar.',               'atak', 8,  18, 'uncommon',  '/assets/powers/default.png'),
('Titan Gücü',          'Efsanevi titan gücü ile saldırı kalıcı olarak yükselir.',       'atak', 15, 35, 'legendary', '/assets/powers/default.png'),

-- ===== SAVUNMA KIRICI (savunmakirici – kalıcı defense azalması) =====
('Zırh Parçalama',      'Düşmanın zırhını parçalar. Savunma kalıcı düşer.',              'savunmakirici', 5,  14, 'common',    '/assets/powers/default.png'),
('Lanetli Çürüme',      'Karanlık lanet ile savunmayı eritir.',                          'savunmakirici', 8,  20, 'uncommon',  '/assets/powers/default.png'),

-- ===== ATAK KIRICI (atakkirici – kalıcı attack azalması) =====
('Güç Emici',           'Hedefin saldırı enerjisini emer. Atak kalıcı düşer.',           'atakkirici', 5,  14, 'common',    '/assets/powers/default.png'),
('Kol Felci',           'Hedefin kollarını felç eder. Saldırı gücü kalıcı azalır.',      'atakkirici', 8,  20, 'uncommon',  '/assets/powers/default.png');
