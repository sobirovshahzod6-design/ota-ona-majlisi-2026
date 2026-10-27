// Ota-onalar majlisi taqdimoti: data/<sinf>.json dan slaydlar yasaydi.
// URL: deck.html?k=9-B&lang=uz   suflyor: &p=1
const Q = new URLSearchParams(location.search);
const KEY = Q.get('k') || '9-B';
const PRESENTER = Q.get('p') === '1';
let LANG = Q.get('lang') || localGet('lang') || 'uz';
let D = null, SLIDES = [], cur = 0, frag = 0;
const chan = 'BroadcastChannel' in window ? new BroadcastChannel('majlis-' + KEY) : null;

function localGet(k) { try { return localStorage.getItem('majlis.' + k); } catch (e) { return null; } }
function localSet(k, v) { try { localStorage.setItem('majlis.' + k, v); } catch (e) {} }

const t = (uz, ru) => (LANG === 'ru' ? ru : uz);
const f = (x, d = 2) => (x == null ? '—' : Number(x).toFixed(d).replace('.', ','));
const pc = (a, b) => Math.round((100 * a) / b);
const dm = s => s.slice(8, 10) + '.' + s.slice(5, 7);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const subj = uz => (LANG === 'ru' ? (D.subjects.find(s => s.uz === uz) || {}).ru || uz : uz);
const initials = nm => nm.split(' ').slice(0, 2).map(w => w[0]).join('');
const S1 = '#3A5BD9', S2 = '#0F9FCF', S3 = '#C98200';

const TOPIC = {
  food_shop: ['Bufet va do‘kon, bolalarga pul', 'Буфет и магазин, карманные деньги'],
  teaching: ['Dars sifati va ustoz', 'Качество уроков и учитель'],
  homework: ['Uy vazifasi', 'Домашние задания'],
  peers: ['O‘quvchilar o‘rtasidagi munosabat', 'Отношения между учениками'],
  food: ['Ovqat sifati', 'Качество питания'],
  transport: ['Transport', 'Транспорт'],
  events: ['Tadbir, to‘garak, ekskursiya', 'Мероприятия, кружки, экскурсии'],
  other: ['Boshqa', 'Другое'],
  coin_tablet: ['O‘tgan yilgi koin uchun planshet qachon beriladi', 'Когда выдадут планшет за коины прошлого года'],
  bus_fee: ['Qabulda avtobus pullik ekani aytilmagan', 'При поступлении не сказали, что автобус платный'],
  cold: ['Shamollash, tomoq, isitma', 'Простуда, горло, температура'],
  head: ['Bosh og‘rig‘i', 'Головная боль'],
  injury: ['Lat yeyish, jarohat', 'Ушибы, травмы'],
  other_h: ['Boshqa sabablar', 'Другие причины'],
  stomach: ['Qorin og\u2018rig\u2018i, ko\u2018ngil aynishi', 'Боль в животе, тошнота'],
  oliy: ['Oliy toifa', 'Высшая категория'], t1: ['1-toifa', '1-я категория'], t2: ['2-toifa', '2-я категория'], mut: ['Mutaxassis', 'Специалист'],
};
const tr = k => t(...TOPIC[k]);

/* ---------- SVG chart helpers (one y-axis, direct labels, hover tips) ---------- */
function hbars(items, { w = 900, row = 54, max, fmt = v => v, color = S1, lw = 360 } = {}) {
  max = max || Math.max(...items.map(i => i.v));
  const bw = w - lw - 110, h = items.length * row;
  let s = `<svg viewBox="0 0 ${w} ${h}" width="100%" style="max-height:${h}px">`;
  items.forEach((it, k) => {
    const y = k * row, L = Math.max(4, (bw * it.v) / max);
    s += `<g class="hit" data-tip="${esc(it.tip || it.l + ': ' + fmt(it.v))}">
      <rect x="0" y="${y}" width="${w}" height="${row}" fill="transparent"/>
      <text x="${lw - 18}" y="${y + row / 2 + 8}" text-anchor="end" font-size="24" fill="#0d1533">${esc(it.l)}</text>
      <rect x="${lw}" y="${y + 12}" width="${L}" height="${row - 24}" rx="4" fill="${it.c || color}"/>
      <text x="${lw + L + 12}" y="${y + row / 2 + 8}" font-size="24" font-weight="700" fill="#0d1533">${fmt(it.v)}</text></g>`;
  });
  return s + '</svg>';
}

function groupBars(cats, series, { w = 1100, h = 520, min = 0, max = 5, fmt = v => f(v) } = {}) {
  const pl = 110, pb = 70, pt = 30, ch = h - pb - pt, cw = w - pl - 20;
  const gw = cw / cats.length, bw = Math.min(70, (gw - 30) / series.length);
  const Y = v => pt + ch - ((v - min) / (max - min)) * ch;
  let s = `<svg viewBox="0 0 ${w} ${h}" width="100%">`;
  for (let g = 0; g <= 4; g++) {
    const v = min + ((max - min) * g) / 4, y = Y(v);
    s += `<line x1="${pl}" x2="${w - 20}" y1="${y}" y2="${y}" stroke="#DBE6F5" stroke-width="1"/>
      <text x="${pl - 12}" y="${y + 7}" text-anchor="end" font-size="20" fill="#8792ad">${fmt(v)}</text>`;
  }
  cats.forEach((c, i) => {
    const x0 = pl + i * gw + (gw - bw * series.length - 2 * (series.length - 1)) / 2;
    series.forEach((se, j) => {
      const v = se.v[i]; if (v == null) return;
      const x = x0 + j * (bw + 2), y = Y(v);
      s += `<g class="hit" data-tip="${esc(c + ' · ' + se.n + ': ' + fmt(v))}">
        <rect x="${x}" y="${y}" width="${bw}" height="${pt + ch - y}" rx="4" fill="${se.c}"/>
        <text x="${x + bw / 2}" y="${y - 10}" text-anchor="middle" font-size="20" font-weight="700" fill="#0d1533">${fmt(v)}</text></g>`;
    });
    s += `<text x="${pl + i * gw + gw / 2}" y="${h - 30}" text-anchor="middle" font-size="22" fill="#0d1533">${esc(c)}</text>`;
  });
  return s + '</svg>';
}

function dumbbell(items, { w = 1000, row = 50, min = 3.5, max = 5 } = {}) {
  const lw = 320, cw = w - lw - 100, h = items.length * row + 40;
  const X = v => lw + ((v - min) / (max - min)) * cw;
  let s = `<svg viewBox="0 0 ${w} ${h}" width="100%">`;
  for (let v = min; v <= max + 1e-9; v += 0.5) s += `<line x1="${X(v)}" x2="${X(v)}" y1="0" y2="${h - 40}" stroke="#DBE6F5"/><text x="${X(v)}" y="${h - 10}" text-anchor="middle" font-size="20" fill="#8792ad">${f(v, 1)}</text>`;
  items.forEach((it, k) => {
    const y = k * row + row / 2, up = it.b >= it.a, c = up ? '#2E7D0F' : '#B3261E';
    s += `<g class="hit" data-tip="${esc(it.l + ': ' + f(it.a) + ' → ' + f(it.b))}">
      <rect x="0" y="${y - row / 2}" width="${w}" height="${row}" fill="transparent"/>
      <text x="${lw - 18}" y="${y + 8}" text-anchor="end" font-size="23" fill="#0d1533">${esc(it.l)}</text>
      <line x1="${X(it.a)}" x2="${X(it.b)}" y1="${y}" y2="${y}" stroke="${c}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="${X(it.a)}" cy="${y}" r="9" fill="#fff" stroke="#8792ad" stroke-width="3"/>
      <circle cx="${X(it.b)}" cy="${y}" r="10" fill="${c}" stroke="#fff" stroke-width="2"/>
      <text x="${Math.max(X(it.a), X(it.b)) + 18}" y="${y + 8}" font-size="21" font-weight="700" fill="${c}">${up ? '+' : ''}${f(it.b - it.a)}</text></g>`;
  });
  return s + '</svg>';
}

function donut(items, { size = 460, hole = 0.6 } = {}) {
  const tot = items.reduce((a, b) => a + b.v, 0), r = size / 2, ri = r * hole;
  let a0 = -Math.PI / 2, s = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`;
  items.forEach(it => {
    const a1 = a0 + (2 * Math.PI * it.v) / tot, lg = a1 - a0 > Math.PI ? 1 : 0;
    const p = (rr, a) => `${r + rr * Math.cos(a)},${r + rr * Math.sin(a)}`;
    s += `<path class="hit" data-tip="${esc(it.l + ': ' + it.v + ' (' + pc(it.v, tot) + '%)')}" d="M${p(r, a0)} A${r},${r} 0 ${lg} 1 ${p(r, a1)} L${p(ri, a1)} A${ri},${ri} 0 ${lg} 0 ${p(ri, a0)}Z" fill="${it.c}" stroke="#F4F8FF" stroke-width="3"/>`;
    a0 = a1;
  });
  return s + '</svg>';
}

function ring(p, { size = 300, c = '#072BAD', label = '' } = {}) {
  const r = size / 2 - 18, L = 2 * Math.PI * r;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#DBE6F5" stroke-width="26"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${c}" stroke-width="26" stroke-linecap="round" stroke-dasharray="${(L * p) / 100} ${L}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="52%" text-anchor="middle" font-size="${size / 4.2}" font-weight="800" fill="#072BAD">${label || p + '%'}</text></svg>`;
}

/* ---------- slides ---------- */
function foot() {
  return `<div class="foot"><b>BILIMGA TO‘LDIRAMIZ</b><span>DATA ${t('xalqaro maktabi', 'международная школа')} · ${D.k} · ${t('1-chorak yakunlari', 'Итоги 1-й четверти')}</span><span>${t('Manba: Durbin, ', 'Источник: Durbin, ')}${dm(D.asof || '2026-10-27')}.2026</span></div>`;
}
const roleName = () => (D.role === 'rahbar' ? t('Sinf rahbari', 'Классный руководитель') : t('Tyutor', 'Тьютор'));

const OPT = {
  "Ingliz tili chuqur o'rgatilishi": 'Углублённый английский', "Akademik ta'lim sifati": 'Качество обучения', 'Tarbiya va axloq': 'Воспитание и нравственность',
  'Xavfsizlik va nazorat': 'Безопасность и контроль', 'Universitetga / xorijga tayyorlash': 'Подготовка в вуз / за рубеж', 'Zamonaviy sharoit': 'Современные условия',
  'Har bir bolaga individual yondashuv': 'Индивидуальный подход', "Maktab obro'si va natijalari": 'Репутация и результаты школы',
  'Xavfsizlik va muhit': 'Безопасность и среда', 'Ingliz tili zaif edi': 'Слабый английский', "O'qishga qiziqishi past edi": 'Низкий интерес к учёбе',
  'Akademik natijalar past edi': 'Низкие результаты', "Avvalgi maktabda e'tibor yetishmasdi": 'Не хватало внимания в прежней школе', 'Intizom yoki xulq masalasi': 'Дисциплина или поведение',
  "O'ziga ishonchi past edi": 'Низкая уверенность в себе', 'Aniq fanlar / mantiq': 'Точные науки / логика', 'Til va nutq': 'Язык и речь', 'Ijod (rasm, musiqa)': 'Творчество',
  'Sport': 'Спорт', 'Liderlik': 'Лидерство', "Muloqot va do'stlashish": 'Общение и дружба', 'Mustaqillik': 'Самостоятельность', 'Diqqatni jamlash': 'Концентрация',
  "O'ziga ishonch": 'Уверенность в себе', 'Til (ingliz/rus)': 'Язык (англ./рус.)', 'Intizom': 'Дисциплина', 'Muloqot': 'Общение', 'Aniq fanlar': 'Точные науки',
  'Ingliz tili': 'Английский', 'Matematika': 'Математика', 'Informatika / IT': 'Информатика / IT', 'Biologiya': 'Биология', 'Kimyo': 'Химия', 'Iqtisod': 'Экономика',
  'Ona tili / adabiyot': 'Родной язык / литература', 'Texnologiya / IT': 'Технологии / IT', 'Tibbiyot': 'Медицина', 'Biznes / tadbirkorlik': 'Бизнес',
  'Til va tarjima': 'Языки и перевод', 'Huquq': 'Право', 'Muhandislik': 'Инженерия', 'Ilm-fan': 'Наука', "Ta'lim": 'Образование', 'Media / blogging': 'Медиа',
  "San'at va ijod": 'Искусство', 'Xorijda': 'За рубежом', "O'zbekistonda": 'В Узбекистане', 'Hali aniq emas': 'Пока не решил(а)',
  "Ha, lekin ko'p ishlashim kerak": 'Да, но нужно много работать', 'Ha, ishonchim komil': 'Да, уверен(а)', 'Bilmayman': 'Не знаю', "Ishonchim yo'q": 'Не уверен(а)',
  'IELTS (ingliz tili)': 'IELTS', 'SAT': 'SAT', 'IT sertifikati': 'IT-сертификат', 'Milliy sertifikat': 'Национальный сертификат', 'HSK (xitoy tili)': 'HSK', 'TOPIK (koreys tili)': 'TOPIK', 'TOEFL': 'TOEFL',
  '1–2 soat': '1–2 часа', "3 soat va undan ko'p": '3 часа и больше', '30 daqiqagacha': 'до 30 минут', 'Deyarli 0': 'Почти 0',
  'Ha, juda tayyorman': 'Да, очень готов(а)', 'Ha, biroz': 'Да, немного', "Hozircha ishonchim yo'q": 'Пока не уверен(а)',
  'Sertifikatga tayyorgarlik': 'Подготовка к сертификату', 'Universitet tanlash': 'Выбор вуза', "Kasb/yo'nalish tanlash": 'Выбор профессии',
  "O'qish rejasini tuzish": 'План обучения', 'Fan repetitori': 'Репетитор', 'Motivatsiya / maqsad': 'Мотивация / цель',
};
const opt = s => (LANG === 'ru' ? OPT[s] || s : s);
const twoName = nm => esc(nm);
const bldShort = b => (/qizlar/i.test(b) ? t('Qizlar', 'Девочки') + (/qamish/i.test(b) ? ' 1' : ' 2') : t('O\u2018g\u2018il bolalar', 'Мальчики'));

