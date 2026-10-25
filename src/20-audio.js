
/* ================= Audio engine (Web Audio, all sounds synthesized) ================= */
let AC = null, G = null;          // live AudioContext and its mixer graph
const REC_SKIP = new WeakSet();   // freshly recorded notes the scheduler should not double-play
const DRUM_SKIP = new Set();      // same for freshly recorded drum hits
const stepDur = () => 60 / S.bpm / 4;

function noiseBuf(ctx) {
  if (ctx._noise) return ctx._noise;
  const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return (ctx._noise = b);
}
function impulse(ctx, secs, decay) {
  const len = Math.floor(ctx.sampleRate * secs), b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  return b;
}
const rooms = new WeakMap();   // one reverb impulse per audio context, reused when the mixer is rebuilt
const reverbIR = ctx => rooms.get(ctx) || (rooms.set(ctx, impulse(ctx, 2.6, 3)), rooms.get(ctx));
const curves = {};
function driveCurve(k) {
  if (curves[k]) return curves[k];
  const c = new Float32Array(1024), n = Math.tanh(k);
  for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(k * x) / n; }
  return (curves[k] = c);
}
function setP(ctx, param, v) {
  if (typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext) param.value = v;
  else param.setTargetAtTime(v, ctx.currentTime, .015);
}

function buildGraph(ctx) {
  const g = { ctx, tracks: {} };
  g.master = ctx.createGain();
  g.comp = ctx.createDynamicsCompressor();
  g.comp.threshold.value = -6; g.comp.knee.value = 6; g.comp.ratio.value = 10; g.comp.attack.value = .003; g.comp.release.value = .2;
  g.analyser = ctx.createAnalyser(); g.analyser.fftSize = 1024;
  g.duck = ctx.createGain();   // turned down while Woofer talks
  g.master.connect(g.duck); g.duck.connect(g.comp); g.comp.connect(ctx.destination); g.master.connect(g.analyser);
  g.rev = ctx.createConvolver(); g.rev.buffer = reverbIR(ctx);
  g.rev.connect(g.master);
  g.dly = ctx.createDelay(2); g.fb = ctx.createGain(); g.fb.gain.value = .36;
  g.dlyF = ctx.createBiquadFilter(); g.dlyF.type = 'lowpass'; g.dlyF.frequency.value = 3200;
  g.dly.connect(g.dlyF); g.dlyF.connect(g.fb); g.fb.connect(g.dly); g.dlyF.connect(g.master);
  g.metro = ctx.createGain(); g.metro.gain.value = .3; g.metro.connect(ctx.destination);
  syncGraph(g);
  return g;
}
// Creates/removes per-track channels and applies every mixer setting
function syncGraph(g) {
  if (!g) return;
  const ctx = g.ctx, ids = new Set(S.tracks.map(t => t.id));
  for (const id in g.tracks) if (!ids.has(id)) { g.tracks[id].pan.disconnect(); delete g.tracks[id]; }
  const anySolo = S.tracks.some(t => t.solo);
  S.tracks.forEach(t => {
    let n = g.tracks[t.id];
    if (!n) {
      n = { in: ctx.createGain(), tone: ctx.createBiquadFilter(), out: ctx.createGain(), pan: ctx.createStereoPanner(), rs: ctx.createGain(), es: ctx.createGain(), an: ctx.createAnalyser() };
      n.tone.type = 'lowpass'; n.tone.frequency.value = 20000; n.an.fftSize = 512;
      n.in.connect(n.tone); n.tone.connect(n.out); n.out.connect(n.pan);
      n.pan.connect(g.master); n.pan.connect(n.an); n.pan.connect(n.rs); n.rs.connect(g.rev); n.pan.connect(n.es); n.es.connect(g.dly);
      g.tracks[t.id] = n;
    }
    const audible = !t.mute && (!anySolo || t.solo);
    setP(ctx, n.out.gain, audible ? t.vol * t.vol * 1.25 : 0);
    setP(ctx, n.pan.pan, t.pan);
    setP(ctx, n.rs.gain, t.rev * .9);
    setP(ctx, n.es.gain, t.echo * .8);
    setP(ctx, n.tone.frequency, t.kind === 'drums' ? (KITS[t.preset] || KITS.classic).tone : 20000);
  });
  setP(ctx, g.dly.delayTime, stepDur() * 3);
  setP(ctx, g.master.gain, S.master == null ? .85 : S.master);
}

