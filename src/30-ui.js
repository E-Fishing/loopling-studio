
/* ================= UI shell ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tcol = t => `var(--t${t.color})`;
const PLAY_ICON = '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/></svg>';
const STOP_ICON = '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg>';

function toast(msg, ms = 3200) {
  const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), ms);
}
function modal(html, wide, sticky) {
  $$('.spotlight').forEach(e => e.classList.remove('spotlight'));
  $('#modalRoot').innerHTML = `<div class="scrim"><div class="modal${wide ? ' wide' : ''}" role="dialog" aria-modal="true">${html}</div></div>`;
  const scrim = $('#modalRoot .scrim');
  if (!sticky) scrim.addEventListener('click', e => { if (e.target === scrim) closeModal(); });
  const first = scrim.querySelector('button, input'); if (first) first.focus();
  return scrim.querySelector('.modal');
}
function closeModal() { $('#modalRoot').innerHTML = ''; setTimeout(() => applySpot(false), 0); }
function ask(title, text, buttons) {
  return new Promise(res => {
    const m = modal(`<h2>${title}</h2><p>${text}</p><div class="acts">${buttons.map(b => `<button class="btn${b.primary ? ' primary' : ''}" data-id="${b.id}">${b.label}</button>`).join('')}</div>`);
    m.querySelectorAll('[data-id]').forEach(b => b.onclick = () => { closeModal(); res(b.dataset.id); });
  });
}
function askText(title, value) {
  return new Promise(res => {
    const m = modal(`<h2>${title}</h2><form id="askForm"><input id="askInput" class="sel" style="width:100%" maxlength="40" value="${esc(value)}"><div class="acts"><button type="button" class="btn" id="askCancel">Cancel</button><button class="btn primary">Save</button></div></form>`);
    const inp = m.querySelector('#askInput'); inp.select();
    m.querySelector('#askCancel').onclick = () => { closeModal(); res(null); };
    m.querySelector('#askForm').onsubmit = e => { e.preventDefault(); const v = inp.value.trim(); closeModal(); res(v || null); };
  });
}

/* ---------- locks: features appear as the lessons introduce them ---------- */
function lockLevel() { return UI.mode === 'studio' ? 99 : P.reached; }
function applyLocks() {
  const lv = lockLevel();
  $$('[data-lock]').forEach(el => el.classList.toggle('locked', +el.dataset.lock > lv));
}
function lockMsg(n) {
  const L = LESSONS[n];
  return L ? `Locked for now. You will learn this in <b>Lesson ${n + 1}: ${L.title}</b>. Or switch to <b>Studio</b> mode to unlock everything.`
           : 'Locked for now. Finish the lessons or switch to <b>Studio</b> mode to unlock everything.';
}
['pointerdown', 'mousedown', 'click', 'dblclick', 'change', 'input'].forEach(ev => document.addEventListener(ev, e => {
  const el = e.target.closest && e.target.closest('.locked');
  if (!el) return;
  e.preventDefault(); e.stopPropagation();
  if (ev === 'click') toast(lockMsg(+el.dataset.lock));
}, true));

/* ---------- hint bar ---------- */
const DEFAULT_HINT = 'Point at anything to see what it does.';
let hintEl = null;
function showHint(el) {
  hintEl = el;
  const txt = $('#hintText');
  if (!el) { txt.innerHTML = DEFAULT_HINT; return; }
  const locked = el.closest('.locked');
  txt.innerHTML = locked ? lockMsg(+locked.dataset.lock) : el.dataset.hint;
}
document.addEventListener('mouseover', e => { const el = e.target.closest && e.target.closest('[data-hint]'); if (el !== hintEl) showHint(el); });
document.addEventListener('focusin', e => { const el = e.target.closest && e.target.closest('[data-hint]'); if (el) showHint(el); });

