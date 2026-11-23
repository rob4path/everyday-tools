const rowSelector = '[data-id]';
const bubbleSelector = '[data-testid="msg-container"]';
const controlSelector = 'button, [role="button"]';
let capturing = false;

function playButton(container) {
  const icon = container.querySelector('[data-icon="audio-play"], [data-testid="audio-play"], [data-icon="ptt-play"]');
  if (icon) return icon.closest(controlSelector);
  return [...container.querySelectorAll(controlSelector)].find((button) =>
    /^(play|redă|reda|redare)(\b|\s|$)/iu.test(button.getAttribute('aria-label') || '')
  );
}

function render(box, text) {
  const p = document.createElement('div');
  p.className = 'wt-text';
  p.textContent = text;
  const copy = document.createElement('button');
  copy.className = 'wt-btn wt-copy';
  copy.textContent = 'Copiază';
  copy.onclick = async (event) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      copy.textContent = 'Copiat ✓';
    } catch {
      copy.textContent = 'Selectează și copiază textul';
    }
    setTimeout(() => { copy.textContent = 'Copiază'; }, 1500);
  };
  box.replaceChildren(p, copy);
}

function captureAudio(button) {
  return new Promise((resolve, reject) => {
    const reqId = crypto.randomUUID();
    function finish(error, audio) {
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      window.removeEventListener('click', onClick, true);
      window.dispatchEvent(new CustomEvent('wt-disarm', { detail: reqId }));
      if (error) reject(new Error(error));
      else resolve(audio);
    }
    function onMessage(event) {
      if (event.source !== window || event.origin !== location.origin || event.data?.reqId !== reqId) return;
      if (event.data.wt === 'audio') finish(null, event.data.audio);
      if (event.data.wt === 'error') finish(event.data.error || 'Captura a eșuat.');
    }
    function onClick(event) {
      if (event.isTrusted) finish('Captură întreruptă. Încearcă din nou.');
    }
    const timer = setTimeout(() => finish('Nu am prins înregistrarea. Verifică dacă este descărcată și încearcă din nou.'), 30000);
    window.addEventListener('message', onMessage);
    window.addEventListener('click', onClick, true);
    window.dispatchEvent(new CustomEvent('wt-arm', { detail: reqId }));
    button.click();
  });
}

async function transcribe(container, box, btn, id) {
  const button = playButton(container);
  box.querySelector('.wt-err')?.remove();
  btn.disabled = true;
  try {
    if (capturing) throw new Error('Așteaptă încărcarea mesajului anterior.');
    if (!button) throw new Error('Oprește mesajul vocal și încearcă din nou.');
    btn.textContent = 'Se încarcă…';
    capturing = true;
    let audio;
    try {
      audio = await captureAudio(button);
    } finally {
      capturing = false;
    }
    btn.textContent = 'Se transcrie…';
    const res = await chrome.runtime.sendMessage({ type: 'transcribe', audio });
    if (!res?.text) throw new Error(res?.error || 'Nu s-a detectat vorbire.');
    if (id) await chrome.storage.local.set({ ['t:' + id]: res.text });
    if (box.isConnected && container.closest(rowSelector)?.getAttribute('data-id') === id) render(box, res.text);
  } catch (error) {
    btn.disabled = false;
    btn.textContent = 'Transcrie';
    const err = document.createElement('div');
    err.className = 'wt-err';
    err.textContent = error.message;
    box.append(err);
  }
}

async function decorate(container) {
  const id = container.closest(rowSelector)?.getAttribute('data-id');
  const existing = container.querySelector(':scope > .wt-box');
  if (existing && existing.dataset.message === (id || '')) return;
  existing?.remove();
  if (!playButton(container)) return;
  const box = document.createElement('div');
  box.className = 'wt-box';
  box.dataset.message = id || '';
  container.append(box);
  if (id) {
    const key = 't:' + id;
    const stored = await chrome.storage.local.get(key);
    if (stored[key]) return render(box, stored[key]);
  }
  const btn = document.createElement('button');
  btn.className = 'wt-btn';
  btn.textContent = 'Transcrie';
  btn.onclick = (event) => {
    event.stopPropagation();
    if (event.isTrusted) transcribe(container, box, btn, id);
  };
  box.append(btn);
}

function scan() {
  // Recycled rows may now contain text or a different voice message.
  for (const box of document.querySelectorAll('.wt-box')) {
    const row = box.closest(rowSelector);
    if ((row?.getAttribute('data-id') || '') !== box.dataset.message) box.remove();
  }
  const containers = new Set();
  for (const slider of document.querySelectorAll('[role="slider"], input[type="range"], [data-icon="audio-play"], [data-testid="audio-play"], [data-icon="ptt-play"]')) {
    const container = slider.closest(bubbleSelector) || slider.closest(rowSelector);
    if (container) containers.add(container);
  }
  containers.forEach(decorate);
}

let scheduled = false;
new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    scan();
  });
}).observe(document.documentElement, {
  childList: true, subtree: true, attributes: true, attributeFilter: ['data-id', 'data-icon', 'data-testid', 'aria-label', 'role'],
});
scan();