/* ---------- synth voice ---------- */
function holdRelease(param, at, r) {
  if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(at);
  else { const v = param.value; param.cancelScheduledValues(at); param.setValueAtTime(v, at); }
  param.setTargetAtTime(0, at, r / 3);
}
function startSynth(g, t, midi, time, vel = 1, atk) {
  const ctx = g.ctx, p = SYNTHS[t.preset] || SYNTHS['soft-keys'], n = g.tracks[t.id];
  if (!n) return { end() {} };
  if (SAMPLED[t.preset]) { const v = startSampled(g, t, midi, time, vel); if (v) return v; }   // real recordings first
  if (p.piano) return pianoSynth(g, t, midi, time, vel);
  const out = ctx.createGain(); out.gain.value = 0; out.connect(n.in);
  let head = out;
  if (p.drive) { const ws = ctx.createWaveShaper(); ws.curve = driveCurve(p.drive); ws.connect(head); head = ws; }
  if (p.f) {
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = p.f.q || .7;
    if (p.f.env) { f.frequency.setValueAtTime(p.f.f + p.f.env * vel, time); f.frequency.setTargetAtTime(p.f.f, time, (p.f.d || .2) / 3); }
    else f.frequency.value = p.f.f;
    f.connect(head); head = f;
  }
  const freq = mtof(midi), srcs = [], carriers = [];
  p.osc.forEach(o => {
    const os = ctx.createOscillator(); os.type = o.t; os.frequency.value = mtof(midi + (o.o || 0)); if (o.dt) os.detune.value = o.dt;
    const og = ctx.createGain(); og.gain.value = o.g; os.connect(og); og.connect(head); srcs.push(os); carriers.push(os);
  });
  if (p.slide) carriers.forEach(os => { const f = os.frequency.value; os.frequency.setValueAtTime(f * Math.pow(2, p.slide / 12), time); os.frequency.exponentialRampToValueAtTime(f, time + .07); });
  if (p.fm) {
    const m = ctx.createOscillator(); m.frequency.value = freq * p.fm.ratio;
    const mg = ctx.createGain(); mg.gain.setValueAtTime(freq * p.fm.index, time); mg.gain.setTargetAtTime(0, time, p.fm.d / 3);
    m.connect(mg); carriers.forEach(os => mg.connect(os.frequency)); srcs.push(m);
  }
  if (p.vib) {
    const l = ctx.createOscillator(); l.frequency.value = p.vib.rate;
    const lg = ctx.createGain(); lg.gain.setValueAtTime(0, time); lg.gain.linearRampToValueAtTime(p.vib.depth, time + p.vib.delay + .2);
    l.connect(lg); carriers.forEach(os => lg.connect(os.detune)); srcs.push(l);
  }
  if (p.noise) {
    const ns = ctx.createBufferSource(); ns.buffer = noiseBuf(ctx); ns.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = Math.min(freq * 2, 12000); bp.Q.value = 1.5;
    const ng = ctx.createGain(); ng.gain.value = p.noise * 6; ns.connect(bp); bp.connect(ng); ng.connect(head); srcs.push(ns);
  }
  const A = p.a, peak = (p.gain || .5) * vel, a = atk == null ? A.a : atk;
  out.gain.setValueAtTime(0, time);
  out.gain.linearRampToValueAtTime(peak, time + a);
  out.gain.setTargetAtTime(peak * A.s, time + a, Math.max(.01, A.d / 3));
  srcs.forEach(s => s.start(time));
  return {
    end(at, live) {
      if (live) holdRelease(out.gain, at, A.r); else out.gain.setTargetAtTime(0, at, A.r / 3);
      const stopAt = at + A.r * 2.5 + .05;
      srcs.forEach(s => { try { s.stop(stopAt); } catch (e) { /* already stopped */ } });
      srcs[0].onended = () => out.disconnect();
    },
  };
}
/* ---------- synthesized piano (stands in until the recorded piano has loaded) ---------- */
// Built like a real piano note: slightly sharp overtones that each fade at their own speed,
// two strings per note drifting against each other, a soft hammer thump, and dampers on release.
function pianoSynth(g, t, midi, time, vel = 1) {
  const ctx = g.ctx, n = g.tracks[t.id], p = SYNTHS[t.preset];
  const f0 = mtof(midi);
  const out = ctx.createGain(); out.gain.value = 1;
  const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.Q.value = .3;
  tone.frequency.setValueAtTime(Math.min(16000, f0 * (5 + 7 * vel) + 1500), time);
  tone.frequency.setTargetAtTime(Math.min(9000, f0 * 3 + 700), time, .5);      // the tone mellows as it rings
  tone.connect(out); out.connect(n.in);
  const ring = clamp(5 * Math.pow(2, -(midi - 40) / 20), .5, 6);               // low notes sustain longer
  const B = .0004 * Math.pow(2, (midi - 60) / 30);                              // string stiffness
  const parts = clamp(Math.floor(9000 / f0), 3, 10);
  const weights = Array.from({ length: parts }, (_, i) => Math.pow(i + 1, -1.3) * (i ? .5 + .5 * vel : 1));
  const norm = weights.reduce((a, b) => a + b, 0);
  const level = (p.gain || .5) * (.35 + .65 * vel) * 1.7 / norm;
  const srcs = [];
  weights.forEach((w, i) => {
    const k = i + 1, fk = k * f0 * Math.sqrt(1 + B * k * k);
    if (fk > 15000) return;
    const amp = level * w, gk = ctx.createGain();
    gk.gain.setValueAtTime(0, time);
    gk.gain.linearRampToValueAtTime(amp, time + .003);
    gk.gain.setTargetAtTime(amp * .4, time + .003, .05 + .25 / k);              // quick drop after the strike...
    gk.gain.setTargetAtTime(0, time + .2, ring / (1 + .5 * i));                 // ...then a long ring, highs fade first
    gk.connect(tone);
    (k <= 3 ? [[-1.1, .62], [1.4, .38]] : [[0, 1]]).forEach(([cents, mix]) => {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.value = fk; o.detune.value = cents; og.gain.value = mix;
      o.connect(og); og.connect(gk); srcs.push(o);
    });
  });
  const hammer = ctx.createBufferSource(), hf = ctx.createBiquadFilter(), hg = ctx.createGain();
  hammer.buffer = noiseBuf(ctx); hf.type = 'bandpass'; hf.frequency.value = Math.min(5000, f0 * 4 + 900); hf.Q.value = .8;
  hg.gain.setValueAtTime((p.gain || .5) * .3 * vel, time); hg.gain.exponentialRampToValueAtTime(.0001, time + .045);
  hammer.connect(hf); hf.connect(hg); hg.connect(out); hammer.start(time); hammer.stop(time + .06);
  srcs.forEach(s => s.start(time));
  const natural = time + ring * 5;
  return {
    end(at, live) {
      const damp = midi >= 89 ? .6 : .12;                                       // the top keys have no dampers
      if (live) holdRelease(out.gain, at, damp); else { out.gain.setValueAtTime(1, at); out.gain.setTargetAtTime(0, at, damp / 3); }
      const stopAt = Math.max(at, Math.min(natural, at + damp * 3 + .05));
      srcs.forEach(s => { try { s.stop(stopAt); } catch (e) { /* already stopped */ } });
      srcs[0].onended = () => out.disconnect();
    },
  };
}
function playSynth(g, t, midi, time, dur, vel = 1) {
  const p = SYNTHS[t.preset] || SYNTHS['soft-keys'];
  startSynth(g, t, midi, time, vel, Math.min(p.a.a, dur * .9)).end(time + dur);
}

