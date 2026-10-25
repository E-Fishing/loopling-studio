
/* ================= Woofer: the animated guide ================= */
const BUDDY_SVG = `<svg class="buddy" viewBox="0 0 84 100" aria-hidden="true">
  <ellipse class="shade" cx="42" cy="96" rx="22" ry="3.5"/>
  <g class="bod">
    <g class="feet" fill="var(--helper-ink)"><rect x="25" y="86" width="12" height="8" rx="3.5"/><rect x="47" y="86" width="12" height="8" rx="3.5"/></g>
    <path class="arm arm-l" d="M17 56 h-12" stroke="var(--helper)" stroke-width="6.5" stroke-linecap="round" fill="none"/>
    <path class="arm arm-r" d="M67 56 h12" stroke="var(--helper)" stroke-width="6.5" stroke-linecap="round" fill="none"/>
    <rect x="13" y="8" width="58" height="81" rx="13" fill="var(--helper)"/>
    <rect x="17.5" y="12.5" width="49" height="72" rx="10" fill="none" stroke="var(--helper-ink)" stroke-opacity=".16" stroke-width="1.5"/>
    <circle class="led" cx="61" cy="17.5" r="2.4"/>
    <g class="eyes"><circle cx="31" cy="31" r="8" fill="var(--helper-ink)"/><circle cx="53" cy="31" r="8" fill="var(--helper-ink)"/>
      <g class="pupils"><circle cx="31" cy="31" r="4.2" fill="var(--cone)"/><circle cx="53" cy="31" r="4.2" fill="var(--cone)"/>
      <circle cx="32.6" cy="29.4" r="1.6" fill="#fff"/><circle cx="54.6" cy="29.4" r="1.6" fill="#fff"/></g></g>
    <g class="joy" fill="none" stroke="var(--helper-ink)" stroke-width="3.2" stroke-linecap="round"><path d="M25 33 q6 -8 12 0"/><path d="M47 33 q6 -8 12 0"/></g>
    <ellipse cx="20.5" cy="42" rx="3.5" ry="2.2" fill="#FF7FA8" opacity=".55"/><ellipse cx="63.5" cy="42" rx="3.5" ry="2.2" fill="#FF7FA8" opacity=".55"/>
    <g class="cone"><circle cx="42" cy="62" r="19.5" fill="var(--helper-ink)"/><circle cx="42" cy="62" r="14" fill="var(--cone)"/>
      <circle cx="42" cy="62" r="9.5" fill="none" stroke="var(--helper-ink)" stroke-opacity=".4" stroke-width="1.2"/>
      <circle class="cap" cx="42" cy="62" r="5.5" fill="var(--helper-belly)"/></g>
  </g>
</svg>`;
const PRAISE = ['Nice!', 'You got it!', 'Great job!', 'Perfect!', 'Awesome!', 'Yes, exactly!', 'Look at you go!', 'Boom!', 'Loud and clear!'];
const GUIDE = { line: 0, min: false, special: null, center: false, target: null, timer: null, moodT: null, talkT: null, pending: false, key: null };
const LSS = { base: {}, passed: false, praise: '' };
const curStep = () => (LESSONS[P.lesson] || LESSONS[0]).steps[P.step];
const linesOf = st => (st.say || []).map(l => (l && typeof l === 'object') ? l : { t: l });
const lineText = l => typeof l.t === 'function' ? l.t() : l.t;
// Calm motion: Woofer glides instead of hopping and flying, and decorative animation stops.
// It starts from the computer's reduced-motion setting and can be changed in the Project menu.
const OS_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const calm = () => UI.motion === 'calm';

function buildGuide() {
  $('#guide').innerHTML = `<button class="buddywrap" id="buddyBtn" aria-label="Woofer, your guide" data-hint="This is <b>Woofer</b>, your guide. Click Woofer to hear the line again, or to bring the tips back after hiding them.">${BUDDY_SVG}<span class="minlabel">Tips</span></button>
    <div class="bubble" id="bubble" role="status" aria-live="polite"></div>`;
  $('#buddyBtn').onclick = buddyClick;
}
function setMood(m, ms) {
  const b = $('#guide .buddy'); if (!b) return;
  ['happy', 'wave'].forEach(c => b.classList.remove(c));
  void b.getBoundingClientRect();   // restart the animation
  clearTimeout(GUIDE.moodT);
  if (m && m !== 'idle') { b.classList.add(m); if (ms) GUIDE.moodT = setTimeout(() => b.classList.remove(m), ms); }
}
function talk(ms) {
  const b = $('#guide .buddy'); if (!b) return;
  b.classList.add('talk'); clearTimeout(GUIDE.talkT);
  GUIDE.talkT = setTimeout(() => b.classList.remove('talk'), Math.max(400, ms));
}
// Reveals the line word by word (HTML tags kept) and returns how long that takes.
// With a voice clip, the words are spread across the clip so they appear as Woofer says them.
function typeInto(el, html, voiceMs) {
  el.innerHTML = html;
  if (calm()) return voiceMs || 600;
  const words = [];
  const walk = node => [...node.childNodes].forEach(c => {
    if (c.nodeType === 3) {
      const frag = document.createDocumentFragment();
      c.textContent.split(/(\s+)/).forEach(p => {
        if (!p) return;
        if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
        const s = document.createElement('span'); s.className = 'w'; s.textContent = p; frag.appendChild(s); words.push(s);
      });
      c.replaceWith(frag);
    } else if (c.nodeType === 1) walk(c);
  });
  walk(el);
  const per = voiceMs ? clamp(voiceMs * .85 / Math.max(1, words.length), 42, 450) : 42;
  words.forEach((s, i) => { s.style.animationDelay = Math.round(i * per) + 'ms'; });
  return voiceMs || words.length * 42 + 200;
}
const voMs = id => { const c = UI.voice && VO.ready.get(id); return c ? c.dur * 1000 : 0; };
const voiceBtn = () => `<button class="bmin bvoice" id="bVoice" aria-label="${UI.voice ? 'Mute' : 'Unmute'} Woofer’s voice" aria-pressed="${UI.voice}" data-hint="<b>Woofer’s voice</b>: turn the spoken lines on or off.">
  <svg class="i" viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/>${UI.voice ? '<path d="M16 9a4 4 0 010 6"/><path d="M18.5 6.5a8 8 0 010 11"/>' : '<path d="M17 9l5 6M22 9l-5 6"/>'}</svg></button>`;
