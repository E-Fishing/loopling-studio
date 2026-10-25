'use strict';
/* ================= Music theory ================= */
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SCALES = {
  major:   { name: 'Major (bright, happy)',          steps: [0,2,4,5,7,9,11], parent: 'major' },
  minor:   { name: 'Minor (moody, emotional)',       steps: [0,2,3,5,7,8,10], parent: 'minor' },
  majpent: { name: 'Major pentatonic (can’t miss)', steps: [0,2,4,7,9],    parent: 'major' },
  minpent: { name: 'Minor pentatonic (can’t miss)', steps: [0,3,5,7,10],   parent: 'minor' },
  blues:   { name: 'Blues (gritty)',                 steps: [0,3,5,6,7,10],   parent: 'minor' },
};
const PARENT = { major: [0,2,4,5,7,9,11], minor: [0,2,3,5,7,8,10] };
const ROMAN = ['I','II','III','IV','V','VI','VII'];
const pc = m => ((m % 12) + 12) % 12;
const noteName = m => NOTE_NAMES[pc(m)] + (Math.floor(m / 12) - 1);
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function inKey(m) { return SCALES[S.scale].steps.includes(pc(m - S.key)); }
function isRoot(m) { return pc(m - S.key) === 0; }

// Triad built on scale degree `deg` (0-based) of the parent major/minor scale
function chordInfo(deg) {
  const P = PARENT[SCALES[S.scale].parent];
  const offs = [0, 2, 4].map(i => { const k = deg + i; return P[k % 7] + 12 * Math.floor(k / 7); });
  const third = offs[1] - offs[0], fifth = offs[2] - offs[0];
  const q = fifth === 6 ? 'dim' : third === 3 ? 'min' : 'maj';
  const root = pc(S.key + offs[0]);
  let roman = ROMAN[deg]; if (q !== 'maj') roman = roman.toLowerCase(); if (q === 'dim') roman += '°';
  return { deg, offs, q, root, roman, name: NOTE_NAMES[root] + (q === 'min' ? 'm' : q === 'dim' ? '°' : '') };
}
// Midi notes for a chord voiced at or just above `base`
function voiceChord(deg, base) {
  const c = chordInfo(deg);
  const r = base + pc(S.key + c.offs[0] - base);
  return c.offs.map(o => r + o - c.offs[0]);
}
const PROGRESSIONS = {
  pop:    { name: 'Pop hit (1-5-6-4)',      degs: [0,4,5,3] },
  sad:    { name: 'Emotional (6-4-1-5)',     degs: [5,3,0,4] },
  fifties:{ name: 'Fifties (1-6-4-5)',       degs: [0,5,3,4] },
  epic:   { name: 'Epic (1-4-6-5)',          degs: [0,3,5,4] },
  jazzy:  { name: 'Jazzy (2-5-1-1)',         degs: [1,4,0,0] },
  dark:   { name: 'Dark (1-7-6-7)',          degs: [0,6,5,6] },
};