/* ---------- top bar ---------- */
function renderTransport() {
  const pb = $('#playBtn');
  pb.innerHTML = T.playing ? STOP_ICON : PLAY_ICON;
  pb.classList.toggle('playing', T.playing);
  pb.setAttribute('aria-label', T.playing ? 'Stop' : 'Play');
  $('#recBtn').classList.toggle('on', UI.rec);
  $('#patModeBtn').setAttribute('aria-pressed', String(!UI.songMode));
  $('#songModeBtn').setAttribute('aria-pressed', String(UI.songMode));
  $('#metroBtn').classList.toggle('on', UI.metro);
  $('#snapBtn').classList.toggle('on', UI.snap); $('#snapBtn').setAttribute('aria-pressed', String(UI.snap));
  updatePos();
}
function updatePos() {
  const s = UI.playStep;
  $('#posDisp').textContent = s < 0 ? (UI.songMode ? 'Song · Bar ' + (UI.songStart + 1) : 'Bar 1 · Beat 1')
    : `Bar ${Math.floor(s / 16) + 1} · Beat ${Math.floor(s % 16 / 4) + 1}`;
}
function renderTop() {
  renderTransport();
  const bi = $('#bpmInput'); if (document.activeElement !== bi) bi.value = S.bpm;
  $('#keySelect').innerHTML = NOTE_NAMES.map((n, i) => `<option value="${i}"${i === S.key ? ' selected' : ''}>Key: ${n}</option>`).join('');
  $('#scaleSelect').innerHTML = Object.entries(SCALES).map(([k, v]) => `<option value="${k}"${k === S.scale ? ' selected' : ''}>${v.name}</option>`).join('');
  $('#modeLearn').setAttribute('aria-pressed', String(UI.mode === 'learn'));
  $('#modeStudio').setAttribute('aria-pressed', String(UI.mode === 'studio'));
  document.body.classList.toggle('studio', UI.mode === 'studio');
  document.body.classList.toggle('learn', UI.mode === 'learn');
  document.body.classList.toggle('calm', UI.motion === 'calm');
  $('#motionLabel').textContent = UI.motion === 'calm' ? 'Calm' : 'Lively';
  $('#undoBtn').disabled = !H.undo.length; $('#redoBtn').disabled = !H.redo.length;
}