function bindVoiceBtn() {
  const b = $('#bVoice'); if (!b) return;
  b.onclick = () => { UI.voice = !UI.voice; if (!UI.voice) voStop(); persistSoon(); b.outerHTML = voiceBtn(); bindVoiceBtn(); };
}
function chirp() {
  try {
    ensureAudio();
    const t = AC.currentTime;
    [988, 1480].forEach((f, i) => {
      const o = AC.createOscillator(), g = AC.createGain(), at = t + i * .08;
      o.type = 'sine'; o.frequency.setValueAtTime(f, at);
      g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(.08, at + .01); g.gain.exponentialRampToValueAtTime(.0001, at + .12);
      o.connect(g); g.connect(AC.destination); o.start(at); o.stop(at + .14);
    });
  } catch (e) { /* audio not available */ }
}

/* ---------- the speech bubble ---------- */
function showLine() {
  if (UI.mode !== 'learn') return;
  GUIDE.special = null; GUIDE.center = false; clearTimeout(GUIDE.timer);
  voStop();
  const L = LESSONS[P.lesson], st = curStep(), lines = linesOf(st);
  GUIDE.line = clamp(GUIDE.line, 0, lines.length - 1);
  const l = lines[GUIDE.line], last = GUIDE.line === lines.length - 1;
  GUIDE.key = `${P.lesson}.${P.step}.${GUIDE.line}`;
  GUIDE.target = l.at !== undefined ? l.at : st.target;
  $('#bubble').innerHTML = `
    <div class="bhead"><span class="bname">Woofer</span><span class="bstep">Lesson ${P.lesson + 1} &middot; Step ${P.step + 1} of ${L.steps.length}</span>
      ${voiceBtn()}<button class="bmin" id="bMin" aria-label="Hide Woofer" data-hint="<b>Hide Woofer</b> to work without tips. Click Woofer to bring them back.">&ndash;</button></div>
    <div class="btext" id="bText"></div>
    <div class="bthere" id="bThere" hidden><span>That’s on another screen right now.</span><button class="btn small" id="bThereBtn">Take me there</button></div>
    ${last && st.task ? '<div class="btask" id="bTask"></div>' : ''}
    ${last && st.dict ? `<div class="bdict"><span class="label">Other DAWs call it</span><span>FL Studio: <b>${st.dict.fl}</b></span><span>GarageBand: <b>${st.dict.gb}</b></span><span>Ableton: <b>${st.dict.ab}</b></span></div>` : ''}
    <div class="bnav"><button class="btn small ghost" id="bBack"${P.step === 0 && GUIDE.line === 0 ? ' disabled' : ''}>&lsaquo; Back</button>
      <span class="grow"></span><button class="linkbtn" id="bSkip" hidden>Skip</button><button class="btn small primary" id="bNext">Next &rsaquo;</button></div>`;
  const tx = $('#bText'), voId = `L${P.lesson + 1}-S${P.step + 1}-${GUIDE.line + 1}`;
  voLoad(voId);
  holdForTrip(typeInto(tx, lineText(l), voMs(voId)), l.mood, voId);
  tx.onclick = () => tx.classList.add('instant');
  bindVoiceBtn();
  $('#bMin').onclick = () => minimizeGuide(true);
  $('#bBack').onclick = guideBack;
  $('#bNext').onclick = guideNext;
  $('#bSkip').onclick = () => nextStep();
  $('#bThereBtn').onclick = takeMeThere;
  LSS.passed = false;
  updateNav();
  if (last && st.task) { LSS.entering = true; lessonTick(); LSS.entering = false; }   // a task already done on arrival waits for Next
  applySpot(true);
}
function updateNav() {
  const nb = $('#bNext'); if (!nb || GUIDE.special) return;
  const st = curStep(), last = GUIDE.line === linesOf(st).length - 1;
  const lastStep = P.step === LESSONS[P.lesson].steps.length - 1;
  const waiting = last && !!st.task && !LSS.passed;
  nb.hidden = waiting;
  nb.innerHTML = last && lastStep ? (P.lesson === LESSONS.length - 1 ? 'Graduate &rsaquo;' : 'Finish lesson &rsaquo;') : 'Next &rsaquo;';
  nb.classList.toggle('pulse', last && !!st.task && LSS.passed);
  $('#bSkip').hidden = !waiting;
  renderGuideTask();
}
function renderGuideTask() {
  const box = $('#bTask'); if (!box) return;
  const st = curStep(), ok = LSS.passed;
  box.classList.toggle('ok', ok);
  box.innerHTML = `<span class="tick">${ok ? ICONS.check : ''}</span><div>
    <div class="tt">${ok ? `<b>${LSS.praise}</b> ` : '<span class="label">Your turn</span> '}${st.task}</div>
    ${!ok && st.progress ? `<div class="prog">${st.progress(LSS.base)}</div>` : ''}
    ${ok && st.yay ? `<div class="yay">${st.yay}</div>` : ''}</div>`;
  placeSoon();
}
function lessonTick() {
  if (UI.mode !== 'learn' || GUIDE.special || !$('#bTask')) return;
  const st = curStep(); if (!st.check) return;
  const ok = !!st.check(LSS.base);
  if (ok && !LSS.passed) stepDone();
  else if (!ok && st.progress) renderGuideTask();
}
setInterval(lessonTick, 350);
function stepDone() {
  const st = curStep();
  LSS.passed = true;
  const early = !!LSS.entering, pi = Math.floor(Math.random() * PRAISE.length);
  LSS.praise = early ? 'Already done!' : PRAISE[pi];
  // Done before Woofer landed: skip the instruction he was about to say, or it would cut off the praise.
  // If it was already done on arrival, he says the line and the bubble shows "Already done!".
  const lineDue = !!GUIDE.voId && hasVoice(GUIDE.voId);
  if (lineDue && !early) GUIDE.voId = null;
  updateNav();
  setMood('happy', 1500);
  if (!GUIDE.min) chirp();
  clearTimeout(GUIDE.timer);
  const key = GUIDE.key;
  const moveOn = () => { if (GUIDE.key === key && LSS.passed && !GUIDE.special && !GUIDE.min) guideNext(); };
  // With voice clips, Woofer finishes talking before moving on; without them, a reading pause
  const clips = [early ? 'already' : 'praise-' + (pi + 1)];
  if (st.yay) clips.push(`L${P.lesson + 1}-S${P.step + 1}-done`);
  const voiced = !GUIDE.min && !(early && lineDue) && voSequence(clips, () => { if (!early) GUIDE.timer = setTimeout(moveOn, 700); });
  if (!voiced && !early) GUIDE.timer = setTimeout(moveOn, st.yay ? 4200 : 2400);
}
function guideNext() {
  clearTimeout(GUIDE.timer);
  if (GUIDE.line < linesOf(curStep()).length - 1) { GUIDE.line++; showLine(); }
  else nextStep();
}
function guideBack() {
  clearTimeout(GUIDE.timer);
  if (GUIDE.line > 0) { GUIDE.line--; showLine(); return; }
  if (P.step > 0) { P.step--; enterStep(); GUIDE.line = linesOf(curStep()).length - 1; showLine(); persistSoon(); }
}