/* ---------- drum voices ---------- */
function playDrum(g, t, row, time, vel = 1) {
  if (g.tracks[t.id] && KIT_PRESETS.includes(t.preset) && playKitHit(g, t, row, time, vel)) return;   // recorded kit first
  const ctx = g.ctx, n = g.tracks[t.id], kit = KITS[t.preset] || KITS.classic;
  if (!n) return;
  const dest = n.in;
  const env = (node, peak, dec, att = 0) => {
    const ga = ctx.createGain();
    if (att) { ga.gain.setValueAtTime(.0001, time); ga.gain.linearRampToValueAtTime(peak * vel, time + att); }
    else ga.gain.setValueAtTime(peak * vel, time);
    ga.gain.exponentialRampToValueAtTime(.0001, time + att + dec);
    node.connect(ga); ga.connect(dest);
  };
  const noise = dur => { const s = ctx.createBufferSource(); s.buffer = noiseBuf(ctx); s.start(time); s.stop(time + dur); return s; };
  const osc = (type, f0, f1, dt, dur) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, time);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, time + dt);
    o.start(time); o.stop(time + dur); return o;
  };
  const filt = (src, type, f, q = 1) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; src.connect(b); return b; };
  switch (row) {
    case 'kick': {
      const [f0, f1, dt] = kit.kp; const o = osc('sine', f0, f1, dt, kit.kd + .05); let node = o;
      if (kit.drive) { const ws = ctx.createWaveShaper(); ws.curve = driveCurve(2); o.connect(ws); node = ws; }
      env(node, 1, kit.kd); env(filt(noise(.012), 'highpass', 3000), .22, .01); break;
    }
    case 'snare': env(filt(noise(.25), 'highpass', 1300), .5, .18); env(osc('triangle', 190, 160, .05, .15), .42, .1); break;
    case 'clap': {
      const src = filt(noise(.35), 'bandpass', 1500, .9), ga = ctx.createGain(), gg = ga.gain;
      gg.setValueAtTime(.0001, time);
      [0, .012, .024].forEach(o => { gg.setValueAtTime(.75 * vel, time + o); gg.exponentialRampToValueAtTime(.06 * vel, time + o + .011); });
      gg.setValueAtTime(.65 * vel, time + .036); gg.exponentialRampToValueAtTime(.0001, time + .26);
      src.connect(ga); ga.connect(dest); break;
    }
    case 'chat': env(filt(noise(.08), 'highpass', 7500), .3, .05); break;
    case 'ohat': env(filt(noise(.45), 'highpass', 7000), .24, .36); break;
    case 'tom':  env(osc('sine', 210, 100, .22, .4), .7, .34); break;
    case 'rim':  env(filt(osc('square', 520, 0, 0, .06), 'bandpass', 1800, 3), .5, .045); env(filt(noise(.02), 'highpass', 4000), .2, .015); break;
    case 'perc': env(filt(noise(.15), 'bandpass', 5800, 1.4), .3, .08, .015); break;
  }
}
function click(g, time, accent) {
  const o = g.ctx.createOscillator(), ga = g.ctx.createGain();
  o.type = 'square'; o.frequency.value = accent ? 1760 : 1180;
  ga.gain.setValueAtTime(.0001, time); ga.gain.exponentialRampToValueAtTime(.5, time + .001); ga.gain.exponentialRampToValueAtTime(.0001, time + .04);
  o.connect(ga); ga.connect(g.metro); o.start(time); o.stop(time + .05);
}