/* ---------- track rack ---------- */
function presetName(t) { return (t.kind === 'drums' ? KITS[t.preset] : SYNTHS[t.preset] || {}).name || ''; }
function renderRack() {
  const rack = $('#rack');
  rack.innerHTML = `<h3>Tracks</h3>` + S.tracks.map(t => `
    <div class="trackrow${t.id === UI.track ? ' sel' : ''}" data-id="${t.id}" data-role-row="${t.role}" data-lock="${ROLE_LESSON[t.role]}" style="color:${tcol(t)}"
      data-hint="<b>${esc(t.name)}</b> track. Click to edit it. Each <b>track</b> is one instrument, like one musician in a band. <b>M</b> mutes it, <b>S</b> solos it (plays it alone).">
      <span class="stripe" style="background:${tcol(t)}"></span>
      <div class="tmain">${instIcon(t.preset, 28)}<div style="min-width:0"><div class="tname">${esc(t.name)}</div><div class="tsub">${esc(presetName(t))}</div></div></div>
      <div class="ms"><button class="m${t.mute ? ' on' : ''}" aria-label="Mute ${esc(t.name)}">M</button><button class="s${t.solo ? ' on' : ''}" aria-label="Solo ${esc(t.name)}">S</button></div>
      <i class="mini"></i>
    </div>`).join('') +
    `<button class="btn small addtrack" id="addTrackBtn" data-lock="8" data-hint="<b>Add a track</b>: bring in another instrument. Real DAWs let you add as many as your computer can handle.">+ Add track</button>`;
  $$('.trackrow', rack).forEach(row => {
    const t = trackById(row.dataset.id);
    row.onclick = e => {
      if (e.target.closest('.m')) return edit('mute', () => { t.mute = !t.mute; });
      if (e.target.closest('.s')) return edit('solo', () => { t.solo = !t.solo; });
      selectTrack(t.id);
      if (t.kind === 'drums') preview(t, 'kick'); else preview(t, t.oct + 12 + S.key, .3);
    };
    row.ondblclick = async e => {
      if (UI.mode !== 'studio' || e.target.closest('.ms')) return;
      const v = await askText('Rename track', t.name);
      if (v) edit('rename', () => { t.name = v; });
    };
  });
  $('#addTrackBtn').onclick = addTrackDialog;
}
function selectTrack(id) {
  UI.track = id; UI.stamp = null; C.sel++;
  if (UI.view !== 'editor') UI.view = 'editor';
  renderAll();
}
function addTrackDialog() {
  if (S.tracks.length >= 8) return toast('Loopling keeps it simple: 8 tracks at most.');
  const m = modal(`<h2>Add a track</h2><p>Pick what kind of instrument the new track plays.</p>
    <div class="choice"><button data-k="other"><b>Instrument</b><span>Plays notes in a piano roll: synths, keys, leads.</span></button>
    <button data-k="drums"><b>Drums</b><span>A second beat grid, for extra percussion layers.</span></button></div>
    <div class="acts"><button class="btn" id="cancelAdd">Cancel</button></div>`);
  m.querySelector('#cancelAdd').onclick = closeModal;
  m.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
    closeModal();
    edit('addtrack', () => {
      const role = b.dataset.k === 'drums' ? 'other' : 'other';
      const t = addTrack(role);
      if (b.dataset.k === 'drums') { t.kind = 'drums'; t.preset = 'classic'; t.name = 'Percussion'; }
      UI.track = t.id;
    });
  });
}

/* ---------- views / tabs ---------- */
function setView(v) { UI.view = v; renderAll(); }
function renderViews() {
  ['editor', 'mixer', 'arrange'].forEach(v => {
    $('#tab-' + v).setAttribute('aria-selected', String(UI.view === v));
    $('#' + v + 'View').hidden = UI.view !== v;
  });
  if (UI.view === 'editor') renderEditor();
  if (UI.view === 'mixer') renderMixer();
  if (UI.view === 'arrange') renderArrange();
}
function renderAll() {
  if (!trackById(UI.track)) UI.track = S.tracks[0].id;
  UI.pat = clamp(UI.pat, 0, S.patterns.length - 1);
  UI.paint = clamp(UI.paint, -1, S.patterns.length - 1);
  renderTop(); renderRack(); renderViews(); renderGuide(); applyLocks();
}
function changed(opts = {}) {
  persistSoon(); syncGraph(G); loadInUse();
  if (opts.quiet) { renderGuideTask(); $('#undoBtn').disabled = !H.undo.length; }
  else renderAll();
  lessonTick();
}
function afterLoad() {
  if (!trackById(UI.track)) UI.track = S.tracks[0].id;
  if (G) { syncGraph(G); }
  loadInUse();
  persistSoon(); renderAll(); lessonTick();
}