/* ================= Instruments ================= */
const DRUM_ROWS = [
  { id: 'kick',  name: 'Kick',       tip: 'The deep <b>boom</b>. Usually lands on beat 1.' },
  { id: 'snare', name: 'Snare',      tip: 'The sharp <b>crack</b>. Usually on beats 2 and 4 (the backbeat).' },
  { id: 'clap',  name: 'Clap',       tip: 'A hand <b>clap</b>. Often doubles the snare or replaces it.' },
  { id: 'chat',  name: 'Closed Hat', tip: 'A short <b>tick</b> (closed hi-hat). Keeps time between the big hits.' },
  { id: 'ohat',  name: 'Open Hat',   tip: 'A longer <b>tssss</b> (open hi-hat). Great on the off-beats.' },
  { id: 'tom',   name: 'Tom',        tip: 'A pitched drum <b>bom</b>. Good for fills at the end of a bar.' },
  { id: 'rim',   name: 'Rim',        tip: 'A woody <b>click</b>. Adds a small accent.' },
  { id: 'perc',  name: 'Shaker',     tip: 'A soft <b>shh</b>. Adds movement and groove.' },
];
const KITS = {
  classic: { name: 'Classic Kit', cat: 'Drum kit', kp: [160, 48, .11], kd: .42, tone: 20000 },
  boom:    { name: '808 Boom',    cat: 'Drum kit', kp: [120, 40, .18], kd: 1.1, tone: 20000, drive: 1 },
  lofi:    { name: 'Lo-Fi Dusty', cat: 'Drum kit', kp: [140, 46, .12], kd: .38, tone: 2600 },
};
const SYNTHS = {
  'deep-bass':   { name: 'Electric Bass', cat: 'Bass', osc: [{ t:'sawtooth', g:.32 }, { t:'sine', o:-12, g:.75 }], f: { f:420, q:5, env:1100, d:.18 }, a: { a:.004, d:.3, s:.6, r:.08 }, gain:.62 },
  'sub-808':     { name: '808 Sub',       cat: 'Bass', osc: [{ t:'sine', g:1 }], drive: 3, slide: 7, a: { a:.002, d:1.4, s:.15, r:.12 }, gain:.62 },
  'pluck-bass':  { name: 'Upright Bass',  cat: 'Bass', osc: [{ t:'square', g:.35 }, { t:'sine', o:-12, g:.55 }], f: { f:260, q:8, env:2600, d:.12 }, a: { a:.002, d:.32, s:.2, r:.06 }, gain:.6 },
  'piano':       { name: 'Grand Piano',   cat: 'Keys', piano: true, osc: [], a: { a:.003, d:1, s:0, r:.12 }, gain:.32 },
  'soft-keys':   { name: 'Soft Keys',     cat: 'Keys', osc: [{ t:'triangle', g:.55 }, { t:'sine', o:12, g:.12 }], f: { f:2800, q:.5 }, a: { a:.006, d:1.1, s:.3, r:.4 }, gain:.42 },
  'organ':       { name: 'Organ',         cat: 'Keys', osc: [{ t:'sine', g:.38 }, { t:'sine', o:12, g:.24 }, { t:'sine', o:19, g:.14 }, { t:'sine', o:24, g:.1 }], a: { a:.01, d:.1, s:.9, r:.08 }, gain:.38 },
  'warm-pad':    { name: 'Warm Pad',      cat: 'Pad',  osc: [{ t:'sawtooth', dt:-9, g:.22 }, { t:'sawtooth', dt:9, g:.22 }, { t:'triangle', o:-12, g:.22 }], f: { f:900, q:1, env:700, d:.9 }, a: { a:.35, d:.6, s:.8, r:.9 }, gain:.36 },
  'bright-pluck':{ name: 'Harp',          cat: 'Strings', osc: [{ t:'sawtooth', g:.36 }, { t:'sawtooth', dt:8, g:.2 }], f: { f:800, q:5, env:5200, d:.14 }, a: { a:.002, d:.38, s:.06, r:.2 }, gain:.42 },
  'retro-lead':  { name: 'Retro Lead',    cat: 'Lead', osc: [{ t:'square', g:.26 }, { t:'square', dt:10, g:.14 }], f: { f:2600, q:2 }, a: { a:.01, d:.2, s:.7, r:.15 }, vib: { rate:5.5, depth:14, delay:.22 }, gain:.36 },
  'music-box':   { name: 'Music Box',     cat: 'Lead', osc: [{ t:'sine', g:.6 }], fm: { ratio:3.5, index:2.2, d:.5 }, a: { a:.002, d:1.2, s:0, r:.5 }, gain:.5 },
  'flute':       { name: 'Flute',         cat: 'Woodwinds', osc: [{ t:'sine', g:.6 }, { t:'triangle', o:12, g:.06 }], noise:.07, a: { a:.06, d:.2, s:.8, r:.2 }, vib: { rate:5, depth:10, delay:.3 }, gain:.46 },
  'violin':      { name: 'Violin',        cat: 'Strings',   osc: [{ t:'sawtooth', g:.3 }, { t:'sawtooth', dt:6, g:.2 }], f: { f:3200, q:1 }, a: { a:.08, d:.3, s:.85, r:.3 }, vib: { rate:5.5, depth:12, delay:.25 }, gain:.3 },
  'viola':       { name: 'Viola',         cat: 'Strings',   osc: [{ t:'sawtooth', g:.3 }, { t:'sawtooth', dt:-6, g:.2 }], f: { f:2400, q:1 }, a: { a:.1, d:.3, s:.85, r:.3 }, vib: { rate:5.2, depth:12, delay:.25 }, gain:.3 },
  'cello':       { name: 'Cello',         cat: 'Strings',   osc: [{ t:'sawtooth', g:.32 }, { t:'sawtooth', dt:5, g:.2 }], f: { f:1800, q:1 }, a: { a:.12, d:.3, s:.85, r:.35 }, vib: { rate:5, depth:10, delay:.3 }, gain:.32 },
  'strings':     { name: 'String Section', cat: 'Strings',  osc: [{ t:'sawtooth', dt:-10, g:.2 }, { t:'sawtooth', dt:10, g:.2 }, { t:'sawtooth', g:.15 }], f: { f:2600, q:.7 }, a: { a:.3, d:.4, s:.85, r:.6 }, gain:.3 },
  'sax':         { name: 'Saxophone',     cat: 'Woodwinds', osc: [{ t:'sawtooth', g:.3 }, { t:'square', g:.12 }], f: { f:1500, q:3, env:1200, d:.2 }, a: { a:.03, d:.2, s:.8, r:.12 }, vib: { rate:5, depth:10, delay:.35 }, gain:.33 },
  'clarinet':    { name: 'Clarinet',      cat: 'Woodwinds', osc: [{ t:'square', g:.35 }], f: { f:2200, q:.7 }, a: { a:.04, d:.2, s:.85, r:.1 }, gain:.3 },
  'oboe':        { name: 'Oboe',          cat: 'Woodwinds', osc: [{ t:'sawtooth', g:.25 }, { t:'square', g:.12 }], f: { f:2800, q:4 }, a: { a:.03, d:.2, s:.85, r:.1 }, vib: { rate:5.5, depth:8, delay:.3 }, gain:.28 },
  'bassoon':     { name: 'Bassoon',       cat: 'Woodwinds', osc: [{ t:'square', g:.3 }, { t:'sawtooth', g:.12 }], f: { f:1100, q:2 }, a: { a:.04, d:.2, s:.85, r:.1 }, gain:.33 },
  'trumpet':     { name: 'Trumpet',       cat: 'Brass',     osc: [{ t:'sawtooth', g:.35 }], f: { f:900, q:2, env:3000, d:.15 }, a: { a:.025, d:.2, s:.8, r:.12 }, gain:.32 },
  'trombone':    { name: 'Trombone',      cat: 'Brass',     osc: [{ t:'sawtooth', g:.35 }], f: { f:600, q:2, env:2000, d:.2 }, a: { a:.04, d:.2, s:.8, r:.14 }, gain:.34 },
  'french-horn': { name: 'French Horn',   cat: 'Brass',     osc: [{ t:'sawtooth', g:.25 }, { t:'triangle', g:.25 }], f: { f:700, q:1, env:900, d:.25 }, a: { a:.06, d:.2, s:.85, r:.2 }, gain:.34 },
  'tuba':        { name: 'Tuba',          cat: 'Brass',     osc: [{ t:'sawtooth', g:.3 }, { t:'sine', o:-12, g:.3 }], f: { f:450, q:1.5, env:700, d:.2 }, a: { a:.05, d:.2, s:.85, r:.15 }, gain:.4 },
};
const ROLE_DEF = {
  drums:  { name: 'Drums',  kind: 'drums', preset: 'classic',      color: 1, len: 16, oct: 0,  nl: 1,  rev: .05 },
  bass:   { name: 'Bass',   kind: 'synth', preset: 'deep-bass',    color: 2, len: 16, oct: 36, nl: 2,  rev: .04 },
  chords: { name: 'Chords', kind: 'synth', preset: 'piano',        color: 3, len: 64, oct: 48, nl: 16, rev: .22 },
  melody: { name: 'Melody', kind: 'synth', preset: 'bright-pluck', color: 4, len: 32, oct: 60, nl: 2,  rev: .2 },
  other:  { name: 'Synth',  kind: 'synth', preset: 'retro-lead',   color: 5, len: 16, oct: 60, nl: 2,  rev: .15 },
};
const ROLE_LESSON = { drums: 1, bass: 2, chords: 3, melody: 5, other: 7 };
const BEATS = {
  rock:      { name: 'Rock',                rows: { kick:[0,8,10], snare:[4,12], chat:[0,2,4,6,8,10,12,14] } },
  pop:       { name: 'Pop',                 rows: { kick:[0,6,8], snare:[4,12], clap:[12], chat:[0,2,4,6,8,10,12,14] } },
  hiphop:    { name: 'Hip-hop (boom bap)',  rows: { kick:[0,7,10], snare:[4,12], chat:[0,2,4,6,8,10,12,14] } },
  house:     { name: 'House (four on the floor)', rows: { kick:[0,4,8,12], clap:[4,12], ohat:[2,6,10,14], chat:[0,1,4,5,8,9,12,13] } },
  trap:      { name: 'Trap',                rows: { kick:[0,7,11], clap:[8], snare:[8], chat:[0,2,4,6,8,10,12,13,14,15] } },
  reggaeton: { name: 'Reggaeton (dembow)',  rows: { kick:[0,4,8,12], snare:[3,6,11,14], chat:[0,2,4,6,8,10,12,14] } },
  lofi:      { name: 'Lo-fi',               rows: { kick:[0,7,10], snare:[4,12], chat:[0,2,4,6,8,10,12,14], perc:[3,11] } },
};
const ICONS = {
  drums:  '<svg class="i" viewBox="0 0 24 24"><ellipse cx="12" cy="8" rx="8" ry="3"/><path d="M4 8v8c0 1.7 3.6 3 8 3s8-1.3 8-3V8"/></svg>',
  bass:   '<svg class="i" viewBox="0 0 24 24"><path d="M3 15c3 0 3-6 6-6s3 6 6 6 3-6 6-6"/></svg>',
  chords: '<svg class="i" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v10M12 4v10M16 4v10"/></svg>',
  melody: '<svg class="i" viewBox="0 0 24 24"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
  other:  '<svg class="i" viewBox="0 0 24 24"><path d="M2 12h4l3-8 4 16 3-8h6"/></svg>',
  speaker:'<svg class="i" viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 010 6"/></svg>',
  lock:   '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>',
  check:  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
};

