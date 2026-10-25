
/* ================= Lessons: what Woofer says and checks ================= */
// Each step: `say` is a list of short lines (a string, or { t, at, mood }). `at` points Woofer at
// another element for that line; otherwise Woofer points at the step's `target`. The task belongs
// to the last line, and Woofer waits there until `check` passes.
C.drum = 0; C.follow = 0; C.sel = 0;
const role = r => trackByRole(r) || S.tracks[0];
const notesOf = r => patData(UI.pat, role(r)).notes || [];
const rowsOf = () => patData(UI.pat, role('drums')).rows;
const hitNear = (row, s) => rowsOf()[row].some(h => Math.round(h) === s);   // counts hits placed a little off the step with Snap off
const keyName = () => `${NOTE_NAMES[S.key]} ${SCALES[S.scale].parent}`;
const cells = (row, steps) => steps.map(s => `#drumGrid .cellb[data-row="${row}"][data-s="${s}"]`).join(', ');
const chordCount = () => chordsIn(patData(UI.pat, role('chords'))).length;
function patSig(pi) {
  return S.tracks.map(t => {
    const d = patData(pi, t);
    return d.len + ':' + (d.notes ? d.notes.map(n => n.s + '.' + n.p + '.' + n.l).sort().join(',') : DRUM_ROWS.map(r => d.rows[r.id].slice().sort((a, b) => a - b).join(',')).join('|'));
  }).join('#');
}
// A "click this track" task that waits for a real click, even if the track is already selected
const pick = r => ({ enter: b => { b.sel = C.sel; }, check: b => C.sel > b.sel && UI.track === role(r).id && UI.view === 'editor' });
const DICT_TRANSPORT = { fl: 'Transport panel', gb: 'Control bar', ab: 'Control bar' };

// The music theory lesson listens to what you play: every note (keyboard, piano or side keys),
// the chord your last three notes made, and the chord buttons you click
C.heard = []; C.triads = []; C.chordLog = [];
function noteHeard(m) {
  const now = performance.now();
  C.heard.push({ m, t: now }); if (C.heard.length > 60) C.heard.shift();
  const last = C.heard.slice(-3);
  if (last.length === 3 && now - last[0].t < 3000) {   // together, or one after another within 3 seconds
    const pcs = [...new Set(last.map(e => pc(e.m)))];
    if (pcs.length === 3) for (const r of pcs) {
      const shape = pcs.map(p => pc(p - r)).sort((a, b) => a - b).join();
      if (shape === '0,4,7' || shape === '0,3,7') { C.triads.push({ q: shape === '0,4,7' ? 'maj' : 'min', t: now }); break; }
    }
  }
  lessonTick();
}
function chordHeard(deg) { C.chordLog.push({ deg, t: performance.now() }); lessonTick(); }
const since = (list, b) => list.filter(e => e.t >= b.at);
const scaleSize = () => SCALES[S.scale].steps.length;
const scaleHeard = b => new Set(since(C.heard, b).filter(e => inKey(e.m)).map(e => pc(e.m))).size;
const chordsHeard = (b, degs) => degs.filter(d => since(C.chordLog, b).some(x => x.deg === d));
const triadsHeard = b => since(C.triads, b).map(x => x.q);
const chordBtns = degs => degs.map(d => `#chordHelper .chordbtn[data-deg="${d}"]`).join(', ');
// Steps start fresh: the clock for what counts, scale highlight on (so the scale shows), no chord button already held
function theoryEnter(b) {
  b.at = performance.now();
  if (UI.scaleLock && UI.stamp == null) return;
  UI.scaleLock = true; UI.stamp = null; persistSoon();
  if (UI.view === 'editor') { renderEditor(); applyLocks(); }
}