function build() {
  const sub = D.subjects.filter(s => s.n > 0);
  const g = D.grades, att = D.att, R = D.returning, par = D.parallel;
  const lessons = D.subjects.filter(s => s.src === 'sinf').reduce((a, s) => a + s.lessons, 0);
  const famPct = pc(D.app.families, D.n), schoolFam = pc(D.app_school.families, D.app_school.students);
  const worstExam = D.exams.length ? D.exams.slice().sort((a, b) => a.av - b.av)[0] : null;
  const bestExam = D.exams.length ? D.exams.slice().sort((a, b) => b.av - a.av)[0] : null;
  const NG = D.no_grades, INC = D.inclusive, upper = D.level >= 5;
  const subjT = s => (LANG === 'ru' ? (D.subjects.find(x => x.uz === s || x.base === s) || {}).ru || s : s);
  const ps = D.psurvey, ss = D.ssurvey, Q = D.qabul, QS = D.qabul_school, L = D.library, DS = D.dorm.students;
  const card = (h, body, extra = '') => `<div class="card ${extra}"><h3 style="font-size:28px;color:var(--navy);margin-bottom:10px">${h}</h3>${body}</div>`;
  const optBars = (arr, n, c = S1, lw = 420, w = 820, row = 58) => hbars(arr.map(([o, v]) => ({ l: opt(o), v, c, tip: `${opt(o)}: ${v} / ${n}` })), { w, row, lw, max: n });

  SLIDES = [
    { dark: true, html: () => `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <img src="assets/img/data-logo-white.png" alt="DATA" style="height:64px">
        <span class="chip" style="background:var(--cyan);color:var(--navy);font-size:24px">${t('OTA-ONALAR MAJLISI', 'РОДИТЕЛЬСКОЕ СОБРАНИЕ')}</span></div>
      <div style="margin-top:auto">
        <div class="kicker">${t('1-chorak yakunlari · 03.09 – 03.11.2026', 'Итоги 1-й четверти · 03.09 – 03.11.2026')}</div>
        <h1 style="font-size:220px;margin:20px 0 10px">${D.k} ${t('sinf', 'класс')}</h1>
        <div class="sub" style="font-size:38px">${roleName()}: ${esc(D.lead)} · ${D.n} ${t('o‘quvchi', 'учеников')}</div></div>
      <img src="assets/img/dubi/salom.png" alt="" style="position:absolute;right:120px;bottom:90px;height:560px">`,
      notes: () => t('Salomlashing va o‘zingizni tanishtiring. Majlis 60 daqiqa: 40 daqiqa taqdimot, 20 daqiqa savol-javob. Oxirida har bir oila farzandi haqida shaxsiy hisobot oladi va dars yozuvi bo‘yicha rozilik hujjatini imzolaydi.',
        'Поприветствуйте родителей и представьтесь. Собрание 60 минут: 40 минут презентация, 20 минут вопросы. В конце каждая семья получит личный отчёт о ребёнке и подпишет согласие на запись уроков.') },

    { html: () => `<div class="kicker">${t('Kun tartibi', 'Повестка')}</div><h2>${t('Bugun nimalar haqida gaplashamiz', 'О чём поговорим сегодня')}</h2>
      <div class="grid3" style="margin-top:40px;grid-template-columns:repeat(5,1fr)">
      ${[[t('Siz va biz', 'Вы и мы'), t('Kutishlaringiz, so‘rovnoma, qabul bo‘limi bahosi', 'Ваши ожидания, опрос, оценка приёмной')],
         [t('Natijalar', 'Результаты'), t('O‘sish, fanlar, GPA, progress imtihon, ustozlar', 'Рост, предметы, GPA, прогресс-экзамен, учителя')],
         [t('Yutuqlar', 'Достижения'), t('Eng yaxshilar, fan yulduzlari, koinlar', 'Лучшие, звёзды предметов, коины')],
         [t('Hayot va xavfsizlik', 'Жизнь и безопасность'), (D.logoped ? t('Davomat, dars yozuvi, intizom, sog‘liq, logoped, kitoblar', 'Посещаемость, запись уроков, дисциплина, здоровье, логопед, учебники') : t('Davomat, dars yozuvi, intizom, sog‘liq, kitoblar', 'Посещаемость, запись уроков, дисциплина, здоровье, учебники'))],
         [t('Keyingi qadam', 'Следующие шаги'), t('Durbin ilovalari, 2-chorak rejasi, savollar', 'Приложения Durbin, план 2-й четверти, вопросы')]]
        .map((x, i) => `<div class="card frag"><div class="big" style="font-size:80px;color:var(--cyan)">0${i + 1}</div><h3 style="font-size:34px;margin:16px 0 10px;color:var(--navy)">${x[0]}</h3><p class="note" style="color:var(--ink2)">${x[1]}</p></div>`).join('')}
      </div>`,
      notes: () => t('Besh blok. Ota-onalarga savollarni yozib borishni taklif qiling, oxirida javob berasiz.', 'Пять блоков. Предложите записывать вопросы, ответите в конце.') },

    { when: () => INC, dark: true, html: () => { const sp = D.subjects.filter(s => /tasavvur|tuyish|maishiy|gimnastika/i.test(s.uz)); return `<div class="kicker">${t('Inklyuziv ta‘lim', 'Инклюзивное обучение')}</div>
      <h2>${t('Har bir bola uchun alohida yo‘l', 'Свой путь для каждого ребёнка')}</h2>
      <p class="sub" style="max-width:1500px">${t(`${D.k} sinfida ko‘zi ojiz va zaif ko‘ruvchi bolalar umumiy dastur bilan birga maxsus mashg‘ulotlarda o‘qiydi. Bu DATA xalqaro maktabining faxri.`, `В классе ${D.k} незрячие и слабовидящие дети учатся по общей программе и на специальных занятиях. Это гордость DATA.`)}</p>
      <div class="kpis" style="margin-top:40px;grid-template-columns:repeat(4,1fr)">
        <div class="kpi c"><b style="color:#fff">${f(att.pct, 1)}%</b><span style="color:#CDEFFD">${t('davomat: maktabdagi eng yuqori ko‘rsatkich', 'посещаемость: лучшая в школе')}</span></div>
        <div class="kpi g"><b style="color:#fff">${f(g.avg)}</b><span style="color:#CDEFFD">${t(`o‘rtacha baho · ${g.n} ta baho`, `средний балл · ${g.n} оценок`)}</span></div>
        <div class="kpi"><b style="color:#fff">${sp.reduce((a, s) => a + s.lessons, 0)}</b><span style="color:#CDEFFD">${t('maxsus mashg‘ulot o‘tildi', 'специальных занятий проведено')}</span></div>
        <div class="kpi y"><b style="color:#fff">${t('Shanba', 'Суббота')}</b><span style="color:#CDEFFD">${t('ota-onalar bilan muntazam uchrashuv', 'регулярные встречи с родителями')}</span></div></div>
      <div class="grid4" style="margin-top:30px">${sp.map(s => `<div class="card frag"><h3 style="font-size:26px;color:#fff">${subjT(s.uz)}</h3><p class="note">${s.lessons} ${t('mashg‘ulot', 'занятий')}</p></div>`).join('')}</div>`; },
      notes: () => t('Inklyuziv ta‘limni yutuq sifatida taqdim eting. Maxsus mashg‘ulotlar: predmet tasavvuri, teri sezgisi va qo‘l motorikasi, ijtimoiy-maishiy yo‘naltirish, davolash gimnastikasi. Shanba kunlari ota-onalar bilan uchrashuvlar davom etadi.',
        'Подайте инклюзивное обучение как достижение. Специальные занятия: предметные представления, осязание и мелкая моторика, социально-бытовая ориентировка, лечебная гимнастика. Встречи с родителями по субботам продолжаются.') },

    { html: () => `<div class="kicker">${t('Sinf bir qarashda', 'Класс в цифрах')}</div><h2>${t(`1-chorakda ${D.k} sinfi`, `Класс ${D.k} в 1-й четверти`)}</h2>
      <div class="kpis" style="margin-top:50px">
        <div class="kpi frag"><b>${D.n}</b><span>${t('o‘quvchi', 'учеников')}<br>${R.n ? t(`${R.n} nafari o‘tgan yildan beri DATA’da`, `${R.n} учатся в DATA с прошлого года`) : t('hammasi yangi kelgan', 'все пришли в этом году')}</span></div>
        ${NG ? `<div class="kpi g frag"><b>${D.coins_total}</b><span>${t('koin (rag‘bat)', 'коинов (поощрений)')}<br>${t('ustozlardan', 'от учителей')}</span></div>` : `<div class="kpi g frag"><b>${f(g.avg)}</b><span>${t('o‘rtacha baho', 'средний балл')}<br>${g.n.toLocaleString('ru')} ${t('ta bahodan', 'оценок')}</span></div>`}
        <div class="kpi c frag"><b>${f(att.pct, 1)}%</b><span>${t('davomat', 'посещаемость')}<br>${t('maktab bo‘yicha', 'по школе')} ${f(D.school_att, 1)}%</span></div>
        <div class="kpi frag"><b>${lessons}</b><span>${t('o‘tilgan dars', 'проведённых уроков')}<br>${t('sinf jadvali bo‘yicha', 'по расписанию класса')}</span></div>
        <div class="kpi y frag"><b>${D.teachers_sum.n}</b><span>${t('ustoz sinfda dars beradi', 'учителей ведут уроки')}<br>${t('o‘rtacha tajriba', 'средний стаж')} ${f(D.teachers_sum.exp_avg, 1)}</span></div>
      </div>
      <div class="card frag" style="margin-top:40px;font-size:30px;line-height:1.45;border-left:8px solid var(--cyan)">
        ${NG ? t('1-sinfda asosiy fanlardan baho qo‘yilmaydi: natija koin, ustoz izohi va sinf rahbari kuzatuvi orqali ko‘rinadi.', 'В 1 классе по основным предметам оценки не ставятся: результат виден через коины, комментарии учителей и наблюдения классного руководителя.')
          : t(`Baholarning ${pc(g.g5, g.n)}% i "5". Oktabrda o‘rtacha baho sentabrga nisbatan ${g.oct >= g.sep ? `${f(g.oct - g.sep)} ga oshdi` : `${f(g.sep - g.oct)} ga pasaydi`}.`, `${pc(g.g5, g.n)}% оценок — «5». В октябре средний балл ${g.oct >= g.sep ? `вырос на ${f(g.oct - g.sep)}` : `снизился на ${f(g.sep - g.oct)}`} по сравнению с сентябрём.`)}</div>`,
      notes: () => t(`Umumiy rasm. Raqamlar Durbindan, ${dm(D.asof)} holatiga. Baholar sinf va kurs jurnallaridan birga olingan.`, `Общая картина. Цифры из Durbin на ${dm(D.asof)}. Оценки из классного и курсового журналов вместе.`) },

    { when: () => !!ps, html: () => `<div class="kicker">${t('Siz bilan so‘rovnoma', 'Опрос родителей')}</div><h2>${t('Nega DATA’ni tanladingiz va nimadan xavotirda edingiz', 'Почему вы выбрали DATA и что вас беспокоило')}</h2>
      <p class="note">${t(`Sinf bo‘yicha ${ps.n} ta javob · maktab bo‘yicha ${D.school_nresp} ta javob (oktabr 2026)`, `${ps.n} ответов по классу · ${D.school_nresp} по школе (октябрь 2026)`)}</p>
      <div class="body" style="margin-top:16px"><div class="col">${card(t('Tanlash sabablari', 'Причины выбора'), optBars(ps.reasons, ps.n, S1, 440, 820, 104))}</div>
      <div class="col">${card(t('Kelishdan oldingi xavotirlar', 'Опасения до поступления'), optBars(ps.concerns, ps.n, S3, 440, 820, 120))}</div></div>`,
      notes: () => t('Bu ota-onalarning o‘z javoblari. Tanlash sabablarini o‘qing va "biz shu va’dalarni bajaryapmiz" degan fikrni keyingi slaydlardagi raqamlar bilan bog‘lang.', 'Это ответы самих родителей. Прочитайте причины выбора и свяжите их с цифрами на следующих слайдах: «мы выполняем эти обещания».') },

    { when: () => !!ps, html: () => { const o = ps.open || {}; const th = [['res', t('Yaxshi baho va bilim', 'Хорошие оценки и знания')], ['conf', t('O‘ziga ishonch', 'Уверенность в себе')], ['eng', t('Ingliz tili', 'Английский язык')], ['math', t('Matematika', 'Математика')], ['rus', t('Rus tili', 'Русский язык')], ['fut', t('Sertifikat, universitet', 'Сертификат, вуз')], ['indep', t('Mustaqil o‘qish', 'Самостоятельность')], ['chr', t('Tarbiya va intizom', 'Воспитание и дисциплина')]].filter(([k]) => o[k] > 0).sort((a, b) => o[b[0]] - o[a[0]]).slice(0, 6);
      return `<div class="kicker">${t('A nuqta: sizning kutishingiz', 'Точка А: ваши ожидания')}</div><h2>${t('"Yil oxirida nima o‘zgarsa, to‘g‘ri tanlov qildim deysiz?"', '«Что должно измениться к концу года, чтобы вы сказали: выбор верный?»')}</h2>
      <div class="body"><div class="col">${card(t(`Ochiq javoblardagi mavzular (${o.n || 0} ta javob)`, `Темы открытых ответов (${o.n || 0})`), hbars(th.map(([k, l]) => ({ l, v: o[k], c: S2 })), { w: 820, row: 86, lw: 380 }))}</div>
      <div class="col">${(o.quotes || []).slice(0, 2).map(q => `<div class="card frag" style="font-size:28px;line-height:1.45;border-left:8px solid var(--cyan)"><span style="font-size:60px;color:var(--cyan);line-height:0;vertical-align:-24px">“</span>${esc(q)}</div>`).join('')}
        <p class="note">${t('Ota-onalar so‘zi, asl holida, ismsiz.', 'Слова родителей в оригинале, без имён.')}</p></div></div>`; },
      notes: () => t('Bu bizning "A nuqta"miz: ota-onalar nimani kutayotgani. Shu kutishlarni yil davomida o‘lchab boramiz. Iqtiboslarni ovoz chiqarib o‘qing.', 'Это наша «точка А»: чего ждут родители. Мы будем измерять эти ожидания весь год. Зачитайте цитаты вслух.') },

    { when: () => !!ps, html: () => `<div class="kicker">${t('Farzandingizni qanday ko‘rasiz', 'Каким вы видите ребёнка')}</div><h2>${t('Kuchli tomonlar va qo‘llab-quvvatlash kerak joylar', 'Сильные стороны и где нужна поддержка')}</h2>
      <div class="body"><div class="col">${card(t('Kuchli tomonlari', 'Сильные стороны'), optBars(ps.strengths, ps.n, '#2E7D0F', 400, 820, 104))}</div>
      <div class="col">${card(t('Ko‘proq qo‘llab-quvvatlash kerak', 'Нужна поддержка'), optBars(ps.support, ps.n, S1, 400, 820, 104))}</div></div>
      <div class="card frag" style="margin-top:24px;font-size:26px;border-left:8px solid var(--cyan)">${t(`Eng ko‘p tanlangan yo‘nalish: "${opt(ps.support[0] ? ps.support[0][0] : '')}". Uyda va maktabda birga ishlaymiz.`, `Чаще всего выбирали: «${opt(ps.support[0] ? ps.support[0][0] : '')}». Работаем вместе дома и в школе.`)}</div>`,
      notes: () => t('Ota-onalar aytgan kuchli tomonlarni maqtang. Qo‘llab-quvvatlash kerak bo‘lgan eng ko‘p tanlangan yo‘nalishni 2-chorak rejasi bilan bog‘lang.', 'Похвалите сильные стороны, названные родителями. Самое частое «нужна поддержка» свяжите с планом 2-й четверти.') },

    { html: () => `<div class="kicker">${t('A nuqta → hozirgi nuqta', 'Точка А → сейчас')}</div><h2>${t('Qayerdan boshladik va qayerdamiz', 'С чего начали и где мы сейчас')}</h2>
      <div class="body"><div class="col" style="flex:1.2">
          <div class="seg" id="aSrc"><button class="on" data-a="w2">${t('Birinchi 2 hafta', 'Первые 2 недели')}</button><button data-a="q4">${t('O‘tgan yil 4-chorak', 'Прошлый год, 4 четв.')}</button><button data-a="exp">${t('Ota-ona kutishi', 'Ожидания родителей')}</button></div>
          <div class="card" id="aBox" style="flex:1;display:flex;align-items:center;gap:60px"></div></div></div>`,
      init: el => {
        const box = el.querySelector('#aBox');
        const pair = (A, B, la, lb, note) => `<div style="text-align:center"><div class="lbl">${la}</div><div class="big" style="color:#8792ad">${f(A)}</div></div>
            <svg width="220" height="60" viewBox="0 0 220 60" aria-hidden="true"><path d="M0 30 H190 M170 10 L200 30 L170 50" stroke="${B >= A ? '#2E7D0F' : '#C98200'}" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <div style="text-align:center"><div class="lbl">${lb}</div><div class="big">${f(B)}</div></div><div style="flex:1;font-size:27px;line-height:1.45;color:var(--ink2)">${note}</div>`;
        const show = a => {
          el.querySelectorAll('#aSrc button').forEach(b => b.classList.toggle('on', b.dataset.a === a));
          if (a === 'w2') box.innerHTML = pair(g.first2w, g.oct, t('03–16 sentabr', '03–16 сентября'), t('Oktabr', 'Октябрь'), t('Sinf o‘rtacha bahosi. Birinchi ikki hafta bolalar ta’tildan keyin moslashadi, shuning uchun bu boshlang‘ich nuqta.', 'Средний балл класса. Первые две недели — адаптация после каникул, поэтому это стартовая точка.'));
          if (a === 'q4') box.innerHTML = R.n ? pair(R.q4, R.now, t(`O‘tgan yil 4-chorak (${R.n} o‘quvchi)`, `4-я четв. прошлого года (${R.n} уч.)`), t('1-chorak', '1-я четверть'),
            t(`Faqat o‘tgan yil ham DATA’da o‘qigan ${R.n} o‘quvchi. ${R.n} tadan ${R.up} nafarida o‘rtacha baho o‘tgan yilgi darajada yoki undan yuqori. Yangi sinfda fanlar murakkablashadi, birinchi chorakda biroz pasayish odatiy.`, `Только ${R.n} учеников, учившихся в DATA в прошлом году. У ${R.up} из ${R.n} средний балл на уровне прошлого года или выше. В новом классе предметы сложнее, небольшое снижение в 1-й четверти обычно.`))
            : `<div class="sub">${t('Sinfdagi o‘quvchilar bu yil DATA’ga kelgan: boshlang‘ich nuqta sifatida birinchi 2 hafta olinadi.', 'Ученики пришли в DATA в этом году: стартовая точка — первые 2 недели.')}</div>`;
          if (a === 'exp') box.innerHTML = `<div class="sub" style="font-size:30px">${ps ? t(`Oktabrdagi so‘rovnomada ${ps.n} ta oila kutishini yozdi. Eng ko‘p kutilgani: ${ps.support.slice(0, 3).map(x => opt(x[0]).toLowerCase()).join(', ')}. Yil davomida shu bo‘yicha natijani ko‘rsatamiz.`, `В октябрьском опросе ${ps.n} семей описали ожидания. Чаще всего: ${ps.support.slice(0, 3).map(x => opt(x[0]).toLowerCase()).join(', ')}. В течение года покажем результат по ним.`) : ''}</div>`;
        };
        el.querySelectorAll('#aSrc button').forEach(b => (b.onclick = () => show(b.dataset.a)));
        show(NG ? 'exp' : 'w2');
      },
      notes: () => t('Tugmalar bilan manbani almashtiring: birinchi 2 hafta, o‘tgan yil va ota-ona kutishi.', 'Переключайте источник кнопками: первые 2 недели, прошлый год и ожидания родителей.') },

    { when: () => NG, html: () => `<div class="kicker">${t('1-sinfda baholash', 'Оценивание в 1 классе')}</div><h2>${t('Baho emas, o‘sish: 1-sinfda natija qanday ko‘rinadi', 'Не оценка, а рост: как виден результат в 1 классе')}</h2>
      <div class="flow" style="margin-top:40px">${[[t('Koin', 'Коин'), t('Darsdagi faollik va mustaqil javob uchun ustoz beradi', 'Учитель даёт за активность и самостоятельный ответ')], [t('Ustoz izohi', 'Комментарий учителя'), t('Maqtov va tavsiya Durbinga yoziladi, ilovada ko‘rinadi', 'Похвала и совет записываются в Durbin и видны в приложении')], [t('Sinf rahbari kuzatuvi', 'Наблюдение кл. руководителя'), t('O‘qish, yozish, sanash darajasi bo‘yicha yozma xulosa', 'Письменный вывод об уровне чтения, письма, счёта')], [t('Ijodiy fanlar', 'Творческие предметы'), t('Art studio, jismoniy tarbiya, shaxmatda baho qo‘yiladi', 'В арт-студии, физкультуре и шахматах ставятся оценки')]].map((x, i) => `<div class="st frag"><b>0${i + 1}</b><h4>${x[0]}</h4><p>${x[1]}</p></div>`).join('')}</div>
      <div class="kpis" style="margin-top:36px;grid-template-columns:repeat(3,1fr)"><div class="kpi y"><b>${D.coins_total}</b><span>${t('koin 1-chorakda', 'коинов за 1-ю четверть')}</span></div><div class="kpi c"><b>${f(att.pct, 1)}%</b><span>${t('davomat', 'посещаемость')}</span></div><div class="kpi g"><b>${D.comms.n}</b><span>${t('sinf rahbari bilan suhbat', 'бесед с кл. руководителем')}</span></div></div>`,
      notes: () => t('Ota-onalarga 1-sinfda baho yo‘qligi normal ekanini tushuntiring: maqsad o‘qishga qiziqishni saqlash.', 'Объясните, что отсутствие оценок в 1 классе — норма: цель — сохранить интерес к учёбе.') },

    { when: () => !NG && sub.filter(s => s.sep && s.oct).length >= 3, html: () => `<div class="kicker">${t('O‘sish', 'Рост')}</div><h2>${t('Sentabr → oktabr: fanlar bo‘yicha', 'Сентябрь → октябрь по предметам')}</h2>
      <div class="legend"><span><i style="background:#fff;border:3px solid #8792ad"></i>${t('Sentabr', 'Сентябрь')}</span><span><i style="background:#2E7D0F"></i>${t('Oktabr: o‘sdi', 'Октябрь: вырос')}</span><span><i style="background:#B3261E"></i>${t('Oktabr: pasaydi', 'Октябрь: снизился')}</span></div>
      <div style="margin-top:12px">${(() => { const ss_ = sub.filter(s => s.sep && s.oct).sort((a, b) => (b.oct - b.sep) - (a.oct - a.sep)); const lo = Math.min(3.5, ...ss_.map(s => Math.min(s.sep, s.oct))); return dumbbell(ss_.map(s => ({ l: subjT(s.uz), a: s.sep, b: s.oct })), { w: 1700, row: Math.min(52, Math.floor(700 / ss_.length)), min: Math.floor(lo * 2) / 2, max: 5 }); })()}</div>`,
      notes: () => { const s2 = sub.filter(s => s.sep && s.oct).sort((a, b) => (b.oct - b.sep) - (a.oct - a.sep)); return t(`Eng ko‘p o‘sgan fanlar: ${s2.slice(0, 3).map(s => subjT(s.uz)).join(', ')}. Pasayganlarini ham ayting va 2-chorak rejasi bilan bog‘lang.`, `Больше всего выросли: ${s2.slice(0, 3).map(s => subjT(s.uz)).join(', ')}. Назовите и снизившиеся, свяжите с планом 2-й четверти.`); } },

    { when: () => !NG, html: () => `<div class="kicker">${t('Taqqoslash', 'Сравнение')}</div><h2>${t('Sinf, parallel sinflar va maktab', 'Класс, параллель и школа')}</h2>
      <div class="seg" id="cmpSeg" style="margin-top:10px"><button class="on" data-m="avg">${t('Chorak', 'Четверть')}</button><button data-m="sep">${t('Sentabr', 'Сентябрь')}</button><button data-m="oct">${t('Oktabr', 'Октябрь')}</button></div>
      <div id="cmpBox" style="margin-top:20px"></div>
      <div class="legend"><span><i style="background:${S1}"></i>${D.k}</span>${par.length > 1 ? `<span><i style="background:${S2}"></i>${t('Parallel sinf', 'Параллельный класс')}</span>` : ''}<span><i style="background:${S3}"></i>${t('Maktab o‘rtachasi', 'Среднее по школе')}</span></div>`,
      init: el => { const box = el.querySelector('#cmpBox'); const show = m => { el.querySelectorAll('#cmpSeg button').forEach(b => b.classList.toggle('on', b.dataset.m === m)); box.innerHTML = hbars(par.map(p => ({ l: p.k, v: p[m], c: p.k === D.k ? S1 : S2 })).concat([{ l: t('Maktab', 'Школа'), v: D.school_avg[m === 'avg' ? 'q1' : m], c: S3 }]), { w: 1700, row: 110, max: 5, fmt: v => f(v) }); }; el.querySelectorAll('#cmpSeg button').forEach(b => (b.onclick = () => show(b.dataset.m))); show('avg'); },
      notes: () => t('Taqqoslash raqobat uchun emas, maktab qayerda turganini ko‘rsatish uchun.', 'Сравнение не для соревнования, а чтобы показать положение относительно школы.') },

    { when: () => !NG, html: () => `<div class="kicker">${t('Tushuntirish', 'Объяснение')}</div><h2>${t('GPA nima va ilovadagi foiz qayerdan chiqadi', 'Что такое GPA и откуда процент в приложении')}</h2>
      <div class="body"><div class="col card" style="flex:1.15;gap:6px"><div class="note" style="margin-bottom:10px">${t('Misol o‘quvchi. Fan o‘rtachasini suring:', 'Пример ученика. Двигайте средний балл по предмету:')}</div><div id="gpRows"></div></div>
        <div class="col" style="flex:1"><div class="res">
            <div class="card"><b id="gpAvg">–</b><span>${t('Oddiy o‘rtacha: barcha baholar birga', 'Простое среднее: все оценки вместе')}</span></div>
            <div class="card" style="border:3px solid var(--navy)"><b id="gpGpa">–</b><span>GPA: ${t('fanlar o‘rtachasining o‘rtachasi', 'среднее средних по предметам')}</span></div>
            <div class="card"><b id="gpPct">–</b><span>${t('Ilovada: GPA × 20', 'В приложении: GPA × 20')}</span></div></div>
          <div class="card" style="font-size:26px;line-height:1.45;color:var(--ink2)">${t('GPA har bir fanga <b>teng og‘irlik</b> beradi. Matematikadan 20 ta, fizikadan 6 ta baho bo‘lsa ham, ikkalasi GPA’da bir xil o‘rin egallaydi. Shuning uchun baho kam qo‘yiladigan fandagi past natija GPA’ni sezilarli tushiradi.', 'GPA даёт каждому предмету <b>одинаковый вес</b>. Даже если по математике 20 оценок, а по физике 6, в GPA они весят одинаково. Поэтому низкий результат по предмету с малым числом оценок заметно снижает GPA.')}</div></div></div>`,
      init: el => {
        const rows = [['Matematika', 'Математика', 20, 4.8], ['Ingliz tili', 'Английский язык', 18, 4.7], ['Fizika', 'Физика', 6, 3.5], ['Ona tili', 'Родной язык', 8, 4.6], ['Tarix', 'История', 6, 4.5]];
        const wrap = el.querySelector('#gpRows');
        wrap.innerHTML = rows.map((r, i) => `<div class="gp-row"><span>${t(r[0], r[1])} <small style="color:#8792ad">· ${r[2]} ${t('baho', 'оц.')}</small></span><input type="range" min="2" max="5" step="0.1" value="${r[3]}" aria-label="${t(r[0], r[1])}"><b>${f(r[3], 1)}</b></div>`).join('');
        const calc = () => { const v = [...wrap.querySelectorAll('input')].map(x => +x.value); wrap.querySelectorAll('b').forEach((b, i) => (b.textContent = f(v[i], 1))); const n = rows.reduce((a, r) => a + r[2], 0), avg = rows.reduce((a, r, i) => a + r[2] * v[i], 0) / n, gpa = v.reduce((a, b) => a + b, 0) / v.length; el.querySelector('#gpAvg').textContent = f(avg); el.querySelector('#gpGpa').textContent = f(gpa); el.querySelector('#gpPct').textContent = Math.round(gpa * 20) + '%'; };
        wrap.oninput = calc; calc();
      },
      notes: () => t('Fizika slayderini 3,5 dan 5 ga suring va GPA qanday o‘zgarishini ko‘rsating. GPA har fanga teng og‘irlik beradi. Ilovadagi foiz = o‘rtacha × 20, masalan 4,75 = 95%.', 'Передвиньте ползунок физики с 3,5 до 5 и покажите изменение GPA. GPA даёт предметам одинаковый вес. Процент в приложении = средний × 20, например 4,75 = 95%.') },

    { when: () => D.exams.length > 0, html: () => `<div class="kicker">${t('Tushuntirish', 'Объяснение')}</div><h2>${t('Kundalik baho va progress imtihon farqi', 'Ежедневная оценка и прогресс-экзамен')}</h2>
      <div class="body"><div class="col" style="flex:1.3">
          <div class="legend"><span><i style="background:${S1}"></i>${t('Kundalik baho (o‘rtacha)', 'Ежедневная оценка (средняя)')}</span><span><i style="background:${S3}"></i>${t('Progress imtihon (o‘rtacha)', 'Прогресс-экзамен (средний)')}</span></div>
          ${groupBars(D.exams.map(e => subjT(e.subj)), [{ n: t('Kundalik', 'Ежедневная'), c: S1, v: D.exams.map(e => e.daily) }, { n: t('Progress', 'Прогресс'), c: S3, v: D.exams.map(e => e.av) }], { w: 1000, h: 560, min: 0, max: 5 })}</div>
        <div class="col">
          <div class="card frag"><h3 style="font-size:30px;color:var(--navy)">${t('Kundalik baho', 'Ежедневная оценка')}</h3><p class="note" style="color:var(--ink2);font-size:25px;margin-top:8px">${t('Bitta dars mavzusi: og‘zaki javob, uy vazifasi, darsdagi faollik.', 'Одна тема урока: устный ответ, домашнее задание, активность.')}</p></div>
          <div class="card frag"><h3 style="font-size:30px;color:var(--navy)">${t('Progress imtihon', 'Прогресс-экзамен')}</h3><p class="note" style="color:var(--ink2);font-size:25px;margin-top:8px">${t('Bir necha haftalik mavzular birga, yozma test. Bilim qanchalik mustahkam qolganini ko‘rsatadi.', 'Темы нескольких недель вместе, письменный тест. Показывает прочность знаний.')}</p></div>
          <div class="card frag" style="background:var(--soft);border-color:var(--line)"><p style="font-size:25px;line-height:1.4">${t(`Eng yaxshi natija: ${subjT(bestExam.subj)} (${f(bestExam.av)}). Asosiy vazifa: ${subjT(worstExam.subj)} bo‘yicha kundalik ${f(worstExam.daily)} va progress ${f(worstExam.av)} orasidagi farqni qisqartirish.`, `Лучший результат: ${subjT(bestExam.subj)} (${f(bestExam.av)}). Главная задача: сократить разрыв по предмету «${subjT(worstExam.subj)}» между ежедневной ${f(worstExam.daily)} и прогрессом ${f(worstExam.av)}.`)}</p></div></div></div>`,
      notes: () => t(`Progress imtihonlar: ${D.exams.map(e => subjT(e.subj) + ' ' + dm(e.date)).join(', ')}. Kundalik yuqori, progress past bo‘lsa, bola mavzuni darsda tushunadi, lekin takrorlamaydi.`, `Прогресс-экзамены: ${D.exams.map(e => subjT(e.subj) + ' ' + dm(e.date)).join(', ')}. Если ежедневная оценка выше прогресса, ребёнок понимает тему на уроке, но не повторяет.`) },

    { html: () => `<div class="kicker">${t('O‘tilgan darslar', 'Проведённые уроки')}</div><h2>${t('Har bir fandan nechta dars o‘tildi', 'Сколько уроков проведено по каждому предмету')}</h2>
      <div class="body"><div class="col" style="flex:1.5">${hbars(D.subjects.slice(0, 20).map(s => ({ l: subjT(s.uz), v: s.lessons, c: s.src === 'kurs' ? S2 : S1 })), { w: 1150, row: Math.min(40, Math.floor(780 / Math.min(20, D.subjects.length))), lw: 440 })}</div>
      <div class="col"><div class="card"><div class="big">${lessons}</div><div class="lbl">${t('dars sinf jadvali bo‘yicha', 'уроков по расписанию класса')}</div></div>
      <div class="legend" style="flex-direction:column;gap:12px"><span><i style="background:${S1}"></i>${t('Sinf jadvali', 'Классное расписание')}</span><span><i style="background:${S2}"></i>${t('Daraja bo‘yicha guruhlar (o‘quvchiga o‘rtacha)', 'Группы по уровню (в среднем на ученика)')}</span></div></div></div>`,
      notes: () => t('O‘tilgan (tugagan) darslar soni. Guruh darslari bitta o‘quvchi o‘rtacha qatnashgan darslar bilan ko‘rsatilgan.', 'Число проведённых уроков. Для групп — в среднем на одного ученика.') },

    { html: () => { const tot = D.subjects.reduce((a, s) => a + s.lessons, 0), top = D.subjects.slice(0, 4), rest = tot - top.reduce((a, s) => a + s.lessons, 0), cols = ['#072BAD', '#3A5BD9', '#0F9FCF', '#7FD3F0', '#C8D3EA'];
        const items = top.map((s, i) => ({ l: subjT(s.uz), v: s.lessons, c: cols[i] })).concat([{ l: t('Boshqa fanlar', 'Другие предметы'), v: rest, c: cols[4] }]);
        return `<div class="kicker">${t('Fanlar ulushi', 'Доля предметов')}</div><h2>${t('Qaysi fanlarga urg‘u berildi', 'На какие предметы сделан акцент')}</h2>
        <div class="body" style="align-items:center"><div>${donut(items, { size: 560 })}</div><div class="col">${items.map(i => `<div style="display:flex;align-items:center;gap:20px;font-size:32px"><i style="width:28px;height:28px;border-radius:8px;background:${i.c}"></i><span style="flex:1">${i.l}</span><b style="color:var(--navy)">${pc(i.v, tot)}%</b></div>`).join('')}
        <p class="sub" style="margin-top:20px">${t(`Darslarning ${pc(top[0].lessons + top[1].lessons, tot)}% i ${subjT(top[0].uz)} va ${subjT(top[1].uz)} fanlariga to‘g‘ri keladi.`, `${pc(top[0].lessons + top[1].lessons, tot)}% уроков — ${subjT(top[0].uz)} и ${subjT(top[1].uz)}.`)}</p></div></div>`; },
      notes: () => t('Diagramma bo‘laklariga sichqoncha olib borilsa, son chiqadi.', 'При наведении на сектор появляется число.') },

    { when: () => sub.length > 0, html: () => { const rows = sub.slice(0, 18); return `<div class="kicker">${t('Fanlar', 'Предметы')}</div><h2>${t('Har bir fan bo‘yicha natija', 'Результат по каждому предмету')}</h2>
      <table class="tight" style="margin-top:14px${rows.length > 15 ? ';font-size:19px' : ''}"><tr><th>${t('Fan', 'Предмет')}</th><th class="num">${t('Darslar', 'Уроки')}</th><th class="num">${t('Baholar', 'Оценки')}</th><th class="num">${t('Sentabr', 'Сентябрь')}</th><th class="num">${t('Oktabr', 'Октябрь')}</th><th class="num">${t('Chorak', 'Четверть')}</th><th>${t('Holat', 'Статус')}</th></tr>
      ${rows.map(s => { const d = s.sep != null && s.oct != null ? s.oct - s.sep : null, c = s.avg >= 4.6 ? '#7BD309' : s.avg >= 4.3 ? '#03CAFF' : '#F0A202';
        return `<tr><td><span class="dot" style="background:${c}"></span>${subjT(s.uz)}</td><td class="num">${s.lessons}</td><td class="num">${s.n}</td><td class="num">${f(s.sep)}</td><td class="num">${f(s.oct)}</td><td class="num"><b>${f(s.avg)}</b></td><td class="${d == null ? '' : d >= 0 ? 'up' : 'down'}">${d == null ? '—' : (d >= 0 ? '▲ +' : '▼ ') + f(d)}</td></tr>`; }).join('')}</table>
      <p class="note" style="margin-top:10px">${t('Yashil: 4,6 va yuqori · ko‘k: 4,3–4,59 · sariq: 4,3 dan past. Baho qo‘yilmaydigan fanlar jadvalda yo‘q.', 'Зелёный: 4,6 и выше · синий: 4,3–4,59 · жёлтый: ниже 4,3. Предметы без оценок не показаны.')}</p>`; },
      notes: () => t('Kuchli fanlar (yashil) va e’tibor kerak fanlarni qisqa ayting. Batafsil ma’lumot shaxsiy hisobotda.', 'Кратко: сильные предметы (зелёные) и требующие внимания. Подробности — в личном отчёте.') },

    { html: () => { const s = D.teachers_sum, many = D.teachers.length > 20; return `<div class="kicker">${t('Sinf ustozlari', 'Учителя класса')}</div><h2 style="margin:6px 0 0;font-size:54px">${t(`${s.n} ustoz, o‘rtacha ${f(s.exp_avg, 1)} yil tajriba`, `${s.n} учителей, средний стаж ${f(s.exp_avg, 1)} лет`)}</h2>
      <div style="display:flex;gap:16px;margin:18px 0 22px;flex-wrap:wrap">${['oliy', 't1', 't2', 'mut'].filter(k => s.deg[k]).map(k => `<span class="chip">${tr(k)}: ${s.deg[k]}</span>`).join('')}<span class="chip">${t('5+ yil tajriba', 'Стаж 5+ лет')}: ${s.exp5}</span></div>
      <div class="grid4 tgrid" style="${many ? '' : 'grid-template-columns:repeat(4,1fr)'}">${D.teachers.map(x => `<div class="tcard"><div class="ava">${initials(x.nm)}</div><div><div class="n">${esc(x.nm.split(' ').slice(0, 2).join(' '))}</div><div class="m">${x.subj.slice(0, 2).map(subjT).join(', ')}<span class="deg ${x.deg}">${tr(x.deg)}</span></div><div class="m">${x.exp ? t(`Staj ${x.exp} yil · `, `Стаж ${x.exp} · `) : ''}DATA: ${x.since}${t('-yildan', ' г.')}</div></div></div>`).join('')}</div>`; },
      notes: () => t('Manba: Durbindagi ustoz profili (toifa, pedagogik staj, maktabga kelgan yil).', 'Источник: профиль учителя в Durbin (категория, стаж, год прихода).') },

    { when: () => !NG && D.top.length >= 3, html: () => `<div class="kicker">${t('Yutuqlar', 'Достижения')}</div><h2>${t('Chorakning eng yaxshi o‘quvchilari', 'Лучшие ученики четверти')}</h2>
      <p class="note">${t('Kartani bosing: ism ochiladi. Ikkala jurnal baholari bo‘yicha o‘rtacha.', 'Нажмите на карточку, чтобы открыть имя. Средний балл по обоим журналам.')}</p>
      <div class="podium" style="margin-top:30px;grid-template-columns:repeat(${D.top.length},1fr)">${D.top.slice().reverse().map((x, i) => { const r = D.top.length - i; return `<div class="pod" style="height:${360 + (5 - r) * 70}px"><div class="rank">#${r}</div><div class="nm">${twoName(x.nm)}</div><div class="sc">${f(x.q1)}</div><div class="note">${x.n} ${t('ta baho', 'оценок')}</div><div class="hint">${t('bosing', 'нажмите')}</div></div>`; }).join('')}</div>`,
      init: el => el.querySelectorAll('.pod').forEach(p => (p.onclick = () => p.classList.add('open'))),
      notes: () => t('Oxirgi o‘rindan boshlab bittadan oching va har birini olqishlang.', 'Открывайте по одному с последнего места и просите аплодисменты.') },

    { when: () => !NG && D.stars.length >= 4, html: () => `<div class="kicker">${t('Fan yulduzlari', 'Звёзды предметов')}</div><h2>${t('Har bir fanda eng faol o‘quvchi', 'Самый активный ученик по каждому предмету')}</h2>
      <p class="note">${t('Faollik = baholar soni × o‘rtacha baho (kamida 4,5). Bir o‘quvchi ko‘pi bilan 2 fanda.', 'Активность = число оценок × средний балл (не ниже 4,5). Один ученик — не более 2 предметов.')}</p>
      <div class="grid4" style="margin-top:22px">${D.stars.slice(0, 20).map(s => `<div class="star frag"><div class="s">${subjT(s.subj)}</div><div class="n">★ ${twoName(s.nm)}</div><div class="v">${s.n} ${t('ta baho', 'оценок')} · ${f(s.av)}</div></div>`).join('')}</div>`,
      notes: () => t('Ko‘proq bolani maqtash uchun har o‘quvchiga ko‘pi bilan 2 fan berildi.', 'Чтобы похвалить больше детей, каждому не более 2 предметов.') },

    { when: () => D.coins_top.length > 0, html: () => `<div class="kicker">${t('Rag‘bat va o‘sish', 'Поощрения и рост')}</div><h2>${t('Koin chempionlari va eng ko‘p o‘sganlar', 'Чемпионы по коинам и самый большой рост')}</h2>
      <div class="body"><div class="col card"><h3 style="font-size:32px;color:var(--navy)">${t('Eng ko‘p koin', 'Больше всего коинов')}</h3>${hbars(D.coins_top.map(x => ({ l: x.nm, v: x.c, c: S3 })), { w: 780, row: 70, lw: 400 })}<p class="note">${t('Koin: darsdagi faollik va xulq uchun ustoz beradigan rag‘bat.', 'Коин — поощрение за активность и поведение.')}</p></div>
      ${D.growth.length && !NG ? `<div class="col card"><h3 style="font-size:32px;color:var(--navy)">${t('Sentabrdan oktabrga eng ko‘p o‘sganlar', 'Наибольший рост с сентября на октябрь')}</h3>${dumbbell(D.growth.map(x => ({ l: x.nm, a: x.sep, b: x.oct })), { w: 780, row: 70, min: Math.floor(Math.min(...D.growth.map(x => x.sep)) * 2) / 2, max: 5 })}<p class="note">${t('Harakat qilayotganlarni ko‘ramiz va qadrlaymiz.', 'Видим и ценим тех, кто старается.')}</p></div>` : ''}</div>`,
      notes: () => t('O‘sganlar ro‘yxati juda muhim: bu bolalar odatda maqtov eshitmaydi.', 'Список выросших очень важен: эти дети редко слышат похвалу.') },

    { when: () => !!ss, html: () => `<div class="kicker">${t('O‘quvchilar so‘rovnomasi', 'Опрос учеников')}</div><h2>${t('Farzandingiz kelajagini qanday ko‘radi', 'Каким ребёнок видит своё будущее')}</h2>
      <p class="note">${t(`${ss.n} ta javob, oktabr 2026. O‘quvchilarning o‘z javoblari, ismsiz.`, `${ss.n} ответов, октябрь 2026. Ответы самих учеников, без имён.`)}</p>
      <div class="body" style="margin-top:14px;gap:24px">
        <div class="col">${card(t('Qiziqqan sohalar', 'Интересные сферы'), optBars(ss.fields, ss.n, S1, 320, 600, 56))}${card(t('Qayerda o‘qimoqchi', 'Где хочет учиться'), optBars(ss.where, ss.n, S2, 320, 600, 56))}</div>
        <div class="col">${card(t('Kerakli sertifikatlar', 'Нужные сертификаты'), optBars(ss.certs, ss.n, S1, 320, 600, 56))}${card(t('Kuniga mustaqil o‘qish', 'Самостоятельная учёба в день'), optBars(ss.study, ss.n, S3, 320, 600, 56))}</div>
        <div class="col" style="flex:.8"><div class="card" style="text-align:center"><div class="big">${Math.round(ss.ready)}%</div><div class="lbl">${t('o‘zini tanlagan universitetiga tayyor deb hisoblaydi (o‘rtacha)', 'считают себя готовыми к выбранному вузу (в среднем)')}</div></div>
          ${card(t('Qanday yordam kerak', 'Какая помощь нужна'), `<ul style="font-size:23px;line-height:1.5;margin-left:24px;color:var(--ink2)">${ss.help.slice(0, 4).map(([o, v]) => `<li>${opt(o)} · ${v}</li>`).join('')}</ul>`)}</div></div>`,
      notes: () => t('Bu bolalarning o‘z orzulari. Ota-onalarga uyda shu mavzuda gaplashishni taklif qiling: farzandingiz qaysi universitetni orzu qiladi?', 'Это мечты самих детей. Предложите родителям поговорить дома: о каком вузе мечтает ребёнок?') },

    { html: () => `<div class="kicker">${t('Davomat', 'Посещаемость')}</div><h2>${f(att.pct, 1)}% ${t('darslarda qatnashdi', 'уроков посещено')}</h2>
      <div class="body"><div class="col" style="flex:1.3">${groupBars([t('Sentabr', 'Сентябрь'), t('Oktabr', 'Октябрь'), t('Chorak', 'Четверть'), t('Maktab', 'Школа')], [{ n: D.k, c: S1, v: [att.sep, att.oct, att.pct, null] }, { n: t('Maktab', 'Школа'), c: S3, v: [null, null, null, D.school_att] }], { w: 1000, h: 560, min: 80, max: 100, fmt: v => f(v, 1) + '%' })}</div>
      <div class="col"><div class="kpi"><b>${att.absent}</b><span>${t('qoldirilgan dars (barcha o‘quvchilar)', 'пропущенных уроков (все ученики)')}</span></div><div class="kpi y"><b>${att.late}</b><span>${t('kechikish', 'опозданий')}</span></div>
      <div class="card" style="font-size:25px;line-height:1.4;color:var(--ink2)">${t('Bola kasal bo‘lsa, uyda qolsin va ertalab tyutorga xabar bering: uzrli sabab jurnalda belgilanadi.', 'Если ребёнок болеет, пусть остаётся дома, а утром сообщите тьютору: уважительная причина отмечается в журнале.')}</div></div></div>`,
      notes: () => t('Davomat sinf jurnali bo‘yicha. Kechikish "qatnashgan" hisoblanadi.', 'Посещаемость по классному журналу. Опоздание считается присутствием.') },

    { when: () => DS.length > 0, html: () => `<div class="kicker">${t('Yotoqxona', 'Общежитие')}</div><h2>${t(`Yotoqxonada ${DS.length} o‘quvchimiz yashaydi`, `В общежитии живут ${DS.length} наших учеников`)}</h2>
      <div class="body" style="gap:28px"><div class="col" style="flex:2.1"><table class="tight" style="font-size:${DS.length > 12 ? 15 : DS.length > 9 ? 17 : 20}px"><tr><th>${t('O‘quvchi', 'Ученик')}</th><th>${t('Xona', 'Комната')}</th><th>${t('Xonadoshlari', 'Соседи по комнате')}</th><th class="num">${t('O‘rtacha', 'Средний')}</th><th class="num">${t('Koin', 'Коины')}</th></tr>
        ${DS.map(x => `<tr><td><b>${twoName(x.nm)}</b></td><td style="white-space:nowrap">${esc(x.room.replace(/\s*\(.*\)/, ''))} · ${esc(bldShort(x.bld))}</td><td style="font-size:.85em">${x.mates.map(m => `${twoName(m.nm)} <span style="color:#8792ad">${m.k}</span>`).join(', ')}</td><td class="num">${f(x.q1)}</td><td class="num">${x.coins ?? '—'}</td></tr>`).join('')}</table></div>
      <div class="col">${card(t('Natija', 'Результат'), `<div class="big" style="font-size:90px">${f(D.dorm.avg)}</div><div class="lbl">${t(`yotoqxona o‘quvchilari o‘rtachasi · sinf ${f(g.avg)}`, `средний балл жильцов · класс ${f(g.avg)}`)}</div>`)}
        ${card(t('2-chorakda ish tartibi', 'Порядок работы во 2-й четверти'), `<ul style="font-size:22px;line-height:1.45;margin-left:22px;color:var(--ink2)"><li>${t('Kechki mustaqil tayyorgarlikda uy vazifasi nazorati', 'Контроль домашнего задания на вечерней самоподготовке')}</li><li>${t('Tyutor va yotoqxona tarbiyachisi haftalik natijani birga ko‘radi', 'Тьютор и воспитатель общежития вместе смотрят итоги недели')}</li><li>${t('Ota-ona bilan haftasiga kamida bir marta aloqa', 'Связь с родителями не реже раза в неделю')}</li><li>${t('Past baho yoki kayfiyat o‘zgarsa, shu kuni xabar', 'При низкой оценке или смене настроения — сообщение в тот же день')}</li></ul>`)}</div></div>`,
      notes: () => t('Yotoqxonadagi bolalar ota-onasidan uzoqda: ularga alohida e’tibor kerak. "Ular bilan qanday ishlaymiz" bandlari 2-chorak uchun ish tartibi sifatida taklif qilinadi, yotoqxona bo‘yicha tashkiliy savollarni yozib oling va ma’muriyatga yetkazing.', 'Дети в общежитии далеко от родителей, им нужно особое внимание. Пункты «Как мы работаем» — порядок работы на 2-ю четверть. Организационные вопросы по общежитию запишите и передайте администрации.') },

    { html: () => `<div class="kicker">${t('O‘zbekistonda birinchi', 'Впервые в Узбекистане')}</div><h2>${t('Darslar yozib olinadi va tahlil qilinadi', 'Уроки записываются и анализируются')}</h2>
      <div class="flow" id="recSteps" style="margin-top:26px">${[[t('Yozib olinadi', 'Запись'), t('Ustoz kompyuteri mikrofoni, faqat ovoz. Qo‘ng‘iroq bilan to‘xtaydi', 'Микрофон компьютера учителя, только звук. Останавливается со звонком')], [t('Matnga aylanadi', 'Транскрипт'), t('Sun’iy intellekt ovozni matnga o‘giradi', 'ИИ превращает звук в текст')], [t('6 mezon bo‘yicha baho', 'Оценка по 6 критериям'), t('Dars sifati ustozga maslahat sifatida', 'Качество урока — совет учителю')], [t('Maqtov va tanbeh', 'Похвала и замечание'), t('Ustoz ism bilan aytgan gap o‘quvchi kartasiga yoziladi', 'Слова учителя с именем ученика — в карточку')], [t('Ota-onaga yetadi', 'Доходит до родителей'), t('Ilovada: sana, fan, ustoz, maqtov yoki tanbeh', 'В приложении: дата, предмет, учитель, похвала или замечание')]]
        .map((x, i) => `<button class="st" data-i="${i}" style="text-align:left"><b>0${i + 1}</b><h4>${x[0]}</h4><p>${x[1]}</p></button>`).join('')}</div>
      <div class="body" style="margin-top:22px"><div class="card col" id="recView" style="min-height:330px;justify-content:center"></div>
        <div class="col" style="flex:.45"><button class="tab" id="recPlay" style="text-align:center">▶ ${t('Ko‘rsatish', 'Показать')}</button><p class="note">${t('Yozuv 60 kun saqlanadi. Tahlilda boshqa o‘quvchilar ismi "[O‘quvchi]" bilan yashiriladi.', 'Запись хранится 60 дней. В анализе имена других учеников заменяются на «[Ученик]».')}</p></div></div>`,
      init: el => {
        const crit = [['Darsni boshlash va qiziqtirish', 'Начало урока и мотивация', 15], ['Mavzuning to‘liq ochilishi', 'Полное раскрытие темы', 25], ['O‘quvchilar faolligi', 'Активность учеников', 20], ['Savol-javob sifati', 'Качество вопросов и ответов', 15], ['Metodlar xilma-xilligi', 'Разнообразие методов', 15], ['Temp va yakunlash', 'Темп и завершение', 10]];
        const views = [
          () => `<div style="display:flex;align-items:center;gap:40px"><div class="wave">${Array.from({ length: 28 }, (_, i) => `<i style="animation-delay:${(i % 7) * 0.12}s"></i>`).join('')}</div><div style="font-size:30px"><b style="color:var(--navy)">● REC</b> 09:00 – 09:45<br><span class="note">${t('Video yozilmaydi. Tanaffus yozilmaydi.', 'Видео не пишется. Перемена не записывается.')}</span></div></div>`,
          () => `<div style="font-size:27px;line-height:1.7;font-family:ui-monospace,Menlo,monospace;color:var(--ink2)">[09:12] ${t('Ustoz', 'Учитель')}: ${t('Kim javob beradi? ', 'Кто ответит? ')}<b style="color:var(--navy)">[${t('O‘quvchi', 'Ученик')}]</b>, ${t('marhamat.', 'пожалуйста.')}<br>[09:13] <b style="color:var(--navy)">[${t('O‘quvchi', 'Ученик')}]</b>: ${t('Bu tenglamaning ildizi ikkiga teng.', 'Корень этого уравнения равен двум.')}<br>[09:13] ${t('Ustoz', 'Учитель')}: <b style="color:#2E7D0F">${t('Aziz, barakalla!', 'Азиз, молодец!')}</b></div>`,
          () => hbars(crit.map(c => ({ l: t(c[0], c[1]), v: c[2], c: S1, tip: t(c[0], c[1]) + ': ' + c[2] + '%' })), { w: 1100, row: 46, lw: 470, max: 25, fmt: v => v + '%' }),
          () => `<div style="display:flex;gap:30px;align-items:center"><div class="ava" style="width:110px;height:110px;font-size:40px">AZ</div><div style="font-size:28px;line-height:1.5"><b>Aziz</b> · ${t('Matematika', 'Математика')} · 09:13<br><span class="chip" style="background:var(--goodbg);color:var(--good)">${t('Maqtov', 'Похвала')}</span> «${t('Aziz, barakalla!', 'Азиз, молодец!')}»<br><span class="note">${t('Misol: rozilik hujjatidagi namuna.', 'Пример из формы согласия.')}</span></div></div>`,
          () => `<div style="display:flex;gap:40px;align-items:center"><div class="phone" style="width:230px;height:400px;border-radius:34px;padding:10px;background:#0d1533"><div style="background:#fff;border-radius:26px;height:100%;padding:18px;font-size:16px;line-height:1.4"><b style="color:var(--navy)">Durbin</b><div class="card" style="padding:12px;margin-top:14px;border-radius:14px"><b>${t('Intizom', 'Дисциплина')}</b><br>${t('Matematika · Maqtov', 'Математика · Похвала')}<br>«${t('Aziz, barakalla!', 'Азиз, молодец!')}»</div></div></div><p style="font-size:28px;line-height:1.5">${t('Ota-ona farzandi haqidagi izohni ilovada ko‘radi. Boshqa bolalar haqidagi izohlar ko‘rinmaydi.', 'Родитель видит комментарии о своём ребёнке в приложении. Комментарии о других детях не видны.')}</p></div>`];
        const box = el.querySelector('#recView'), steps = [...el.querySelectorAll('#recSteps .st')];
        let i = 0, timer = null;
        const show = k => { i = k; steps.forEach((s, j) => s.style.borderColor = j === k ? 'var(--navy)' : 'var(--line)'); box.innerHTML = views[k](); };
        steps.forEach((s, k) => (s.onclick = () => { clearInterval(timer); show(k); }));
        el.querySelector('#recPlay').onclick = () => { clearInterval(timer); show(0); timer = setInterval(() => (i < 4 ? show(i + 1) : clearInterval(timer)), 3500); };
        show(0);
      },
      notes: () => t('Bu O‘zbekistonda birinchi marta DATA maktabida qo‘llanilmoqda. "Ko‘rsatish" tugmasini bosing: 5 bosqich o‘zi almashadi. Asosiy fikr: maqsad bolani kuzatish emas, dars sifatini oshirish va bolaning yutug‘i unutilmasligi.', 'Впервые в Узбекистане — в школе DATA. Нажмите «Показать»: 5 этапов сменятся сами. Главное: цель — не следить за ребёнком, а повысить качество урока и не упустить успехи ребёнка.') },

    { html: () => `<div class="kicker">${t('Intizom profili', 'Профиль дисциплины')}</div><h2>${t('O‘quvchi intizomi Durbinda qanday yuritiladi', 'Как в Durbin ведётся дисциплина ученика')}</h2>
      <div class="body" style="margin-top:30px"><div class="col">${card(t('"Intizom" bo‘limida nima bor', 'Что есть в разделе «Дисциплина»'), `<ul style="font-size:25px;line-height:1.6;margin-left:26px;color:var(--ink2)"><li>${t('Ustozlarning darsdagi maqtov va tanbehlari', 'Похвалы и замечания учителей на уроке')}</li><li>${t('Maktab hodisalari (o‘quvchi ishtirok etgan)', 'Школьные инциденты (с участием ученика)')}</li><li>${t('So‘rovnoma javoblari', 'Ответы на опросы')}</li></ul>`)}
        ${card(t('Kim ko‘radi', 'Кто видит'), `<ul style="font-size:24px;line-height:1.6;margin-left:26px;color:var(--ink2)"><li>${t('Audio: shu dars ustozi, direktor va direktor o‘rinbosari, 60 kun', 'Аудио: учитель урока, директор и заместитель, 60 дней')}</li><li>${t('Izohlar: farzandingizni o‘qitadigan xodimlar va siz', 'Комментарии: сотрудники, обучающие ребёнка, и вы')}</li><li>${t('Dars tahlili (ismsiz): ustoz va rahbariyat, 2 yil', 'Анализ урока (без имён): учитель и руководство, 2 года')}</li></ul>`)}</div>
      <div class="col" style="flex:.6"><div class="card" style="text-align:center"><div class="big">${D.incidents}</div><div class="lbl">${t('1-chorakda sinf o‘quvchilari ishtirokidagi hodisa', 'инцидентов с участием учеников класса за 1-ю четверть')}</div></div>
        <div class="card" style="font-size:24px;line-height:1.45;color:var(--ink2)">${t('Ustoz tanbeh bersa, sinf rahbari buni vaqtida biladi va muammo kattalashmasdan oldin siz bilan gaplashadi.', 'Если учитель сделал замечание, классный руководитель узнаёт вовремя и поговорит с вами до того, как проблема вырастет.')}</div></div></div>`,
      notes: () => t('Ma’lumotlar rozilik hujjatidan olingan. Hodisalar soni Durbindagi hodisalar daftaridan.', 'Сведения из формы согласия. Число инцидентов — из журнала инцидентов Durbin.') },

    { html: () => `<div class="kicker">${t('Majlis yakunida imzolaysiz', 'Подписываете в конце собрания')}</div><h2>${t('Darslarni audio yozib olishga rozilik (DA-02)', 'Согласие на аудиозапись уроков (DA-02)')}</h2>
      <div class="body"><div class="pages"><img src="assets/img/rozilik-1.jpg" alt="DA-02, 1-bet"><img src="assets/img/rozilik-2.jpg" alt="DA-02, 2-bet"></div>
      <div class="col">${card(t('Asosiy qoidalar', 'Главные правила'), `<ul style="font-size:24px;line-height:1.55;margin-left:24px;color:var(--ink2)"><li>${t('Faqat ovoz, video yozilmaydi', 'Только звук, видео не пишется')}</li><li>${t('Yozuvlar internetga va boshqa ota-onalarga berilmaydi', 'Записи не публикуются и не передаются другим родителям')}</li><li>${t('Noto‘g‘ri izohni o‘chirishni so‘rash: 5 ish kuni', 'Удалить неверный комментарий: 5 рабочих дней')}</li><li>${t('Rozilikni istalgan vaqtda qaytarib olish mumkin', 'Согласие можно отозвать в любое время')}</li><li>${t('Rozilik bermaslik ta’lim va baholashga ta’sir qilmaydi', 'Отказ не влияет на обучение и оценивание')}</li></ul>`)}
        <div class="card" style="font-size:26px;border-left:8px solid var(--cyan)">${t('Hujjat ikki nusxada: biri sizda, biri farzandingiz shaxsiy ishida.', 'Документ в двух экземплярах: один у вас, второй в личном деле ребёнка.')}</div></div></div>`,
      notes: () => t('Hujjatni hozir tarqating, majlis oxirida yig‘ib oling. Shoshirmang: savollarga javob bering. Rozilik bermaslik huquqi borligini aniq ayting.', 'Раздайте форму сейчас, соберите в конце. Не торопите, отвечайте на вопросы. Чётко скажите о праве отказаться.') },

    { html: () => { const h = D.health, mx = Math.max(...h.cats.map(c => c[1])); return `<div class="kicker">${t('Sog‘liq', 'Здоровье')}</div><h2>${h.visits ? t(`${h.students} o‘quvchi shifokor xonasiga ${h.visits} marta murojaat qildi`, `${h.students} учеников обратились в медкабинет ${h.visits} раз`) : t('Shifokor xonasi', 'Медкабинет')}</h2>
      <div class="body"><div class="col" style="flex:1.4">${h.visits ? hbars(h.cats.filter(c => c[1] > 0).map(([k, v]) => ({ l: tr(k === 'other' ? 'other_h' : k), v, c: '#0F9FCF' })), { w: 1100, row: 92, lw: 420, max: mx }) : ''}</div>
      <div class="col"><div class="card" style="font-size:26px;line-height:1.45;color:var(--ink2)">${t('Har bir murojaat Durbinga yoziladi: sabab, berilgan yordam, natija. Jiddiy holatda hamshira ota-onaga darhol qo‘ng‘iroq qiladi.', 'Каждое обращение записывается в Durbin: причина, помощь, результат. В серьёзных случаях медсестра сразу звонит родителям.')}</div>
      <p class="note">${t('Ismlar ko‘rsatilmaydi. Sabablar yozuv matni bo‘yicha guruhlangan. Farzandingiz haqida ma’lumot shaxsiy hisobotda.', 'Имена не показываются. Причины сгруппированы по тексту записи. Сведения о вашем ребёнке — в личном отчёте.')}</p></div></div>`; },
      notes: () => t('Ismsiz umumiy raqamlar. Ilovada "Sog‘liq" bo‘limida farzandingizning murojaatlari ko‘rinadi.', 'Обезличенные цифры. Обращения вашего ребёнка видны в разделе «Здоровье» приложения.') },

    { when: () => D.logoped, html: () => { const g = D.logoped, S = D.logoped_school, d = x => x.slice(8, 10) + '.' + x.slice(5, 7);
      const F = { sz: t('S, Z, Sh, J tovushlari', 'Звуки С, З, Ш, Ж'), r: t('R tovushi', 'Звук Р'), art: t('Artikulyatsiya: til va lab harakati', 'Артикуляция: движения языка и губ'), swap: t('Tovush va bo‘g‘inlarni almashtirish', 'Замена звуков и слогов'), rhythm: t('Nutq ritmi', 'Ритм речи') };
      const M = { massaj: t('Logomassaj', 'Логомассаж'), gimn: t('Artikulyatsion gimnastika', 'Артикуляционная гимнастика'), nafas: t('Nafas mashqlari', 'Дыхательные упражнения'), til: t('Til massaji', 'Массаж языка'), neyro: t('Neyromashqlar', 'Нейроупражнения'), taktil: t('Diqqat va sezgi mashqlari', 'Упражнения на внимание и ощущения') };
      const fo = Object.entries(g.focus).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]);
      return `<div class="kicker">${t('Logoped', 'Логопед')}</div><h2>${t(`${g.therapy} o‘quvchi logoped bilan shug‘ullanmoqda`, `${g.therapy} уч. занимаются с логопедом`)}</h2>
      <div class="body"><div class="col" style="flex:1.25"><div class="kpis lg4" style="grid-template-columns:repeat(4,minmax(0,1fr))"><div class="kpi"><b>${g.students}</b><span>${t('ko‘rikdan o‘tdi', 'осмотрены')}</span></div><div class="kpi g"><b>${g.therapy}</b><span>${t('shug‘ullanmoqda', 'занимаются')}</span></div><div class="kpi c"><b>${g.sessions}</b><span>${t('mashg‘ulot', 'занятий')}</span></div><div class="kpi y"><b>${d(g.d1)}</b><span>${t('dan beri', 'начало')}</span></div></div>
        <div class="card"><h3 style="font-size:28px;color:var(--navy)">${t('Nima ustida ishlanmoqda', 'Над чем работаем')}</h3>${hbars(fo.map(([k, v]) => ({ l: F[k], v, c: S2 })), { w: 860, row: 62, lw: 470, max: g.students, fmt: v => t(`${v} o‘q.`, `${v} уч.`) })}</div></div>
      <div class="col"><div class="card" style="font-size:24px;line-height:1.45"><h3 style="font-size:28px;color:var(--navy)">${t('Qanday ishlaydi', 'Как устроена работа')}</h3>
        <ol style="margin:10px 0 0 30px;color:var(--ink2)"><li>${t('Tekshiruv-konsultatsiya: logoped nutqni baholaydi', 'Консультация: логопед оценивает речь')}</li><li>${t('Yakka mashg‘ulotlar: ', 'Индивидуальные занятия: ')}${Object.entries(g.meth).filter(e => e[1] > 0).map(e => M[e[0]].toLowerCase()).join(', ')}</li><li>${t('Har bir mashg‘ulot Durbinga yoziladi', 'Каждое занятие записывается в Durbin')}</li></ol></div>
        <div class="card" style="font-size:24px;line-height:1.45;border-left:8px solid var(--cyan)">${t('Ota-onadan iltimos: logoped bergan mashqlarni uyda kuniga 5–10 daqiqa takrorlang. Natija tezroq mustahkamlanadi.', 'Просьба к родителям: повторяйте дома упражнения логопеда по 5–10 минут в день — результат закрепится быстрее.')}</div>
        <p class="note">${t(`Ismlar ko‘rsatilmaydi. Maktab bo‘yicha: ${S.students} o‘quvchi, ${S.classes} sinf, ${S.sessions} mashg‘ulot (${d(S.d1)}–${d(S.d2)}). Farzandingiz bo‘yicha logoped bilan yakka suhbatlashing.`, `Имена не показываются. По школе: ${S.students} учеников, ${S.classes} классов, ${S.sessions} занятий. О своём ребёнке поговорите с логопедом лично.`)}</p></div></div>`; },
      notes: () => t('Logoped oktabrdan ishlay boshladi. Ismlarni aytmang. Qaysi bola qatnashayotganini so‘rashsa, majlisdan keyin yakka tartibda ayting yoki logoped bilan uchrashuv belgilang.', 'Логопед начал работу в октябре. Имён не называйте. Если спросят, кто занимается, скажите лично после собрания или назначьте встречу с логопедом.') },

    { html: () => { const c = D.comms; return INC ? `<div class="kicker">${t('Ota-onalar bilan aloqa', 'Связь с родителями')}</div><h2>${t('Har shanba: ota-onalar bilan jonli uchrashuv', 'Каждую субботу: живая встреча с родителями')}</h2>
      <div class="body"><div class="col">${card(t('Qanday ishlaymiz', 'Как мы работаем'), `<ul style="font-size:27px;line-height:1.6;margin-left:26px;color:var(--ink2)"><li>${t('Sinf rahbari har shanba ota-onalar bilan yuzma-yuz gaplashadi', 'Классный руководитель каждую субботу встречается с родителями лично')}</li><li>${t('Har bir bolaning haftalik o‘sishi muhokama qilinadi', 'Обсуждается недельный рост каждого ребёнка')}</li><li>${t('Uyda mashq qilish bo‘yicha tavsiyalar beriladi', 'Даются рекомендации для занятий дома')}</li></ul>`)}</div>
      <div class="col" style="flex:.6"><img src="assets/img/dubi/qiz.jpg" alt="" style="width:100%;border-radius:30px"></div></div>`
      : `<div class="kicker">${t('Ota-onalar bilan aloqa', 'Связь с родителями')}</div><h2>${c.n ? t(`${c.n} ta suhbat, ${c.students} oila bilan`, `${c.n} бесед с ${c.students} семьями`) : t('Ota-onalar bilan aloqa', 'Связь с родителями')}</h2>
      <div class="body" style="align-items:center"><div>${ring(pc(c.students, D.n), { size: 380 })}<div class="lbl" style="text-align:center">${t('oilalar qamrovi', 'охват семей')}</div></div>
      <div class="col"><div class="kpis" style="grid-template-columns:repeat(3,1fr)"><div class="kpi g"><b>${c.pos}</b><span>${t('ijobiy kayfiyat', 'позитивный настрой')}</span></div><div class="kpi"><b>${c.neu}</b><span>${t('neytral', 'нейтральный')}</span></div><div class="kpi y"><b>${c.neg}</b><span>${t('e’tiroz bilan', 'с возражением')}</span></div></div>
      <div class="card" style="font-size:26px;line-height:1.45;color:var(--ink2)">${t(`${roleName()} har hafta oilalar bilan bog‘lanadi, har suhbat Durbinga yoziladi. 1-chorakda o‘rtacha har bir oila bilan ${f(c.n / Math.max(1, c.students), 1)} marta gaplashilgan.`, `${roleName()} каждую неделю связывается с семьями, каждая беседа записывается в Durbin. В 1-й четверти в среднем ${f(c.n / Math.max(1, c.students), 1)} беседы на семью.`)}</div></div></div>`; },
      notes: () => t('Qaysi vaqtda qo‘ng‘iroq qilish qulayligini so‘rang.', 'Спросите, в какое время удобно звонить.') },

    { html: () => { const crit = [['edu', t('Ta’lim sifati', 'Качество обучения')], ['cl', roleName()], ['ext', t('To‘garak va tadbirlar', 'Кружки, события')], ['org', t('Tashkiliy masalalar', 'Организация')]];
      const hasC = Q && Q.av != null;
      return `<div class="kicker">${t('Qabul bo‘limi suhbatlari', 'Беседы приёмной')}</div><h2>${t('Ota-onalar maktabni qanday baholamoqda', 'Как родители оценивают школу')}</h2>
      <p class="note">${t(`Qabul bo‘limi 08–27 oktabr kunlari ${QS.talked} ta suhbatda ota-onalardan 1 dan 10 gacha baho so‘radi.`, `С 8 по 27 октября приёмная в ${QS.talked} беседах попросила родителей оценить школу от 1 до 10.`)}</p>
      <div class="body"><div class="col" style="flex:1.4"><div class="legend">${hasC ? `<span><i style="background:${S1}"></i>${D.k}</span>` : ''}<span><i style="background:${S3}"></i>${t('Maktab', 'Школа')}</span></div>
        ${groupBars(crit.map(c => c[1]), (hasC ? [{ n: D.k, c: S1, v: crit.map(c => Q[c[0]]) }] : []).concat([{ n: t('Maktab', 'Школа'), c: S3, v: crit.map(c => QS[c[0]]) }]), { w: 1050, h: 560, min: 0, max: 10, fmt: v => f(v, 1) })}</div>
      <div class="col"><div class="card" style="text-align:center"><div class="big">${f(hasC ? Q.av : QS.av, 1)}</div><div class="lbl">${hasC ? t(`${D.k} sinfi ota-onalarining umumiy bahosi (maktab: ${f(QS.av, 1)})`, `общая оценка родителей ${D.k} (школа: ${f(QS.av, 1)})`) : t('maktab bo‘yicha umumiy baho', 'общая оценка по школе')}</div></div>
        <div class="kpi g"><b>${pc((hasC ? Q.pos : QS.pos), (hasC ? Q.pos + Q.neu + Q.neg : QS.pos + QS.neu + QS.neg))}%</b><span>${t('suhbatlarda ijobiy kayfiyat', 'бесед с позитивным настроем')}</span></div></div></div>`; },
      notes: () => t('Bu mustaqil bo‘lim (qabul bo‘limi) o‘tkazgan suhbatlar natijasi. Yuqori bahoga rahmat ayting, eng past mezon bo‘yicha nima qilinayotganini ayting.', 'Результаты бесед независимого отдела (приёмной). Поблагодарите за высокие оценки и скажите, что делается по самому низкому критерию.') },

    { html: () => { const cs = D.complaint_status; return `<div class="kicker">${t('Murojaatlar', 'Обращения')}</div><h2>${t('Sizni nima bezovta qilgan', 'Что вас беспокоило')}</h2>
      <div class="body"><div class="col" style="flex:1.3"><p class="note">${t(`Maktab bo‘yicha 1-chorakda ${cs.real} ta shikoyat va taklif. Mavzular bo‘yicha:`, `По школе в 1-й четверти ${cs.real} жалоб и предложений. По темам:`)}</p>
        ${hbars(D.complaint_topics.map(([k, v]) => ({ l: tr(k), v, c: S1 })), { w: 1050, row: 62, lw: 460 })}</div>
      <div class="col"><div class="card"><h3 style="font-size:28px;color:var(--navy)">${D.k} ${t('sinfidan', 'из класса')}: ${D.class_complaints.reduce((a, x) => a + x[1], 0)}</h3>
        ${D.class_complaints.length ? `<ul style="font-size:24px;line-height:1.45;margin:14px 0 0 26px;color:var(--ink2)">${D.class_complaints.map(([k, v]) => `<li>${tr(k)}: ${v}</li>`).join('')}</ul>` : `<p class="note" style="margin-top:10px">${t('Sinf ota-onalaridan rasmiy shikoyat qayd etilmagan.', 'Официальных жалоб от родителей класса не зарегистрировано.')}</p>`}</div>
        <div class="card frag" style="font-size:24px;line-height:1.45;color:var(--ink2)">${t('Har bir murojaat yozib olinadi va mas’ul xodimga yetkaziladi. Javob sizga qaytariladi.', 'Каждое обращение записывается и передаётся ответственному. Ответ вернётся к вам.')}</div></div></div>`; },
      notes: () => t('Murojaatlarni yashirmang, lekin "hal qilindi" demang: faqat aniq bajarilgan ishni ayting.', 'Не скрывайте обращения, но не говорите «решено» — называйте только реально сделанное.') },

    { html: () => `<div class="kicker">${t('Savollaringiz kimga', 'Кому задавать вопросы')}</div><h2>${t('Har savol o‘z egasiga yetadi', 'Каждый вопрос дойдёт до адресата')}</h2>
      <div class="body" style="margin-top:30px"><div class="col card" style="border-top:8px solid var(--navy)"><h3 style="font-size:34px;color:var(--navy)">${roleName()} ${t('javob beradi', 'отвечает')}</h3>
        <div class="grid3" style="grid-template-columns:repeat(2,1fr);margin-top:18px">${[t('Ta’lim', 'Обучение'), t('Tartib', 'Порядок'), t('Intizom', 'Дисциплина'), t('Natija', 'Результат')].map(x => `<div class="chip" style="font-size:28px;padding:16px 24px;justify-content:center">${x}</div>`).join('')}</div>
        <p class="sub" style="margin-top:20px;font-size:26px">${t('Shu yerda, hozir javob beraman.', 'Отвечу здесь и сейчас.')}</p></div>
      <div class="col card" style="border-top:8px solid var(--cyan)"><h3 style="font-size:34px;color:var(--navy)">${t('Ma’muriyatga yetkaziladi', 'Передаётся администрации')}</h3>
        <div class="grid3" style="grid-template-columns:repeat(2,1fr);margin-top:18px">${[t('Ovqat', 'Питание'), t('Avtobus', 'Автобус'), t('Moliya, to‘lov', 'Финансы, оплата'), t('Yotoqxona', 'Общежитие')].map(x => `<div class="chip" style="font-size:28px;padding:16px 24px;justify-content:center;background:#F5FBFF">${x}</div>`).join('')}</div>
        <p class="sub" style="margin-top:20px;font-size:26px">${t('Savolingizni yozib olaman, ma’muriyatga yetkazaman va javobini sizga aytaman.', 'Запишу вопрос, передам администрации и сообщу вам ответ.')}</p></div></div>`,
      notes: () => t('Muhim qoida: ovqat, avtobus, moliya va yotoqxona bo‘yicha o‘zingiz javob bermang. Savolni ism va telefon bilan yozib oling, ma’muriyatga yetkazing va javobni ota-onaga qaytaring. Siz ta’lim, tartib, intizom va natijaga javob berasiz.', 'Важное правило: по питанию, автобусу, финансам и общежитию сами не отвечайте. Запишите вопрос с именем и телефоном, передайте администрации и верните ответ родителю. Вы отвечаете за обучение, порядок, дисциплину и результат.') },

    { when: () => L && L.pct != null && L.need > 0 && !INC, html: () => { const LS = D.library_school; return `<div class="kicker">${t('Kutubxona', 'Библиотека')}</div><h2>${t(`Darsliklar bilan ta’minlanganlik: ${L.pct}%`, `Обеспеченность учебниками: ${L.pct}%`)}</h2>
      <div class="body" style="align-items:center"><div>${ring(L.pct, { size: 380, c: L.pct >= 90 ? '#2E7D0F' : S3 })}</div>
      <div class="col"><div class="kpis" style="grid-template-columns:repeat(3,1fr)"><div class="kpi"><b>${L.subjects}</b><span>${t('darslikli fan', 'предметов с учебником')}</span></div><div class="kpi g"><b>${Math.round(L.have)}</b><span>${t(`o‘quvchilar qo‘lida (kerak: ${L.need})`, `на руках (нужно: ${L.need})`)}</span></div><div class="kpi c"><b>${f(LS.pct, 1)}%</b><span>${t('maktab bo‘yicha', 'по школе')}</span></div></div>
      <div class="card" style="font-size:25px;line-height:1.45;color:var(--ink2)">${L.pct >= 100 ? t('Sinf darsliklar bilan to‘liq ta’minlangan.', 'Класс полностью обеспечен учебниками.') : t('Yetishmayotgan darsliklar viloyat xalq ta’limi boshqarmasidan kutilmoqda: talabnoma yuborilgan.', 'Недостающие учебники ожидаются из областного управления образования: заявка отправлена.')}</div>
      <p class="note">${t('Manba: kutubxona hisobi, 12.10.2026. Kutubxona Durbin tizimiga o‘tkazilmoqda.', 'Источник: учёт библиотеки, 12.10.2026. Библиотека переводится в Durbin.')}</p></div></div>`; },
      notes: () => t('Raqam kutubxona Excel hisobidan. Qaysi darslik yetishmasligi bo‘yicha savol bo‘lsa, yozib oling va kutubxonachiga yetkazing.', 'Цифра из учёта библиотеки (Excel). Вопросы о конкретных учебниках запишите и передайте библиотекарю.') },

    { html: () => `<div class="kicker">${t('Durbin ota-ona ilovasi', 'Родительское приложение Durbin')}</div><h2>${t(`${famPct}% oilamiz ilovada bizni kuzatmoqda`, `${famPct}% наших семей следят за нами в приложении`)}</h2>
      <div class="body" style="align-items:center"><div>${ring(famPct, { size: 380, c: S1 })}</div>
      <div class="col"><div class="kpis" style="grid-template-columns:repeat(3,1fr)"><div class="kpi"><b>${D.app.families} / ${D.n}</b><span>${t('oila', 'семей')}</span></div><div class="kpi c"><b>${D.app.viewers}</b><span>${t('ota-ona (ona, ota, vasiy)', 'родителей')}</span></div><div class="kpi y"><b>${schoolFam}%</b><span>${t('maktab bo‘yicha', 'по школе')}</span></div></div>
      <div class="card" style="font-size:27px;line-height:1.45;border-left:8px solid var(--cyan)">${t('Maqsad: 2-chorak oxirigacha har bir oila ilovada. Hozir telefoningizni oling: keyingi slaydda qayerda nima borligini ko‘rsatamiz.', 'Цель: к концу 2-й четверти каждая семья в приложении. Возьмите телефон: на следующем слайде покажем, где что находится.')}</div>
      <p class="note">${t('Hisob: 1-chorakda ilovada kamida bitta e’lonni ochgan ota-onalar. Haqiqiy foydalanuvchilar bundan ko‘p bo‘lishi mumkin.', 'Учтены родители, открывшие в приложении хотя бы одно объявление. Реальных пользователей может быть больше.')}</p></div></div>`,
      notes: () => t('Login va parolni majlis oxirida tyutordan olishni taklif qiling, o‘rnatishga yordam bering.', 'Предложите получить логин и пароль у тьютора в конце собрания, помогите установить.') },

    { html: () => `<div class="kicker">${t('Yo‘riqnoma', 'Инструкция')}</div><h2>${t('Ilovada nimani qayerdan kuzatasiz', 'Что и где смотреть в приложении')}</h2>
      <div class="body"><div class="tabs sm col" id="appTabs" style="flex:1"></div><div class="phone"><img id="appImg" src="assets/img/app/${LANG}/asosiy.jpg" alt=""></div>
      <div class="col" style="flex:.9"><div class="card"><h3 style="font-size:28px;color:var(--navy)">${t('Asosiy sahifadagi boshqa bo‘limlar', 'Другие разделы на главной')}</h3><ul style="font-size:23px;line-height:1.6;margin:12px 0 0 26px;color:var(--ink2)">
        ${[t('Reyting: sinfdagi o‘rni va GPA', 'Рейтинг: место в классе и GPA'), t('Sog‘liq: shifokor ko‘riklari', 'Здоровье: осмотры врача'), t('Yutuqlar va koinlar', 'Достижения и коины'), t('Farovonlik: psixolog bilan ishlashga rozilik', 'Благополучие: согласия на работу психолога'), t('Ovqatlanish menyusi', 'Меню питания'), t('To‘lov hisoboti', 'Отчёт об оплате'), t('Taklif va shikoyat: direktorga yozish', 'Предложения и жалобы директору'), t('Profil: farzandlar, til', 'Профиль: дети, язык')].map(x => `<li>${x}</li>`).join('')}</ul></div>
      <p class="note">${t('Ilovaning joriy versiyasi (1.1.3). Rasmlardagi ism va baholar namunaviy.', 'Текущая версия приложения (1.1.3). Имена и оценки на скриншотах условные.')}</p></div></div>`,
      init: el => {
        const tabs = [['asosiy', t('Asosiy', 'Главная'), t('O‘rtacha baho, foiz, koin, bugungi darslar', 'Средний балл, процент, коины, уроки на сегодня')], ['natijalar', t('Natijalar', 'Результаты'), t('Har bir fan: baho va foiz, chorak bo‘yicha', 'Каждый предмет: оценка и процент по четвертям')], ['imtihonlar', t('Imtihonlar', 'Экзамены'), t('Progress testlar va chorak imtihonlari', 'Прогресс-тесты и четвертные экзамены')], ['kundalik', t('Kundalik', 'Дневник'), t('Dars, mavzu, baho va uy vazifasi', 'Урок, тема, оценка и домашнее задание')], ['davomat', t('Davomat', 'Посещаемость'), t('Kelgan, kechikkan, sababli va sababsiz', 'Пришёл, опоздал, по уважительной и без')], ['chat', t('Chat', 'Чат'), t('Har bir fan ustoziga to‘g‘ridan-to‘g‘ri yozish', 'Написать напрямую учителю предмета')], ['aichat', t('AI Chat', 'AI Чат'), t('Farzandingiz haqida savol bering', 'Спросите о своём ребёнке')]];
        const box = el.querySelector('#appTabs'), img = el.querySelector('#appImg');
        box.innerHTML = tabs.map(x => `<button class="tab" data-k="${x[0]}">${x[1]}<small>${x[2]}</small></button>`).join('');
        const show = k => { box.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.k === k)); img.src = `assets/img/app/${LANG}/${k}.jpg`; };
        box.querySelectorAll('.tab').forEach(b => (b.onclick = () => show(b.dataset.k))); show('asosiy');
      },
      notes: () => t('Bo‘limlarni bosib ko‘rsating va ota-onalarga o‘z telefonida ochishni so‘rang.', 'Нажимайте разделы и просите родителей открыть их у себя.') },

    { dark: true, html: () => `<div class="kicker">${t('Yangilik', 'Новинка')}</div><h2>${t('Durbin Students: Dubi bilan tanishing', 'Durbin Students: знакомьтесь, Dubi')}</h2>
      <p class="sub" style="max-width:1200px">${t('O‘quvchilar uchun ilova yaratyapmiz. Dubi bolani bilimga yaqinlashtiradigan hamroh: "5" olsa faxrlanadi, past baho olsa "keling, qaytadan qaraymiz" deydi.', 'Мы создаём приложение для учеников. Dubi — спутник, который радуется «5», а при низкой оценке говорит «давай разберём ещё раз».')}</p>
      <div class="dubi" style="margin-top:30px">${[['mur418', 'Oktam', t('Matematika', 'Математика')], ['mur419', 'Tilla', t('Tillar', 'Языки')], ['mur420', 'Donish', t('Tabiiy fanlar', 'Естественные науки')], ['mur421', 'Kodir', 'IT'], ['mur422', t('Mayoqchi bobo', 'Дед Маячник'), t('Tarix, adabiyot', 'История, литература')], ['mur423', 'Chaqqon', t('Sport', 'Спорт')], ['mur424', 'Ohang', t('San’at', 'Искусство')]]
        .map(x => `<figure class="frag"><img src="assets/img/dubi/${x[0]}.jpg" alt="${x[1]}"><figcaption style="color:var(--ink)">${x[1]}<small>${x[2]}</small></figcaption></figure>`).join('')}</div>
      <div style="display:flex;gap:30px;margin-top:26px;align-items:center"><img src="assets/img/dubi/evo3.png" alt="Dubi" style="height:220px">
        <p class="sub" style="font-size:27px">${t('"Ichki dushmanlar" ham bor: Uyqichi Mors (dangasalik), Chalg‘it baliq (telefon), Ertaga Tuman (keyinga qoldirish). Ustozlar uchun ham alohida mobil ilova sinovdan o‘tmoqda.', 'Есть и «внутренние враги»: Соня-Морж (лень), Рыба-Отвлекалка (телефон), Туман «Завтра» (откладывание). Отдельное приложение для учителей тоже тестируется.')}</p>
        <img src="assets/img/dubi/mors.png" alt="" style="height:190px"><img src="assets/img/dubi/baliq.png" alt="" style="height:160px"><img src="assets/img/dubi/tuman.png" alt="" style="height:180px"></div>`,
      notes: () => t('Bu reja bo‘yicha yangilik, ilova hali chiqmagan: sanani va’da qilmang.', 'Это анонс, приложение ещё не вышло: не обещайте дату.') },

    { html: () => `<div class="kicker">${t('Majlis yakunida', 'В конце собрания')}</div><h2>${t('Har bir oilaga farzandi haqida shaxsiy hisobot', 'Каждой семье — личный отчёт о ребёнке')}</h2>
      <div class="body"><div class="pages">${[1, 2, 3].map(i => `<img src="assets/img/hisobot-${i}.jpg" alt="">`).join('')}</div>
      <div class="col"><ul style="font-size:27px;line-height:1.6;color:var(--ink2);margin-left:30px">
        <li>${t('Davomat: har bir qoldirilgan dars sanasi bilan', 'Посещаемость: каждый пропуск с датой')}</li><li>${t('Har bir fan: ustoz, darslar, baholar, sinf o‘rtachasi', 'Каждый предмет: учитель, уроки, оценки, среднее по классу')}</li><li>${t('Koin va ustozlar izohlari', 'Коины и комментарии учителей')}</li><li>${t('Tyutor bilan suhbatlar', 'Беседы с тьютором')}</li><li>${t('Kuchli tomonlar va e’tibor kerak joylar', 'Сильные стороны и зоны внимания')}</li><li>${t('Sanali reja: kim, nima, qachon', 'План с датами: кто, что, когда')}</li></ul>
      <p class="note">${t('Namuna hisobot, ma’lumotlar yashirilgan.', 'Пример отчёта, данные скрыты.')}</p></div></div>`,
      notes: () => t('Hisobotni konvertda bering: har oila faqat o‘z farzandining hisobotini oladi.', 'Отчёт раздайте в конверте: каждая семья получает только отчёт своего ребёнка.') },

    { html: () => `<div class="kicker">${t('2-chorak', '2-я четверть')}</div><h2>${t('09.11 – 26.12: reja va sinf maqsadlari', '09.11 – 26.12: план и цели класса')}</h2>
      <div class="body"><div class="col timeline" style="flex:1.1">${[['09.11', t('2-chorak boshlanadi', 'Начало 2-й четверти'), ''], ['09.11 dan', t('Ota-onalar majlislari', 'Родительские собрания'), t('sinflar navbat bilan', 'классы по очереди')], ['30.11', t('Noyabr oyi shaxsiy hisoboti', 'Личный отчёт за ноябрь'), ''], [t('Dekabr', 'Декабрь'), t('Progress imtihonlar', 'Прогресс-экзамены'), t('sanalar alohida e’lon qilinadi', 'даты объявим отдельно')], ['26.12', t('2-chorak yakuni', 'Конец 2-й четверти'), ''], ['05.01', t('3-chorak boshlanadi', 'Начало 3-й четверти'), '']]
        .map(x => `<div class="tl frag"><div class="d">${x[0]}</div><div class="p"></div><div class="t">${x[1]}<small>${x[2]}</small></div></div>`).join('')}</div>
      <div class="col">${card(t('Sinf maqsadlari', 'Цели класса'), [!NG && [t('O‘rtacha baho', 'Средний балл'), f(g.avg), f(Math.min(5, g.avg + 0.07))], [t('Davomat', 'Посещаемость'), f(att.pct, 1) + '%', f(Math.max(95, Math.min(99, att.pct + 1)), 0) + '%'], worstExam && [t(`${subjT(worstExam.subj)}: progress`, `${subjT(worstExam.subj)}: прогресс`), f(worstExam.pct, 0) + '%', f(Math.max(70, worstExam.pct + 10), 0) + '%'], [t('Ilovadagi oilalar', 'Семьи в приложении'), D.app.families + '/' + D.n, D.n + '/' + D.n]].filter(Boolean)
          .map(x => `<div style="display:grid;grid-template-columns:1fr 130px 40px 130px;align-items:center;font-size:27px;padding:12px 0;border-bottom:1px solid var(--line)"><span>${x[0]}</span><b style="color:#8792ad;text-align:right">${x[1]}</b><span style="text-align:center;color:var(--cyan)">→</span><b style="color:var(--navy);text-align:right">${x[2]}</b></div>`).join(''))}</div></div>`,
      notes: () => t('Chorak sanalari Durbin kalendaridan. Sinf maqsadlarini ota-onalar bilan kelishib oling.', 'Даты четвертей из календаря Durbin. Согласуйте цели класса с родителями.') },

    { html: () => `<div class="kicker">${t('Hamkorlik', 'Сотрудничество')}</div><h2>${t('Birgalikda erishamiz', 'Достигнем вместе')}</h2>
      <div class="grid3" style="margin-top:30px">${[[t('Ilovaga haftada 2 marta kiring', 'Заходите в приложение 2 раза в неделю'), t('Baho, davomat, ustoz izohi va uy vazifasini ko‘ring', 'Смотрите оценки, посещаемость, комментарии и домашнее задание')],
        [t('Haftada bir marta takrorlash', 'Повторение раз в неделю'), t('O‘tilgan mavzularni 20 daqiqa birga takrorlang: progress imtihon shunga bog‘liq', '20 минут повторите пройденное вместе — от этого зависит прогресс-экзамен')],
        [t('Tyutor bilan aloqa', 'Связь с тьютором'), t('Qo‘ng‘iroqqa javob bering, xavotir bo‘lsa o‘zingiz yozing', 'Отвечайте на звонки, при беспокойстве пишите сами')],
        [t('Uyqu va telefon', 'Сон и телефон'), t('Kechqurun telefon vaqti cheklansa, ertalab bola dars uchun tayyor bo‘ladi', 'Если вечером ограничить телефон, утром ребёнок готов к урокам')],
        [t('Kasal bo‘lsa uyda qoldiring', 'Болеет — оставьте дома'), t('Va ertalab tyutorga xabar bering', 'И утром сообщите тьютору')],
        [t('Rozilik hujjati', 'Форма согласия'), t('Majlis oxirida DA-02 hujjatini o‘qib, imzolang', 'В конце собрания прочитайте и подпишите форму DA-02')]]
        .map((x, i) => `<div class="card frag"><div style="font-size:44px;font-weight:800;color:var(--cyan)">${i + 1}</div><h3 style="font-size:30px;margin:8px 0;color:var(--navy)">${x[0]}</h3><p style="font-size:24px;color:var(--ink2);line-height:1.4">${x[1]}</p></div>`).join('')}</div>`,
      notes: () => t('Har bandni bitta misol bilan ayting.', 'Каждый пункт подкрепите примером.') },

    { html: () => `<div class="kicker">${t('Ko‘p beriladigan savollar', 'Частые вопросы')}</div><h2>${t('Savollaringizga javoblar', 'Ответы на ваши вопросы')}</h2><div id="faq" style="margin-top:30px;display:grid;grid-template-columns:1fr 1fr;gap:14px;align-content:start;align-items:start"></div>`,
      init: el => {
        const qa = [
          [t('Nega kundalikda 5, progressda 3?', 'Почему в дневнике 5, а на прогрессе 3?'), t('Kundalik baho bitta mavzu bo‘yicha, progress imtihon bir necha haftalik mavzular bo‘yicha. Farq takrorlash yetishmasligini ko‘rsatadi.', 'Ежедневная оценка — по одной теме, прогресс — по темам нескольких недель. Разница показывает нехватку повторения.')],
          [t('GPA va ilovadagi foiz nima?', 'Что такое GPA и процент в приложении?'), t('GPA har bir fan o‘rtachasining o‘rtachasi. Ilovadagi foiz = o‘rtacha baho × 20.', 'GPA — среднее средних по предметам. Процент в приложении = средний балл × 20.')],
          [t('Uy vazifasi bo‘yicha qiynalyapmiz', 'Ребёнку трудно с домашним заданием'), t('Tyutorga ayting: ustoz bilan qo‘shimcha mashg‘ulot kelishiladi.', 'Скажите тьютору: договоримся о дополнительном занятии с учителем.')],
          [t('Ingliz tili va matematika guruhlari qanday tuzilgan?', 'Как сформированы группы по английскому и математике?'), t('Darajaga qarab. Natija yaxshilansa, bola yuqori guruhga o‘tkaziladi va bu Durbinda qayd etiladi.', 'По уровню. При улучшении ребёнка переводят выше, это фиксируется в Durbin.')],
          [t('Darsda ovoz yozilyapti. Bolamning ovozi qayerga ketadi?', 'Куда попадает голос ребёнка при записи урока?'), t('Yozuv 60 kun saqlanadi va o‘chiriladi. Uni shu dars ustozi, direktor va direktor o‘rinbosari eshitadi. Tahlilda boshqa o‘quvchilar ismi yashiriladi.', 'Запись хранится 60 дней и удаляется. Её слушают учитель урока, директор и заместитель. В анализе имена других учеников скрыты.')],
          [t('Bolalar o‘rtasida nizo bo‘lsa nima qilinadi?', 'Что делается при конфликте между детьми?'), t('Har bir holat hodisalar daftariga yoziladi, tyutor ikkala oila bilan gaplashadi.', 'Каждый случай вносится в журнал инцидентов, тьютор говорит с обеими семьями.')],
          [t('Ovqat, avtobus, to‘lov yoki yotoqxona bo‘yicha savolim bor', 'У меня вопрос о питании, автобусе, оплате или общежитии'), t('Savolingizni yozib olaman, ma’muriyatga yetkazaman va javobini sizga aytaman.', 'Запишу вопрос, передам администрации и сообщу ответ.')],
          [t('Ovqat menyusini qayerdan ko‘raman?', 'Где посмотреть меню питания?'), t('Durbin ilovasida "Ovqatlanish menyusi" bo‘limida.', 'В приложении Durbin, раздел «Меню питания».')],
          [t('Ilovaga login va parolni qayerdan olaman?', 'Где взять логин и пароль?'), t('Tyutordan. Majlis oxirida birga o‘rnatamiz.', 'У тьютора. В конце собрания установим вместе.')]];
        const box = el.querySelector('#faq');
        box.innerHTML = qa.map(x => `<div class="acc"><button>${x[0]}</button><div>${x[1]}</div></div>`).join('');
        box.querySelectorAll('.acc button').forEach(b => (b.onclick = () => b.parentNode.classList.toggle('open')));
      },
      notes: () => t('Ota-ona so‘ragan savolni bosib javobni oching. Javob bilmasangiz, yozib oling va 3 kun ichida qaytib aloqaga chiqing.', 'Откройте вопрос, который задал родитель. Если не знаете ответа, запишите и свяжитесь в течение 3 дней.') },

    { dark: true, html: () => `<div style="display:flex;gap:80px;align-items:center;flex:1">
      <div style="flex:1"><div class="kicker">${t('Aloqa', 'Контакты')}</div><h1 style="font-size:110px;margin:20px 0">${t('Rahmat!<br>Savollaringiz?', 'Спасибо!<br>Ваши вопросы?')}</h1>
      <div class="sub" style="font-size:32px;line-height:1.6">${roleName()}: <b style="color:#fff">${esc(D.lead)}</b><br>${t('Maktab', 'Школа')}: +998 55 602 00 55<br>datamaktab.uz · @data_maktab</div>
      <div class="chip" style="margin-top:26px;background:var(--cyan);color:var(--navy);font-size:24px">${t('Chiqishda: shaxsiy hisobot va rozilik hujjati (DA-02)', 'На выходе: личный отчёт и форма согласия (DA-02)')}</div></div>
      <img src="assets/img/dubi/ogil.jpg" alt="" style="height:620px;border-radius:40px"></div>`,
      notes: () => t('Savol-javob uchun 15-20 daqiqa. Oxirida shaxsiy hisobotlarni tarqating, rozilik hujjatlarini yig‘ing va ilovani o‘rnatishga yordam bering.', 'На вопросы 15–20 минут. В конце раздайте отчёты, соберите формы согласия и помогите установить приложение.') },
  ].filter(s => !s.when || s.when());
}

