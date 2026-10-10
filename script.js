// ================== Basics ==================
const TARGET  = Date.UTC(2026, 9, 12, 15, 0, 0);   // 13 Oct 2026, 12:00 AM KST
let PREVIEW = new URLSearchParams(location.search).has('preview'); // test ke liye: ?preview=1
const DAY = 86400000;
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, '0');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (CONFIG.background) {
  document.documentElement.style.setProperty('--bg', `url("${CONFIG.background}")`);
}

// ================== Confetti (hearts + petals) ==================
const cv = $('confetti'), ctx = cv.getContext('2d');
const COLORS = ['#a78bfa', '#7c3aed', '#c9b6f2', '#f7b6d2', '#ffcfa8', '#fff6fb'];
let parts = [], raf = null, rate = 0, acc = 0, stopAt = 0;

function resizeCv() { cv.width = innerWidth; cv.height = innerHeight; }
addEventListener('resize', resizeCv); resizeCv();

function spawn(y) {
  parts.push({
    x: Math.random() * cv.width,
    y: y ?? -20,
    r: 6 + Math.random() * 9,
    vy: 1.6 + Math.random() * 2.6,
    vx: -1 + Math.random() * 2,
    rot: Math.random() * 6,
    vr: -.06 + Math.random() * .12,
    col: COLORS[Math.floor(Math.random() * COLORS.length)],
    heart: Math.random() < .55
  });
}

function confettiLoop(now) {
  ctx.clearRect(0, 0, cv.width, cv.height);
  if (stopAt && now > stopAt) { rate = 0; stopAt = 0; }
  acc += rate;
  while (acc >= 1 && parts.length < 240) { spawn(); acc -= 1; }
  if (acc >= 1) acc = 0;

  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.rot += p.vr;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col;
    if (p.heart) { ctx.font = `${p.r * 2}px serif`; ctx.fillText('♥', -p.r, p.r); }
    else { ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r / 2, 0, 0, 6.3); ctx.fill(); }
    ctx.restore();
  }
  parts = parts.filter(p => p.y < cv.height + 30);

  if (!parts.length && !rate) { raf = null; ctx.clearRect(0, 0, cv.width, cv.height); return; }
  raf = requestAnimationFrame(confettiLoop);
}

// ms = kitni der tak (0 = jab tak stop na karo)
function startConfetti(ms = 0) {
  if (reduceMotion) return;
  for (let i = 0; i < 90; i++) spawn(-Math.random() * cv.height);   // pehle ek bada burst
  rate = .7;
  stopAt = ms ? performance.now() + ms : 0;
  if (!raf) raf = requestAnimationFrame(confettiLoop);
}
function stopConfetti() { rate = 0; stopAt = 0; parts = []; }

// ================== Music (YouTube, loop) ==================
function parseYT(u) {
  if (!u) return null;
  let m = u.match(/[?&]list=([\w-]+)/);
  const list = m ? m[1] : null;
  m = u.match(/(?:youtu\.be\/|[?&]v=|embed\/)([\w-]{11})/);
  const id = m ? m[1] : null;
  return (list || id) ? { id, list } : null;
}
const yc = parseYT(CONFIG.playlist);
let yt = null, ytReady = false, gestured = false, soundOn = false;

function updateSoundBtn() { $('soundBtn').textContent = soundOn ? '🔊' : '🔇'; }

function startSound() {
  if (!ytReady) return;
  try { yt.unMute(); yt.setVolume(100); yt.playVideo(); soundOn = true; updateSoundBtn(); } catch (e) {}
}

window.onYouTubeIframeAPIReady = () => {
  if (!yc) return;
  const vars = { autoplay: 1, controls: 0, playsinline: 1, rel: 0, loop: 1, modestbranding: 1 };
  const opts = {
    width: 200, height: 200, playerVars: vars,
    events: {
      onReady: e => {
        ytReady = true;
        if (yc.list) e.target.setLoop(true);
        e.target.mute();             // muted autoplay browser allow karta hai
        e.target.playVideo();
        if (gestured) startSound();
      },
      onStateChange: e => { if (e.data === 0) e.target.playVideo(); }   // gaana khatam -> dobara
    }
  };
  if (yc.list) { vars.listType = 'playlist'; vars.list = yc.list; }
  else { opts.videoId = yc.id; vars.playlist = yc.id; }
  yt = new YT.Player('ytplayer', opts);
};

if (yc) {
  $('soundBtn').hidden = false;
  $('hint').hidden = false;
  updateSoundBtn();
  $('soundBtn').addEventListener('click', e => {
    e.stopPropagation();
    if (!ytReady) return;
    if (soundOn) { yt.mute(); soundOn = false; updateSoundBtn(); }
    else startSound();
  });
}

