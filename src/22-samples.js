
/* ================= Recorded instruments ================= */
// inst/<preset>/ holds a recording every few notes (named like C4, Fs4); a note plays the nearest
// one, re-tuned. inst/kit/ holds one recording per drum row. Until a set has loaded, the synthesized
// version of that sound stands in, so a note is never silent. Sources are listed in CREDITS below.
const SAMPLED = {          // how each recorded instrument behaves
  piano:          { level: 3.2, release: .14 },
  'deep-bass':    { level: 1.0, release: .1 },
  'pluck-bass':   { level: .9, release: .12 },
  organ:          { level: 2.0, release: .08, sustain: true },
  'bright-pluck': { level: 1.0, release: .8 },
  'music-box':    { level: 1.4, release: 1.2 },
  flute:          { level: 1.26, release: .15, sustain: true },
  violin:         { level: 2.7, release: .3, sustain: true },
  viola:          { level: 2.0, release: .3, sustain: true },
  cello:          { level: 2.05, release: .35, sustain: true },
  strings:        { level: 2.85, release: .5, sustain: true },
  sax:            { level: 1.72, release: .12, sustain: true },
  clarinet:       { level: 1.62, release: .1, sustain: true },
  oboe:           { level: 1.66, release: .1, sustain: true },
  bassoon:        { level: 2.29, release: .1, sustain: true },
  trumpet:        { level: 2.24, release: .12, sustain: true },
  trombone:       { level: 3.08, release: .14, sustain: true },
  'french-horn':  { level: 1.9, release: .2, sustain: true },
  tuba:           { level: 1.66, release: .15, sustain: true },
};
const KIT_LEVEL = { kick: 1.4, snare: .75, chat: .32, ohat: .21, tom: .5, rim: .63 };   // balanced like a mixed kit
const KIT_PRESETS = ['classic', 'lofi'];
const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const INST = {};           // key -> { ready: Map, loading: Promise }

function leadIn(buf) {     // skips the bit of silence before the sound starts
  const d = buf.getChannelData(0);
  let i = 0; while (i < d.length && Math.abs(d[i]) < .01) i++;
  return Math.max(0, i / buf.sampleRate - .002);
}
function zeroUp(d, i) {    // next upward zero crossing, for click-free loop points
  for (let k = Math.max(1, i); k < d.length; k++) if (d[k - 1] < 0 && d[k] >= 0) return k;
  return i;
}
function noteMidi(name) {
  const m = name.match(/^([A-G])(s?)(\d)$/);
  return m ? (+m[3] + 1) * 12 + NOTE_INDEX[m[1]] + (m[2] ? 1 : 0) : null;
}
// Loads one recorded set, a few files at a time, the middle of the keyboard first
function instLoad(key) {
  const files = INST_FILES[key];
  if (!files) return Promise.resolve();
  const set = INST[key] || (INST[key] = { ready: new Map(), loading: null });
  if (set.loading) return set.loading;
  const queue = Object.entries(files).map(([name, url]) => ({ name, url, midi: noteMidi(name) }))
    .sort((a, b) => Math.abs((a.midi ?? 62) - 62) - Math.abs((b.midi ?? 62) - 62));
  const sustain = SAMPLED[key] && SAMPLED[key].sustain;
  const worker = async () => {
    for (let n = queue.shift(); n; n = queue.shift()) {
      try {
        const r = await fetch(n.url);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const buf = await voDecoder().decodeAudioData(await r.arrayBuffer());
        const s = { midi: n.midi, buf, start: leadIn(buf) };
        if (sustain) {     // loop the steady middle of the note
          const d = buf.getChannelData(0), sr = buf.sampleRate, len = buf.duration - s.start;
          s.loopStart = zeroUp(d, Math.floor((s.start + len * .4) * sr)) / sr;
          s.loopEnd = zeroUp(d, Math.floor((s.start + len * .85) * sr)) / sr;
        }
        set.ready.set(n.midi ?? n.name, s);
      } catch (e) { console.warn(`Recording ${key}/${n.name} did not load:`, e); }
    }
  };
  set.loading = Promise.all([worker(), worker(), worker(), worker()]);
  return set.loading;
}
const instKeyOf = preset => KIT_PRESETS.includes(preset) ? 'kit' : (SAMPLED[preset] ? preset : null);
const presetsInUse = () => [...new Set(S.tracks.map(t => instKeyOf(t.preset)).filter(Boolean))];
const loadInUse = () => Promise.all(presetsInUse().map(instLoad));
function nearestRecording(key, midi) {
  const set = INST[key]; if (!set) return null;
  let best = null;
  set.ready.forEach(s => { if (!best || Math.abs(s.midi - midi) < Math.abs(best.midi - midi)) best = s; });
  return best && Math.abs(best.midi - midi) <= 12 ? best : null;
}