/* ---------- render & navigation ---------- */
function renderStage(stage) {
  stage.innerHTML = SLIDES.map((s, i) => `<section class="slide${s.dark ? ' dark' : ''}" data-i="${i}">${s.html()}${foot()}</section>`).join('') + '<div class="tip"></div>';
  stage.querySelectorAll('.slide').forEach((el, i) => SLIDES[i].init && SLIDES[i].init(el));
}

function fit(stage, box) {
  const w = box ? box.clientWidth : innerWidth, h = box ? box.clientHeight : innerHeight;
  const s = Math.min(w / 1920, h / 1080);
  stage.style.transform = box ? `scale(${s})` : `translate(-50%, -50%) scale(${s})`;
  if (box) { stage.style.left = (w - 1920 * s) / 2 + 'px'; stage.style.top = (h - 1080 * s) / 2 + 'px'; }
}

function show(stage, i, fr) {
  stage.querySelectorAll('.slide').forEach((el, k) => {
    el.classList.toggle('on', k === i);
    if (k === i) el.querySelectorAll('.frag').forEach((x, j) => x.classList.toggle('in', j < fr));
  });
}

function fragsOf(i) { return document.querySelector(`#main .slide[data-i="${i}"]`)?.querySelectorAll('.frag').length || 0; }