/* ---------- sequencing ---------- */
function scheduleStep(g, step, time, songMode, pi, live) {
  const sd = stepDur(), tt = time + (step % 2 ? S.swing * sd * .6 : 0);
  S.tracks.forEach(t => {
    const c = contentAt(t, step, songMode, pi);
    if (!c) return;
    if (t.kind === 'drums') DRUM_ROWS.forEach(r => c.d.rows[r.id].forEach(h => {
      const base = Math.floor(h + 1e-6);
      if (base !== c.local) return;
      const k = t.id + r.id + h;
      if (live && DRUM_SKIP.has(k)) { DRUM_SKIP.delete(k); return; }
      const off = h - base;     // hits recorded without Snap can sit between steps: play them exactly there
      playDrum(g, t, r.id, off > 1e-3 ? time + off * sd : tt);
    }));
    else c.d.notes.forEach(n => {
      const base = Math.floor(n.s + 1e-6);
      if (base !== c.local) return;
      if (live && REC_SKIP.has(n)) { REC_SKIP.delete(n); return; }
      const off = n.s - base;   // recorded notes can sit between steps: play them exactly there
      playSynth(g, t, n.p, off > 1e-3 ? time + off * sd : tt, Math.max(.05, n.l * sd - .01), n.v || 1);
    });
  });
  if (live && UI.metro && step % 4 === 0) click(g, time, step % 16 === 0);
}
const T = { playing: false, step: 0, next: 0, timer: null, queue: [], hist: [] };
function ensureAudio() {
  if (!AC) {
    // iPhones mute web audio while the ringer switch is on silent; "playback" makes Loopling play like a music app
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older Safari */ }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    AC = new Ctx({ latencyHint: 'interactive' });
    G = buildGraph(AC);
  }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function loopSteps() { return UI.songMode ? Math.max(1, songBars()) * 16 : patLen(UI.pat); }
