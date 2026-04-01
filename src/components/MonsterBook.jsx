import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = 'https://www.dnd5eapi.co';

const CR_LABELS = { 0: '0', 0.125: '1/8', 0.25: '1/4', 0.5: '1/2' };
function crLabel(cr) { return CR_LABELS[cr] ?? cr; }
function statMod(val) { const m = Math.floor((val - 10) / 2); return m >= 0 ? `+${m}` : `${m}`; }

/* ── Giant TR dictionaries ── */
const MONSTER_TR = {"aboleth":"Abolet","acolyte":"Rahip Çırağı","adult-black-dragon":"Yetişkin Siyah Ejder","adult-blue-dragon":"Yetişkin Mavi Ejder","adult-brass-dragon":"Yetişkin Pirinç Ejder","adult-bronze-dragon":"Yetişkin Bronz Ejder","adult-copper-dragon":"Yetişkin Bakır Ejder","adult-gold-dragon":"Yetişkin Altın Ejder","adult-green-dragon":"Yetişkin Yeşil Ejder","adult-red-dragon":"Yetişkin Kırmızı Ejder","adult-silver-dragon":"Yetişkin Gümüş Ejder","adult-white-dragon":"Yetişkin Beyaz Ejder","air-elemental":"Hava Elementali","ancient-black-dragon":"Kadim Siyah Ejder","ancient-blue-dragon":"Kadim Mavi Ejder","ancient-brass-dragon":"Kadim Pirinç Ejder","ancient-bronze-dragon":"Kadim Bronz Ejder","ancient-copper-dragon":"Kadim Bakır Ejder","ancient-gold-dragon":"Kadim Altın Ejder","ancient-green-dragon":"Kadim Yeşil Ejder","ancient-red-dragon":"Kadim Kırmızı Ejder","ancient-silver-dragon":"Kadim Gümüş Ejder","ancient-white-dragon":"Kadim Beyaz Ejder","androsphinx":"Androsfenks","animated-armor":"Canlı Zırh","ankheg":"Ankheg","ape":"Maymun","archmage":"Büyücübaşı","assassin":"Suikastçı","awakened-shrub":"Uyanmış Çalı","awakened-tree":"Uyanmış Ağaç","axe-beak":"Balta Gaga","azer":"Azer","baboon":"Babun","badger":"Porsuk","balor":"Balor","bandit":"Haydut","bandit-captain":"Haydut Kaptanı","barbed-devil":"Dikenli Şeytan","basilisk":"Basilisk","bat":"Yarasa","bearded-devil":"Sakallı Şeytan","behir":"Behir","berserker":"Berserker","black-bear":"Kara Ayı","black-dragon-wyrmling":"Siyah Ejder Yavrusu","black-pudding":"Kara Pelte","blink-dog":"Işınlanma Köpeği","blood-hawk":"Kan Şahini","blue-dragon-wyrmling":"Mavi Ejder Yavrusu","boar":"Yabandomuzu","bone-devil":"Kemik Şeytan","brass-dragon-wyrmling":"Pirinç Ejder Yavrusu","bronze-dragon-wyrmling":"Bronz Ejder Yavrusu","brown-bear":"Boz Ayı","bugbear":"Öcü Ayı","bulette":"Bulet","camel":"Deve","cat":"Kedi","centaur":"Sentör","chain-devil":"Zincir Şeytanı","chimera":"Kimera","chuul":"Çuul","clay-golem":"Kil Golem","cloaker":"Pelerinli","cloud-giant":"Bulut Devi","cockatrice":"Horozyılan","commoner":"Sıradan Halk","constrictor-snake":"Sıkıcı Yılan","copper-dragon-wyrmling":"Bakır Ejder Yavrusu","couatl":"Kuatl","crab":"Yengeç","crocodile":"Timsah","cult-fanatic":"Kült Fanatiği","cultist":"Kültçü","darkmantle":"Karanlık Örtü","death-dog":"Ölüm Köpeği","deep-gnome-svirfneblin":"Derin Cüce","deer":"Geyik","deva":"Deva","dire-wolf":"Korkunç Kurt","djinni":"Cin","doppelganger":"Doppelganger","draft-horse":"Yük Atı","dragon-turtle":"Ejder Kaplumbağası","dretch":"Dreç","drider":"Drider","drow":"Kara Elf","druid":"Druid","dryad":"Ağaç Perisi","duergar":"Gri Cüce","dust-mephit":"Toz Mefiti","eagle":"Kartal","earth-elemental":"Toprak Elementali","efreeti":"İfrit","elephant":"Fil","elk":"Geyik","erinyes":"Erinyes","ettercap":"Ettercap","ettin":"Ettin","fire-elemental":"Ateş Elementali","fire-giant":"Ateş Devi","flesh-golem":"Et Golem","flying-snake":"Uçan Yılan","flying-sword":"Uçan Kılıç","frog":"Kurbağa","frost-giant":"Buz Devi","gargoyle":"Gargoyl","gelatinous-cube":"Jelatin Küp","ghast":"Gast","ghost":"Hayalet","ghoul":"Hortlak","giant-ape":"Dev Maymun","giant-badger":"Dev Porsuk","giant-bat":"Dev Yarasa","giant-boar":"Dev Yabandomuzu","giant-centipede":"Dev Kırkayak","giant-constrictor-snake":"Dev Sıkıcı Yılan","giant-crab":"Dev Yengeç","giant-crocodile":"Dev Timsah","giant-eagle":"Dev Kartal","giant-elk":"Dev Geyik","giant-fire-beetle":"Dev Ateş Böceği","giant-frog":"Dev Kurbağa","giant-goat":"Dev Keçi","giant-hyena":"Dev Sırtlan","giant-lizard":"Dev Kertenkele","giant-octopus":"Dev Ahtapot","giant-owl":"Dev Baykuş","giant-poisonous-snake":"Dev Zehirli Yılan","giant-rat":"Dev Fare","giant-rat-diseased":"Dev Fare (Hastalıklı)","giant-scorpion":"Dev Akrep","giant-sea-horse":"Dev Denizatı","giant-shark":"Dev Köpekbalığı","giant-spider":"Dev Örümcek","giant-toad":"Dev Kara Kurbağa","giant-vulture":"Dev Akbaba","giant-wasp":"Dev Eşek Arısı","giant-weasel":"Dev Gelincik","giant-wolf-spider":"Dev Kurt Örümceği","gibbering-mouther":"Sayıklayan Ağız","glabrezu":"Glabrezu","gladiator":"Gladyatör","gnoll":"Gnoll","goat":"Keçi","goblin":"Goblin","gold-dragon-wyrmling":"Altın Ejder Yavrusu","gorgon":"Gorgon","gray-ooze":"Gri Balçık","green-dragon-wyrmling":"Yeşil Ejder Yavrusu","green-hag":"Yeşil Cadı","grick":"Grick","griffon":"Grifon","grimlock":"Grimlok","guard":"Muhafız","guardian-naga":"Koruyucu Naga","gynosphinx":"Ginosfenks","half-red-dragon-veteran":"Yarı Kırmızı Ejder Gazisi","harpy":"Harpi","hawk":"Şahin","hell-hound":"Cehennem Tazısı","hezrou":"Hezrou","hill-giant":"Tepe Devi","hippogriff":"Hipogrif","hobgoblin":"Hobgoblin","homunculus":"Homunkülüs","horned-devil":"Boynuzlu Şeytan","hunter-shark":"Avcı Köpekbalığı","hydra":"Hidra","hyena":"Sırtlan","ice-devil":"Buz Şeytanı","ice-mephit":"Buz Mefiti","imp":"İmp","invisible-stalker":"Görünmez Avcı","iron-golem":"Demir Golem","jackal":"Çakal","killer-whale":"Katil Balina","knight":"Şövalye","kobold":"Kobold","kraken":"Kraken","lamia":"Lamia","lemure":"Lemür","lich":"Lich","lion":"Aslan","lizard":"Kertenkele","lizardfolk":"Kertenkelehalk","mage":"Büyücü","magma-mephit":"Magma Mefiti","magmin":"Magmin","mammoth":"Mamut","manticore":"Mantikor","marilith":"Marilit","mastiff":"Mastif","medusa":"Medusa","merfolk":"Denizhalkı","merrow":"Merrou","mimic":"Taklitçi","minotaur":"Minotaur","minotaur-skeleton":"Minotaur İskeleti","mule":"Katır","mummy":"Mumya","mummy-lord":"Mumya Lord","nalfeshnee":"Nalfeshni","night-hag":"Gece Cadısı","nightmare":"Kabus Atı","noble":"Soylu","ochre-jelly":"Sarı Jöle","octopus":"Ahtapot","ogre":"Ogr","ogre-zombie":"Ogr Zombisi","oni":"Oni","orc":"Ork","otyugh":"Otyugh","owl":"Baykuş","owlbear":"Baykuşayı","panther":"Panter","pegasus":"Pegasus","phase-spider":"Faz Örümceği","pit-fiend":"Çukur Şeytanı","planetar":"Planetar","plesiosaurus":"Plesiosaur","poisonous-snake":"Zehirli Yılan","polar-bear":"Kutup Ayısı","pony":"Midilli","priest":"Rahip","pseudodragon":"Sahte Ejder","purple-worm":"Mor Solucan","quasit":"Kuazit","quipper":"Piranha","rakshasa":"Rakshasa","rat":"Fare","raven":"Kuzgun","red-dragon-wyrmling":"Kırmızı Ejder Yavrusu","reef-shark":"Resif Köpekbalığı","remorhaz":"Remorhaz","rhinoceros":"Gergedan","riding-horse":"Binek Atı","roc":"Rüh Kuşu","roper":"Roper","rug-of-smothering":"Boğucu Halı","rust-monster":"Pas Canavarı","saber-toothed-tiger":"Kılıçdişli Kaplan","sahuagin":"Sahuagin","salamander":"Semender","satyr":"Satir","scorpion":"Akrep","scout":"İzci","sea-hag":"Deniz Cadısı","sea-horse":"Denizatı","shadow":"Gölge","shambling-mound":"Sallanan Yığın","shield-guardian":"Kalkan Koruyucu","shrieker":"Çığlıkçı","silver-dragon-wyrmling":"Gümüş Ejder Yavrusu","skeleton":"İskelet","solar":"Solar","specter":"Tayf","spider":"Örümcek","spirit-naga":"Ruh Nagası","sprite":"Peri","spy":"Casus","steam-mephit":"Buhar Mefiti","stirge":"Stirge","stone-giant":"Taş Devi","stone-golem":"Taş Golem","storm-giant":"Fırtına Devi","succubus-incubus":"Sükkübüs/İnkübus","swarm-of-bats":"Yarasa Sürüsü","swarm-of-beetles":"Böcek Sürüsü","swarm-of-centipedes":"Kırkayak Sürüsü","swarm-of-insects":"Böcek Sürüsü","swarm-of-poisonous-snakes":"Zehirli Yılan Sürüsü","swarm-of-quippers":"Piranha Sürüsü","swarm-of-rats":"Fare Sürüsü","swarm-of-ravens":"Kuzgun Sürüsü","swarm-of-spiders":"Örümcek Sürüsü","swarm-of-wasps":"Eşek Arısı Sürüsü","tarrasque":"Tarrasque","thug":"Kabadayı","tiger":"Kaplan","treant":"Ağaç Adam","tribal-warrior":"Kabile Savaşçısı","triceratops":"Triceratops","troll":"Trol","tyrannosaurus-rex":"Tiranozor","unicorn":"Tek Boynuzlu At","vampire-bat":"Vampir (Yarasa)","vampire-mist":"Vampir (Sis)","vampire-spawn":"Vampir Dölü","vampire-vampire":"Vampir","veteran":"Gazi","violet-fungus":"Mor Mantar","vrock":"Vrok","vulture":"Akbaba","warhorse":"Savaş Atı","warhorse-skeleton":"Savaş Atı İskeleti","water-elemental":"Su Elementali","weasel":"Gelincik","werebear-bear":"Ayıkurt (Ayı)","werebear-human":"Ayıkurt (İnsan)","werebear-hybrid":"Ayıkurt (Melez)","wereboar-boar":"Domuzadam (Domuz)","wereboar-human":"Domuzadam (İnsan)","wereboar-hybrid":"Domuzadam (Melez)","wererat-human":"Fareadam (İnsan)","wererat-hybrid":"Fareadam (Melez)","wererat-rat":"Fareadam (Fare)","weretiger-human":"Kaplanadam (İnsan)","weretiger-hybrid":"Kaplanadam (Melez)","weretiger-tiger":"Kaplanadam (Kaplan)","werewolf-human":"Kurtadam (İnsan)","werewolf-hybrid":"Kurtadam (Melez)","werewolf-wolf":"Kurtadam (Kurt)","white-dragon-wyrmling":"Beyaz Ejder Yavrusu","wight":"Kefensiz Ölü","will-o-wisp":"Bataklık Ateşi","winter-wolf":"Kış Kurdu","wolf":"Kurt","worg":"Varg","wraith":"Hayalet Lord","wyvern":"Uçan Yılan","xorn":"Xorn","young-black-dragon":"Genç Siyah Ejder","young-blue-dragon":"Genç Mavi Ejder","young-brass-dragon":"Genç Pirinç Ejder","young-bronze-dragon":"Genç Bronz Ejder","young-copper-dragon":"Genç Bakır Ejder","young-gold-dragon":"Genç Altın Ejder","young-green-dragon":"Genç Yeşil Ejder","young-red-dragon":"Genç Kırmızı Ejder","young-silver-dragon":"Genç Gümüş Ejder","young-white-dragon":"Genç Beyaz Ejder","zombie":"Zombi"};