/* ---------- mixer ---------- */
let mixSig = '';
const pct = v => Math.round(v * 100) + '%';
const panTxt = v => Math.abs(v) < .03 ? 'Center' : (v < 0 ? 'L ' : 'R ') + Math.round(Math.abs(v) * 100);
function renderMixer() {
  const view = $('#mixerView');
  const sig = S.tracks.map(t => t.id + t.name + t.color + t.preset).join('|');
  if (sig !== mixSig || !view.firstChild) {
    mixSig = sig;
    view.innerHTML = `<div class="toolbar"><div class="edtitle"><h2>Mixer</h2></div><span class="grow"></span>
      <span style="color:var(--ink-3);font-size:13px">Tip: press Play first, then move things and listen.</span></div>
      <div class="mixer">${S.tracks.map(t => `
      <div class="strip" data-id="${t.id}" data-role-strip="${t.role}" style="--tc:${tcol(t)}">
        <div class="sname">${esc(t.name)}</div>
        <div class="sicon" data-hint="${esc(presetName(t))}: ${INST_DESC[t.preset] || ''}">${instIcon(t.preset, 34)}</div>
        <div class="ms"><button class="m" data-hint="<b>Mute</b>: silence this track.">M</button><button class="s" data-hint="<b>Solo</b>: hear only this track (and other soloed ones).">S</button></div>
        <label class="knob" data-hint="<b>Pan</b>: move the sound left or right between your speakers or headphones."><span>Pan <b class="pv"></b></span><input type="range" class="pan" min="-1" max="1" step=".05" id="pan-${t.id}"></label>
        <label class="knob" data-hint="<b>Reverb</b>: adds the echo of a room or hall, so the sound feels bigger and further away."><span>Reverb <b class="rv"></b></span><input type="range" class="rev" min="0" max="1" step=".01" id="rev-${t.id}"></label>
        <label class="knob" data-hint="<b>Echo</b> (also called <b>delay</b>): repeats the sound a few times, fading out."><span>Echo <b class="ev"></b></span><input type="range" class="echo" min="0" max="1" step=".01" id="echo-${t.id}"></label>
        <div class="fader" data-hint="<b>Volume fader</b>: slide up for louder, down for quieter. Balancing these is most of what <b>mixing</b> means."><input type="range" class="vol" min="0" max="1" step=".01" id="vol-${t.id}" aria-label="${esc(t.name)} volume"><div class="meter"><i></i></div></div>
        <div class="db"></div>
      </div>`).join('')}
      <div class="strip master" data-hint="<b>Master</b>: the final volume of the whole song. Everything flows into here.">
        <div class="sname">Master</div>
        <div class="fader"><input type="range" class="mvol" min="0" max="1" step=".01" id="vol-master" aria-label="Master volume"><div class="meter" id="masterMeter2"><i></i></div></div>
        <div class="db"></div>
      </div></div>`;
    $$('.strip[data-id]', view).forEach(st => {
      const t = trackById(st.dataset.id);
      const bind = (cls, key) => { st.querySelector('.' + cls).oninput = e => { checkpoint(key + t.id); t[key] = +e.target.value; changed({ quiet: true }); updateMixerValues(); }; };
      bind('pan', 'pan'); bind('rev', 'rev'); bind('echo', 'echo'); bind('vol', 'vol');
      st.querySelector('.m').onclick = () => { checkpoint(); t.mute = !t.mute; changed({ quiet: true }); updateMixerValues(); renderRack(); applyLocks(); };
      st.querySelector('.s').onclick = () => { checkpoint(); t.solo = !t.solo; changed({ quiet: true }); updateMixerValues(); renderRack(); applyLocks(); };
      st.querySelector('.pan').ondblclick = () => { t.pan = 0; changed({ quiet: true }); updateMixerValues(); };
    });
    $('.mvol', view).oninput = e => { checkpoint('master'); S.master = +e.target.value; changed({ quiet: true }); updateMixerValues(); };
  }
  updateMixerValues();
}
function updateMixerValues() {
  $$('#mixerView .strip[data-id]').forEach(st => {
    const t = trackById(st.dataset.id); if (!t) return;
    const set = (cls, v) => { const el = st.querySelector('.' + cls); if (document.activeElement !== el) el.value = v; };
    set('pan', t.pan); set('rev', t.rev); set('echo', t.echo); set('vol', t.vol);
    st.querySelector('.pv').textContent = panTxt(t.pan);
    st.querySelector('.rv').textContent = pct(t.rev);
    st.querySelector('.ev').textContent = pct(t.echo);
    st.querySelector('.db').textContent = pct(t.vol);
    st.querySelector('.m').classList.toggle('on', t.mute);
    st.querySelector('.s').classList.toggle('on', t.solo);
  });
  const mv = $('#mixerView .mvol');
  if (mv) { const m = S.master == null ? .85 : S.master; if (document.activeElement !== mv) mv.value = m; mv.closest('.strip').querySelector('.db').textContent = pct(m); }
}