// browser bina click ke awaaz nahi chalne deta, isliye pehle tap/click/key par awaaz on
function firstGesture(e) {
  if (gestured || (e.target && e.target.id === 'soundBtn')) return;
  gestured = true;
  $('hint').hidden = true;
  startSound();
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => removeEventListener(ev, firstGesture, true));
}
['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, firstGesture, true));

// ================== Pages ==================
const PAGES = ['count', 'surprise', 'letter', 'cards'];
let current = null;
const unlocked = () => PREVIEW || Date.now() >= TARGET;

function show(name) {
  if (!PAGES.includes(name) || (name !== 'count' && !unlocked())) name = 'count';
  if (name === current) return;
  current = name;
  PAGES.forEach(p => $('p-' + p).classList.toggle('active', p === name));
  scrollTo(0, 0);
  if (location.hash !== '#' + name) location.hash = name;

  if (name === 'surprise') startConfetti(0);   // is page par confetti chalta rahega
  else stopConfetti();
  if (name === 'cards') loadCards();
}
addEventListener('hashchange', () => show(location.hash.slice(1)));

$('reveal').addEventListener('click', () => show('surprise'));
$('toLetter').addEventListener('click', () => show('letter'));
$('toCards').addEventListener('click', () => show('cards'));
$('toLetterAgain').addEventListener('click', () => show('letter'));

// ================== Countdown ==================
let revealedOnce = false;
function tick() {
  const diff = PREVIEW ? 0 : TARGET - Date.now();

  if (diff <= 0) {
    $('headline').textContent = 'Happy Birthday Jimin! 💜';
    $('clock').hidden = true;
    $('sub').textContent = '생일 축하해, 지민!';
    $('reveal').hidden = false;
    if (!revealedOnce) {
      revealedOnce = true;
      if (current === 'count') startConfetti(12000);   // countdown khatam hote hi confetti
    }
    return;
  }

  $('clock').hidden = false;
  $('reveal').hidden = true;
  $('headline').textContent = 'Jimin turns 31 in';
  $('d').textContent = pad(Math.floor(diff / DAY));
  $('h').textContent = pad(Math.floor(diff % DAY / 3600000));
  $('m').textContent = pad(Math.floor(diff % 3600000 / 60000));
  $('s').textContent = pad(Math.floor(diff % 60000 / 1000));
  const local = new Date(TARGET).toLocaleString([], {
    weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit'
  });
  $('sub').innerHTML = `Counting to 13 October, 12:00 AM Korea time (KST).<br><span>In your time: ${local}</span>`;
}

// ================== Photos (5 + 5 + 5) ==================
const photos = CONFIG.photos.map(p => typeof p === 'string' ? { src: p, caption: '' } : p);
const groups = [photos.slice(0, 5), photos.slice(5, 10), photos.slice(10, 15)];
let lbSet = [], lbIdx = 0;

function renderPins(containerId, list) {
  const box = $(containerId);
  box.innerHTML = '';
  list.forEach((p, i) => {
    const pin = document.createElement('div'); pin.className = 'pin';
    const img = document.createElement('img');
    img.src = p.src; img.loading = 'lazy'; img.className = 'zoom';
    img.alt = p.caption || 'Jimin';
    img.addEventListener('click', () => openLb(list, i));
    pin.append(img); box.append(pin);
  });
}
renderPins('pins1', groups[0]);
renderPins('pins2', groups[1]);
renderPins('pins3', groups[2]);

function showLb() { $('lbImg').src = lbSet[lbIdx].src; $('lbImg').alt = lbSet[lbIdx].caption || ''; }
function openLb(set, i) { lbSet = set; lbIdx = i; showLb(); $('lb').hidden = false; $('lbClose').focus(); }
function closeLb() { $('lb').hidden = true; }
const stepLb = d => { lbIdx = (lbIdx + d + lbSet.length) % lbSet.length; showLb(); };
$('lbClose').addEventListener('click', closeLb);
$('lbPrev').addEventListener('click', () => stepLb(-1));
$('lbNext').addEventListener('click', () => stepLb(1));
$('lb').addEventListener('click', e => { if (e.target === $('lb')) closeLb(); });
addEventListener('keydown', e => {
  if ($('lb').hidden) return;
  if (e.key === 'Escape') closeLb();
  if (e.key === 'ArrowLeft') stepLb(-1);
  if (e.key === 'ArrowRight') stepLb(1);
});

// ================== Fan cards (Supabase) ==================
const SB = { url: (CONFIG.supabaseUrl || '').replace(/\/$/, ''), key: CONFIG.supabaseKey || '' };
const sbOn = !!(SB.url && SB.key);
const MEDIA_PREFIX = SB.url + '/storage/v1/object/public/card-media/';
const OK_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
const MAX_FILES = 3, MAX_MB = 10;

const sbHeaders = (extra = {}) => {
  const h = { apikey: SB.key, ...extra };
  if (SB.key.startsWith('eyJ')) h.Authorization = 'Bearer ' + SB.key;
  return h;
};

async function uploadFile(file) {
  const ext = ((file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5)) || 'bin';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const r = await fetch(`${SB.url}/storage/v1/object/card-media/${path}`, {
    method: 'POST', headers: sbHeaders({ 'Content-Type': file.type }), body: file
  });
  if (!r.ok) throw new Error('upload failed');
  return { url: MEDIA_PREFIX + path, type: file.type.startsWith('video') ? 'video' : 'image' };
}

function setStatus(msg, err = false) {
  $('cStatus').textContent = msg;
  $('cStatus').classList.toggle('err', err);
}

$('cMsg').addEventListener('input', e => { $('cCount').textContent = `${e.target.value.length} / 600`; });

$('cFiles').addEventListener('change', e => {
  const files = [...e.target.files];
  const bad = files.length > MAX_FILES || files.some(f => !OK_TYPES.includes(f.type) || f.size > MAX_MB * 1048576);
  if (bad) {
    e.target.value = '';
    $('fileInfo').textContent = `Please choose up to ${MAX_FILES} photos, videos or GIFs, ${MAX_MB} MB each.`;
  } else {
    $('fileInfo').textContent = files.length ? files.map(f => f.name).join(', ') : `Up to ${MAX_FILES} files, ${MAX_MB} MB each.`;
  }
});

$('cardForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!sbOn) { setStatus('Cards are not switched on yet. Please check back soon 💜', true); return; }

  const name = $('cName').value.trim();
  const age = parseInt($('cAge').value, 10);
  const message = $('cMsg').value.trim();
  const files = [...$('cFiles').files];

  if (!name) { setStatus('Please write your name.', true); $('cName').focus(); return; }
  if (!(age >= 1 && age <= 120)) { setStatus('Please write your age.', true); $('cAge').focus(); return; }
  if (!message) { setStatus('Please write your message for Jimin.', true); $('cMsg').focus(); return; }

  let last = 0; try { last = +localStorage.getItem('jimin-last-card') || 0; } catch {}
  if (Date.now() - last < 15000) { setStatus('Please wait a few seconds before sending another card.', true); return; }

  $('cSend').disabled = true;
  try {
    setStatus(files.length ? 'Uploading your files…' : 'Sending…');
    const media = [];
    for (const f of files) media.push(await uploadFile(f));

    setStatus('Sending…');
    const r = await fetch(`${SB.url}/rest/v1/cards`, {
      method: 'POST',
      headers: sbHeaders({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify({ name, age, message, media })
    });
    if (!r.ok) throw new Error('insert failed');

    try { localStorage.setItem('jimin-last-card', String(Date.now())); } catch {}
    $('cardForm').reset();
    $('cCount').textContent = '0 / 600';
    $('fileInfo').textContent = `Up to ${MAX_FILES} files, ${MAX_MB} MB each.`;
    setStatus('Your card has been sent to Jimin! 💜 Tap the button below to see all cards.');
  } catch (err) {
    setStatus('Something went wrong. Please try again.', true);
  }
  $('cSend').disabled = false;
});

async function loadCards() {
  const wall = $('cardsWall');
  if (!sbOn) {
    $('cardsStatus').textContent = 'Cards are not switched on yet. Please check back soon 💜';
    return;
  }
  $('cardsStatus').textContent = 'Loading cards…';
  try {
    const r = await fetch(`${SB.url}/rest/v1/cards?select=name,age,message,media&approved=eq.true&order=created_at.desc&limit=1000`,
      { headers: sbHeaders() });
    if (!r.ok) throw new Error('load failed');
    const rows = await r.json();
    wall.innerHTML = '';
    rows.forEach(c => wall.append(buildCard(c)));
    $('cardsCount').textContent = rows.length ? `(${rows.length})` : '';
    $('cardsStatus').textContent = rows.length ? '' : 'No cards yet. Be the first to write one!';
  } catch (err) {
    $('cardsStatus').textContent = 'Could not load the cards. Please refresh the page.';
  }
}

function buildCard(c) {
  const pin = document.createElement('div'); pin.className = 'pin letter';

  const items = Array.isArray(c.media) ? c.media : [];
  const safe = items.filter(m => m && typeof m.url === 'string' && m.url.startsWith(MEDIA_PREFIX));
  if (safe.length) {
    const box = document.createElement('div'); box.className = 'media';
    safe.forEach(m => {
      if (m.type === 'video') {
        const v = document.createElement('video');
        v.src = m.url; v.controls = true; v.playsInline = true; v.preload = 'metadata';
        box.append(v);
      } else {
        const im = document.createElement('img');
        im.src = m.url; im.loading = 'lazy'; im.alt = 'Photo from ' + (c.name || 'ARMY');
        box.append(im);
      }
    });
    pin.append(box);
  }

  const body = document.createElement('div'); body.className = 'body';
  const t = document.createElement('div'); t.className = 'text'; t.textContent = c.message || '';
  const by = document.createElement('div'); by.className = 'by';
  by.textContent = `${c.name || 'ARMY'}${c.age ? ', ' + c.age : ''}`;
  body.append(t, by); pin.append(body);
  return pin;
}

// ================== Trial button (sirf test ke liye) ==================
if (CONFIG.showTrialButton) {
  $('trial').hidden = false;
  $('trial').addEventListener('click', () => { PREVIEW = true; tick(); $('trial').hidden = true; });
}

// ================== Start ==================
show(location.hash.slice(1));
tick();
setInterval(tick, 1000);