/* ---------- lesson flow ---------- */
function enterStep() {
  LSS.base = {}; LSS.passed = false; GUIDE.line = 0;
  const st = curStep();
  if (st.enter) st.enter(LSS.base);
}
async function startLesson(i, step = 0) {
  if (T.playing) stop();
  P.lesson = i; P.step = step; P.reached = Math.max(P.reached, i);
  UI.mode = 'learn'; GUIDE.pending = false; GUIDE.special = null;
  minimizeGuide(false, true);
  voPreload(i);
  if (step === 0 && LESSONS[i].start) await LESSONS[i].start();
  enterStep(); renderAll(); showLine(); persistSoon();
}
function nextStep() {
  clearTimeout(GUIDE.timer);
  if (P.step < LESSONS[P.lesson].steps.length - 1) { P.step++; enterStep(); showLine(); persistSoon(); }
  else completeLesson();
}
function special(kind, html, buttons, mood, center, voId, extra = '') {
  clearTimeout(GUIDE.timer);
  voStop();
  GUIDE.special = kind; GUIDE.center = !!center; GUIDE.target = null; GUIDE.key = null;
  minimizeGuide(false, true);
  $('#bubble').innerHTML = `<div class="bhead"><span class="bname">Woofer</span><span class="bstep"></span>${voiceBtn()}</div><div class="btext" id="bText"></div>
    ${extra}<div class="bchoices">${buttons.map(b => `<button class="btn${b.primary ? ' primary' : ''}" data-id="${b.id}">${b.label}</button>`).join('')}</div>`;
  bindVoiceBtn(); bindBridge();
  holdForTrip(typeInto($('#bText'), html, voMs(voId)), mood, voId);
  applySpot(false);
  return new Promise(res => $$('#bubble [data-id]').forEach(b => b.onclick = () => res(b.dataset.id)));
}
// "Now try it in a real DAW": the lesson's skill in GarageBand (Mac) or BandLab (any browser), one at a time
const DAWS = {
  gb: { tab: 'GarageBand', get: 'Get GarageBand, free on Mac', url: 'https://www.apple.com/mac/garageband/' },
  bl: { tab: 'BandLab', get: 'Open BandLab, free in your browser', url: 'https://www.bandlab.com/' },
};
function bridgeHtml(L) {
  if (!L || !L.bridge) return '';
  const keys = Object.keys(DAWS);
  return `<div class="bbridge" data-daw="${UI.daw}"><div class="bbhead"><span class="label">Now try it in a real DAW</span>
    <span class="seg">${keys.map(k => `<button data-daw="${k}" aria-pressed="${UI.daw === k}">${DAWS[k].tab}</button>`).join('')}</span></div>
    ${keys.map(k => `<div class="bbtext" data-for="${k}">${L.bridge[k]} <a href="${DAWS[k].url}" target="_blank" rel="noopener">${DAWS[k].get}&nbsp;&rsaquo;</a></div>`).join('')}</div>`;
}
function bindBridge() {
  $$('#bubble [data-daw]').forEach(b => b.onclick = () => {
    UI.daw = b.dataset.daw; persistSoon();
    $('#bubble .bbridge').dataset.daw = UI.daw;
    $$('#bubble .bbhead [data-daw]').forEach(x => x.setAttribute('aria-pressed', x.dataset.daw === UI.daw));
    placeSoon();
  });
}
async function completeLesson() {
  const i = P.lesson, next = i + 1;
  P.done[i] = true;
  if (next >= LESSONS.length) return graduate();
  P.reached = Math.max(P.reached, next);
  persistSoon(); applyLocks(); renderPill(); confetti(); chirp();
  const a = await special('done', `<b>Lesson ${i + 1} complete!</b> ${LESSONS[i].recap}<br><br>Up next: <b>${LESSONS[next].title}</b>.`,
    [{ id: 'stay', label: 'Play around first' }, { id: 'go', label: `Start Lesson ${next + 1} &rsaquo;`, primary: true }], 'happy', false, `L${i + 1}-complete`, bridgeHtml(LESSONS[i]));
  if (a === 'go') return startLesson(next);
  P.lesson = next; P.step = 0; GUIDE.pending = true; GUIDE.special = null;
  persistSoon(); renderPill(); minimizeGuide(true);
  toast('Woofer is waiting in the corner. Click Woofer when you’re ready for the next lesson.');
}
async function graduate() {
  LESSONS.forEach((_, i) => { P.done[i] = true; });
  P.reached = LESSONS.length; persistSoon(); applyLocks(); renderPill(); confetti(); chirp();
  const a = await special('grad', '<b>You graduated!</b> Every tool is unlocked now, including extras like Swing and more tracks.<br><br>When you open FL Studio or GarageBand, look for the same ideas. The Dictionary shows what each one is called there.',
    [{ id: 'dict', label: 'Open the Dictionary' }, { id: 'go', label: 'Start making music', primary: true }], 'happy', true, 'graduate', bridgeHtml(LESSONS[LESSONS.length - 1]));
  voStop();
  GUIDE.special = null; UI.mode = 'studio'; persistSoon(); renderAll();
  if (a === 'dict') showDictionary();
}
async function welcome() {
  const a = await special('welcome', 'Hi, I’m <b>Woofer</b>! I’m a little speaker, so music is kind of my whole thing. I help people make their first song, even if they’ve never touched music software.<br><br>Have you made music on a computer before?',
    [{ id: 'learn', label: 'Never. Teach me!', primary: true }, { id: 'studio', label: 'A little. Let me explore.' }], 'wave', true, 'welcome');
  P.welcomed = true;
  voStop();
  if (a === 'learn') return startLesson(0);
  GUIDE.special = null; UI.mode = 'studio';
  if (projectIsEmpty()) { demoProject(); UI.track = S.tracks[0].id; }
  afterLoad();
  toast('Everything is unlocked. Switch to <b>Learn</b> any time to get Woofer’s lessons.');
}
function minimizeGuide(on, quiet) {
  if (GUIDE.min !== on) MOVE.want = true;
  if (on) voStop();
  GUIDE.min = on;
  $('#guide').classList.toggle('min', on);
  if (!on && !quiet) {
    if (GUIDE.pending) { startLesson(P.lesson); return; }
    if (!GUIDE.special) showLine();
  }
  applySpot(false);
}
function buddyClick() {
  if (GUIDE.min) { minimizeGuide(false); return; }
  if (UI.voice && replayLine()) { $('#bHear')?.remove(); return; }
  setMood('happy', 900); chirp();
}