function go(i, fr, from) {
  cur = Math.max(0, Math.min(SLIDES.length - 1, i)); frag = fr;
  const main = document.getElementById('main');
  if (main) show(main, cur, frag);
  if (PRESENTER) updatePresenter();
  document.querySelector('.progress').style.width = ((cur + 1) / SLIDES.length) * 100 + '%';
  if (!from && chan) chan.postMessage({ i: cur, f: frag });
  history.replaceState(null, '', `#${cur + 1}`);
  suggestLink();
}
// Tyutor taklifi: Telegram'ni sinf, slayd raqami va sarlavhasi yozilgan tayyor xabar bilan ochadi
function suggestLink() {
  const a = document.getElementById('sug'); if (!a || !D) return;
  const sl = document.querySelector(`#main .slide[data-i="${cur}"]`);
  const kick = sl?.querySelector('.kicker')?.textContent || '', title = sl?.querySelector('h1,h2')?.textContent || '';
  const text = `${t('Taklif', 'Предложение')} · ${D.k} · ${cur + 1}-${t('slayd', 'слайд')} (${kick}: ${title})\n\n`;
  a.href = `https://t.me/share/url?url=${encodeURIComponent(location.href)}&text=${encodeURIComponent(text)}`;
}
function next() { const n = PRESENTER ? (document.querySelector(`#pcur .slide[data-i="${cur}"]`)?.querySelectorAll('.frag').length || 0) : fragsOf(cur); frag < n ? go(cur, frag + 1) : cur < SLIDES.length - 1 && go(cur + 1, 0); }
function prev() { frag > 0 ? go(cur, frag - 1) : cur > 0 && go(cur - 1, 99); }