// A melodic note from recordings; null when none is ready yet (the caller uses the synth)
function startSampled(g, t, midi, time, vel = 1) {
  const key = t.preset, opt = SAMPLED[key];
  if (!INST[key]) instLoad(key);
  const s = nearestRecording(key, midi);
  if (!s) return null;
  const ctx = g.ctx, n = g.tracks[t.id];
  const src = ctx.createBufferSource(), tone = ctx.createBiquadFilter(), out = ctx.createGain();
  src.buffer = s.buf;
  src.playbackRate.value = Math.pow(2, (midi - s.midi) / 12);
  if (opt.sustain && s.loopEnd > s.loopStart) { src.loop = true; src.loopStart = s.loopStart; src.loopEnd = s.loopEnd; }
  tone.type = 'lowpass'; tone.Q.value = .2;
  tone.frequency.value = 1600 + 17000 * vel * vel;                         // softer playing sounds darker
  out.gain.value = (SYNTHS[key].gain || .5) * opt.level * (.3 + .7 * Math.pow(vel, 1.4));
  src.connect(tone); tone.connect(out); out.connect(n.in);
  src.start(time, s.start);
  const natural = src.loop ? Infinity : time + (s.buf.duration - s.start) / src.playbackRate.value;
  return {
    end(at, live) {
      const damp = key === 'piano' && midi >= 89 ? .6 : opt.release;      // the top piano keys have no dampers
      if (live) holdRelease(out.gain, at, damp);
      else { out.gain.setValueAtTime(out.gain.value, at); out.gain.setTargetAtTime(0, at, damp / 3); }
      try { src.stop(Math.max(at, Math.min(natural, at + damp * 3 + .05))); } catch (e) { /* already stopped */ }
      src.onended = () => out.disconnect();
    },
  };
}
// A drum hit from the recorded kit; false when this row has no recording (the synth plays it)
function playKitHit(g, t, row, time, vel = 1) {
  if (!INST.kit) instLoad('kit');
  const s = INST.kit && INST.kit.ready.get(row);
  if (!s) return false;
  const ctx = g.ctx, n = g.tracks[t.id];
  const src = ctx.createBufferSource(), out = ctx.createGain();
  src.buffer = s.buf;
  if (t.preset === 'lofi') src.playbackRate.value = .92;                     // a little slower and darker, like old vinyl
  out.gain.value = (KIT_LEVEL[row] || .6) * vel;
  src.connect(out); out.connect(n.in);
  src.start(time, s.start);
  src.onended = () => out.disconnect();
  return true;
}

/* ---------- credits (required by the CC BY licenses) ---------- */
function showCredits() {
  const m = modal(`<h2>Credits</h2><p>The real instruments in Loopling are recordings shared freely by these musicians and studios:</p>
    <ul class="credits">${CREDITS.map(([what, who]) => `<li><b>${what}:</b> ${who}</li>`).join('')}</ul>
    <p>Changes: Loopling trimmed some of these recordings and converted them to mono, and sets each instrument's volume as it plays.</p>
    <p>The 808 drums and bass, Warm Pad, Retro Lead, Soft Keys, Clap and Shaker are synthesizers, generated live in your browser.</p>
    <div class="acts"><button class="btn primary" id="credClose">Close</button></div>`);
  m.querySelector('#credClose').onclick = closeModal;
}
const CREDITS = [
  ['Grand Piano', '<a href="https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html" target="_blank" rel="noopener">Salamander Grand Piano</a> by Alexander Holm (a Yamaha C5), <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>'],
  ['Classic Kit and Lo-Fi Dusty drums', '<a href="https://freepats.zenvoid.org/Percussion/acoustic-drum-kit.html" target="_blank" rel="noopener">MuldjordKit</a> recorded by Lars Muldjord, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>'],
  ['Electric Bass and Saxophone', 'Karoryfer Samples, via <a href="https://github.com/nbrosowsky/tonejs-instruments" target="_blank" rel="noopener">tonejs-instruments</a> by Nicholaus Brosowsky, <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>'],
  ['Harp, Flute, Organ, Violin, Clarinet, Bassoon, Trumpet, Trombone, French Horn and Tuba', 'Versilian Studios VSCO 2 Community Edition, via <a href="https://github.com/nbrosowsky/tonejs-instruments" target="_blank" rel="noopener">tonejs-instruments</a> by Nicholaus Brosowsky, <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>'],
  ['Upright Bass, Viola, Cello, String Section, Oboe, Music Box (glockenspiel) and the Rim sound (claves)', '<a href="https://github.com/sgossner/VSCO-2-CE" target="_blank" rel="noopener">VSCO 2 Community Edition</a> by Versilian Studios, public domain (CC0)'],
];