/* ---------- pointing at things ---------- */
// Opens the tab (and track) that holds what Woofer is pointing at
function takeMeThere() {
  const t = GUIDE.target || '', L = LESSONS[P.lesson];
  if (/mixerView|\.strip/.test(t)) UI.view = 'mixer';
  else if (/arrGrid|palette/.test(t)) UI.view = 'arrange';
  else {
    UI.view = 'editor';
    if (L.role && /drumGrid|#pr|pianoRoll|chord|typingMap|soundBtn|scaleLock|lenSelect|matchBass|progSelect/.test(t)) UI.track = role(L.role).id;
  }
  renderAll(); applySpot(true);
}
function guideTargets() {
  if (!GUIDE.target || GUIDE.special || UI.mode !== 'learn') return [];
  return $$(GUIDE.target).filter(e => e.getClientRects().length && !e.closest('[hidden]'));
}
function applySpot(scroll) {
  $$('.spotlight').forEach(e => e.classList.remove('spotlight'));
  if (UI.mode === 'learn' && !$('#modalRoot').firstChild && !GUIDE.min) {
    const els = guideTargets();
    els.forEach(e => e.classList.add('spotlight'));
    if (scroll && els[0]) {
      const r = els[0].getBoundingClientRect();
      if (r.top < 60 || r.bottom > innerHeight - 200) els[0].scrollIntoView({ block: 'center', behavior: calm() ? 'auto' : 'smooth' });
    }
  }
  placeSoon();
}
let placeQueued = false;
function placeSoon() {
  if (placeQueued) return;
  placeQueued = true;
  const run = () => { if (!placeQueued) return; placeQueued = false; placeGuide(); };
  requestAnimationFrame(run); setTimeout(run, 120);   // the timeout covers frames that never come (background tabs)
}
function placeGuide() {
  const g = $('#guide'), ring = $('#guideRing');
  const show = UI.mode === 'learn' || !!GUIDE.special;
  g.hidden = !show;
  if (!show) { ring.className = ''; if (VO.playing) voStop(); return; }
  const vw = document.documentElement.clientWidth, vh = innerHeight, pad = 14;
  const modalOpen = !!$('#modalRoot').firstChild;
  let rect = null;
  const els = (GUIDE.min || modalOpen) ? [] : guideTargets();
  if (els.length) {
    let l = 1e9, t = 1e9, r = -1e9, b = -1e9;
    els.forEach(e => { const q = e.getBoundingClientRect(); l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom); });
    rect = { left: l, top: t, right: r, bottom: b, width: r - l, height: b - t };
  }
  if (!modalOpen && !GUIDE.min && (rect || GUIDE.center)) {
    const R = rect || { left: vw / 2, top: vh / 2, width: 0, height: 0 }, p = rect ? 6 : 0;
    ring.className = rect ? 'on' : 'on nocut';
    Object.assign(ring.style, { left: (R.left - p) + 'px', top: (R.top - p) + 'px', width: (R.width + 2 * p) + 'px', height: (R.height + 2 * p) + 'px' });
  } else ring.className = '';
  const there = $('#bThere');
  if (there) {
    const lost = !!GUIDE.target && !GUIDE.special && !GUIDE.min && !modalOpen && !els.length;
    if (there.hidden === lost) there.hidden = !lost;   // shown, not spoken: a clip here would only be cut off by the next line
  }
  const W = g.offsetWidth, Hh = g.offsetHeight;
  let x = null, y = null;
  if (GUIDE.min) { x = vw - W - pad; y = vh - Hh - pad; }
  else if (GUIDE.center) { x = (vw - W) / 2; y = (vh - Hh) / 2 - 20; }
  else if (!rect || vw < 700) { x = vw - W - pad; y = vh - Hh - pad; }
  else {
    const below = rect.bottom + 14, above = rect.top - 14 - Hh;
    if (below + Hh <= vh - pad) y = below; else if (above >= pad) y = above;
    if (y != null) x = rect.left + Math.min(rect.width, 160) / 2 - 42;
    else {
      y = rect.top + rect.height / 2 - Hh / 2;
      if (rect.right + 14 + W <= vw - pad) x = rect.right + 14;
      else if (rect.left - 14 - W >= pad) x = rect.left - 14 - W;
      else { x = vw - W - pad; y = vh - Hh - pad; }
    }
  }
  x = clamp(x, pad, Math.max(pad, vw - W - pad)); y = clamp(y, pad, Math.max(pad, vh - Hh - pad));
  MOVE.w = W; MOVE.h = Hh;
  MOVE.look = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null;
  g.classList.toggle('groove', T.playing);
  g.style.setProperty('--beat', (60 / S.bpm).toFixed(3) + 's');
  setDest(x, y);
}

