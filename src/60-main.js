
/* ================= Global controls + startup ================= */
const safeName = () => (S.name || 'song').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'song';
function setBpm(v) {
  edit('bpm', () => { S.bpm = clamp(Math.round(v) || 90, 50, 522); }, { quiet: true });
  $('#bpmInput').value = S.bpm;
}
function setSongMode(on) {
  UI.songMode = on;
  if (on) UI.rec = false;
  if (T.playing) { stop(); play(); } else renderTransport();
  drawPlayheads(); lessonTick();
}
function changeKey(k) {
  let d = k - S.key; if (d > 6) d -= 12; if (d < -5) d += 12;
  edit('key', () => {
    S.patterns.forEach(p => S.tracks.forEach(t => { const pd = p.data[t.id]; if (t.kind === 'synth' && pd) pd.notes.forEach(n => { n.p += d; }); }));
    S.key = k;
  });
  toast(`Moved the whole song ${d === 0 ? '' : d > 0 ? 'up ' + d : 'down ' + -d} ${Math.abs(d) === 1 ? 'note' : 'notes'} into ${NOTE_NAMES[k]}.`);
}
function toggleMenu(force) {
  UI.menu = force == null ? !UI.menu : force;
  $('#projMenu').hidden = !UI.menu;
}
function effectiveDark() {
  const th = document.documentElement.dataset.theme;
  return th ? th === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
}
async function saveProjectFile() {
  const blob = new Blob([JSON.stringify(Object.assign({ app: 'loopling' }, S))], { type: 'application/json' });
  if (await offerFile(safeName() + '.loopling.json', blob)) { C.saves++; toast('Project saved. Open it later from <b>Project &rarr; Open a saved project</b>.'); lessonTick(); }
}
let exporting = false;
async function exportAudio() {
  if (exporting) return;
  if (projectIsEmpty()) return toast('Your song is empty. Add some notes first.');
  exporting = true;
  const btn = $('#exportBtn'), label = btn.querySelector('span');
  btn.disabled = true; label.textContent = 'Rendering…';
  try {
    const { buf, useSong } = await renderAudio();
    const wav = encodeWav(buf), base = safeName(), dl = await DOWNLOADS;
    const ok = dl ? await offerFile(base + '.zip', zipOne(base + '.wav', wav)) : await offerFile(base + '.wav', new Blob([wav], { type: 'audio/wav' }));
    if (ok) {
      C.exports++;
      toast((useSong ? 'Exported your whole song' : patLen(UI.pat) < 128 ? 'Exported your pattern, looped to about 8 bars,' : 'Exported your whole pattern') + (dl ? ' as a WAV inside a .zip file.' : ' as a WAV file.'));
      lessonTick();
    }
  } catch (e) {
    console.error(e); toast('Export did not work: ' + esc(e.message || e));
  } finally { exporting = false; btn.disabled = false; label.textContent = 'Export'; }
}
async function confirmReplace(title) {
  if (projectIsEmpty() || S.isDemo) return true;
  return (await ask(title, 'Your current song will be replaced. Click <b>Save</b> first if you want to keep it. You can also undo this.',
    [{ id: 'no', label: 'Cancel' }, { id: 'yes', label: 'Continue', primary: true }])) === 'yes';
}

function bindTop() {
  $('#playBtn').onclick = togglePlay;
  $('#recBtn').onclick = () => {
    UI.rec = !UI.rec;
    if (UI.rec && UI.songMode) { UI.songMode = false; toast('Recording works in Pattern mode, so Loopling switched to Pattern.'); }
    if (UI.rec && !T.playing) toast('Record is on. Press Play, then play notes on your keyboard.');
    renderTransport(); lessonTick();
  };
  $('#patModeBtn').onclick = () => setSongMode(false);
  $('#songModeBtn').onclick = () => setSongMode(true);
  $('#bpmDown').onclick = () => setBpm(S.bpm - 5);
  $('#bpmUp').onclick = () => setBpm(S.bpm + 5);
  $('#bpmInput').onchange = e => setBpm(+e.target.value);
  $('#metroBtn').onclick = () => { UI.metro = !UI.metro; ensureAudio(); renderTransport(); lessonTick(); };
  $('#snapBtn').onclick = () => {
    UI.snap = !UI.snap; persistSoon(); renderTransport();
    toast(UI.snap ? '<b>Snap</b> is on: notes and drums you record or click in land right on the grid.' : '<b>Snap</b> is off: notes go exactly where you play or click, even between the boxes. Quantize can line them up later.');
  };
  $('#keySelect').onchange = e => changeKey(+e.target.value);
  $('#scaleSelect').onchange = e => edit('scale', () => { S.scale = e.target.value; });
  $('#modeLearn').onclick = () => { if (UI.mode === 'learn') return; UI.mode = 'learn'; enterStep(); GUIDE.key = null; renderAll(); persistSoon(); };
  $('#modeStudio').onclick = () => { UI.mode = 'studio'; renderAll(); persistSoon(); };
  $('#undoBtn').onclick = undo;
  $('#redoBtn').onclick = redo;
  $('#dictBtn').onclick = showDictionary;
  $('#saveBtn').onclick = saveProjectFile;
  $('#exportBtn').onclick = exportAudio;
  $('#projBtn').onclick = e => { e.stopPropagation(); toggleMenu(); };
  document.addEventListener('click', e => { if (UI.menu && !e.target.closest('.menuwrap')) toggleMenu(false); });
  $('#mNew').onclick = async () => { toggleMenu(false); if (!(await confirmReplace('Start a new song?'))) return; stop(); checkpoint(); newProject(); UI.pat = 0; afterLoad(); };
  $('#mDemo').onclick = async () => { toggleMenu(false); if (!(await confirmReplace('Open the demo song?'))) return; stop(); checkpoint(); demoProject(); UI.pat = 0; afterLoad(); };
  $('#mOpen').onclick = () => { toggleMenu(false); $('#fileInput').click(); };
  $('#mRename').onclick = async () => { toggleMenu(false); const v = await askText('Rename your song', S.name); if (v) edit('name', () => { S.name = v; }); };
  $('#mTheme').onclick = () => { toggleMenu(false); document.documentElement.dataset.theme = effectiveDark() ? 'light' : 'dark'; persistSoon(); renderAll(); };
  $('#mMotion').onclick = () => {
    toggleMenu(false);
    UI.motion = calm() ? 'full' : 'calm';
    persistSoon(); renderTop();
    toast(calm() ? 'Calm motion: Woofer glides gently and extra animation is off.' : 'Lively motion: Woofer hops, flies and bounces again.');
  };
  $('#mCredits').onclick = () => { toggleMenu(false); showCredits(); };
  $('#mSettings').onclick = () => { toggleMenu(false); showSettings(); };
  $('#mReset').onclick = async () => {
    toggleMenu(false);
    const a = await ask('Restart all lessons?', 'Your lesson progress resets and the tools lock again. Your song is not affected unless Lesson 1 loads the demo.', [{ id: 'no', label: 'Cancel' }, { id: 'yes', label: 'Restart', primary: true }]);
    if (a !== 'yes') return;
    Object.assign(P, { lesson: 0, step: 0, reached: 0, done: [] });
    startLesson(0);
  };
  $('#fileInput').onchange = e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const o = JSON.parse(r.result);
        if (!validProject(o)) throw new Error('not a Loopling project');
        delete o.app;
        stop(); checkpoint(); S = o; UI.pat = 0; afterLoad();
        toast(`Opened <b>${esc(S.name)}</b>.`);
      } catch (err) { toast('That file is not a Loopling project. Choose a file you saved with the Save button.'); }
    };
    r.readAsText(f);
  };
  ['editor', 'mixer', 'arrange'].forEach(v => { $('#tab-' + v).onclick = () => setView(v); });
}