function play() {
  ensureAudio();
  if (UI.songMode && songBars() === 0) { toast('Your song timeline is empty. Paint some patterns in the Arrange tab first.'); return; }
  T.playing = true;
  T.step = UI.songMode ? Math.min(UI.songStart, songBars() - 1) * 16 : 0;
  T.next = AC.currentTime + .06; T.queue = []; T.hist = [];
  clearInterval(T.timer); T.timer = setInterval(tick, 25); tick();
  renderTransport();
}
function stop() {
  T.playing = false; clearInterval(T.timer); T.queue = [];
  UI.playStep = -1; endAllHeld(); hush(); renderTransport(); drawPlayheads();
}
// Stop means silence right now. Ringing notes, notes already scheduled a moment ahead, and the
// reverb and echo tails all live in the mixer, so fade it out in a few milliseconds (no click) and swap in a fresh one
function hush() {
  if (!AC || !G) return;
  const old = G, t = AC.currentTime;
  [old.master.gain, old.metro.gain].forEach(p => { p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); p.setTargetAtTime(0, t, .004); });
  G = buildGraph(AC);
  setTimeout(() => { old.comp.disconnect(); old.metro.disconnect(); }, 80);
}
function togglePlay() { T.playing ? stop() : play(); }
function tick() {
  const sd = stepDur();
  if (T.next < AC.currentTime - .1) T.next = AC.currentTime + .05;   // tab was asleep: skip ahead
  while (T.next < AC.currentTime + .12) {
    if (T.step >= loopSteps()) {
      if (recording()) growTake();   // while recording, keep going instead of looping back
      if (T.step >= loopSteps()) T.step = 0;
    }
    scheduleStep(G, T.step, T.next, UI.songMode, UI.pat, true);
    const e = { step: T.step, t: T.next };
    T.queue.push(e); T.hist.push(e); if (T.hist.length > 48) T.hist.shift();
    T.next += sd; T.step++;
  }
}

/* ---------- live notes: preview clicks, computer keyboard, recording ---------- */
const HELD = new Map();   // key -> { voice, note }
function preview(t, midi, dur = .4) {
  ensureAudio();
  if (t.kind === 'drums') playDrum(G, t, midi, AC.currentTime + .005);
  else playSynth(G, t, midi, AC.currentTime + .005, dur);
}
function noteOn(key, t, midi) {
  ensureAudio();
  if (HELD.has(key)) return;
  const voice = startSynth(G, t, midi, AC.currentTime + .005);
  const h = { voice, take: null };
  if (recording()) h.take = recordNote(t, midi);
  HELD.set(key, h);
}
function noteOff(key) {
  const h = HELD.get(key);
  if (!h) return;
  HELD.delete(key);
  h.voice.end(AC.currentTime, true);
  if (h.take) {   // the note lasts exactly as long as the key was held (in whole steps with Snap on)
    const held = (heardNow() - h.take.from) / stepDur();
    h.take.note.l = h.take.snap ? Math.max(1, Math.round(held)) : Math.max(.1, +held.toFixed(3));
    renderEditorCanvas();
  }
}
function endAllHeld() { [...HELD.keys()].forEach(noteOff); }