/* ---------- moving around: Woofer hops short distances and flies long ones ---------- */
const MOVE = { x: null, y: null, tx: 0, ty: 0, fx: 0, fy: 0, w: 0, h: 0, t0: 0, dur: 0, dist: 0, hops: 1, mode: '', raf: 0, want: false, face: 1, puffAt: 0, look: null };
// The bubble stays folded until Woofer arrives; then the words type out and Woofer talks
function holdForTrip(talkMs, mood, voId) {
  GUIDE.talkMs = talkMs; GUIDE.arriveMood = mood || null; GUIDE.voId = voId || null; GUIDE.lineVo = voId || null;
  $('#guide').classList.add('hold');
  MOVE.want = true;
  // Never leave the bubble folded: if the trip stalls (no animation frames), land right away
  clearTimeout(GUIDE.holdT);
  const watch = () => {
    if (!$('#guide').classList.contains('hold')) return;
    if (MOVE.raf && performance.now() - MOVE.t0 < MOVE.dur + 400) { GUIDE.holdT = setTimeout(watch, 500); return; }
    cancelAnimationFrame(MOVE.raf); MOVE.raf = 0;
    MOVE.x = MOVE.tx; MOVE.y = MOVE.ty; renderMove(); arrive(false);
  };
  GUIDE.holdT = setTimeout(watch, 2000);
}
function setDest(x, y) {
  MOVE.tx = x; MOVE.ty = y;
  if (MOVE.x == null) { MOVE.x = Math.max(0, innerWidth - 140); MOVE.y = innerHeight + 30; MOVE.want = true; }   // first entrance: from below the screen
  if (MOVE.want) { MOVE.want = false; startTrip(); return; }
  if (!MOVE.raf) { MOVE.x = x; MOVE.y = y; renderMove(); }   // just follow scrolling
}
function startTrip() {
  cancelAnimationFrame(MOVE.raf); MOVE.raf = 0;
  const dx = MOVE.tx - MOVE.x, dy = MOVE.ty - MOVE.y, dist = Math.hypot(dx, dy);
  if (dist < 8 || document.hidden) { MOVE.x = MOVE.tx; MOVE.y = MOVE.ty; renderMove(); arrive(false); return; }
  Object.assign(MOVE, { fx: MOVE.x, fy: MOVE.y, t0: performance.now(), dist, mode: calm() ? 'glide' : dist < 240 ? 'hop' : 'fly' });
  MOVE.hops = Math.max(1, Math.round(dist / 85));
  MOVE.dur = MOVE.mode === 'hop' ? MOVE.hops * 240 + 60 : MOVE.mode === 'glide' ? clamp(dist * .6, 350, 800) : clamp(dist * .85, 650, 1400);
  if (Math.abs(dx) > 20) MOVE.face = dx > 0 ? 1 : -1;
  const g = $('#guide'); g.classList.remove('hop', 'fly', 'glide'); g.classList.add('moving', MOVE.mode);
  MOVE.raf = requestAnimationFrame(tripFrame);
}
const easeInOut = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
function tripFrame(now) {
  const p = clamp((now - MOVE.t0) / MOVE.dur, 0, 1), fx = MOVE.fx, fy = MOVE.fy, tx = MOVE.tx, ty = MOVE.ty;
  let x, y, tilt = 0, sx = 1, sy = 1;
  if (MOVE.mode === 'glide') {
    const e = easeInOut(p);
    x = fx + (tx - fx) * e; y = fy + (ty - fy) * e;
  } else if (MOVE.mode === 'fly') {
    const e = easeInOut(p);
    x = fx + (tx - fx) * e;
    y = fy + (ty - fy) * e - Math.sin(Math.PI * e) * Math.min(150, MOVE.dist * .28);   // arc up and over
    tilt = MOVE.face * 18 * Math.sin(Math.PI * p);                                    // lean into the flight
    sx = 1 - .06 * Math.sin(Math.PI * p); sy = 1 + .06 * Math.sin(Math.PI * p);
    if (now - MOVE.puffAt > 50 && p > .05 && p < .9) { MOVE.puffAt = now; puff(x, y); }
  } else {
    x = fx + (tx - fx) * p; y = fy + (ty - fy) * p;
    const hp = (p * MOVE.hops) % 1, lift = Math.sin(Math.PI * hp);
    y -= lift * 26;
    tilt = MOVE.face * 7 * lift;
    if (hp < .12 || hp > .9) { sx = 1.12; sy = .86; } else { sx = .95; sy = 1.06; }   // squash on each landing, stretch in the air
  }
  MOVE.x = x; MOVE.y = y;
  renderMove(tilt, sx, sy);
  if (p < 1) MOVE.raf = requestAnimationFrame(tripFrame);
  else { MOVE.raf = 0; MOVE.x = tx; MOVE.y = ty; renderMove(); arrive(true); }
}
function renderMove(tilt = 0, sx = 1, sy = 1) {
  const g = $('#guide'), b = g.querySelector('.buddywrap');
  if (!b) return;
  g.style.transform = `translate(${Math.round(MOVE.x)}px, ${Math.round(MOVE.y)}px)`;
  b.style.setProperty('--tilt', tilt.toFixed(1) + 'deg');
  b.style.setProperty('--sx', sx.toFixed(3)); b.style.setProperty('--sy', sy.toFixed(3));
  aim();
}
function arrive(landed) {
  const g = $('#guide'), b = g.querySelector('.buddywrap');
  // the clip may have finished loading during the trip: re-time the words to match it
  const ms = GUIDE.voId && hasVoice(GUIDE.voId) ? voMs(GUIDE.voId) : 0;
  if (ms && g.classList.contains('hold')) {
    const words = $$('#bText .w'), per = clamp(ms * .85 / Math.max(1, words.length), 42, 450);
    words.forEach((s, i) => { s.style.animationDelay = Math.round(i * per) + 'ms'; });
    GUIDE.talkMs = ms;
  }
  g.classList.remove('moving', 'hop', 'fly', 'glide', 'hold');
  if (landed) { b.classList.remove('land'); void b.offsetWidth; b.classList.add('land'); puff(MOVE.x, MOVE.y, true); setTimeout(() => b.classList.remove('land'), 450); }
  if (GUIDE.talkMs) { talk(GUIDE.talkMs); GUIDE.talkMs = 0; }
  if (GUIDE.voId) { if (hasVoice(GUIDE.voId)) voPlay(GUIDE.voId); GUIDE.voId = null; }
  if (GUIDE.arriveMood) { setMood(GUIDE.arriveMood, 2000); GUIDE.arriveMood = null; }
  aim();
}
// Eyes, facing and the pointing arm: toward the travel direction while moving, toward the target once there
function aim() {
  const svg = $('#guide .buddy'); if (!svg) return;
  const pu = svg.querySelector('.pupils');
  const ex = MOVE.x + 42, ey = MOVE.y + MOVE.h - 69;
  let lx = 0, ly = 0, pointing = false;
  if (MOVE.raf) { lx = MOVE.tx - MOVE.fx; ly = MOVE.ty - MOVE.fy; }
  else if (MOVE.look && !GUIDE.min) {
    lx = MOVE.look.x - ex; ly = MOVE.look.y - ey; pointing = true;
    if (Math.abs(lx) > 40) MOVE.face = lx > 0 ? 1 : -1;
  }
  svg.classList.toggle('flip', MOVE.face < 0);
  const d = Math.hypot(lx, ly);
  pu.style.transform = d ? `translate(${(lx / d * 2.6 * MOVE.face).toFixed(2)}px, ${(ly / d * 2.6).toFixed(2)}px)` : '';
  if (pointing) {
    const sx0 = MOVE.x + 42 + 26 * MOVE.face, sy0 = MOVE.y + MOVE.h - 44;
    const ang = Math.atan2(MOVE.look.y - sy0, (MOVE.look.x - sx0) * MOVE.face) * 180 / Math.PI;
    svg.style.setProperty('--ar', clamp(ang, -85, 75).toFixed(0) + 'deg');
  } else svg.style.removeProperty('--ar');
}
// The speaker cone pumps with the song's real loudness (the master level meter)
let pump = 0;
function woofPulse() {
  const cone = $('#guide .cone');
  if (!cone || $('#guide').hidden) return;
  const music = T.playing ? (lvl.master || 0) * 1.6 : 0, voice = voLevel() * 2.4;   // music, or Woofer's own voice
  const lv = calm() ? 0 : Math.min(1, Math.max(music, voice));
  pump = Math.max(lv, pump * .8);
  cone.style.setProperty('--pump', (1 + pump * .22).toFixed(3));
}
function puff(x, y, landing) {
  if (calm()) return;
  const p = document.createElement('i');
  p.className = 'puff';
  if (landing) { p.classList.add('big'); p.style.left = (x + 42) + 'px'; p.style.top = (y + MOVE.h - 6) + 'px'; }
  else { p.style.left = (x + 42 - MOVE.face * 18) + 'px'; p.style.top = (y + MOVE.h - 38) + 'px'; }
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 650);
}
window.addEventListener('scroll', placeSoon, true);
window.addEventListener('resize', placeSoon);
setInterval(placeSoon, 300);

