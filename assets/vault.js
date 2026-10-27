/* Shifrlangan ma'lumotni ochish. Saytdagi data/*.json fayllar AES-GCM bilan shifrlangan
   ({v,s,i,c}); kalit paroldan PBKDF2 orqali olinadi va brauzerda saqlanadi (bir marta kiritiladi).
   Lokal (shifrlanmagan) faylda to'g'ridan-to'g'ri JSON qaytaradi. */
const VAULT = (() => {
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const KEY_ITEM = 'majlis.key';
  let key = null;

  async function derive(pass, salt) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, base,
      { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
  }
  async function stored() {
    try {
      const raw = localStorage.getItem(KEY_ITEM);
      return raw ? crypto.subtle.importKey('raw', b64(raw), 'AES-GCM', false, ['decrypt']) : null;
    } catch (e) { return null; }
  }
  async function remember(k) {
    try { localStorage.setItem(KEY_ITEM, btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey('raw', k))))); } catch (e) {}
  }
  const open = (k, box) => crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(box.i) }, k, b64(box.c))
    .then(buf => JSON.parse(new TextDecoder().decode(buf)));

  function ask(box) {
    return new Promise(done => {
      const w = document.createElement('div');
      w.style.cssText = 'position:fixed;inset:0;z-index:99;display:grid;place-items:center;background:#072BAD;font-family:"Plus Jakarta Sans",system-ui,sans-serif';
      w.innerHTML = `<form style="background:#fff;border-radius:24px;padding:36px 32px;width:min(420px,calc(100vw - 32px));box-shadow:0 30px 80px rgba(0,0,0,.25)">
        <h2 style="margin:0 0 6px;color:#072BAD;font-size:24px">Parol / Пароль</h2>
        <p style="margin:0 0 18px;color:#555;font-size:15px;line-height:1.4">Faqat DATA xalqaro maktabi xodimlari uchun.<br>Только для сотрудников школы DATA.</p>
        <input type="password" autocomplete="current-password" style="width:100%;box-sizing:border-box;font-size:18px;padding:12px 14px;border:2px solid #DBE6F5;border-radius:12px">
        <p class="e" style="color:#C62828;font-size:14px;min-height:20px;margin:8px 0 0"></p>
        <button style="margin-top:8px;width:100%;font-size:17px;font-weight:700;padding:12px;border:0;border-radius:12px;background:#072BAD;color:#fff;cursor:pointer">Kirish / Войти</button></form>`;
      document.body.appendChild(w);
      const f = w.querySelector('form'), inp = w.querySelector('input');
      inp.focus();
      f.onsubmit = async e => {
        e.preventDefault();
        const k = await derive(inp.value, b64(box.s));
        try { const data = await open(k, box); await remember(k); key = k; w.remove(); done(data); }
        catch (err) { w.querySelector('.e').textContent = 'Parol noto‘g‘ri / Неверный пароль'; inp.select(); }
      };
    });
  }

  return {
    async json(url) {
      const box = await (await fetch(url, { cache: 'no-cache' })).json();
      if (!box || !box.c) return box; // shifrlanmagan (lokal ishlash)
      key = key || await stored();
      if (key) { try { return await open(key, box); } catch (e) { key = null; } }
      return ask(box);
    },
  };
})();