/* ---------- recording: exactly what you played, no looping, no length limit ---------- */
// A loop length that fits step s: 1, 2, 4 or 8 bars, then 4 more bars at a time for as long as you keep playing
const roomFor = s => s < 128 ? [16, 32, 64, 128].find(L => L > s) : (Math.floor(s / 64) + 1) * 64;
const recording = () => UI.rec && T.playing && !UI.songMode;
// The moment the listener is hearing right now (the audio clock minus the speaker delay)
function heardNow() {
  if (AC.getOutputTimestamp) {
    const ts = AC.getOutputTimestamp();
    if (ts.contextTime > 0) return ts.contextTime + Math.max(0, (performance.now() - ts.performanceTime) / 1000);
  }
  return AC.currentTime - (AC.outputLatency || AC.baseLatency || 0);
}
// Position in steps (with fractions) of a moment, measured from the steps already scheduled
function stepAt(time) {
  let e = T.hist[0] || { step: 0, t: time };
  for (const x of T.hist) if (x.t <= time) e = x;
  return Math.max(0, e.step + (time - e.t) / stepDur());
}
// Where a recorded note or hit goes: the exact moment it was heard, or the nearest step when Snap is on
const recStep = time => { const at = stepAt(time); return UI.snap ? Math.round(at) : +at.toFixed(3); };
// Writes the note where it was heard (the Quantize button can line it up later)
function recordNote(t, midi) {
  const from = heardNow(), d = patData(UI.pat, t), s = recStep(from);
  checkpoint('rec');
  if (s >= d.len) d.len = roomFor(s);
  const note = { s, p: midi, l: UI.snap ? 1 : .25 };
  d.notes.push(note);
  if (Math.floor(s) >= T.step) REC_SKIP.add(note);   // not scheduled yet, and you already heard it
  C.recNotes++;
  changed({ quiet: true }); renderEditorCanvas();
  return { note, from, snap: UI.snap };
}
// While recording, the part being recorded keeps growing instead of the loop jumping back
function growTake() {
  const d = patData(UI.pat, curTrack());
  d.len = Math.max(d.len, roomFor(T.step)); UI.redrawEditor = true;
}

/* ---------- export ---------- */
async function renderAudio() {
  await loadInUse();   // the export needs the real recordings, not the stand-ins
  const useSong = songBars() > 0, sd = stepDur();
  const L = patLen(UI.pat);
  const steps = useSong ? songBars() * 16 : L * Math.max(1, Math.ceil(128 / L));
  const sr = 44100, dur = steps * sd + 3;
  const oc = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
  const og = buildGraph(oc);
  for (let s = 0; s < steps; s++) scheduleStep(og, s, .05 + s * sd, useSong, UI.pat, false);
  const buf = await oc.startRendering();
  return { buf, useSong, secs: dur };
}
function encodeWav(buf) {
  const ch = 2, len = buf.length, sr = buf.sampleRate;
  const L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
  let peak = 0; for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const gain = peak > .98 ? .98 / peak : 1;
  const dv = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); dv.setUint32(4, 36 + len * ch * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, ch, true); dv.setUint32(24, sr, true);
  dv.setUint32(28, sr * ch * 2, true); dv.setUint16(32, ch * 2, true); dv.setUint16(34, 16, true); str(36, 'data'); dv.setUint32(40, len * ch * 2, true);
  let o = 44;
  for (let i = 0; i < len; i++) for (const d of [L, R]) { const v = clamp(d[i] * gain, -1, 1); dv.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  return new Uint8Array(dv.buffer);
}
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
// Minimal one-file ZIP (stored, no compression)
function zipOne(name, u8) {
  const nb = new TextEncoder().encode(name), crc = crc32(u8), size = u8.length;
  const lh = new DataView(new ArrayBuffer(30));
  lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(12, 33, true);
  lh.setUint32(14, crc, true); lh.setUint32(18, size, true); lh.setUint32(22, size, true); lh.setUint16(26, nb.length, true);
  const ch = new DataView(new ArrayBuffer(46));
  ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(14, 33, true);
  ch.setUint32(16, crc, true); ch.setUint32(20, size, true); ch.setUint32(24, size, true); ch.setUint16(28, nb.length, true);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, 1, true); end.setUint16(10, 1, true);
  end.setUint32(12, 46 + nb.length, true); end.setUint32(16, 30 + nb.length + size, true);
  return new Blob([lh.buffer, nb, u8, ch.buffer, nb, end.buffer], { type: 'application/zip' });
}
const DOWNLOADS = (window.claude && typeof window.claude.use === 'function')
  ? window.claude.use('downloads').catch(() => null) : Promise.resolve(null);
// Hands a file to the viewer: through the Claude viewer when present, else a normal browser download
async function offerFile(filename, blob) {
  const dl = await DOWNLOADS;
  if (dl) {
    try { await dl.save({ filename, data: blob }); return true; }
    catch (e) {
      if (e && e.code === 'declined') { toast('Save cancelled.'); return false; }
      if (e && e.code === 'rate_limited') { toast('A save is already waiting for your answer.'); return false; }
      toast('Saving files is not available here.'); return false;
    }
  }
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return true;
}