/* ---------- lesson picker in the hint bar ---------- */
function renderPill() {
  const el = $('#lessonPill'), learn = UI.mode === 'learn', L = LESSONS[P.lesson];
  el.innerHTML = `<button class="lpill" id="lessonsBtn" aria-haspopup="true" data-hint="<b>Lessons</b>: see your progress and jump to any lesson.">
      ${learn ? `<span class="label">Lesson ${P.lesson + 1}/${LESSONS.length}</span><b>${L.title}</b>` : '<b>Lessons</b>'}
      <span class="ldots">${LESSONS.map((_, i) => `<i class="${P.done[i] ? 'done' : ''}${learn && i === P.lesson ? ' cur' : ''}"></i>`).join('')}</span>
      <svg class="i" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>
    <div class="menu lmenu" id="lessonMenu" hidden>
      ${LESSONS.map((x, i) => `<button data-l="${i}" class="${P.done[i] ? 'done' : ''}${learn && i === P.lesson ? ' cur' : ''}"><span class="n">${P.done[i] ? ICONS.check : i + 1}</span>${x.title}</button>`).join('')}
    </div>`;
  $('#lessonsBtn').onclick = e => { e.stopPropagation(); $('#lessonMenu').hidden = !$('#lessonMenu').hidden; };
  $$('#lessonMenu [data-l]').forEach(b => b.onclick = () => { $('#lessonMenu').hidden = true; startLesson(+b.dataset.l); });
}
document.addEventListener('click', e => { const m = $('#lessonMenu'); if (m && !m.hidden && !e.target.closest('#lessonPill')) m.hidden = true; });
// Called from renderAll: keeps the guide in sync without retyping the current line
function renderGuide() {
  renderPill();
  if (UI.mode === 'learn' && !GUIDE.special && !GUIDE.pending && GUIDE.key !== `${P.lesson}.${P.step}.${GUIDE.line}`) { showLine(); return; }
  applySpot(false);
}