const LESSONS = [
  { title: 'Welcome to the studio', role: 'drums', recap: 'You can play and stop a song, read bars and beats, and change the tempo.',
    bridge: { gb: 'Make an <b>Empty Project</b>. The control bar at the top has Play, Record and the <b>Metronome</b> button, plus a display showing bars, beats and the tempo. Double-click the tempo to type a new one.',
              bl: 'Click <b>Create</b> and start a new project. Play, Record, the metronome and the tempo (BPM) are in the bar along the top. Press Space to play and stop.' },
    async start() {
      if (projectIsEmpty() || S.isDemo) { demoProject(); H.undo.length = 0; afterLoad(); return; }
      const a = await ask('Load the demo song?', 'This lesson plays a short demo song. Your current song will be replaced, so save it first if you want to keep it.',
        [{ id: 'keep', label: 'Keep my song' }, { id: 'demo', label: 'Load the demo', primary: true }]);
      if (a === 'demo') { checkpoint(); demoProject(); afterLoad(); }
    },
    steps: [
      { say: [
        { t: 'Hi, I’m <b>Woofer</b>! I’m a little speaker, so I love music. I’ll show you how music software works, one small step at a time.', mood: 'wave', at: null },
        { t: 'Apps like FL Studio, GarageBand and Ableton are called <b>DAWs</b> (Digital Audio Workstations). That just means a music studio inside your computer.', at: null },
        { t: 'These are your <b>tracks</b>. Each track is like one musician in a band: drums, bass, chords and melody.', at: '#rack' },
        { t: 'This big area is the <b>editor</b>. It’s where you write music for the track you picked.', at: '#editorView' },
        { t: 'Up here are the <b>transport</b> controls. They work like the buttons on a music player.', at: '.transport' },
      ] },
      { say: ['I loaded a short demo song so you can hear what we’ll build together.', 'Press the green <b>Play</b> button. The Spacebar works too!'],
        task: 'Press Play', target: '#playBtn', check: () => T.playing, yay: 'Sounds good, right? Watch my speaker cone. It pumps along with the music!', dict: DICT_TRANSPORT },
      { say: [
        { t: 'See the highlight sliding across the grid? That’s the <b>playhead</b>. It marks the moment you’re hearing.', at: '#drumGrid' },
        { t: 'Music is counted in <b>bars</b> and <b>beats</b>: 1, 2, 3, 4, then a new bar starts. This box keeps count for you.', at: '#posDisp' },
      ] },
      { say: ['The <b>tempo</b> is the speed of a song, measured in <b>BPM</b>: beats per minute.', 'Press <b>+</b> or <b>&minus;</b> to change it, and listen to the difference.'],
        task: 'Change the tempo', target: '#bpmBox', enter: b => { b.bpm = S.bpm; }, check: b => S.bpm !== b.bpm, yay: 'Slow songs sit around 70 to 90 BPM. Dance music is usually 120 to 130.',
        dict: { fl: 'Tempo', gb: 'Tempo (in the LCD)', ab: 'Tempo field' } },
      { say: ['Now turn on the <b>Click</b>. It’s a <b>metronome</b>: a tick on every beat.'],
        task: 'Turn on the click', target: '#metroBtn', check: () => UI.metro, yay: 'Count along with it: 1, 2, 3, 4! The high tick is beat 1.', dict: { fl: 'Metronome', gb: 'Metronome', ab: 'Metronome' } },
      { say: ['Nice counting! Now press <b>Stop</b>. Turn the click off too, if you like.'], task: 'Stop playback', target: '#playBtn', check: () => !T.playing },
      { say: [
        { t: 'One more tip: point at anything, and the <b>hint bar</b> explains what it does.', at: '#hintBar' },
        { t: 'Faded buttons are locked for now. They unlock as you learn them, so nothing gets overwhelming.', at: null },
        { t: 'Next, you’ll make your very own beat. Ready?', at: null, mood: 'happy' },
      ] },
    ] },

  { title: 'Your first beat', role: 'drums', recap: 'You know how bars, beats and steps work, and you built a beat in a step sequencer.',
    bridge: { gb: 'GarageBand on Mac has no step grid. Add a <b>Software Instrument</b> track with a drum kit, Command-click the track to make a region, and double-click it. In the <b>Piano Roll</b>, each row is one drum: Command-click to add hits. (On iPhone and iPad, use the <b>Beat Sequencer</b>.)',
              bl: 'Add a <b>Drum Machine</b> track. Its grid works just like this one: one row per drum, and you click a box to add a hit. Build the same kick, snare and hi-hat beat.' },
    start() {
      if (S.isDemo) { newProject(); H.undo.length = 0; afterLoad(); }
      UI.songMode = false; UI.pat = 0; UI.view = 'editor';
    },
    steps: [
      { say: [{ t: 'Fresh start! I cleared the demo, so this song is empty and waiting for you.', at: null }, 'Click the <b>Drums</b> track to open it.'],
        task: 'Click the Drums track', target: '[data-role-row="drums"]', ...pick('drums') },
      { say: [{ t: 'This grid is a <b>step sequencer</b>. Each row is a different drum sound.', at: '#drumGrid' }, 'Click a drum’s name to hear it. Try a few!'],
        task: 'Listen to 3 drums', target: '#drumGrid .rl', enter: b => { b.n = C.drum; }, check: b => C.drum - b.n >= 3, progress: b => `${Math.min(3, C.drum - b.n)} of 3`,
        dict: { fl: 'Channel Rack', gb: 'Beat Sequencer (iPhone/iPad), Drummer (Mac)', ab: 'Drum Rack' } },
      { say: [
        { t: 'Each box is a moment in time. Songs have 4 <b>beats</b> in each <b>bar</b>, and each beat splits into 4 <b>steps</b>.', at: '#drumGrid' },
        { t: 'The bold numbers <b>1, 5, 9 and 13</b> are where each beat starts.', at: '#drumGrid .hd.beat' },
        'Click those 4 boxes in the <b>Kick</b> row.',
      ], task: 'Kick on steps 1, 5, 9 and 13', target: cells('kick', [0, 4, 8, 12]),
        check: () => [0, 4, 8, 12].every(s => hitNear('kick', s)), progress: () => `${[0, 4, 8, 12].filter(s => hitNear('kick', s)).length} of 4` },
      { say: ['Press <b>Play</b> to hear your kick drum!'], task: 'Press Play', target: '#playBtn', check: () => T.playing,
        yay: 'A kick on every beat is called <b>four on the floor</b>. It’s the heartbeat of dance music.' },
      { say: ['Now the <b>Snare</b>. Put it on steps <b>5 and 13</b>.', 'Those are beats 2 and 4, the <b>backbeat</b>. Almost every pop, rock and hip-hop song has one.'],
        task: 'Snare on steps 5 and 13', target: cells('snare', [4, 12]), check: () => [4, 12].every(s => hitNear('snare', s)) },
      { say: ['Hi-hats fill the gaps between the big hits.', 'Add a <b>Closed Hat</b> on every other step: 1, 3, 5, 7&hellip; Tip: click and drag to paint lots at once!'],
        task: 'Add 6 Closed Hats', target: '#drumGrid [data-row="chat"]', check: () => rowsOf().chat.length >= 6, progress: () => `${Math.min(6, rowsOf().chat.length)} of 6` },
      { say: [
        { t: 'You made a beat! Now make it yours: move a kick, add a clap, or take something away.', at: '#drumGrid', mood: 'happy' },
        { t: 'There are no wrong answers. If you don’t like a change, <b>Undo</b> takes you back.', at: '#undoBtn' },
      ] },
    ] },

  { title: 'Notes and the piano roll', role: 'bass', recap: 'You can place, stretch, move and delete notes, and swap a track’s instrument.',
    bridge: { gb: 'Add a <b>Software Instrument</b> track and pick a bass from the Library. Command-click the track to make a region, double-click it to open the <b>Piano Roll</b>, then Command-click to add notes.',
              bl: 'Add an <b>Instruments</b> track and pick a bass. Record a few notes with your computer keyboard, then double-click the region to open the <b>MIDI editor</b>, where you can move, stretch and draw notes.' },
    steps: [
      { say: ['Drums keep the rhythm. Now let’s add notes that go high and low, starting with the <b>bass</b>.', 'Click the <b>Bass</b> track.'],
        task: 'Click the Bass track', target: '[data-role-row="bass"]', ...pick('bass') },
      { say: [
        { t: 'This is the <b>piano roll</b>. Every DAW has one!', at: '#pianoRoll' },
        { t: 'Up and down is <b>pitch</b>: low notes at the bottom, high notes at the top. Left to right is time.', at: '#pianoRoll' },
        'Click a few piano keys on the left to hear them.',
      ], task: 'Click 3 piano keys', target: '#prKeys', enter: b => { b.n = C.keys; }, check: b => C.keys - b.n >= 3, progress: b => `${Math.min(3, C.keys - b.n)} of 3`,
        dict: { fl: 'Piano roll', gb: 'Piano Roll editor', ab: 'MIDI Note Editor' } },
      { say: [
        { t: 'This box shows your song’s <b>key</b>. A key is a family of notes that sound good together.', at: '#keyBox' },
        { t: '<b>Scale highlight</b> is on, so notes outside that family are greyed out. Stick to the bright rows and everything fits!', at: '#scaleLockBtn' },
        { t: 'The yellow rows are the <b>home note</b>. Melodies love to come back to it.', at: '#prKeys' },
      ], dict: { fl: 'Scale highlighting', gb: 'Key (in the LCD)', ab: 'Scale Mode' } },
      { say: ['Click the grid to place notes. Start on a yellow home note at the very beginning.'],
        task: 'Place 4 bass notes', target: '#prGrid', check: () => notesOf('bass').length >= 4, progress: () => `${Math.min(4, notesOf('bass').length)} of 4` },
      { say: ['Notes can be short or long. Hold the mouse down on an empty box and drag right to draw a longer note.', 'Click a note to delete it. Drag its middle to move it, or its right edge to stretch it.'],
        task: 'Make a note one beat long (4 steps)', target: '#prGrid', check: () => notesOf('bass').some(n => n.l >= 3.75) },
      { say: ['The same notes sound totally different with another <b>instrument</b>.', 'Open the <b>Sound</b> menu and pick a new bass sound.'],
        task: 'Choose a different sound', target: '#soundBtn', enter: b => { b.p = role('bass').preset; }, check: b => role('bass').preset !== b.p,
        dict: { fl: 'Plugins (like FLEX)', gb: 'Software instruments', ab: 'Instruments (like Wavetable)' } },
      { say: ['Press <b>Play</b> and listen to your bass with your drums.'], task: 'Press Play', target: '#playBtn', check: () => T.playing,
        yay: 'Bass plus drums is called the <b>rhythm section</b>. It’s the backbone of almost every song.' },
    ] },

  { title: 'Chords', role: 'chords', recap: 'You know what chords and chord progressions are, and how bass follows chords.',
    bridge: { gb: 'There are no chord buttons on Mac, so build one by hand: in the Piano Roll, Command-click <b>C, E and G</b> at the same spot. That’s a C major chord. Make four, then give the bass each chord’s main note.',
              bl: 'In the <b>MIDI editor</b>, stack <b>C, E and G</b> at the same spot to make a C major chord. Make four chords, then write a bassline that plays each chord’s main note.' },
    steps: [
      { say: ['Time for <b>chords</b>! Click the <b>Chords</b> track.'], task: 'Click the Chords track', target: '[data-role-row="chords"]', ...pick('chords') },
      { say: [{ t: 'A <b>chord</b> is 3 or more notes played together. Chords set the mood: happy, sad, dreamy or tense.', at: '#chordHelper' }, 'These buttons are chords that fit your key. Click one to hear it.'],
        task: 'Click a chord', target: '#chordHelper .chordbtn', check: () => UI.stamp != null, dict: { fl: 'Stamp tool', gb: 'Chord Strips (iPhone/iPad)', ab: 'Chord MIDI effect' } },
      { say: [{ t: 'This track is <b>4 bars</b> long. You can see Bar 1 to Bar 4 along the top.', at: '#lenSelect' }, 'Click near the start of a bar to place your chord. It lasts the whole bar.'],
        task: 'Place a chord', target: '#prGrid', check: () => chordCount() >= 1, yay: 'Three notes, one click.' },
      { say: ['Songs repeat a few chords in a loop. That’s a <b>chord progression</b>.', 'Place 4 chords, one per bar. Or choose one from <b>Famous progressions</b>, used in thousands of hits.'],
        task: 'Have 4 chords', target: '#chordHelper', check: () => chordCount() >= 4, progress: () => `${Math.min(4, chordCount())} of 4` },
      { say: ['Bass and chords sound best when they agree.', 'Click <b>Make bass follow chords</b>. I’ll write a bassline that plays the main note of each chord.'],
        task: 'Make the bass follow', target: '#matchBassBtn', enter: b => { b.n = C.follow; }, check: b => C.follow > b.n },
      { say: ['Press <b>Play</b>. Drums, bass and chords together already sound like a real song!'], task: 'Press Play', target: '#playBtn', check: () => T.playing },
    ] },

  { title: 'Music theory: why chords work', role: 'chords', recap: 'You know what scales and triads are, how major and minor chords differ, how chords get their numbers, and why V wants to go home to I.',
    bridge: { gb: 'In the <b>Piano Roll</b>, Command-click <b>C, E and G</b> at the same spot: C major. Drag the E down to E&flat; and it turns minor. Then put <b>G, B, D</b> right before C, E, G and hear V go home to I.',
              bl: 'In the <b>MIDI editor</b>, draw <b>C, E and G</b> at the same spot: C major. Drag the E down to E&flat; and it turns minor. Then put <b>G, B, D</b> right before C, E, G and hear V go home to I.' },
    steps: [
      { say: ['You’ve been using chords. Now let’s look inside them and find out why they sound good!', 'Click the <b>Chords</b> track.'],
        task: 'Click the Chords track', target: '[data-role-row="chords"]', ...pick('chords') },
      { say: [
        { t: 'Every key is built from a <b>scale</b>: a set of notes that sound good together. Your song’s key and scale are shown here.', at: '#keyBox' },
        { t: 'On this piano, the bright keys are the notes of your scale. The greyed keys are outside it.', at: '#typingMap' },
        'Play every note of the scale: the bright keys, one after another. Your computer keyboard works too.',
      ], task: 'Play every note of the scale', target: '#typingMap', enter: theoryEnter,
        check: b => scaleHeard(b) >= scaleSize(), progress: b => `${Math.min(scaleSize(), scaleHeard(b))} of ${scaleSize()} notes`,
        yay: 'That’s the scale your whole song is built from.', dict: { fl: 'Scale highlighting', gb: 'Key (in the LCD)', ab: 'Scale Mode' } },
      { say: [
        'A <b>chord</b> is built from the scale too. Pick a note, skip the next one, take one, skip one, take one.',
        'Those 3 notes make a <b>triad</b>, the most common kind of chord. Its bottom note is called the <b>root</b>.',
        'Play a triad: hold <b>Q</b>, <b>E</b> and <b>T</b> together, or click those three piano keys one after another.',
      ], task: 'Play a triad', target: '#typingMap', enter: theoryEnter, check: b => triadsHeard(b).length > 0,
        yay: 'Root, skip one, third, skip one, fifth. Every triad is built that way!' },
      { say: [
        'Chords come in two main flavors. <b>Major</b> sounds bright and happy. <b>Minor</b> sounds sad or dreamy.',
        'The only difference is the middle note. Move it down by one key, and a major chord turns minor.',
        'Play a major chord, then a minor one. Try <b>Q E T</b>, then <b>Q 3 T</b>.',
      ], task: 'Play a major and a minor chord', target: '#typingMap', enter: theoryEnter,
        check: b => ['maj', 'min'].every(q => triadsHeard(b).includes(q)),
        progress: b => ['maj', 'min'].filter(q => triadsHeard(b).includes(q)).map(q => (q === 'maj' ? 'Major' : 'Minor') + ' done').join(', ') || 'Major first, then minor',
        yay: 'Hear the mood change? Just one note made the difference.' },
      { say: [
        { t: 'Build a triad on each note of the scale, and you get the chords of your key. These buttons are those chords.', at: '#chordHelper' },
        { t: 'Musicians number them in Roman numerals: I, ii, iii, IV, V, vi, vii°. Capital letters are major chords, small letters are minor.', at: '#chordHelper' },
        'Click chords <b>1, 4 and 5</b>. They’re the most used chords in all of music.',
      ], task: 'Hear chords 1, 4 and 5', target: chordBtns([0, 3, 4]), enter: theoryEnter,
        check: b => chordsHeard(b, [0, 3, 4]).length === 3, progress: b => `${chordsHeard(b, [0, 3, 4]).length} of 3` },
      { say: [
        'Chord <b>5</b> (V) sounds like a question. Chord <b>1</b> (I) sounds like the answer: home.',
        'Going from V to I is called a <b>cadence</b>. It’s how songs feel finished.',
        'Click chord <b>5</b>, then chord <b>1</b>, and hear it land home.',
      ], task: 'Play chord 5, then chord 1', target: chordBtns([4, 0]), enter: theoryEnter,
        check: b => { const l = since(C.chordLog, b); return l.length >= 2 && l[l.length - 2].deg === 4 && l[l.length - 1].deg === 0; },
        yay: 'Home sweet home! That pull from V to I is in almost every song you know.' },
      { say: [
        { t: 'Now you know why famous progressions work. The pop hit progression is just I, V, vi and IV.', at: '#progSelect' },
        { t: 'Next time you hear a song, listen for the chord that sounds like home!', at: null, mood: 'happy' },
      ] },
    ] },

  { title: 'Melody and recording', role: 'melody', recap: 'You can play notes on your keyboard, write a melody, and record with quantize.',
    bridge: { gb: 'Choose <b>Window &gt; Show Musical Typing</b> (Command-K) to play with your keyboard. Press Record and play, then line the notes up with <b>Time Quantize</b> in the Piano Roll.',
              bl: 'Select an <b>Instruments</b> track, press Record and play with your computer keyboard. To line the notes up, select them in the MIDI editor, right-click and choose <b>Quantize</b>.' },
    steps: [
      { say: ['The <b>melody</b> is the part you’d sing or hum. Click the <b>Melody</b> track.'], task: 'Click the Melody track', target: '[data-role-row="melody"]', ...pick('melody') },
      { say: ['Your computer keyboard is an instrument now! Press <b>Q W E R T Y U I O P</b>, then keep climbing on the bottom row: <b>Z X C V</b>.', 'The greyed keys clash with your song, so the bright ones are safe. Just explore!'],
        task: 'Play 12 notes', target: '#typingMap', enter: b => { b.n = C.typed; }, check: b => C.typed - b.n >= 12, progress: b => `${Math.min(12, C.typed - b.n)} of 12`,
        dict: { fl: 'Typing keyboard to piano', gb: 'Musical Typing', ab: 'Computer MIDI Keyboard' } },
      { say: ['Now write a melody in the piano roll.', 'The shaded boxes are notes from the chord playing at that moment. They always sound good together.'],
        task: 'Place 6 melody notes', target: '#prGrid', check: () => notesOf('melody').length >= 6, progress: () => `${Math.min(6, notesOf('melody').length)} of 6` },
      { say: [{ t: 'Musicians often <b>record</b> instead of clicking. Press the red <b>Record</b> button first.', at: '#recBtn' },
        { t: 'See the magnet? That’s <b>Snap</b>. It lines your notes up with the beat. Now press <b>Play</b> and play along!', at: '#snapBtn' }],
        task: 'Record 4 notes', target: '.transport', enter: b => { b.n = C.recNotes; }, check: b => C.recNotes - b.n >= 4, progress: b => `${Math.min(4, C.recNotes - b.n)} of 4`,
        yay: 'Nice take! Turn <b>Snap</b> off when you want to keep your exact timing. The <b>Quantize</b> button can still line it up later.',
        dict: { fl: 'Record + Quantize', gb: 'Record + Time Quantize', ab: 'Record + Quantize' } },
      { say: ['Turn <b>Record</b> off and listen back. Don’t like a take? Undo removes it.'], task: 'Turn Record off', target: '#recBtn', check: () => !UI.rec },
    ] },

  { title: 'Mixing', recap: 'You can balance volumes, solo and mute, pan, and add reverb.',
    bridge: { gb: 'Every track header has a volume slider, a pan knob, and mute and solo buttons. Press <b>B</b> for Smart Controls, then add a reverb in an empty slot of the <b>Plug-ins</b> area.',
              bl: 'The track list has a volume fader, a pan knob, and <b>M</b> and <b>S</b> buttons for every track. Pick a track and add reverb from the <b>Effects</b> panel.' },
    steps: [
      { say: ['Writing notes is half the job. <b>Mixing</b> makes all the parts fit together.', 'Open the <b>Mixer</b> tab.'],
        task: 'Open the Mixer', target: '#tab-mixer', check: () => UI.view === 'mixer', dict: { fl: 'Mixer', gb: 'Track headers and Smart Controls', ab: 'Mixer' } },
      { say: ['Each track has a <b>fader</b>, a volume slider.', 'Press Play, then drag a fader until every part is easy to hear.'],
        task: 'Move a fader', target: '#mixerView .fader input', enter: b => { b.v = S.tracks.map(t => t.vol).join(); }, check: b => S.tracks.map(t => t.vol).join() !== b.v },
      { say: ['The <b>S</b> button <b>solos</b> a track, so you hear only that one. Solo the <b>Bass</b>.'], task: 'Solo the Bass', target: '.strip[data-role-strip="bass"] .s', check: () => role('bass').solo },
      { say: ['Hear it on its own? Now turn solo off again.', '<b>M</b> does the opposite: it mutes one track.'], task: 'Turn solo off', target: '.strip[data-role-strip="bass"] .s', check: () => !S.tracks.some(t => t.solo) },
      { say: ['<b>Pan</b> moves a sound left or right in your headphones.', 'Slide the Melody’s pan a little to one side.'], task: 'Pan the Melody', target: '.strip[data-role-strip="melody"] .pan', check: () => Math.abs(role('melody').pan) >= .1 },
      { say: ['<b>Effects</b> change how a sound feels. <b>Reverb</b> makes it sound like a big room.', 'Turn up the reverb on the Chords.'],
        task: 'Add reverb to the Chords', target: '.strip[data-role-strip="chords"] .rev', enter: b => { b.r = role('chords').rev; }, check: b => role('chords').rev >= b.r + .1,
        dict: { fl: 'Mixer effects (like Fruity Reeverb 2)', gb: 'Plug-ins', ab: 'Audio Effects' } },
      { say: [{ t: 'Keep an eye on this <b>meter</b>. If it turns red, the song is too loud and may crackle.', at: '#masterMeter2' }, { t: 'If that happens, lower a few faders instead.', at: '#mixerView .fader input' }] },
    ] },

  { title: 'Patterns and arranging', recap: 'You can make pattern variations and arrange them into a full song.',
    bridge: { gb: 'GarageBand calls patterns <b>regions</b>. Option-drag a region to copy it, change the copy, then line regions up along the timeline. Press <b>C</b> to turn off Cycle and hear the whole song.',
              bl: 'BandLab calls patterns <b>regions</b> too. Copy and paste a region, change the copy, then drag regions along the timeline. Turn off the loop to hear the whole song.' },
    steps: [
      { say: ['So far you’ve built one loop: <b>Pattern 1</b>.', 'Real songs change: a quiet intro, a verse, a big chorus. DAWs build those sections out of <b>patterns</b>.', 'Head back to the <b>Editor</b> tab.'],
        task: 'Open the Editor', target: '#tab-editor', check: () => UI.view === 'editor', dict: { fl: 'Pattern', gb: 'Region', ab: 'Clip' } },
      { say: ['Click <b>Duplicate</b> to copy this pattern into a new one.'], task: 'Duplicate the pattern', target: '#dupPatBtn', check: () => S.patterns.length >= 2 && UI.pat >= 1 },
      { say: [{ t: 'You’re now editing the copy you just made. Its name is lit up here.', at: '#patBar' },
        { t: 'Change something so it sounds different. Add hi-hats, try new melody notes, or remove the kick for a calm moment.', at: '#rack' }],
        task: 'Make the copy different', target: null, check: () => UI.pat > 0 && patSig(UI.pat) !== patSig(0) },
      { say: ['Now open the <b>Arrange</b> tab.'], task: 'Open Arrange', target: '#tab-arrange', check: () => UI.view === 'arrange', dict: { fl: 'Playlist', gb: 'Tracks area', ab: 'Arrangement View' } },
      { say: [
        { t: 'This is your song’s <b>timeline</b>. Rows are tracks, columns are bars.', at: '#arrGrid' },
        { t: 'Pick a pattern here, then click or drag across the grid to paint it in.', at: '#palette' },
        'Try building up: chords alone first, then add drums and bass, then everything. Or press <b>Auto-arrange for me</b>.',
      ], task: 'Fill 8 blocks with 2 patterns', target: '#arrGrid, #autoArrBtn',
        check: () => { const v = S.tracks.flatMap(t => S.arr[t.id].filter(p => p != null)); return v.length >= 8 && new Set(v).size >= 2; },
        progress: () => { const v = S.tracks.flatMap(t => S.arr[t.id].filter(p => p != null)); const n = new Set(v).size; return `${v.length} blocks, ${n} pattern${n === 1 ? '' : 's'}`; } },
      { say: ['Pattern mode loops one pattern while you write. Song mode plays your whole timeline.', 'Switch to <b>Song</b>, then press <b>Play</b>.'],
        task: 'Play in Song mode', target: '#patSongSeg, #playBtn', check: () => UI.songMode && T.playing,
        dict: { fl: 'PAT / SONG switch', gb: 'Cycle on or off', ab: 'Session and Arrangement View' } },
    ] },

  { title: 'Save and share', recap: 'You can save a project file and export your song as audio.',
    bridge: { gb: 'Choose <b>File &gt; Save</b> to keep the project, then <b>Share &gt; Export Song to Disk</b> to make an audio file anyone can play.',
              bl: 'BandLab saves your project online by itself. To get an audio file, open the project menu and choose <b>Download &gt; Mixdown As</b>.' },
    steps: [
      { say: ['Loopling remembers your latest work in this browser.', 'To keep a song for good, click <b>Save</b>. You’ll get a project file you can open again later.'],
        task: 'Save your project', target: '#saveBtn', enter: b => { b.n = C.saves; }, check: b => C.saves > b.n, dict: { fl: '.flp project file', gb: '.band project', ab: '.als Live Set' } },
      { say: ['A project file only opens in Loopling. To share your music with anyone, turn it into audio.', 'DAWs call this <b>exporting</b>, <b>bouncing</b> or <b>rendering</b>. Click <b>Export</b>.'],
        task: 'Export your song', target: '#exportBtn', enter: b => { b.n = C.exports; }, check: b => C.exports > b.n,
        dict: { fl: 'File → Export → WAV', gb: 'Share → Export Song to Disk', ab: 'File → Export Audio/Video' } },
      { say: [
        { t: 'You did it! You now know the big ideas every DAW shares.', mood: 'happy', at: null },
        { t: 'Open the <b>Dictionary</b> any time to see what FL Studio, GarageBand and Ableton call each one.', at: '#dictBtn' },
      ] },
    ] },
];
