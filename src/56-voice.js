
/* ================= Woofer's voice: recorded voiceover clips ================= */
// Clip ids match voiceover-script.md (L1-S1-1, praise-3, welcome...). VO_FILES lists the clips
// that exist; build.sh generates it from the voice/ folder, so missing clips are simply silent.
const VO = { cache: new Map(), ready: new Map(), playing: null, token: 0, ctx: null, an: null, dctx: null };
UI.voice = true;

function voDecoder() {
  if (AC) return AC;
  const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  return VO.dctx || (VO.dctx = new Off(1, 1, 44100));
}
// Trims silence at both ends and evens out loudness, so every recording sounds alike
function prepClip(buf) {
  const d = buf.getChannelData(0), sr = buf.sampleRate;
  // loudness from the 99.9th-percentile sample, so a single pop or plosive doesn't decide the volume
  const hist = new Uint32Array(1000);
  for (let i = 0; i < d.length; i++) hist[Math.min(999, Math.floor(Math.abs(d[i]) * 1000))]++;
  let seen = 0, loud = .001;
  for (let b = 999; b >= 0; b--) { seen += hist[b]; if (seen >= d.length * .001) { loud = Math.max(.001, b / 1000); break; } }
  const th = Math.max(.008, loud * .12);
  let s = 0; while (s < d.length && Math.abs(d[s]) < th) s++;
  let e = d.length - 1; while (e > s && Math.abs(d[e]) < th) e--;
  const start = Math.max(0, s / sr - .08), end = Math.min(buf.duration, e / sr + .3);
  return { buf, start, dur: Math.max(.2, end - start), gain: clamp(.7 / loud, .5, 8) };
}
function voLoad(id) {
  const url = VO_FILES[id];
  if (!url) return null;
  if (!VO.cache.has(id)) {
    VO.cache.set(id, fetch(url)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then(b => voDecoder().decodeAudioData(b))
      .then(buf => { const c = prepClip(buf); VO.ready.set(id, c); return c; })
      .catch(err => { console.warn('Woofer voice clip ' + id + ' did not load:', err); return null; }));
  }
  return VO.cache.get(id);
}
function voPreload(li) {
  ['welcome', 'already', 'graduate'].concat(PRAISE.map((_, i) => 'praise-' + (i + 1))).forEach(voLoad);
  const L = LESSONS[li]; if (!L) return;
  L.steps.forEach((st, si) => {
    linesOf(st).forEach((_, i) => voLoad(`L${li + 1}-S${si + 1}-${i + 1}`));
    voLoad(`L${li + 1}-S${si + 1}-done`);
  });
  voLoad(`L${li + 1}-complete`);
}
const hasVoice = id => UI.voice && !!VO_FILES[id];
function voGraph() {
  if (VO.ctx === AC) return;
  VO.ctx = AC;
  VO.lim = AC.createDynamicsCompressor();   // soft limiter: catches pops after leveling
  Object.entries({ threshold: -8, knee: 4, ratio: 12, attack: .002, release: .12 }).forEach(([k, v]) => { VO.lim[k].value = v; });
  VO.an = AC.createAnalyser(); VO.an.fftSize = 512;
  VO.lim.connect(VO.an); VO.an.connect(AC.destination);
}
// Lowers the music while Woofer talks
function duck(on) {
  if (!G || !G.duck) return;
  G.duck.gain.setTargetAtTime(on ? .35 : 1, AC.currentTime, on ? .06 : .3);
}
// Plays one clip. onEnd runs when it finishes, or right away if the clip is missing or broken.
async function voPlay(id, onEnd) {
  voStop();
  const token = VO.token;
  const p = UI.voice ? voLoad(id) : null;
  const clip = p ? await p : null;
  if (token !== VO.token) return;          // something newer took over
  if (!clip) { if (onEnd) onEnd(); return; }
  ensureAudio();
  if (AC.state !== 'running') await Promise.race([AC.resume(), new Promise(r => setTimeout(r, 300))]);
  if (token !== VO.token) return;
  if (AC.state !== 'running') { offerHear(id); return; }   // browser blocks sound until the first click
  voGraph();
  const src = AC.createBufferSource(), g = AC.createGain();
  src.buffer = clip.buf; g.gain.value = clip.gain;
  src.connect(g); g.connect(VO.lim);
  src.start(AC.currentTime + .03, clip.start, clip.dur);
  VO.playing = src; duck(true);
  src.onended = () => { if (VO.playing !== src) return; VO.playing = null; duck(false); if (onEnd) onEnd(); };
}
function voStop() {
  VO.token++;
  if (!VO.playing) return;
  const s = VO.playing; VO.playing = null;
  s.onended = null;
  try { s.stop(); } catch (e) { /* already stopped */ }
  duck(false);
}
// Plays clips one after another; returns false when none of them exist (callers fall back to timers)
function voSequence(ids, onDone) {
  const list = ids.filter(hasVoice);
  if (!list.length) return false;
  const next = i => i < list.length ? voPlay(list[i], () => next(i + 1)) : onDone && onDone();
  next(0);
  return true;
}
function voLevel() { return VO.playing && VO.an ? level(VO.an, 'vo') : 0; }
// Shown when the browser blocked sound: one click plays the line (that click unlocks audio)
function offerHear(id) {
  const head = $('#bubble .bhead');
  if (!head || $('#bHear')) return;
  head.insertAdjacentHTML('beforeend', '<button class="btn small bhear" id="bHear" data-hint="Your browser waits for a click before playing sound. Click to hear Woofer.">Hear Woofer</button>');
  $('#bHear').onclick = () => { $('#bHear').remove(); ensureAudio(); voPlay(id); talk(voMs(id) || 1500); };
}
// Clicking Woofer replays the current line
function replayLine() {
  const id = GUIDE.lineVo;
  if (!id || !hasVoice(id)) return false;
  voPlay(id); talk(voMs(id) || 1500);
  return true;
}
// Opening a page needs one click before browsers allow sound; wake the audio on the first one
document.addEventListener('pointerdown', () => { ensureAudio(); }, { once: true, capture: true });