/* ================= Project state ================= */
const BARS = 32;
let S = null;                 // the song project (saved, undoable)
const UI = {                  // view state (not part of the song)
  mode: 'learn', view: 'editor', track: null, pat: 0, songMode: false, metro: false, rec: false, snap: true,
  scaleLock: true, ghosts: true, stamp: null, paint: 0, songStart: 0, playStep: -1, menu: false,
  daw: /Mac/.test(navigator.userAgent) && navigator.maxTouchPoints < 2 ? 'gb' : 'bl',   // which real DAW the lesson bridges show first
};
const P = { v: 2, lesson: 0, step: 0, reached: 0, done: [], welcomed: false };   // lesson progress (v2: theory lesson added as Lesson 5)
const C = { keys: 0, typed: 0, recNotes: 0, saves: 0, exports: 0 };       // counters lessons check

function emptyProject() {
  return { v: 1, name: 'My first song', bpm: 90, swing: 0, key: 0, scale: 'major', tracks: [], patterns: [], arr: {}, nextId: 1, isDemo: false };
}
function newProject() {
  S = emptyProject();
  ['drums','bass','chords','melody'].forEach(r => addTrack(r));
  addPattern();
}
function addTrack(role) {
  const d = ROLE_DEF[role];
  const used = S.tracks.map(t => t.color);
  let color = d.color;
  if (role === 'other') { for (let c = 5; c <= 8; c++) if (!used.includes(c)) { color = c; break; } }
  const t = { id: 't' + (S.nextId++), role, kind: d.kind, name: role === 'other' ? 'Synth ' + (S.tracks.filter(x => x.role === 'other').length + 1) : d.name,
    preset: d.preset, color, vol: .8, pan: 0, rev: d.rev, echo: 0, mute: false, solo: false, oct: d.oct, nl: d.nl };
  S.tracks.push(t);
  S.arr[t.id] = Array(BARS).fill(null);
  return t;
}
function addPattern(copyFrom) {
  const p = copyFrom ? JSON.parse(JSON.stringify(copyFrom)) : { data: {} };
  p.name = 'Pattern ' + (S.patterns.length + 1);
  S.patterns.push(p);
  return S.patterns.length - 1;
}
const trackById = id => S.tracks.find(t => t.id === id);
const trackByRole = role => S.tracks.find(t => t.role === role);
const curTrack = () => trackById(UI.track) || S.tracks[0];
function patData(pi, t) {
  const p = S.patterns[pi];
  let d = p.data[t.id];
  if (!d) { d = t.kind === 'drums' ? { len: 16, rows: {} } : { len: ROLE_DEF[t.role].len, notes: [] }; p.data[t.id] = d; }
  if (t.kind === 'drums') DRUM_ROWS.forEach(r => { if (!d.rows[r.id]) d.rows[r.id] = []; });
  return d;
}
function hasContent(d) { return d && (d.notes ? d.notes.length > 0 : Object.values(d.rows).some(a => a.length)); }
// Loop length (steps) of a pattern: its longest track that has content, plus the track you are editing
function patLen(pi) {
  let L = 16;
  S.tracks.forEach(t => { const d = S.patterns[pi].data[t.id]; if (d && (hasContent(d) || t.id === UI.track)) L = Math.max(L, d.len); });
  return L;
}
function songBars() {
  let last = -1;
  S.tracks.forEach(t => (S.arr[t.id] || []).forEach((p, b) => { if (p != null) last = Math.max(last, b); }));
  return last + 1;
}
// What a track plays at an absolute step: { d, local } or null
function contentAt(t, step, songMode, pi) {
  if (!songMode) { const d = patData(pi, t); return { d, local: step % d.len }; }
  const bar = Math.floor(step / 16), row = S.arr[t.id];
  const p = row && row[bar];
  if (p == null || !S.patterns[p]) return null;
  let b0 = bar; while (b0 > 0 && row[b0 - 1] === p) b0--;
  const d = patData(p, t);
  return { d, local: ((bar - b0) * 16 + step % 16) % d.len };
}