function setLang(l) {
  LANG = l; localSet('lang', l); document.documentElement.lang = l;
  rebuild(); if (chan) chan.postMessage({ lang: l });
}

function rebuild() {
  build();
  if (PRESENTER) { renderStage(document.querySelector('#pcur .stage')); renderStage(document.querySelector('#pnext .stage')); }
  else renderStage(document.getElementById('main'));
  go(cur, frag, true);
  layout();
}

/* presenter */
let t0 = null;
function updatePresenter() {
  show(document.querySelector('#pcur .stage'), cur, frag);
  show(document.querySelector('#pnext .stage'), Math.min(cur + 1, SLIDES.length - 1), 99);
  document.getElementById('pnotes').textContent = SLIDES[cur].notes();
  document.getElementById('pmeta').textContent = `${cur + 1} / ${SLIDES.length} · ${D.k} · ${LANG.toUpperCase()}`;
}
function tick() {
  if (!t0) return;
  const s = Math.floor((Date.now() - t0) / 1000), el = document.getElementById('ptimer');
  el.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')} / 60:00`;
  el.classList.toggle('late', s > 3600);
}

function layout() {
  if (PRESENTER) { fit(document.querySelector('#pcur .stage'), document.getElementById('pcur')); fit(document.querySelector('#pnext .stage'), document.getElementById('pnext')); }
  else fit(document.getElementById('main'));
}