const SIZE_TR = { Tiny:'Minik', Small:'Küçük', Medium:'Orta', Large:'Büyük', Huge:'Dev', Gargantuan:'Devasa' };
const TYPE_TR = { aberration:'Sapkın', beast:'Canavar', celestial:'Kutsal Varlık', construct:'Yapay', dragon:'Ejderha', elemental:'Elemental', fey:'Peri', fiend:'Şeytan', giant:'Dev', humanoid:'İnsansı', monstrosity:'Ucube', ooze:'Balçık', plant:'Bitki', undead:'Ölümsüz', swarm:'Sürü' };
const ALIGN_TR = { 'lawful good':'Düzenli İyi','neutral good':'Nötr İyi','chaotic good':'Kaotik İyi','lawful neutral':'Düzenli Nötr','neutral':'Nötr','true neutral':'Nötr','chaotic neutral':'Kaotik Nötr','lawful evil':'Düzenli Kötü','neutral evil':'Nötr Kötü','chaotic evil':'Kaotik Kötü','unaligned':'Hizasız','any alignment':'Herhangi','any non-good alignment':'İyi Olmayan','any non-lawful alignment':'Düzenli Olmayan','any chaotic alignment':'Kaotik','any evil alignment':'Kötü' };
const SPEED_TR = { walk:'Yürüme', fly:'Uçma', swim:'Yüzme', burrow:'Kazma', climb:'Tırmanma', hover:'Süzülme' };
const SENSE_TR = { darkvision:'Karanlık Görüşü', blindsight:'Kör Algı', tremorsense:'Titreşim Algısı', truesight:'Gerçek Görüş', passive_perception:'Pasif Algı' };
const COND_TR = { blinded:'Kör', charmed:'Büyülenmiş', deafened:'Sağır', exhaustion:'Yorgunluk', frightened:'Korkmuş', grappled:'Yakalanmış', incapacitated:'Etkisiz', invisible:'Görünmez', paralyzed:'Felçli', petrified:'Taşlaşmış', poisoned:'Zehirlenmiş', prone:'Yere Yığılmış', restrained:'Kısıtlanmış', stunned:'Sersemletilmiş', unconscious:'Bilinçsiz' };
const DMG_TR = { acid:'Asit', bludgeoning:'Ezme', cold:'Soğuk', fire:'Ateş', force:'Güç', lightning:'Yıldırım', necrotic:'Nekrotik', piercing:'Delme', poison:'Zehir', psychic:'Psişik', radiant:'Işıltılı', slashing:'Kesme', thunder:'Gök Gürültüsü' };