/* ================= Song helpers used by tools and lessons ================= */
function stampChord(t, d, deg, step, len, base) {
  voiceChord(deg, base).forEach(m => {
    d.notes = d.notes.filter(n => !(n.s === step && n.p === m));
    d.notes.push({ s: step, p: m, l: len });
  });
}
function fillProgression(key) {
  const t = trackByRole('chords') || curTrack();
  const d = patData(UI.pat, t);
  d.len = 64; d.notes = [];
  PROGRESSIONS[key].degs.forEach((deg, i) => stampChord(t, d, deg, i * 16, 16, t.oct));
  return t;
}
// Groups chord-track notes into chords: [{s, l, root}]
function chordsIn(d) {
  const by = {};
  d.notes.forEach(n => { (by[n.s] = by[n.s] || []).push(n); });
  return Object.keys(by).map(Number).sort((a, b) => a - b).filter(s => by[s].length >= 2)
    .map(s => ({ s, l: Math.max(...by[s].map(n => n.l)), root: Math.min(...by[s].map(n => n.p)) }));
}
function matchBassToChords(pi) {
  const ct = trackByRole('chords'), bt = trackByRole('bass');
  if (!ct || !bt) return false;
  const cd = patData(pi, ct), bd = patData(pi, bt);
  const chords = chordsIn(cd);
  if (!chords.length) return false;
  bd.len = cd.len; bd.notes = [];
  chords.forEach((c, i) => {
    const end = i + 1 < chords.length ? chords[i + 1].s : cd.len;
    const span = Math.min(c.l, end - c.s) || 16;
    const r = bt.oct + pc(c.root - bt.oct);
    [[0, 5, 0], [6, 2, 0], [8, 3, 0], [12, 3, 12]].forEach(([o, l, up]) => {
      if (o < span) bd.notes.push({ s: c.s + o, p: r + up, l: Math.min(l, span - o) });
    });
  });
  return true;
}
function applyBeat(key, pi) {
  const t = trackByRole('drums') || S.tracks.find(x => x.kind === 'drums');
  if (!t) return;
  const d = patData(pi, t);
  d.len = 16;
  DRUM_ROWS.forEach(r => { d.rows[r.id] = (BEATS[key].rows[r.id] || []).slice(); });
}
function autoArrange() {
  const A = 0, B = S.patterns.length > 1 ? 1 : 0;
  const plan = [ // [bars, pattern, roles]
    [4, A, ['chords']],
    [4, A, ['chords','melody']],
    [8, A, ['drums','bass','chords']],
    [8, B, ['drums','bass','chords','melody','other']],
    [4, A, ['chords','melody']],
  ];
  S.tracks.forEach(t => { S.arr[t.id] = Array(BARS).fill(null); });
  let bar = 0;
  plan.forEach(([n, p, roles]) => {
    S.tracks.forEach(t => { if (roles.includes(t.role)) for (let b = bar; b < bar + n && b < BARS; b++) S.arr[t.id][b] = p; });
    bar += n;
  });
}
function demoProject() {
  newProject();
  Object.assign(S, { name: 'Late Night Loop (demo)', bpm: 86, key: 9, scale: 'minor', isDemo: true });
  const [dr, ba, ch, me] = S.tracks;
  ch.preset = 'warm-pad'; ch.vol = .7; me.preset = 'bright-pluck'; me.echo = .22; me.vol = .62; ba.vol = .85;
  S.patterns[0].name = 'Verse';
  const dd = patData(0, dr);
  Object.assign(dd.rows, { kick: [0,7,10], snare: [4,12], chat: [0,2,4,6,8,10,12], ohat: [14], perc: [3,11] });
  const cd = patData(0, ch); cd.len = 64;
  [0,5,2,6].forEach((deg, i) => stampChord(ch, cd, deg, i * 16, 16, ch.oct));
  matchBassToChords(0);
  const md = patData(0, me); md.len = 64;
  md.notes = [[0,76,2],[2,74,2],[4,72,4],[10,69,2],[12,72,4],[16,69,2],[18,72,2],[20,69,4],[26,67,2],[28,69,4],
    [32,76,2],[34,79,2],[36,76,4],[42,74,2],[44,72,4],[48,74,2],[50,72,2],[52,69,6],[60,67,2],[62,69,2]].map(([s,p,l]) => ({ s, p, l }));
  const p2 = addPattern(S.patterns[0]);
  S.patterns[p2].name = 'Chorus';
  const d2 = patData(p2, dr);
  Object.assign(d2.rows, { chat: [0,1,2,4,6,8,9,10,12], clap: [4,12], tom: [13,15] });
  const arr = (t, from, to, p) => { for (let b = from; b < to; b++) S.arr[t.id][b] = p; };
  arr(ch, 0, 20, 0); arr(ch, 8, 16, 1);
  arr(dr, 4, 8, 0); arr(dr, 8, 16, 1);
  arr(ba, 4, 8, 0); arr(ba, 8, 16, 1);
  arr(me, 8, 16, 1); arr(me, 16, 20, 0);
}
function projectIsEmpty() {
  return S.patterns.every(p => S.tracks.every(t => !hasContent(p.data[t.id])));
}