/* ---------- dictionary ---------- */
const DICT = [
  ['Transport', 'The Play, Stop and Record buttons.', 'Top bar', 'Transport panel', 'Control bar', 'Control bar'],
  ['Tempo (BPM)', 'The speed of the song in beats per minute.', 'BPM box', 'Tempo', 'Tempo (LCD)', 'Tempo field'],
  ['Metronome', 'A click on every beat to keep time.', 'Click', 'Metronome', 'Metronome', 'Metronome'],
  ['Bar, beat, step', 'Music is counted in bars of 4 beats; each beat splits into 4 steps.', 'Bar · Beat display', 'Bars:Steps:Ticks', 'Bars and beats', 'Bars.Beats.Sixteenths'],
  ['Track', 'One instrument or part of the song.', 'Tracks list', 'Channel + Mixer track', 'Track', 'Track'],
  ['Step sequencer', 'A grid of boxes for programming beats.', 'Drums editor', 'Channel Rack', 'Beat Sequencer (iPhone/iPad), Drummer (Mac)', 'Drum Rack + MIDI clip'],
  ['Piano roll', 'A grid for writing notes: pitch up and down, time left to right.', 'Piano roll', 'Piano roll', 'Piano Roll editor', 'MIDI Note Editor'],
  ['Instrument', 'The sound a track plays.', 'Sound menu', 'Plugin / generator', 'Software instrument (Library)', 'Instrument'],
  ['Key and scale', 'A family of notes that sound good together.', 'Key + scale menus, Scale highlight', 'Scale highlighting', 'Key (LCD), Scale (iPhone/iPad)', 'Scale Mode'],
  ['Chord', 'Three or more notes played together.', 'Chord helper', 'Stamp tool', 'Chord Strips (iPhone/iPad)', 'Chord MIDI effect'],
  ['Chord progression', 'A loop of chords that repeats through a song.', 'Famous progressions', 'Written in the Piano roll', 'Chord Strips / Smart Instruments', 'Written in a MIDI clip'],
  ['Musical typing', 'Playing notes with your computer keyboard.', 'Keyboard row', 'Typing keyboard to piano', 'Musical Typing', 'Computer MIDI Keyboard'],
  ['Quantize', 'Snapping notes to the grid so they are in time.', 'Quantize button, or Snap while recording', 'Quantize', 'Time Quantize', 'Quantize'],
  ['Pattern', 'A short loop holding a part for each track.', 'Pattern', 'Pattern', 'Region (or Live Loops cell)', 'Clip'],
  ['Arrangement', 'Laying out patterns on a timeline to build a song.', 'Arrange tab', 'Playlist', 'Tracks area', 'Arrangement View'],
  ['Pattern vs song playback', 'Loop one section, or play the whole song.', 'Pattern / Song switch', 'PAT / SONG switch', 'Cycle on / off', 'Session View / Arrangement View'],
  ['Mixer', 'Where you balance volume, pan and effects.', 'Mixer tab', 'Mixer', 'Track headers + Smart Controls', 'Mixer'],
  ['Fader', 'A volume slider.', 'Fader', 'Fader', 'Volume slider', 'Volume fader'],
  ['Mute and solo', 'Silence one track, or hear one track alone.', 'M and S', 'Mute / Solo', 'Mute / Solo', 'Track Activator / Solo'],
  ['Pan', 'Left or right position of a sound.', 'Pan', 'Pan knob', 'Pan knob', 'Pan knob'],
  ['Effects', 'Tools that change how a sound feels, like reverb and echo.', 'Reverb, Echo', 'Mixer effect slots', 'Plug-ins', 'Audio Effects'],
  ['Master', 'The final volume of the whole song.', 'Master strip', 'Master track', 'Master track', 'Main track'],
  ['Swing', 'Delaying every second step for a bouncy groove.', 'Swing (Studio mode)', 'Swing (Channel Rack)', 'Swing in Quantize', 'Groove Pool'],
  ['Export', 'Turning your song into an audio file.', 'Export', 'Export (WAV / MP3)', 'Share → Export Song to Disk', 'Export Audio/Video'],
  ['Project file', 'The editable file of your song.', '.json (Save)', '.flp', '.band', '.als'],
];
function showDictionary() {
  const m = modal(`<h2>DAW Dictionary</h2><p>Every DAW names things a little differently. Here is what each idea is called in Loopling and the three most popular beginner DAWs.</p>
    <div class="tablewrap"><table class="dictt"><thead><tr><th>Idea</th><th>What it means</th><th>Loopling</th><th>FL Studio</th><th>GarageBand</th><th>Ableton Live</th></tr></thead>
    <tbody>${DICT.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <div class="acts"><button class="btn primary" id="dClose">Close</button></div>`, true);
  m.querySelector('#dClose').onclick = closeModal;
}

/* ---------- confetti ---------- */
function confetti() {
  if (calm()) return;
  const cv = document.createElement('canvas'); cv.id = 'confetti'; document.body.appendChild(cv);
  const dpr = window.devicePixelRatio || 1, W = innerWidth, Hh = innerHeight;
  cv.width = W * dpr; cv.height = Hh * dpr; cv.style.width = W + 'px'; cv.style.height = Hh + 'px';
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const cols = [1, 2, 3, 4, 5, 6].map(i => cssVar('--t' + i));
  const bits = Array.from({ length: 140 }, () => ({ x: W / 2 + (Math.random() - .5) * 200, y: Hh * .35, vx: (Math.random() - .5) * 12, vy: -Math.random() * 12 - 4, r: Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)], s: 4 + Math.random() * 5 }));
  const t0 = performance.now();
  (function step(now) {
    g.clearRect(0, 0, W, Hh);
    bits.forEach(b => { b.vy += .35; b.x += b.vx; b.y += b.vy; b.r += .1; g.save(); g.translate(b.x, b.y); g.rotate(b.r); g.fillStyle = b.c; g.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); g.restore(); });
    if (now - t0 < 2200) requestAnimationFrame(step); else cv.remove();
  })(t0);
}