/* ---------- keyboard ---------- */
document.addEventListener('keydown', e => {
  const el = e.target, tag = (el.tagName || '').toLowerCase();
  if ((tag === 'input' && el.type !== 'range') || tag === 'select' || tag === 'textarea' || $('#modalRoot').firstChild) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
  if (mod || e.altKey) return;
  if (e.code === 'Space') {
    e.preventDefault();
    if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
    if (!e.repeat && !$('#playBtn').classList.contains('locked')) togglePlay();
    return;
  }
  if (UI.view !== 'editor' || lockLevel() < 4) return;
  const k = e.key.toLowerCase(), t = curTrack();
  if (k === '-' || k === '=') {   // octave down / up for the piano keys
    e.preventDefault();
    if (t.kind !== 'drums' && !e.repeat) shiftTypeOct(k === '=' ? 1 : -1);
    return;
  }
  if (keyToNote(k, t) == null) return;
  e.preventDefault();
  if (!e.repeat) { HELD_CODE[e.code] = k; keyDown(k); }
});
// Releases by physical key, so a note still stops if Shift changed what the key types (2 becomes @) while it was held
const HELD_CODE = {};
document.addEventListener('keyup', e => { const k = HELD_CODE[e.code] || e.key.toLowerCase(); delete HELD_CODE[e.code]; keyUp(k); });
window.addEventListener('blur', () => [...DOWN.keys()].forEach(keyUp));   // switching windows lets go of every held note
window.addEventListener('blur', () => { [...DOWN].forEach(keyUp); });
let resizeT = null;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (UI.view === 'editor') renderEditorCanvas(); drawPlayheads(); }, 120); });
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => renderEditorCanvas());

function init() {
  const saved = LS.get('project');
  if (validProject(saved)) S = saved; else newProject();
  const prog = LS.get('progress');
  if (prog) {
    Object.assign(P, prog);
    if (!(prog.v >= 2)) {   // saved before the theory lesson became Lesson 5: lessons from 5 on moved up by one
      if (P.lesson >= 4) P.lesson++;
      if (P.reached >= 4) P.reached++;
      if (P.done.length > 4) P.done.splice(4, 0, false);
      P.v = 2;
    }
  }
  const ui = LS.get('ui');
  if (ui) {
    UI.mode = ui.mode === 'studio' ? 'studio' : 'learn';
    UI.scaleLock = ui.scaleLock !== false; UI.ghosts = ui.ghosts !== false;
    if (ui.theme) document.documentElement.dataset.theme = ui.theme;
    if (ui.motion) UI.motion = ui.motion;
    if (ui.voice === false) UI.voice = false;
    UI.snap = ui.snap !== false;   // on unless you turned it off
    if (ui.daw === 'gb' || ui.daw === 'bl') UI.daw = ui.daw;
  }
  if (!UI.motion) UI.motion = OS_REDUCED ? 'calm' : 'full';
  if (UI.mode === 'learn' && P.lesson === 0 && projectIsEmpty() && P.welcomed) demoProject();
  UI.track = (trackByRole('drums') || S.tracks[0]).id;
  bindTop();
  buildGuide();
  voPreload(P.lesson);
  loadInUse();
  if (UI.mode === 'learn') enterStep();
  renderAll();
  requestAnimationFrame(frame);
  if (!P.welcomed) welcome();
}
init();