/* ---------- arrangement ---------- */
const CELL_W = 44;
let arrPaint = null;
function renderArrange() {
  const view = $('#arrangeView');
  const bars = BARS;
  view.innerHTML = `<div class="toolbar">
      <div class="edtitle"><h2>Arrange your song</h2></div><span class="grow"></span>
      <button class="btn" id="autoArrBtn" data-hint="<b>Auto-arrange</b>: Loopling builds a simple song for you (intro, verse, chorus, outro) from your patterns. A great starting point to edit.">Auto-arrange for me</button>
      <button class="btn" id="clearArrBtn" data-hint="<b>Clear timeline</b>: remove every block from the song (your patterns stay safe).">Clear timeline</button>
    </div>
    <div class="patbar"><span class="label">Paint with</span><div class="palette" id="palette">
      ${S.patterns.map((p, i) => `<button class="patchip" data-p="${i}" aria-pressed="${UI.paint === i}" data-hint="Paint <b>${esc(p.name)}</b> onto the timeline. Click or drag across the grid."><span class="n" style="background:var(--ink-2)">${i + 1}</span>${esc(p.name)}</button>`).join('')}
      <button class="patchip" data-p="-1" aria-pressed="${UI.paint === -1}" data-hint="<b>Eraser</b>: click or drag over blocks to remove them."><span class="n" style="background:var(--bad)">&times;</span>Eraser</button>
    </div></div>
    <div class="arrwrap" id="arrWrap"><div class="arr" id="arrGrid" style="grid-template-columns:120px repeat(${bars},${CELL_W}px)"
      data-hint="The <b>timeline</b>: each row is a track, each column is one bar (4 beats). Blocks show which pattern a track plays in that bar. FL Studio calls this the <b>Playlist</b>; GarageBand calls it the <b>Tracks area</b>.">
      <div></div>${Array.from({ length: bars }, (_, b) => `<button class="ah${b === UI.songStart ? ' start' : ''}" data-b="${b}" data-hint="Bar ${b + 1}. Click to make <b>Song</b> mode start playing from here.">${b + 1}</button>`).join('')}
      ${S.tracks.map(t => `<div class="an"><i style="background:${tcol(t)}"></i>${instIcon(t.preset, 22)}<span>${esc(t.name)}</span></div>` +
        Array.from({ length: bars }, (_, b) => {
          const p = S.arr[t.id][b], prev = b > 0 ? S.arr[t.id][b - 1] : null;
          const f = p != null;
          return `<button class="acell${f ? ' f' : ''}${f && prev === p ? ' cont' : ''}${!f && Math.floor(b / 4) % 2 ? ' alt' : ''}" data-t="${t.id}" data-b="${b}" style="--pc:${tcol(t)}" aria-label="${esc(t.name)} bar ${b + 1}">${f && prev !== p ? p + 1 : ''}</button>`;
        }).join('')).join('')}
      <div class="playline" id="arrLine"></div>
    </div></div>
    <p style="color:var(--ink-3);font-size:13px;margin:8px 0 0">Switch the top bar to <b>Song</b> and press Play to hear the whole timeline.</p>`;
  $$('#palette .patchip').forEach(b => b.onclick = () => { UI.paint = +b.dataset.p; renderArrange(); applyLocks(); });
  $$('#arrGrid .ah').forEach(b => b.onclick = () => { UI.songStart = +b.dataset.b; renderArrange(); updatePos(); });
  $('#autoArrBtn').onclick = () => { edit('arr', autoArrange); toast('Song arranged. Switch to <b>Song</b> mode and press Play.'); };
  $('#clearArrBtn').onclick = () => edit('arr', () => S.tracks.forEach(t => { S.arr[t.id] = Array(BARS).fill(null); }));
  const grid = $('#arrGrid');
  const paintCell = (cell) => {
    const t = trackById(cell.dataset.t), b = +cell.dataset.b;
    const v = arrPaint === 'erase' ? null : UI.paint;
    if (S.arr[t.id][b] === v) return;
    S.arr[t.id][b] = v;
    changed({ quiet: true });
    renderArrangeCells();
  };
  grid.onpointerdown = e => {
    const cell = e.target.closest('.acell'); if (!cell || e.button > 0) return;
    const t = trackById(cell.dataset.t), b = +cell.dataset.b;
    checkpoint();
    arrPaint = (UI.paint === -1 || S.arr[t.id][b] === UI.paint) ? 'erase' : 'paint';
    paintCell(cell);
  };
  grid.onpointerover = e => { if (!arrPaint) return; const cell = e.target.closest('.acell'); if (cell) paintCell(cell); };
  drawPlayheads();
}
function renderArrangeCells() {
  $$('#arrGrid .acell').forEach(cell => {
    const t = trackById(cell.dataset.t), b = +cell.dataset.b, p = S.arr[t.id][b], prev = b > 0 ? S.arr[t.id][b - 1] : null;
    const f = p != null;
    cell.className = 'acell' + (f ? ' f' : '') + (f && prev === p ? ' cont' : '') + (!f && Math.floor(b / 4) % 2 ? ' alt' : '');
    cell.textContent = f && prev !== p ? p + 1 : '';
  });
}
document.addEventListener('pointerup', () => { arrPaint = null; });

