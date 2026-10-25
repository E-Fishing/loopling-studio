
/* ================= Editor: beat grid + piano roll ================= */
const LEN_OPTS = [[16, '1 bar'], [32, '2 bars'], [64, '4 bars'], [128, '8 bars']];
const NL_OPTS = [[1, 'Tiny (1 step)'], [2, 'Short (2 steps)'], [4, 'One beat (4 steps)'], [8, 'Half bar (8 steps)'], [16, 'Whole bar (16 steps)']];
UI.typeOct = 0;

/* ---------- instrument picker: icon tiles instead of a plain list ---------- */
const CHEVRON = '<svg class="i" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
async function previewSound(t) {
  ensureAudio();
  const key = instKeyOf(t.preset);   // hear the real recording, not the stand-in, if it's still loading
  if (key && !(INST[key] && INST[key].ready.size)) await Promise.race([instLoad(key), new Promise(r => setTimeout(r, 2500))]);
  const at = AC.currentTime + .02;
  if (t.kind === 'drums') { [['kick', 0], ['chat', .17], ['snare', .34], ['chat', .51]].forEach(([r, d]) => playDrum(G, t, r, at + d)); return; }
  voiceChord(0, t.oct + 12).forEach((m, i) => playSynth(G, t, m, at + i * .16, .32));
}
function openInstPicker(t, anchor) {
  closeInstPicker(true);
  const groups = t.kind === 'drums' ? [['Drum kits', Object.keys(KITS)]]
    : [['Bass', 'Bass'], ['Keys', 'Keys'], ['Pads', 'Pad'], ['Strings', 'Strings'], ['Woodwinds', 'Woodwinds'], ['Brass', 'Brass'], ['Leads', 'Lead']].map(([label, cat]) => [label, Object.keys(SYNTHS).filter(k => SYNTHS[k].cat === cat)]);
  const pop = document.createElement('div');
  pop.className = 'instpop'; pop.id = 'instPop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Choose a sound');
  pop.innerHTML = `<div class="iphead"><b>Choose a sound for ${esc(t.name)}</b><span>Click one to hear it. Try a few!</span></div>` +
    groups.map(([label, keys]) => `<div class="ipgroup"><span class="label">${label}</span><div class="iptiles">${keys.map(k => {
      const p = KITS[k] || SYNTHS[k];
      return `<button class="iptile" data-k="${k}" aria-pressed="${k === t.preset}">${instIcon(k, 40)}<span><b>${p.name}</b><small>${INST_DESC[k] || ''}</small></span></button>`;
    }).join('')}</div></div>`).join('') +
    `<div class="ipfoot"><span class="ipcredit">Real instruments are recordings by the musicians listed in <button class="linkbtn" id="ipCredits">Credits</button>.</span><button class="btn primary small" id="ipDone">Done</button></div>`;
  document.body.appendChild(pop);
  // open below the button (or above, if there's more room there) and scroll inside rather than cover it
  const r = anchor.getBoundingClientRect(), W = pop.offsetWidth, Hh = pop.offsetHeight;
  const below = innerHeight - r.bottom - 18, above = r.top - 18;
  const down = Hh <= below || below >= above, room = Math.max(220, down ? below : above);
  pop.style.maxHeight = room + 'px';
  pop.style.left = clamp(r.left, 16, Math.max(16, innerWidth - W - 16)) + 'px';
  pop.style.top = (down ? r.bottom + 6 : Math.max(12, r.top - 6 - Math.min(Hh, room))) + 'px';
  $$('.iptile', pop).forEach(b => b.onclick = () => {
    $$('.iptile', pop).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    if (b.dataset.k !== t.preset) edit('sound', () => { t.preset = b.dataset.k; }, { quiet: true });
    previewSound(t);
    const btn = $('#soundBtn');
    if (btn) btn.innerHTML = `${instIcon(t.preset, 22)}<span>${esc(presetName(t))}</span>${CHEVRON}`;
  });
  $('#ipDone', pop).onclick = () => closeInstPicker();
  $('#ipCredits', pop).onclick = () => { closeInstPicker(); showCredits(); };
  ($('.iptile[aria-pressed="true"]', pop) || $('.iptile', pop)).focus();
}
function closeInstPicker(quiet) {
  const pop = $('#instPop');
  if (!pop) return;
  pop.remove();
  if (!quiet) renderAll();
}
document.addEventListener('pointerdown', e => { if ($('#instPop') && !e.target.closest('#instPop, #soundBtn')) closeInstPicker(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#instPop')) closeInstPicker(); });
function renderEditor() {
  const t = curTrack(), d = patData(UI.pat, t), view = $('#editorView');
  const synth = t.kind === 'synth';
  const chordy = synth && (t.role === 'chords' || t.role === 'other');
  const showPats = lockLevel() >= 6;
  const at = t.id + ':' + UI.pat, was = $('#prScroll') || $('#drumScroll');   // redrawing the same part keeps where you had scrolled to
  const keep = was && view.dataset.at === at ? was.scrollLeft : 0;
  view.dataset.at = at;
  view.innerHTML = `
    <div class="toolbar">
      <div class="edtitle"><span class="chip" style="background:${tcol(t)}"></span><h2>${esc(t.name)}</h2></div>
      <div class="field" data-lock="2" data-hint="<b>Sound</b>: choose which instrument this track plays. DAWs call these <b>instruments</b>, <b>plugins</b> or <b>presets</b>."><span class="label">Sound</span>
        <button class="btn soundbtn" id="soundBtn" aria-haspopup="dialog">${instIcon(t.preset, 22)}<span>${esc(presetName(t))}</span>${CHEVRON}</button></div>
      <label class="field" data-lock="3" data-hint="<b>Loop length</b>: how many bars this track's part lasts before it repeats. Chords and melodies often need 2 or 4 bars."><span class="label">Loop length</span>
        <select class="sel" id="lenSelect">${(LEN_OPTS.some(([v]) => v === d.len) ? LEN_OPTS : [...LEN_OPTS, [d.len, d.len / 16 + ' bars']]).map(([v, l]) =>`<option value="${v}"${v === d.len ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      ${synth ? `
      <label class="field" data-lock="2" data-hint="<b>New note length</b>: how long each note you place will be. You can also drag a note's right edge to stretch it."><span class="label">New notes</span>
        <select class="sel" id="nlSelect">${NL_OPTS.map(([v, l]) => `<option value="${v}"${v === t.nl ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      <div class="field" data-lock="2" data-hint="<b>Scale highlight</b>: greys out the notes that clash with your song&rsquo;s key, in the piano roll and on the piano below, so the bright notes are the ones that fit. Turn it off for plain piano colors."><span class="label">Scale</span>
        <button class="btn${UI.scaleLock ? ' on' : ''}" id="scaleLockBtn">${UI.scaleLock ? 'Highlighted' : 'Not highlighted'}</button></div>
      <div class="field" data-lock="2" data-hint="<b>Octave</b>: shift the piano roll view higher or lower. An octave is the jump from one C to the next C."><span class="label">Octave</span>
        <div class="seg"><button id="octDown" aria-label="Lower">&darr;</button><button id="octUp" aria-label="Higher">&uarr;</button></div></div>
      ${t.role !== 'chords' ? `<div class="field" data-lock="5" data-hint="<b>Show chord notes</b>: shades the notes that belong to the chord playing at each moment. Those notes always sound good together."><span class="label">Helpers</span>
        <button class="btn${UI.ghosts ? ' on' : ''}" id="ghostBtn">Chord notes</button></div>` : ''}
      ` : `
      <label class="field" data-lock="2" data-hint="<b>Starter beats</b>: load a classic drum pattern from a music style, then change it to make it yours."><span class="label">Starter beat</span>
        <select class="sel" id="beatSelect"><option value="">Choose a style&hellip;</option>${Object.entries(BEATS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}</select></label>
      <label class="field" data-lock="9" data-hint="<b>Swing</b>: delays every second step a little so the beat bounces. Used a lot in hip-hop, jazz and lo-fi."><span class="label">Swing <b class="mono" id="swingVal">${Math.round(S.swing * 100)}%</b></span>
        <input type="range" id="swingRange" min="0" max="1" step=".05" value="${S.swing}"></label>`}
      <span class="grow"></span>
      <button class="btn small" id="quantizeBtn" data-lock="5" data-hint="<b>Quantize</b>: snaps this track's ${synth ? 'notes' : 'drum hits'} to the nearest step so they line up perfectly with the beat. What you record keeps your exact timing until you press this (unless <b>Snap</b> was on).">Quantize</button>
      <button class="btn small" id="clearTrackBtn" data-lock="1" data-hint="<b>Clear</b>: erase this track's notes in the current pattern. Undo brings them back.">Clear</button>
    </div>
    ${showPats ? patBarHtml() : ''}
    ${chordy ? chordBarHtml(t) : ''}
    ${synth ? `<div class="pr" id="pianoRoll"><canvas class="keys" id="prKeys" data-hint="<b>Piano keys</b>: each row of the piano roll is one note. Click a key to hear it. Low notes at the bottom, high notes at the top."></canvas>
      <div class="gridscroll" id="prScroll" data-hint="<b>Piano roll</b>: click to add a note, drag to make it longer, drag a note to move it, click a note to delete it. Up and down is pitch, left to right is time.">
      <div class="prspace" id="prSpace"><canvas id="prGrid"></canvas><div class="playline" id="prLine"></div></div></div></div>
      <div id="rangeNote" style="font-size:13px;color:var(--ink-3);margin-top:6px"></div>
      ${typingHtml(t)}`
    : `<div class="gridscroll" id="drumScroll">${drumGridHtml(t, d)}</div>${typingHtml(t)}`}
  `;
  bindEditor(t, d);
  const sc = $('#prScroll') || $('#drumScroll');
  if (synth) renderEditorCanvas();
  if (keep) { sc.scrollLeft = keep; if (synth) drawGrid(); }
  if (!synth) drawEditorPlayhead();
}
function patBarHtml() {
  return `<div class="patbar" id="patBar" data-lock="7" data-hint="<b>Patterns</b> are the building blocks of a song. Each one holds a loop for every track. Make variations (a verse, a chorus) and arrange them in the Arrange tab.">
    <span class="label">Pattern</span>
    ${S.patterns.map((p, i) => `<button class="patchip" data-p="${i}" aria-pressed="${i === UI.pat}"><span class="n" style="background:var(--ink-2)">${i + 1}</span>${esc(p.name)}</button>`).join('')}
    <span class="grow" style="flex:1"></span>
    <button class="btn small" id="dupPatBtn" data-hint="<b>Duplicate</b>: copy this pattern into a new one, so you can make a variation without losing the original.">Duplicate</button>
    <button class="btn small" id="newPatBtn" data-hint="<b>New pattern</b>: start an empty pattern.">New</button>
    <button class="btn small" id="renPatBtn" data-hint="<b>Rename</b> this pattern, for example Verse or Chorus.">Rename</button>
    <button class="btn small" id="delPatBtn" data-hint="<b>Delete</b> this pattern. It also disappears from the song timeline.">Delete</button>
  </div>`;
}
function chordBarHtml(t) {
  const chords = [0, 1, 2, 3, 4, 5, 6].map(chordInfo);
  return `<div class="chordbar" id="chordHelper" data-lock="3" data-hint="<b>Chord helper</b>: a <b>chord</b> is 3 or more notes played together. These are the chords that fit your key. The number shows which step of the scale the chord starts on.">
    <span class="label">Chords in ${NOTE_NAMES[S.key]}</span>
    ${chords.map(c => `<button class="chordbtn" data-deg="${c.deg}" aria-pressed="${UI.stamp === c.deg}"><b>${c.name}</b><small>${c.deg + 1} &middot; ${c.roman}</small></button>`).join('')}
    <select class="sel" id="progSelect" data-hint="<b>Famous progressions</b>: chord patterns used in thousands of hit songs. Pick one to fill 4 bars instantly."><option value="">Famous progressions&hellip;</option>
      ${Object.entries(PROGRESSIONS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}</select>
    <button class="btn small" id="matchBassBtn" data-lock="3" data-hint="<b>Make bass follow chords</b>: writes a bassline that plays the root (main note) of each chord. Bass and chords that agree sound tight.">Make bass follow chords</button>
    <span style="font-size:13px;color:var(--ink-2)" id="stampMsg">${UI.stamp != null ? `Click the grid to place <b>${chordInfo(UI.stamp).name}</b>. Click the chord again to stop.` : 'Pick a chord, then click the grid to place it.'}</span>
  </div>`;
}
const DRUM_KEYS = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'];
// Two rows of the computer keyboard laid out like a piano, about 2½ octaves: Q to / are the white keys,
// and the number row plus S D F H J L ; ' are the black keys in between
const CHROM_KEYS = { q: 0, 2: 1, w: 2, 3: 3, e: 4, r: 5, 5: 6, t: 7, 6: 8, y: 9, 7: 10, u: 11, i: 12, 9: 13, o: 14, 0: 15, p: 16,
  z: 17, s: 18, x: 19, d: 20, c: 21, f: 22, v: 23, b: 24, h: 25, n: 26, j: 27, m: 28, ',': 29, l: 30, '.': 31, ';': 32, '/': 33, "'": 34 };
const PIANO_SPAN = 36;   // the keys you can assign: three octaves, C to B
// Keybinds: which computer key plays each piano key (by steps above Q's note) and each drum.
// The defaults are the layout above; Project > Settings can change them, and the changes are kept in this browser
const KB_DEFAULT = {
  piano: Object.fromEntries(Object.entries(CHROM_KEYS).map(([k, o]) => [o, k])),
  drums: Object.fromEntries(DRUM_ROWS.map((r, i) => [r.id, DRUM_KEYS[i] || ''])),
};
const KB = { piano: {}, drums: {} };
let KEY_NOTE = new Map(), KEY_DRUM = new Map();
function applyKeybinds(saved) {
  KB.piano = { ...KB_DEFAULT.piano, ...(saved && saved.piano) };
  KB.drums = { ...KB_DEFAULT.drums, ...(saved && saved.drums) };
  KEY_NOTE = new Map(Object.entries(KB.piano).filter(([, k]) => k).map(([o, k]) => [k, +o]));
  KEY_DRUM = new Map(Object.entries(KB.drums).filter(([, k]) => k).map(([r, k]) => [k, r]));
}
applyKeybinds(LS.get('keys'));
const typeBase = t => t.oct + 12 * UI.typeOct;   // Q plays the track's home C, the bottom row of its piano roll, so what you play shows up there
function keyToNote(k, t) {
  if (t.kind === 'drums') return KEY_DRUM.get(k) ?? null;
  const o = KEY_NOTE.get(k);
  return o == null ? null : typeBase(t) + o;
}
function shiftTypeOct(d) {
  UI.typeOct = clamp(UI.typeOct + d, -2, 2);
  renderEditor(); applyLocks();
}
function typingHtml(t) {
  if (t.kind === 'synth') return pianoHtml(t);
  return `<div class="typing" id="typingMap" data-lock="4" style="--tc:${tcol(t)}" data-hint="<b>Musical typing</b>: play this track with your computer keyboard. Each key is one drum. Change the keys in <b>Project &rarr; Settings</b>.">
    <span class="label" style="margin-right:4px">Keyboard</span>
    ${DRUM_ROWS.map(r => { const k = KB.drums[r.id]; return `<button class="k" data-row="${r.id}"${k ? ` data-k="${esc(k)}"` : ''}><b>${k ? esc(k.toUpperCase()) : '&ndash;'}</b>${r.name.replace(' Hat', '')}</button>`; }).join('')}
  </div>`;
}
// A piano for synth tracks. Each computer key's letter sits on the piano key it plays; click or drag across keys to play them too
function pianoHtml(t) {
  const map = new Map();   // note -> computer key
  KEY_NOTE.forEach((o, k) => map.set(typeBase(t) + o, k));
  let lo = typeBase(t) - 1, hi = typeBase(t) + PIANO_SPAN;   // the whole assignable range, plus a spare white key at each end
  while (isBlackKey(lo)) lo--;
  while (isBlackKey(hi)) hi++;
  const whites = []; for (let m = lo; m <= hi; m++) if (!isBlackKey(m)) whites.push(m);
  const key = (m, cls, extra = '') => {
    const k = map.get(m), out = UI.scaleLock && !inKey(m);
    return `<button class="${cls}${out ? ' out' : ''}${isRoot(m) ? ' root' : ''}${m === 60 ? ' midc' : ''}" data-m="${m}"${k ? ` data-k="${esc(k)}"` : ''}${extra} aria-label="${noteName(m)}${m === 60 ? ' (middle C)' : ''}${k ? ', computer key ' + esc(k.toUpperCase()) : ''}">`
      + `${k ? `<span class="cap">${esc(k.toUpperCase())}</span>` : ''}${cls === 'wk' ? `<span class="nn">${noteName(m)}</span>` : ''}</button>`;
  };
  let keys = whites.map(m => key(m, 'wk')).join('');
  for (let m = lo + 1; m < hi; m++) if (isBlackKey(m)) keys += key(m, 'bk', ` style="--x:${whites.filter(w => w < m).length}"`);
  return `<div class="typing pianomode" id="typingMap" data-lock="4" style="--tc:${tcol(t)}" data-hint="<b>Musical typing</b>: play this track with your computer keyboard. The letter on each piano key is the computer key that plays it. ${UI.scaleLock ? 'The greyed keys clash with your song&rsquo;s key, so the bright ones are the safe choices.' : ''} You can also click the piano. The octave buttons (or the <b>-</b> and <b>=</b> keys) move everything higher or lower. Change which keys play what in <b>Project &rarr; Settings</b>.">
    <div class="tyhead"><span class="label">Keyboard</span>
      <button class="btn small" id="typeOctDown" aria-label="Octave down">&minus;</button><span class="octnote mono">Octave ${UI.typeOct > 0 ? '+' : ''}${UI.typeOct}</span><button class="btn small" id="typeOctUp" aria-label="Octave up">+</button>
      <span class="octnote">or the - and = keys</span></div>
    <div class="pianoscroll"><div class="piano" id="piano" style="--whites:${whites.length}">${keys}</div></div>
  </div>`;
}
/* ---------- settings: keybinds ---------- */
// Project > Settings: click a piano key or a drum, then press the computer key you want to play it
function showSettings() {
  const m = modal(`<h2>Settings</h2>
    <h3 class="sethead">Piano keys</h3>
    <p class="setnote">Click a key, then press the computer key you want to play it. <b>Esc</b> cancels, <b>Backspace</b> leaves it empty. The note names are the Melody track&rsquo;s; other tracks use the same keys in their own range.</p>
    <div class="pianoscroll"><div class="piano kbpiano" id="kbPiano"></div></div>
    <h3 class="sethead">Drum keys</h3>
    <div class="kbdrums" id="kbDrums"></div>
    <p class="kbmsg" id="kbMsg" aria-live="polite"></p>
    <div class="acts"><button class="btn" id="kbReset">Reset to the default keys</button><button class="btn primary" id="kbDone">Done</button></div>`, true);
  const base = 60;   // Q plays middle C on the Melody track
  let pick = null;   // the key waiting for a computer key: { group: 'piano' | 'drums', id, label }
  const msg = h => { m.querySelector('#kbMsg').innerHTML = h; };
  const cap = k => `<span class="cap${k ? '' : ' none'}">${k ? esc(k.toUpperCase()) : '+'}</span>`;
  const draw = () => {
    const whites = []; for (let o = 0; o < PIANO_SPAN; o++) if (!isBlackKey(base + o)) whites.push(o);
    const key = (o, cls, extra = '') => {
      const k = KB.piano[o], n = base + o, sel = pick && pick.group === 'piano' && pick.id === o;
      return `<button class="${cls}${sel ? ' pick' : ''}${n === 60 ? ' midc' : ''}" data-o="${o}"${extra} aria-label="${noteName(n)}: ${k ? 'key ' + esc(k.toUpperCase()) : 'no key'}">${cap(k)}${cls === 'wk' ? `<span class="nn">${noteName(n)}</span>` : ''}</button>`;
    };
    let h = whites.map(o => key(o, 'wk')).join('');
    for (let o = 1; o < PIANO_SPAN - 1; o++) if (isBlackKey(base + o)) h += key(o, 'bk', ` style="--x:${whites.filter(w => w < o).length}"`);
    const p = m.querySelector('#kbPiano'); p.style.setProperty('--whites', whites.length); p.innerHTML = h;
    m.querySelector('#kbDrums').innerHTML = DRUM_ROWS.map(r => `<button class="btn kbpad${pick && pick.group === 'drums' && pick.id === r.id ? ' pick' : ''}" data-row="${r.id}">${drumIcon(r.id, 18)}${r.name}${cap(KB.drums[r.id])}</button>`).join('');
    m.querySelectorAll('#kbPiano [data-o]').forEach(b => b.onclick = () => {
      pick = { group: 'piano', id: +b.dataset.o, label: noteName(base + +b.dataset.o) }; msg(`Press the computer key for <b>${pick.label}</b>&hellip;`); draw();
    });
    m.querySelectorAll('#kbDrums [data-row]').forEach(b => b.onclick = () => {
      pick = { group: 'drums', id: b.dataset.row, label: DRUM_ROWS.find(r => r.id === b.dataset.row).name }; msg(`Press the computer key for the <b>${pick.label}</b>&hellip;`); draw();
    });
  };
  const save = () => { LS.set('keys', KB); applyKeybinds(KB); if (UI.view === 'editor') { renderEditor(); applyLocks(); } };
  const nameOf = (group, id) => group === 'piano' ? noteName(base + +id) : DRUM_ROWS.find(r => r.id === id).name;
  const onKey = e => {
    if (!m.isConnected) { document.removeEventListener('keydown', onKey, true); return; }
    if (!pick) return;
    e.preventDefault(); e.stopPropagation();
    if (e.key === 'Escape') { pick = null; msg(''); draw(); return; }
    const group = KB[pick.group];
    if (e.key === 'Backspace' || e.key === 'Delete') {
      group[pick.id] = ''; save(); msg(`<b>${pick.label}</b> has no key now. You can still click it.`); pick = null; draw(); return;
    }
    const k = e.key.toLowerCase();
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return msg('Pick a letter, number or symbol key (without Shift).');
    if (k === ' ') return msg('Space is saved for Play and Stop. Pick another key.');
    if (k === '-' || k === '=') return msg('<b>-</b> and <b>=</b> move the octave. Pick another key.');
    const other = Object.keys(group).find(id => group[id] === k && id !== String(pick.id));
    if (other != null) group[other] = group[pick.id] || '';   // swap: the key's old owner takes this key's old one
    group[pick.id] = k;
    save();
    msg(`<b>${esc(k.toUpperCase())}</b> now plays ${pick.label}.` + (other == null ? ''
      : ` ${nameOf(pick.group, other)} ${group[other] ? `moved to <b>${esc(group[other].toUpperCase())}</b>` : 'has no key now'}.`));
    pick = null; draw();
  };
  document.addEventListener('keydown', onKey, true);
  m.querySelector('#kbReset').onclick = () => {
    LS.set('keys', null); applyKeybinds(null); pick = null; draw(); msg('Back to the default keys.');
    if (UI.view === 'editor') { renderEditor(); applyLocks(); }
  };
  m.querySelector('#kbDone').onclick = closeModal;
  draw();
}
let pianoHeld = null;   // the piano key the mouse is holding down
function pianoPress(el) {
  if (pianoHeld === el) return;
  pianoRelease();
  pianoHeld = el;
  keyDown(el.dataset.k || 'piano' + el.dataset.m, +el.dataset.m);
}
function pianoRelease() {
  if (!pianoHeld) return;
  const el = pianoHeld; pianoHeld = null;
  keyUp(el.dataset.k || 'piano' + el.dataset.m);
}
function drumGridHtml(t, d) {
  const L = d.len;
  let h = `<div class="drumgrid" id="drumGrid" style="--tc:${tcol(t)};grid-template-columns:112px repeat(${L},minmax(26px,1fr))"><div></div>`;
  for (let s = 0; s < L; s++) h += `<div class="hd${s % 4 === 0 ? ' beat' : ''}">${s % 16 === 0 && L > 16 ? 'B' + (s / 16 + 1) : (s % 16) + 1}</div>`;
  DRUM_ROWS.forEach(r => {
    h += `<button class="rl" data-row="${r.id}" data-hint="${r.tip} Click the name to hear it.">${drumIcon(r.id, 22)}${r.name}</button>`;
    const hits = hitsByCell(d.rows[r.id], L);
    for (let s = 0; s < L; s++) {
      const x = hits.get(s), off = hitOff(x), loose = Math.abs(off) >= .03;
      h += `<button class="cellb${Math.floor(s / 4) % 2 ? ' beat' : ''}${x != null ? ' on' : ''}${loose ? ' loose' : ''}"${loose ? ` style="--off:${off}"` : ''} data-row="${r.id}" data-s="${s}" aria-label="${r.name} step ${s + 1}${loose ? (off < 0 ? ', played a little early' : ', played a little late') : ''}"></button>`;
    }
  });
  return h + `<div class="playcol" id="drumCol"></div></div>`;
}
// Each drum hit shows in its nearest step. A hit recorded off the grid gets a tick showing how early or late it was
function hitsByCell(row, L) {
  const m = new Map(), dist = h => Math.abs(h - Math.round(h));
  row.forEach(h => { const c = Math.round(h) % L; if (!m.has(c) || dist(h) < dist(m.get(c))) m.set(c, h); });
  return m;
}
const hitOff = h => h == null ? 0 : +(h - Math.round(h)).toFixed(2);   // -.5 (early) to .5 (late) of a step
function showHit(c, h) {
  const off = hitOff(h);
  c.classList.toggle('on', h != null); c.classList.toggle('loose', Math.abs(off) >= .03);
  c.style.setProperty('--off', off);
}

let drumPaint = null;
function bindEditor(t, d) {
  const v = $('#editorView');
  const on = (id, ev, fn) => { const el = $('#' + id, v); if (el) el['on' + ev] = fn; };
  on('soundBtn', 'click', e => { if ($('#instPop')) closeInstPicker(); else openInstPicker(t, e.currentTarget); });
  on('lenSelect', 'change', e => edit('len', () => setLen(t, d, +e.target.value)));
  on('nlSelect', 'change', e => edit('nl', () => { t.nl = +e.target.value; }));
  on('scaleLockBtn', 'click', () => { UI.scaleLock = !UI.scaleLock; persistSoon(); renderEditor(); applyLocks(); });
  on('ghostBtn', 'click', () => { UI.ghosts = !UI.ghosts; persistSoon(); renderEditor(); applyLocks(); });
  on('octDown', 'click', () => edit('oct', () => { t.oct = Math.max(24, t.oct - 12); }));
  on('octUp', 'click', () => edit('oct', () => { t.oct = Math.min(84, t.oct + 12); }));
  on('clearTrackBtn', 'click', () => edit('clear', () => { if (d.notes) d.notes = []; else DRUM_ROWS.forEach(r => { d.rows[r.id] = []; }); }));
  on('quantizeBtn', 'click', () => {
    let moved = 0;
    edit('quantize', () => {
      if (d.rows) return DRUM_ROWS.forEach(r => {
        const out = [];
        d.rows[r.id].forEach(h => { const s = Math.round(h) % d.len; if (s !== h) moved++; if (!out.includes(s)) out.push(s); });
        d.rows[r.id] = out;
      });
      const seen = new Set();
      d.notes = d.notes.filter(n => {
        const s = Math.min(Math.round(n.s), d.len - 1), l = Math.max(1, Math.round(n.l));
        if (s !== n.s || l !== n.l) moved++;
        n.s = s; n.l = l;
        const k = s + ':' + n.p; if (seen.has(k)) return false; seen.add(k); return true;
      });
    });
    C.quantized = (C.quantized || 0) + 1;
    const what = synth ? 'note' : 'drum hit';
    toast(moved ? `Snapped ${moved} ${what}${moved > 1 ? 's' : ''} to the grid. Undo puts them back.` : `Every ${what} is already on the grid.`);
  });
  on('beatSelect', 'change', e => { const k = e.target.value; if (!k) return; edit('beat', () => { d.len = 16; DRUM_ROWS.forEach(r => { d.rows[r.id] = (BEATS[k].rows[r.id] || []).slice(); }); }); toast(`Loaded the <b>${BEATS[k].name}</b> beat. Press Play to hear it.`); });
  on('swingRange', 'input', e => { checkpoint('swing'); S.swing = +e.target.value; $('#swingVal').textContent = Math.round(S.swing * 100) + '%'; changed({ quiet: true }); });
  // patterns
  $$('#patBar .patchip', v).forEach(b => b.onclick = () => { UI.pat = +b.dataset.p; renderAll(); });
  on('dupPatBtn', 'click', () => { edit('pat', () => { UI.pat = addPattern(S.patterns[UI.pat]); }); toast(`Copied into <b>${esc(S.patterns[UI.pat].name)}</b>. You are now editing the copy.`); });
  on('newPatBtn', 'click', () => edit('pat', () => { UI.pat = addPattern(); }));
  on('renPatBtn', 'click', async () => { const p = S.patterns[UI.pat]; const n = await askText('Rename pattern', p.name); if (n) edit('ren', () => { p.name = n; }); });
  on('delPatBtn', 'click', () => deletePattern(UI.pat));
  // chords
  $$('#chordHelper .chordbtn', v).forEach(b => b.onclick = () => {
    const deg = +b.dataset.deg;
    UI.stamp = UI.stamp === deg ? null : deg;
    if (UI.stamp != null) { ensureAudio(); voiceChord(deg, t.oct + 12).forEach(m => playSynth(G, t, m, AC.currentTime + .01, .7)); chordHeard(deg); }
    renderEditor(); applyLocks();
  });
  on('progSelect', 'change', e => { const k = e.target.value; if (!k) return; edit('prog', () => fillProgression(k)); toast(`Placed the <b>${PROGRESSIONS[k].name}</b> progression across 4 bars.`); });
  on('matchBassBtn', 'click', () => {
    let ok = false; edit('bass', () => { ok = matchBassToChords(UI.pat); });
    if (ok) { C.follow++; lessonTick(); }
    toast(ok ? 'The <b>Bass</b> track now follows your chords. Select it to see the notes.' : 'Add some chords first, then try again.');
  });
  // typing keys on screen
  $$('#typingMap .k', v).forEach(b => {
    const id = b.dataset.k || 'pad' + b.dataset.row;
    b.onpointerdown = e => { e.preventDefault(); keyDown(id, b.dataset.row); };
    b.onpointerup = b.onpointerleave = () => keyUp(id);
  });
  on('typeOctDown', 'click', () => shiftTypeOct(-1));
  on('typeOctUp', 'click', () => shiftTypeOct(1));
  const piano = $('#piano', v);
  if (piano) {
    piano.onpointerdown = e => { const el = e.target.closest('[data-m]'); if (!el || e.button > 0) return; e.preventDefault(); pianoPress(el); };
    piano.onpointerover = e => { const el = pianoHeld && e.target.closest('[data-m]'); if (el) pianoPress(el); };   // glide across the keys
    piano.onpointerleave = piano.onpointercancel = pianoRelease;
  }
  // drum grid
  const dg = $('#drumGrid', v);
  if (dg) {
    dg.onpointerdown = e => {
      const lab = e.target.closest('.rl'); if (lab) { preview(t, lab.dataset.row); C.drum++; lessonTick(); return; }
      const c = e.target.closest('.cellb'); if (!c) return;
      checkpoint();
      drumPaint = c.classList.contains('on') ? 'off' : 'on';
      setDrumCell(t, d, c, e);
      if (drumPaint === 'on') preview(t, c.dataset.row);
    };
    dg.onpointerover = e => { if (!drumPaint) return; const c = e.target.closest('.cellb'); if (c) setDrumCell(t, d, c, e); };
  }
  if (t.kind === 'synth') bindPianoRoll(t);
}
document.addEventListener('pointerup', () => { drumPaint = null; pianoRelease(); });
// Where a click in a drum box puts the hit. With Snap off it lands where you clicked:
// the middle of a box is right on the step, the left half a little early, the right half a little late
function cellPos(c, e, len) {
  const s = +c.dataset.s;
  if (UI.snap || !e) return s;
  const r = c.getBoundingClientRect(), p = s + (e.clientX - r.left) / r.width - .5;
  return +(((p % len) + len) % len).toFixed(2);
}
function setDrumCell(t, d, c, e) {
  const row = d.rows[c.dataset.row], s = +c.dataset.s, mine = h => Math.round(h) % d.len === s, has = row.some(mine);
  const at = cellPos(c, e, d.len);
  if (drumPaint === 'on' && !has) row.push(at);
  else if (drumPaint === 'off' && has) { for (let i = row.length - 1; i >= 0; i--) if (mine(row[i])) row.splice(i, 1); }
  else return;
  showHit(c, drumPaint === 'on' ? at : null);
  changed({ quiet: true });
}
function setLen(t, d, L) {
  const old = d.len; d.len = L;
  if (L <= old) return;
  // repeat the existing loop into the new bars when they are empty
  if (d.notes) {
    if (d.notes.some(n => n.s >= old)) return;
    const base = d.notes.filter(n => n.s < old);
    for (let o = old; o < L; o += old) base.forEach(n => d.notes.push({ ...n, s: n.s + o }));
  } else {
    DRUM_ROWS.forEach(r => {
      const row = d.rows[r.id]; if (row.some(s => s >= old)) return;
      const base = row.filter(s => s < old);
      for (let o = old; o < L; o += old) base.forEach(s => row.push(s + o));
    });
  }
}
async function deletePattern(i) {
  if (S.patterns.length < 2) return toast('A song needs at least one pattern.');
  const a = await ask('Delete this pattern?', `<b>${esc(S.patterns[i].name)}</b> and its notes will be removed, including from the song timeline. You can undo this.`,
    [{ id: 'no', label: 'Keep it' }, { id: 'yes', label: 'Delete', primary: true }]);
  if (a !== 'yes') return;
  edit('delpat', () => {
    S.patterns.splice(i, 1);
    S.tracks.forEach(t => { S.arr[t.id] = S.arr[t.id].map(p => p == null || p === i ? null : p > i ? p - 1 : p); });
    UI.pat = Math.max(0, i - 1);
  });
}

/* ---------- piano roll canvas ---------- */
const PR = { rows: [], ys: [], hs: [], H: 0, cw: 24, wh: 22, bh: 14, ruler: 22, kw: 72, drag: null, lit: new Set(), side: null };
const isBlackKey = m => [1, 3, 6, 8, 10].includes(pc(m));
// Two octaves from the track's home C, one row per note like the keys of a piano
function prRows(t) {
  const rows = [];
  for (let m = t.oct + 24; m >= t.oct; m--) rows.push(m);
  return rows;
}
// Where each row sits: white-key rows full height, black-key rows thinner (still big enough to click)
function layoutRows(rows) {
  let y = PR.ruler; PR.ys = []; PR.hs = [];
  rows.forEach(m => { const h = isBlackKey(m) ? PR.bh : PR.wh; PR.ys.push(y); PR.hs.push(h); y += h; });
  PR.H = y;
}
const rowAt = y => PR.ys.findIndex((top, i) => y >= top && y < top + PR.hs[i]);
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function chordPcsAt(t, s) {
  const ct = trackByRole('chords');
  if (!ct || ct === t || !UI.ghosts) return null;
  const cd = patData(UI.pat, ct), ls = s % cd.len;
  const ch = chordsIn(cd).filter(c => c.s <= ls && ls < c.s + c.l).pop();
  if (!ch) return null;
  return new Set(cd.notes.filter(n => n.s === ch.s).map(n => pc(n.p)));
}
function renderEditorCanvas() {
  const t = curTrack(), grid = $('#prGrid');
  if (!grid || t.kind !== 'synth') return;
  const d = patData(UI.pat, t);
  layoutRows(PR.rows = prRows(t));
  drawKeys();   // first, so the keys canvas has its real width (not the 300px default) before the grid measures
  const scroll = $('#prScroll');
  const avail = Math.max(200, scroll.clientWidth);
  PR.cw = clamp(Math.floor(avail / d.len), 22, 56);
  const W = d.len * PR.cw, Hh = PR.H;
  // grid: a spacer as wide as the whole loop scrolls, and the canvas draws only the part on screen
  Object.assign($('#prSpace').style, { width: W + 'px', height: Hh + 'px' });
  drawGrid();
  const out = d.notes.filter(n => n.p < t.oct || n.p > t.oct + 24).length;
  const rn = $('#rangeNote');
  if (rn) rn.textContent = out ? `${out} note${out > 1 ? 's are' : ' is'} outside this view. Use the Octave arrows to find ${out > 1 ? 'them' : 'it'}.` : '';
  $('#prLine').style.height = Hh + 'px';
  drawEditorPlayhead();
}
// The piano beside the piano roll, turned on its side. Black keys are shorter and sit on top, and each white key
// reaches halfway into the rows of its black neighbours, like on a real keyboard. Keys you are playing light up.
function drawKeys() {
  const cv = $('#prKeys'); if (!cv) return;
  const rows = PR.rows, kw = PR.kw, bw = Math.round(kw * .6), Hh = PR.H, dpr = window.devicePixelRatio || 1;
  if (cv.width !== Math.round(kw * dpr) || cv.height !== Math.round(Hh * dpr)) {
    cv.width = Math.round(kw * dpr); cv.height = Math.round(Hh * dpr); cv.style.width = kw + 'px'; cv.style.height = Hh + 'px';
  }
  const k = cv.getContext('2d'), seen = {}, col = n => seen[n] || (seen[n] = cssVar(n));
  const lit = col('--t' + curTrack().color), top = i => PR.ys[i], ht = i => PR.hs[i];
  const clash = m => UI.scaleLock && !inKey(m);
  k.setTransform(dpr, 0, 0, dpr, 0, 0);
  k.fillStyle = col('--panel'); k.fillRect(0, 0, kw, PR.ruler);
  k.fillStyle = col('--key-white'); k.fillRect(0, PR.ruler, kw, Hh - PR.ruler);
  k.font = '600 10px ' + col('--font-mono'); k.textAlign = 'right';
  const shade = k.createLinearGradient(0, 0, kw, 0);   // a soft shadow toward the back of the keys
  shade.addColorStop(0, 'rgba(0,0,0,.18)'); shade.addColorStop(.4, 'rgba(0,0,0,0)');
  rows.forEach((m, i) => {
    if (isBlackKey(m)) return;
    const up = rows.indexOf(m + 1), dn = rows.indexOf(m - 1);
    const y0 = top(i) - (up >= 0 && isBlackKey(m + 1) ? ht(up) / 2 : 0), y1 = top(i) + ht(i) + (dn >= 0 && isBlackKey(m - 1) ? ht(dn) / 2 : 0);
    if (PR.lit.has(m)) { k.fillStyle = lit; k.fillRect(0, y0, kw, y1 - y0); }
    else if (clash(m)) { k.fillStyle = 'rgba(20,24,40,.14)'; k.fillRect(0, y0, kw, y1 - y0); }   // greyed: clashes with your key
    k.fillStyle = shade; k.fillRect(0, y0, kw, y1 - y0);
    k.fillStyle = col('--line'); k.fillRect(0, y1 - 1, kw, 1);
    if (isRoot(m)) { k.fillStyle = col('--spot'); k.fillRect(kw - 4, top(i) + 2, 4, ht(i) - 4); }
    k.fillStyle = PR.lit.has(m) ? '#fff' : col('--key-black'); k.globalAlpha = clash(m) && !PR.lit.has(m) ? .45 : 1;
    k.fillText(noteName(m), kw - 8, top(i) + ht(i) / 2 + 3.5); k.globalAlpha = 1;
  });
  k.font = '600 9px ' + col('--font-mono');
  rows.forEach((m, i) => {
    if (!isBlackKey(m)) return;
    const y = top(i) + 1, h = ht(i) - 2, g = k.createLinearGradient(0, 0, bw, 0);
    if (clash(m)) { g.addColorStop(0, '#22252C'); g.addColorStop(.8, '#4B505B'); g.addColorStop(1, '#2E323A'); }   // greyed like the bottom piano's
    else { g.addColorStop(0, '#07080B'); g.addColorStop(.8, '#363B46'); g.addColorStop(1, '#1B1E25'); }
    k.fillStyle = PR.lit.has(m) ? lit : g; roundRect(k, -4, y, bw + 4, h, 3); k.fill();
    k.fillStyle = 'rgba(255,255,255,.14)'; k.fillRect(bw - 7, y + 2, 2, h - 4);   // light catching the front edge
    if (isRoot(m)) { k.fillStyle = col('--spot'); k.fillRect(kw - 4, y + 1, 4, h - 2); }
    if (!clash(m) && (UI.scaleLock || isRoot(m))) { k.fillStyle = '#fff'; k.fillText(noteName(m), bw - 11, y + h / 2 + 3); }
  });
  k.textAlign = 'left';
}
// Which side key is under a point: the right part of a black row belongs to the white keys around it
function sideKeyAt(x, y) {
  const i = rowAt(y), m = PR.rows[i];
  if (m == null || !isBlackKey(m) || x < PR.kw * .6) return m;
  const w = y - PR.ys[i] < PR.hs[i] / 2 ? m + 1 : m - 1;
  return PR.rows.includes(w) ? w : m;
}
// Draws the part of the piano roll that is on screen. Runs on every scroll, so a loop of any length stays quick
function drawGrid() {
  const t = curTrack(), grid = $('#prGrid'), scroll = $('#prScroll');
  if (!grid || t.kind !== 'synth') return;
  const d = patData(UI.pat, t), rows = PR.rows, cw = PR.cw, W = d.len * cw, Hh = PR.H;
  const vw = Math.min(W, Math.max(200, scroll.clientWidth)), x0 = clamp(scroll.scrollLeft, 0, W - vw);
  const dpr = window.devicePixelRatio || 1, seen = {}, col = n => seen[n] || (seen[n] = cssVar(n));
  if (grid.width !== Math.round(vw * dpr) || grid.height !== Math.round(Hh * dpr)) {
    grid.width = Math.round(vw * dpr); grid.height = Math.round(Hh * dpr);
    grid.style.width = vw + 'px'; grid.style.height = Hh + 'px';
  }
  const g = grid.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, -x0 * dpr, 0);   // draw in loop coordinates, shifted to the scroll position
  g.clearRect(x0, 0, vw, Hh);
  const s0 = Math.floor(x0 / cw), s1 = Math.min(d.len, Math.ceil((x0 + vw) / cw));
  // rows: black-key rows are the thin ones; with Scale highlight on, notes that clash with your key are greyed
  rows.forEach((m, i) => {
    const hl = UI.scaleLock;
    g.fillStyle = hl && !inKey(m) ? col('--cell') : hl && isRoot(m) ? col('--key-root') : isBlackKey(m) ? col('--row-alt') : col('--surface');
    g.fillRect(x0, PR.ys[i], vw, PR.hs[i]);
  });
  g.fillStyle = col('--grid-line');   // a line around every row, so each one reads as its own lane
  PR.ys.forEach(y => g.fillRect(x0, y, vw, 1));
  // chord-note shading
  if (t.role !== 'chords') for (let s = s0; s < s1; s++) {
    const set = chordPcsAt(t, s); if (!set) continue;
    g.fillStyle = col('--t3'); g.globalAlpha = .16;
    rows.forEach((m, i) => { if (set.has(pc(m))) g.fillRect(s * cw, PR.ys[i], cw, PR.hs[i]); });
    g.globalAlpha = 1;
  }
  for (let s = s0; s <= s1; s++) {
    g.fillStyle = s % 16 === 0 ? col('--grid-bar') : s % 4 === 0 ? col('--grid-beat') : col('--grid-line');
    g.fillRect(s * cw - (s % 16 === 0 ? 1 : 0), PR.ruler, s % 16 === 0 ? 2 : 1, Hh);
  }
  g.fillStyle = col('--panel'); g.fillRect(x0, 0, vw, PR.ruler);
  g.font = '500 11px ' + col('--font-mono');
  for (let s = s0 - s0 % 4; s < s1; s += 4) {
    g.fillStyle = s % 16 === 0 ? col('--ink') : col('--ink-3');
    g.fillText(s % 16 === 0 ? 'Bar ' + (s / 16 + 1) : 'beat ' + (s % 16 / 4 + 1), s * cw + 4, 15);
  }
  // notes
  g.font = '700 10px ' + col('--font-body');
  d.notes.forEach(n => {
    const i = rows.indexOf(n.p); if (i < 0 || n.s >= d.len || n.s >= s1 || n.s + n.l <= s0) return;
    const x = n.s * cw + 1, y = PR.ys[i] + 2, w = Math.min(n.l, d.len - n.s) * cw - 2, h = PR.hs[i] - 3;
    g.fillStyle = col('--t' + t.color); roundRect(g, x, y, w, h, 3); g.fill();
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + w - 4, y + 2, 2, h - 4);
    if (w > 26 && h >= 14) { g.fillStyle = '#fff'; g.fillText(noteName(n.p), x + 4, y + h / 2 + 3.5); }
  });
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function prHit(e) {
  const r = $('#prSpace').getBoundingClientRect();   // the whole loop, so x counts from its start even when scrolled
  const x = e.clientX - r.left, y = e.clientY - r.top, f = x / PR.cw;
  // at: where a click puts a note. The box you clicked with Snap on, the exact spot (even between boxes) with it off
  return { x, y, f, s: Math.floor(f), at: UI.snap ? Math.floor(f) : Math.max(0, +f.toFixed(2)), row: rowAt(y) };
}
function bindPianoRoll(t) {
  const grid = $('#prGrid'), keys = $('#prKeys');
  $('#prScroll').onscroll = drawGrid;
  keys.onpointerdown = e => {   // the side piano plays for as long as you hold it, and records like typing does
    const r = keys.getBoundingClientRect(), m = sideKeyAt(e.clientX - r.left, e.clientY - r.top);
    if (m == null) return;
    keys.setPointerCapture(e.pointerId);
    PR.side = 'side' + m; C.keys++; keyDown(PR.side, m);
  };
  keys.onpointerup = keys.onpointercancel = () => { if (PR.side) { keyUp(PR.side); PR.side = null; } };
  const noteAt = (d, s, m) => d.notes.find(n => n.p === m && n.s <= s && s < n.s + n.l);
  grid.onpointermove = e => {
    const d = patData(UI.pat, t), h = prHit(e), m = PR.rows[h.row];
    if (!PR.drag) {
      const n = m != null && noteAt(d, h.f, m);
      grid.style.cursor = !n ? 'crosshair' : h.x > (n.s + n.l) * PR.cw - 8 ? 'ew-resize' : 'grab';
      return;
    }
    const D = PR.drag; if (D.touch) return;
    const s = clamp(h.s, 0, d.len - 1);
    if (D.mode === 'resize') {
      if (s === D.s0 && !D.moved) return;
      D.moved = true;
      D.notes.forEach(n => { n.l = UI.snap ? clamp(s - n.s + 1, 1, d.len - n.s) : clamp(+(h.f - n.s).toFixed(2), .25, d.len - n.s); });
    } else if (D.mode === 'move') {
      const n = D.notes[0], np = m != null ? m : n.p;
      const ns = clamp(UI.snap ? s - D.off : +(h.f - D.off).toFixed(2), 0, d.len - n.l);
      if (ns !== n.s || np !== n.p) { D.moved = true; if (np !== n.p) preview(t, np, .25); n.s = ns; n.p = np; }
    }
    renderEditorCanvas();
  };
  grid.onpointerdown = e => {
    if (e.button > 0) return;
    const d = patData(UI.pat, t), h = prHit(e), m = PR.rows[h.row];
    if (h.y < PR.ruler || m == null || h.s >= d.len) return;
    if (e.pointerType === 'touch') { PR.drag = { touch: true, s: h.s, at: h.at, m }; return; }
    grid.setPointerCapture(e.pointerId);
    checkpoint();
    const n = noteAt(d, h.f, m);
    if (n) {
      PR.drag = h.x > (n.s + n.l) * PR.cw - 8 ? { mode: 'resize', notes: [n], s0: h.s, moved: false } : { mode: 'move', notes: [n], off: (UI.snap ? h.s : h.f) - n.s, moved: false };
      return;
    }
    const L = Math.min(t.nl, d.len - h.at);
    if (UI.stamp != null) {
      const before = d.notes.length;
      stampChord(t, d, UI.stamp, h.at, L, m - 5);
      PR.drag = { mode: 'resize', notes: d.notes.slice(before), s0: h.s, moved: false };
      PR.drag.notes.forEach(x => preview(t, x.p, .4));
    } else {
      const nn = { s: h.at, p: m, l: L };
      d.notes.push(nn); preview(t, m, .3);
      PR.drag = { mode: 'resize', notes: [nn], s0: h.s, moved: false, fresh: true };
    }
    renderEditorCanvas(); changed({ quiet: true });
  };
  grid.onpointerup = e => {
    const D = PR.drag; PR.drag = null;
    if (!D) return;
    const d = patData(UI.pat, t);
    if (D.touch) {
      const h = prHit(e), m = PR.rows[h.row];
      if (m !== D.m || h.s !== D.s) return;
      checkpoint();
      const n = noteAt(d, h.f, m);
      if (n) d.notes.splice(d.notes.indexOf(n), 1);
      else if (UI.stamp != null) stampChord(t, d, UI.stamp, D.at, Math.min(t.nl, d.len - D.at), m - 5);
      else { d.notes.push({ s: D.at, p: m, l: Math.min(t.nl, d.len - D.at) }); preview(t, m, .3); }
    } else if (D.mode === 'move' && !D.moved) {
      d.notes.splice(d.notes.indexOf(D.notes[0]), 1);
    }
    renderEditorCanvas(); changed({ quiet: true });
  };
  grid.onpointercancel = () => { PR.drag = null; };
  grid.oncontextmenu = e => {
    e.preventDefault();
    const d = patData(UI.pat, t), h = prHit(e), m = PR.rows[h.row], n = m != null && noteAt(d, h.f, m);
    if (n) edit('del', () => d.notes.splice(d.notes.indexOf(n), 1), { quiet: true }), renderEditorCanvas();
  };
}
// Where the playhead sits inside the current track's loop (or -1)
function editorLocal() {
  const s = UI.playStep; if (s < 0) return -1;
  const t = curTrack();
  if (UI.songMode && S.arr[t.id][Math.floor(s / 16)] !== UI.pat) return -1;
  const c = contentAt(t, s, UI.songMode, UI.pat);
  return c ? c.local : -1;
}
function drawEditorPlayhead() {
  const local = editorLocal(), t = curTrack();
  if (t.kind === 'drums') {
    const col = $('#drumCol'); if (!col) return;
    const cell = local >= 0 && $(`#drumGrid .cellb[data-s="${local}"]`);
    if (!cell) { col.style.display = 'none'; return; }
    const grid = $('#drumGrid');
    Object.assign(col.style, { display: 'block', left: cell.offsetLeft + 'px', width: cell.offsetWidth + 'px', top: cell.offsetTop + 'px', height: (grid.scrollHeight - cell.offsetTop - 8) + 'px' });
    followPlayhead($('#drumScroll'), cell.offsetLeft);
  } else {
    const line = $('#prLine'); if (!line) return;
    if (local < 0) { line.style.display = 'none'; return; }
    line.style.display = 'block'; line.style.left = local * PR.cw + 'px';
    followPlayhead($('#prScroll'), local * PR.cw);
  }
}
function followPlayhead(sc, x) {
  if (!sc || PR.drag || drumPaint) return;
  if (x < sc.scrollLeft || x > sc.scrollLeft + sc.clientWidth - 30) sc.scrollLeft = Math.max(0, x - 40);
}

/* ---------- computer keyboard as an instrument ---------- */
const DOWN = new Map();   // held key -> the note or drum it plays
// k is a computer key, or an id for a piano key clicked with the mouse (then note says which one)
function keyDown(k, note) {
  const t = curTrack(), n = note ?? keyToNote(k, t);
  if (n == null || DOWN.has(k)) return;
  DOWN.set(k, n);
  markKey(t, k, n, true);
  C.typed++;
  if (t.kind !== 'drums') noteHeard(n);
  if (t.kind === 'drums') {
    preview(t, n);
    if (recording()) recordDrum(t, n);
  } else noteOn(k, t, n);
  changed({ quiet: true });
}
function keyUp(k) {
  if (!DOWN.has(k)) return;
  const n = DOWN.get(k);
  DOWN.delete(k);
  markKey(curTrack(), k, n, false);
  noteOff(k);
}
// Lights a held key: the drum pad, or the note on both pianos (the one at the bottom and the one beside the piano roll)
function markKey(t, k, n, on) {
  if (t.kind === 'drums') { $$(`#typingMap .k[data-row="${n}"]`).forEach(b => b.classList.toggle('down', on)); return; }
  if (!on && [...DOWN.values()].includes(n)) return;   // still held another way
  $$(`#typingMap [data-m="${n}"]`).forEach(b => b.classList.toggle('down', on));
  if (on) PR.lit.add(n); else PR.lit.delete(n);
  drawKeys();
}
// A drum hit goes exactly where you played it, or on the nearest step when Snap is on
function recordDrum(t, row) {
  const s = recStep(heardNow()), d = patData(UI.pat, t);
  checkpoint('rec');
  if (s >= d.len) { d.len = roomFor(s); UI.redrawEditor = true; }
  if (!d.rows[row].includes(s)) d.rows[row].push(s);
  if (Math.floor(s) >= T.step) DRUM_SKIP.add(t.id + row + s);   // not scheduled yet: don't play it twice
  C.recNotes++;
  const cell = Math.round(s) % d.len, c = $(`#drumGrid .cellb[data-row="${row}"][data-s="${cell}"]`);
  if (c) showHit(c, hitsByCell(d.rows[row], d.len).get(cell));
}