/* ================= Undo / redo ================= */
const H = { undo: [], redo: [], key: null, at: 0 };
function checkpoint(key) {
  const now = performance.now();
  if (key && key === H.key && now - H.at < 1500) { H.at = now; return; }
  H.undo.push(JSON.stringify(S));
  if (H.undo.length > 150) H.undo.shift();
  H.redo.length = 0; H.key = key; H.at = now;
}
function undo() { if (!H.undo.length) return toast('Nothing to undo'); H.redo.push(JSON.stringify(S)); S = JSON.parse(H.undo.pop()); H.key = null; afterLoad(); toast('Undone'); }
function redo() { if (!H.redo.length) return toast('Nothing to redo'); H.undo.push(JSON.stringify(S)); S = JSON.parse(H.redo.pop()); H.key = null; afterLoad(); toast('Redone'); }
// Wraps a song change: remembers it for undo, applies it, saves and redraws
function edit(key, fn, opts = {}) {
  checkpoint(key);
  fn();
  changed(opts);
}

/* ================= Browser storage (convenience only) ================= */
const LS = {
  get(k) { try { const v = localStorage.getItem('loopling:' + k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem('loopling:' + k, JSON.stringify(v)); return true; } catch (e) { return false; /* storage blocked or full */ } },
};
let saveTimer = null, saveWarned = false;
function persistSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!LS.set('project', S) && !saveWarned) storageBlocked();
    LS.set('progress', P);
    LS.set('ui', { mode: UI.mode, scaleLock: UI.scaleLock, ghosts: UI.ghosts, motion: UI.motion, voice: UI.voice, snap: UI.snap, daw: UI.daw, theme: document.documentElement.dataset.theme || '' });
  }, 500);
}
// The browser refused to keep the song (private window, blocked site data, or full): say so once and unlock Save
function storageBlocked() {
  saveWarned = true;
  $('#saveBtn').dataset.lock = '0'; applyLocks();
  toast('Your browser isn\'t letting Loopling keep your song, so it will be gone when you close this page. Click <b>Save</b> at the top to keep a copy.', 10000);
}
function validProject(o) {
  return o && Array.isArray(o.tracks) && Array.isArray(o.patterns) && o.patterns.length && typeof o.bpm === 'number' && o.arr;
}