function tips(root) {
  root.addEventListener('mousemove', e => {
    const stage = e.target.closest('.stage'); if (!stage) return;
    const tip = stage.querySelector('.tip'), h = e.target.closest('[data-tip]');
    if (!h) return tip.classList.remove('on');
    const r = stage.getBoundingClientRect(), s = r.width / 1920;
    tip.textContent = h.dataset.tip; tip.classList.add('on');
    tip.style.left = Math.min(1920 - 420, (e.clientX - r.left) / s + 18) + 'px'; tip.style.top = (e.clientY - r.top) / s + 18 + 'px';
  });
}

async function main() {
  document.documentElement.lang = LANG;
  try { D = await VAULT.json(`data/${KEY}.json`); }
  catch (e) { document.body.innerHTML = `<p style="color:#fff;padding:40px;font-size:24px">${KEY}: ma'lumot topilmadi / данные не найдены</p>`; return; }
  document.title = `${D.k} · ${t('Ota-onalar majlisi', 'Родительское собрание')}`;
  if (PRESENTER) {
    document.body.classList.add('presenter');
    document.getElementById('pstart').onclick = () => { t0 = Date.now(); };
    document.getElementById('pprev').onclick = prev; document.getElementById('pnext-b').onclick = next;
    document.getElementById('plang').onclick = () => setLang(LANG === 'uz' ? 'ru' : 'uz');
    setInterval(tick, 1000);
  }
  cur = Math.max(0, (parseInt(location.hash.slice(1)) || 1) - 1);
  if (Q.has('shot')) { frag = 99; document.body.classList.add('shot'); } // skrinshot uchun: barcha bo'laklar ochiq
  rebuild();
  tips(document.body);
  addEventListener('resize', layout);
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); prev(); }
    else if (e.key === 'Home') go(0, 0); else if (e.key === 'End') go(SLIDES.length - 1, 0);
    else if (e.key === 'l' || e.key === 'L') setLang(LANG === 'uz' ? 'ru' : 'uz');
    else if (e.key === 'f' || e.key === 'F') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    else if (e.key === 'p' || e.key === 'P') openPresenter();
  });
  if (chan) chan.onmessage = ({ data }) => { if (data.lang && data.lang !== LANG) { LANG = data.lang; rebuild(); } if (data.i != null) go(data.i, data.f, true); };
  if (!PRESENTER) document.getElementById('main').addEventListener('click', e => { if (!e.target.closest('button,input,a,.pod,.hit,.acc,figure,.tab')) next(); });
}
function openPresenter() { window.open(`deck.html?k=${encodeURIComponent(KEY)}&lang=${LANG}&p=1#${cur + 1}`, 'suflyor', 'width=1400,height=850'); }
main();