function trName(index) { return MONSTER_TR[index] || null; }
function trDmg(s) { const l = s.toLowerCase(); return DMG_TR[l] || s; }
function trDmgList(arr) { return arr.map(d => typeof d === 'string' ? trDmg(d) : d).join(', '); }
function trCond(name) { const l = name.toLowerCase(); return COND_TR[l] || name; }

export default function MonsterBook({ onClose }) {
  const [monsterList, setMonsterList] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [page, setPage] = useState(0);
  const detailRef = useRef(null);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/monsters`);
        const data = await res.json();
        if (!cancelled) {
          setMonsterList(data.results || []);
          setFiltered(data.results || []);
          setListLoading(false);
        }
      } catch { if (!cancelled) setListLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) { setFiltered(monsterList); setPage(0); return; }
    setFiltered(monsterList.filter(m => {
      const tr = MONSTER_TR[m.index] || '';
      return m.name.toLowerCase().includes(q) || tr.toLowerCase().includes(q);
    }));
    setPage(0);
  }, [search, monsterList]);

  const loadDetail = useCallback(async (monster) => {
    if (selected?.index === monster.index && detail) return;
    setSelected(monster);
    setDetail(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/monsters/${monster.index}`);
      const data = await res.json();
      setDetail(data);
    } catch { setDetail(null); }
    setLoading(false);
    if (detailRef.current) detailRef.current.scrollTop = 0;
  }, [selected, detail]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const pageItems = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  return (
    <div className="monster-book-overlay" onClick={onClose}>
      <div className="monster-book" onClick={e => e.stopPropagation()}>
        <div className="monster-book__header">
          <span className="monster-book__title">📕 Canavarlar Kitabı</span>
          <span className="monster-book__count">{filtered.length} canavar</span>
          <button className="monster-book__close" onClick={onClose}>✕</button>
        </div>

        <div className="monster-book__body">
          <div className="monster-book__index">
            <input
              className="monster-book__search"
              placeholder="🔍 Canavar ara (TR/EN)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="monster-book__list vulpax-scroll">
              {listLoading ? (
                <div className="monster-book__loading">Yükleniyor...</div>
              ) : pageItems.length === 0 ? (
                <div className="monster-book__empty">Sonuç bulunamadı</div>
              ) : (
                pageItems.map(m => (
                  <div
                    key={m.index}
                    className={`monster-book__entry ${selected?.index === m.index ? 'monster-book__entry--active' : ''}`}
                    onClick={() => loadDetail(m)}
                  >
                    <span className="monster-book__entry-tr">{MONSTER_TR[m.index] || m.name}</span>
                    {MONSTER_TR[m.index] && <span className="monster-book__entry-en">{m.name}</span>}
                  </div>
                ))
              )}
            </div>
            {totalPages > 1 && (
              <div className="monster-book__pagination">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>◀</button>
                <span>{page + 1} / {totalPages}</span>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>▶</button>
              </div>
            )}
          </div>

          <div className="monster-book__detail vulpax-scroll" ref={detailRef}>
            {!selected && !loading && (
              <div className="monster-book__placeholder">
                <div style={{ fontSize: 48 }}>📖</div>
                <p>Soldan bir canavar seçin</p>
              </div>
            )}
            {loading && (
              <div className="monster-book__placeholder">
                <div className="monster-book__spinner" />
                <p>Yükleniyor...</p>
              </div>
            )}
            {detail && !loading && <MonsterDetail data={detail} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function MonsterDetail({ data }) {
  const {
    index, name, size, type, alignment,
    armor_class, hit_points, hit_dice,
    speed, strength, dexterity, constitution, intelligence, wisdom, charisma,
    proficiencies, damage_vulnerabilities, damage_resistances, damage_immunities,
    condition_immunities, senses, languages, challenge_rating, xp,
    special_abilities, actions, legendary_actions, reactions,
    image,
  } = data;

  const trN = MONSTER_TR[index];
  const sizeTr = SIZE_TR[size] || size;
  const typeTr = TYPE_TR[type] || type;
  const alignTr = ALIGN_TR[alignment?.toLowerCase()] || alignment || '';
  const speedStr = speed ? Object.entries(speed).map(([k, v]) => `${SPEED_TR[k] || k}: ${v}`).join(', ') : '—';
  const acStr = armor_class?.map(a => `${a.value}${a.type && a.type !== 'dex' ? ` (${a.type})` : ''}`).join(', ') || '—';
  const sensesStr = senses ? Object.entries(senses).map(([k, v]) => `${SENSE_TR[k] || k}: ${v}`).join(', ') : null;

  return (
    <div className="monster-detail">
      <div className="monster-detail__name">{trN || name}</div>
      {trN && <div className="monster-detail__name-en">{name}</div>}
      <div className="monster-detail__meta">
        {sizeTr} {typeTr}{alignTr ? `, ${alignTr}` : ''}
      </div>

      {image && (
        <img src={`${API_BASE}${image}`} alt={name} className="monster-detail__image" loading="lazy" />
      )}

      <div className="monster-detail__bar">
        <div><strong>🛡️ Zırh</strong> {acStr}</div>
        <div><strong>❤️ Can</strong> {hit_points} ({hit_dice})</div>
        <div><strong>👟 Hız</strong> {speedStr}</div>
      </div>

      <div className="monster-detail__abilities">
        {[
          ['⚔️ Saldırı', strength],
          ['🏃 Çeviklik', dexterity],
          ['🛡️ Dayanıklılık', constitution],
          ['🧠 Zeka', intelligence],
          ['👁️ Bilgelik', wisdom],
          ['✨ Karizma', charisma],
        ].map(([label, val]) => (
          <div key={label} className="monster-detail__ability">
            <div className="monster-detail__ability-label">{label}</div>
            <div className="monster-detail__ability-val">{val} ({statMod(val)})</div>
          </div>
        ))}
      </div>

      <div className="monster-detail__info">
        {proficiencies?.length > 0 && (
          <div><strong>Yetkinlikler:</strong> {proficiencies.map(p => `${p.proficiency.name} ${p.value >= 0 ? '+' : ''}${p.value}`).join(', ')}</div>
        )}
        {damage_vulnerabilities?.length > 0 && (
          <div><strong>Hasar Zafiyeti:</strong> {trDmgList(damage_vulnerabilities)}</div>
        )}
        {damage_resistances?.length > 0 && (
          <div><strong>Hasar Dayanıklılığı:</strong> {trDmgList(damage_resistances)}</div>
        )}
        {damage_immunities?.length > 0 && (
          <div><strong>Hasar Bağışıklığı:</strong> {trDmgList(damage_immunities)}</div>
        )}
        {condition_immunities?.length > 0 && (
          <div><strong>Durum Bağışıklığı:</strong> {condition_immunities.map(c => trCond(c.name)).join(', ')}</div>
        )}
        {sensesStr && <div><strong>Duyular:</strong> {sensesStr}</div>}
        {languages && <div><strong>Diller:</strong> {languages || 'Yok'}</div>}
        <div><strong>Zorluk Derecesi:</strong> {crLabel(challenge_rating)} ({xp?.toLocaleString()} XP)</div>
      </div>

      {special_abilities?.length > 0 && (
        <div className="monster-detail__section">
          <div className="monster-detail__section-title">⚡ Özel Yetenekler</div>
          {special_abilities.map((a, i) => (
            <div key={i} className="monster-detail__action">
              <strong>{a.name}.</strong> {a.desc}
            </div>
          ))}
        </div>
      )}

      {actions?.length > 0 && (
        <div className="monster-detail__section">
          <div className="monster-detail__section-title">⚔️ Aksiyonlar</div>
          {actions.map((a, i) => (
            <div key={i} className="monster-detail__action">
              <strong>{a.name}.</strong> {a.desc}
            </div>
          ))}
        </div>
      )}

      {reactions?.length > 0 && (
        <div className="monster-detail__section">
          <div className="monster-detail__section-title">🔄 Reaksiyonlar</div>
          {reactions.map((a, i) => (
            <div key={i} className="monster-detail__action">
              <strong>{a.name}.</strong> {a.desc}
            </div>
          ))}
        </div>
      )}

      {legendary_actions?.length > 0 && (
        <div className="monster-detail__section">
          <div className="monster-detail__section-title">🏆 Efsanevi Aksiyonlar</div>
          {legendary_actions.map((a, i) => (
            <div key={i} className="monster-detail__action">
              <strong>{a.name}.</strong> {a.desc}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