/* ---------- playheads + meters ---------- */
function drawPlayheads() {
  updatePos();
  if (UI.view === 'editor') drawEditorPlayhead();
  const line = $('#arrLine');
  if (line) {
    const show = UI.playStep >= 0 && UI.songMode;
    line.style.display = show ? 'block' : 'none';
    const first = $('#arrGrid .ah');
    if (show && first) line.style.left = (first.offsetLeft + UI.playStep / 16 * CELL_W) + 'px';
  }
}
const lvl = {};
function level(an, id) {
  const buf = level.buf || (level.buf = new Float32Array(1024));
  an.getFloatTimeDomainData(buf.subarray(0, an.fftSize));
  let pk = 0; for (let i = 0; i < an.fftSize; i++) pk = Math.max(pk, Math.abs(buf[i]));
  lvl[id] = Math.max(pk, (lvl[id] || 0) * .88);
  return lvl[id];
}
const toH = v => clamp((20 * Math.log10(v + 1e-6) + 48) / 48, 0, 1);
function meters() {
  if (!G) return;
  const m = level(G.analyser, 'master');
  [$('#masterMeter i'), $('#masterMeter2 i')].forEach(el => { if (el) { el.style.height = toH(m) * 100 + '%'; el.classList.toggle('hot', m > .99); } });
  if (m > .99) UI.clipped = performance.now();
  S.tracks.forEach(t => {
    const n = G.tracks[t.id]; if (!n) return;
    const v = toH(level(n.an, t.id));
    const mini = $(`.trackrow[data-id="${t.id}"] .mini`); if (mini) mini.style.width = v * 100 + '%';
    const mm = $(`.strip[data-id="${t.id}"] .meter i`); if (mm) mm.style.height = v * 100 + '%';
  });
}
function frame() {
  requestAnimationFrame(frame);
  if (!AC) return;
  const now = AC.currentTime;
  let moved = false;
  while (T.queue.length && T.queue[0].t <= now) { const e = T.queue.shift(); if (T.playing) { UI.playStep = e.step; moved = true; } }
  if (UI.redrawEditor) { UI.redrawEditor = false; renderTransport(); if (UI.view === 'editor') renderEditor(); applyLocks(); }   // a recording grew the pattern
  if (moved) drawPlayheads();
  meters();
  woofPulse();
}
