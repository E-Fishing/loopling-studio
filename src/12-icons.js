
/* ================= Instrument icons ================= */
// Duotone line icons: ink outlines (currentColor), a soft fill (.f) and a solid accent (.a)
// in the instrument family's color (--ic). Keys match KITS / SYNTHS / DRUM_ROWS.
const INST_SVG = {
  // drum kits
  classic: `<ellipse class="f" cx="6.5" cy="11.5" rx="4.5" ry="1.6"/><path class="f" d="M2 11.5v4.2c0 .9 2 1.6 4.5 1.6s4.5-.7 4.5-1.6v-4.2"/>
    <path d="M6.5 17.3v6.2M4.5 26l2-2.5 2 2.5"/><ellipse class="a" cx="24" cy="6" rx="6" ry="1.3" transform="rotate(-10 24 6)"/><path d="M24 7.3v6"/>
    <circle class="f" cx="19" cy="20.5" r="7"/><circle class="a" cx="19" cy="20.5" r="2.6"/><path d="M14 27.5l1.5-1.5M24 27.5L22.5 26"/>`,
  boom: `<rect class="f" x="3" y="6.5" width="26" height="19" rx="3"/><circle cx="7.5" cy="11" r="1.4"/><circle cx="12" cy="11" r="1.4"/>
    <rect x="16.5" y="9.5" width="9" height="3" rx="1"/><rect class="a" x="6" y="15.5" width="4.4" height="4.4" rx="1"/>
    <rect x="11.6" y="15.5" width="4.4" height="4.4" rx="1"/><rect x="17.2" y="15.5" width="4.4" height="4.4" rx="1"/><rect class="a" x="22.8" y="15.5" width="3.2" height="4.4" rx="1"/>`,
  lofi: `<circle class="f" cx="14" cy="17.5" r="11"/><circle cx="14" cy="17.5" r="7.5" stroke-opacity=".4"/><circle class="a" cx="14" cy="17.5" r="3.2"/>
    <circle class="k" cx="14" cy="17.5" r=".9" stroke="none"/><path d="M28 3.5v9.5l-5 6"/><circle class="f" cx="28" cy="3.5" r="1.7"/><path d="M4 4.5h.01M7.5 2.8h.01M3 8h.01" stroke-width="2.4"/>`,
  // bass
  'deep-bass': `<ellipse class="f" cx="10" cy="22" rx="7.2" ry="5.6" transform="rotate(-45 10 22)"/><path d="M13 19L25.5 6.5" stroke-width="3"/>
    <path class="a" d="M24.3 4.2l3.5 3.5 2.2-2.2-3.5-3.5z"/><path d="M7.5 20.5l4 4M10 18l4 4"/>`,
  'sub-808': `<rect class="f" x="3.5" y="3.5" width="18" height="25" rx="3"/><circle cx="12.5" cy="19" r="6"/><circle class="a" cx="12.5" cy="19" r="2.3"/>
    <circle cx="12.5" cy="9" r="2"/><path d="M24.5 14c1.4 1.6 1.4 4.4 0 6M27.5 11.5c2.6 3 2.6 8 0 11"/>`,
  'pluck-bass': `<path class="f" d="M16 10.5c-3 0-5.2 1.9-5.2 4.2 0 1.3.9 2.2.9 3s-2.1 1.8-2.1 4.2c0 3.4 2.9 6.1 6.4 6.1s6.4-2.7 6.4-6.1c0-2.4-2.1-3.4-2.1-4.2s.9-1.7.9-3c0-2.3-2.2-4.2-5.2-4.2z"/>
    <path d="M16 10.5V3.5"/><circle class="a" cx="16" cy="2.6" r="1.5"/><path d="M13.6 17v4.2M18.4 17v4.2" stroke-width="1.4"/><path d="M13.8 24h4.4M16 28.2v2.4"/>`,
  // keys and pads
  piano: `<path class="f" d="M4.5 14.5L23 4.2c1.3-.7 2.7.6 2 1.9l-4.5 8.4z"/><path d="M16.5 14.5l-1.7-4.8"/>
    <path class="f" d="M3 14.5h17.5c4.6 0 7.1 1.3 8.7 3.6.7 1-.1 2.4-1.3 2.4H3z"/><rect class="k" x="2" y="12.4" width="6" height="2.4" rx=".6"/>
    <path d="M6 20.5v7M25.5 20.5v6M15.5 20.5v6"/><path class="a" d="M13.3 27.2h4.4" stroke-width="2.2"/>`,
  'soft-keys': `<rect class="f" x="2.5" y="8.5" width="27" height="15.5" rx="2.5"/><path d="M8 17v7M13.5 17v7M19 8.5V24M24.5 17v7" stroke-width="1.4"/>
    <rect class="k" x="6.5" y="8.5" width="3" height="8.5" rx=".8"/><rect class="k" x="12" y="8.5" width="3" height="8.5" rx=".8"/><rect class="k" x="23" y="8.5" width="3" height="8.5" rx=".8"/>`,
  organ: `<rect class="f" x="4" y="12" width="4.2" height="13" rx="2"/><rect class="f" x="9.3" y="8" width="4.2" height="17" rx="2"/><rect class="f" x="14.6" y="4" width="4.2" height="21" rx="2"/>
    <rect class="f" x="19.9" y="8" width="4.2" height="17" rx="2"/><rect class="f" x="25.2" y="12" width="2.8" height="13" rx="1.4"/>
    <path class="a" d="M5 19.5h2.2M10.3 19.5h2.2M15.6 19.5h2.2M20.9 19.5h2.2" stroke-width="2.2"/><rect class="a" x="2.5" y="25" width="27" height="4" rx="1.5"/>`,
  'warm-pad': `<circle class="a" cx="22.5" cy="8.5" r="4.6"/><path d="M22.5 1.2v1.3M28.6 3.3l-.9.9M30.6 8.5h-1.3" stroke-width="1.5"/>
    <path class="f" d="M8.5 22h14.5a5 5 0 00.6-10 7.2 7.2 0 00-13.6-1.6A5.8 5.8 0 008.5 22z"/><path d="M4 27.5c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 7.5 0"/>`,
  // leads
  'bright-pluck': `<path class="f" d="M6 5c6-2 10 4 20 1L9 28H6z"/><path d="M6 5v23M6 5c6-2 10 4 20 1M26 6L9 28" /><path d="M10 5.5v20.6M13.5 6.4v15.3M17 7.4V17M20.5 7.6v5" stroke-width="1.2"/>
    <path class="a" d="M26.5 14l1.1 2.2 2.2 1.1-2.2 1.1-1.1 2.2-1.1-2.2-2.2-1.1 2.2-1.1z" stroke-width="1"/>`,
  'retro-lead': `<path class="f" d="M9 9.5h14c3.5 0 6.1 3 6.6 7l.6 5c.3 2.4-2.6 3.8-4.3 2.1l-3.4-3.1h-13l-3.4 3.1c-1.7 1.7-4.6.3-4.3-2.1l.6-5C2.9 12.5 5.5 9.5 9 9.5z"/>
    <path d="M9.5 13v5.5M6.8 15.8h5.4" stroke-width="2.2"/><circle class="a" cx="21.5" cy="14" r="1.6"/><circle class="a" cx="24.8" cy="17.2" r="1.6"/><path d="M14 5.5h4" stroke-width="2.4"/>`,
  'music-box': `<rect class="f" x="3.5" y="14" width="20" height="13.5" rx="2"/><path d="M3.5 19h20"/><path d="M23.5 21h3.6v-3.8"/><circle class="a" cx="27.1" cy="16" r="1.5"/>
    <path d="M13.5 10V3.8l5-1.3v6"/><circle class="a" cx="12" cy="10" r="1.8"/><circle class="a" cx="17" cy="8.5" r="1.8"/>`,
  flute: `<g transform="rotate(-20 16 16)"><rect class="f" x="1.5" y="13.4" width="29" height="5.2" rx="2.6"/><ellipse class="k" cx="7" cy="16" rx="1.4" ry="1" stroke="none"/>
    <circle class="k" cx="14" cy="16" r="1" stroke="none"/><circle class="k" cx="17.5" cy="16" r="1" stroke="none"/><circle class="k" cx="21" cy="16" r="1" stroke="none"/><circle class="k" cx="24.5" cy="16" r="1" stroke="none"/></g>
    <path d="M3.5 12c1.2-.9 2.6-.9 3.8 0M2.5 8.5c1.6-1.2 3.4-1.2 5 0" stroke-width="1.4"/>`,
  // strings
  violin: `<g transform="translate(15 16) rotate(-35) scale(.8) translate(-16 -19)"><path class="f" d="M16 10.5c-3 0-5.2 1.9-5.2 4.2 0 1.3.9 2.2.9 3s-2.1 1.8-2.1 4.2c0 3.4 2.9 6.1 6.4 6.1s6.4-2.7 6.4-6.1c0-2.4-2.1-3.4-2.1-4.2s.9-1.7.9-3c0-2.3-2.2-4.2-5.2-4.2z"/><path d="M16 10.5V3.5"/><circle class="a" cx="16" cy="2.6" r="1.5"/><path d="M13.6 17v4.2M18.4 17v4.2" stroke-width="1.4"/></g><path d="M4.5 28L28 7.5" stroke-width="1.5"/><path d="M5.6 29.2L29 8.8" stroke-width=".8" stroke-opacity=".55"/>`,
  viola: `<g transform="translate(15.5 16.5) rotate(-28) scale(.9) translate(-16 -19)"><path class="a" d="M16 10.5c-3 0-5.2 1.9-5.2 4.2 0 1.3.9 2.2.9 3s-2.1 1.8-2.1 4.2c0 3.4 2.9 6.1 6.4 6.1s6.4-2.7 6.4-6.1c0-2.4-2.1-3.4-2.1-4.2s.9-1.7.9-3c0-2.3-2.2-4.2-5.2-4.2z"/><path d="M16 10.5V3.5"/><circle class="a" cx="16" cy="2.6" r="1.5"/><path d="M13.6 17v4.2M18.4 17v4.2" stroke-width="1.4"/></g><path d="M3.5 26L29 10" stroke-width="1.5"/><path d="M4.4 27.4L29.8 11.4" stroke-width=".8" stroke-opacity=".55"/>`,
  cello: `<g transform="translate(16 16.5) scale(.95) translate(-16 -16.5)"><path class="f" d="M16 10.5c-3 0-5.2 1.9-5.2 4.2 0 1.3.9 2.2.9 3s-2.1 1.8-2.1 4.2c0 3.4 2.9 6.1 6.4 6.1s6.4-2.7 6.4-6.1c0-2.4-2.1-3.4-2.1-4.2s.9-1.7.9-3c0-2.3-2.2-4.2-5.2-4.2z"/><path d="M16 10.5V3.5"/><circle class="a" cx="16" cy="2.6" r="1.5"/><path d="M13.6 17v4.2M18.4 17v4.2" stroke-width="1.4"/><path d="M16 28.2v2.4"/></g><path d="M2.5 22.5L29.5 16.5" stroke-width="1.5"/><path d="M2.8 24L29.8 18" stroke-width=".8" stroke-opacity=".55"/>`,
  strings: `<g transform="translate(11 17) rotate(-28) scale(.66) translate(-16 -19)"><path class="f" d="M16 10.5c-3 0-5.2 1.9-5.2 4.2 0 1.3.9 2.2.9 3s-2.1 1.8-2.1 4.2c0 3.4 2.9 6.1 6.4 6.1s6.4-2.7 6.4-6.1c0-2.4-2.1-3.4-2.1-4.2s.9-1.7.9-3c0-2.3-2.2-4.2-5.2-4.2z"/><path d="M16 10.5V3.5"/><circle class="a" cx="16" cy="2.6" r="1.5"/><path d="M13.6 17v4.2M18.4 17v4.2" stroke-width="1.4"/></g><g transform="translate(20.5 15) rotate(-28) scale(.66) translate(-16 -19)"><path class="a" d="M16 10.5c-3 0-5.2 1.9-5.2 4.2 0 1.3.9 2.2.9 3s-2.1 1.8-2.1 4.2c0 3.4 2.9 6.1 6.4 6.1s6.4-2.7 6.4-6.1c0-2.4-2.1-3.4-2.1-4.2s.9-1.7.9-3c0-2.3-2.2-4.2-5.2-4.2z"/><path d="M16 10.5V3.5"/><circle class="a" cx="16" cy="2.6" r="1.5"/><path d="M13.6 17v4.2M18.4 17v4.2" stroke-width="1.4"/></g><path d="M3 28.5L29 12" stroke-width="1.5"/>`,
  // woodwinds
  sax: `<path class="f" d="M10.5 6.5h4v14.5a3.5 3.5 0 007 0v-3.5l-2-3.5h8l-2 3.5v3.5a7.5 7.5 0 01-15 0z"/><path d="M12.5 6.5c0-2-1.5-3-4-3.5"/>
    <path d="M19.5 14h8" stroke="var(--ic)" stroke-width="2.4"/><circle class="k" cx="12.5" cy="10.5" r="1" stroke="none"/><circle class="k" cx="12.5" cy="13.8" r="1" stroke="none"/><circle class="k" cx="12.5" cy="17.1" r="1" stroke="none"/>`,
  clarinet: `<path class="k" d="M14.6 1.6h2.8l-.3 3.2h-2.2z" stroke="none"/><rect class="f" x="13.4" y="4.8" width="5.2" height="19.5" rx="1.6"/><path class="f" d="M13.4 24.3h5.2l2.6 5H10.8z"/>
    <path d="M13.4 7.6h5.2M13.4 21.6h5.2" stroke="var(--ic)" stroke-width="1.8"/><circle class="k" cx="16" cy="10.5" r="1" stroke="none"/><circle class="k" cx="16" cy="14" r="1" stroke="none"/><circle class="k" cx="16" cy="17.5" r="1" stroke="none"/>`,
  oboe: `<path d="M16 1.3v4" stroke-width="1.3"/><path class="f" d="M14.7 5.3h2.6l1.3 19h-5.2z"/><path class="f" d="M13.4 24.3h5.2l1.2 4.2h-7.6z"/>
    <path d="M14.5 8h3M13.6 22.4h4.8" stroke="var(--ic)" stroke-width="1.8"/><circle class="k" cx="16" cy="11.5" r=".9" stroke="none"/><circle class="k" cx="16" cy="15" r=".9" stroke="none"/><circle class="k" cx="16" cy="18.5" r=".9" stroke="none"/>`,
  bassoon: `<rect class="f" x="15" y="4.2" width="7.5" height="24.5" rx="2.6"/><rect class="a" x="15.5" y="2.2" width="6.5" height="2.6" rx="1"/><path d="M15 10.5c-3.2 0-5.4-1.6-6.8-5.2l-1.7-1" stroke-width="1.7"/>
    <circle class="k" cx="18.75" cy="13.5" r="1" stroke="none"/><circle class="k" cx="18.75" cy="17" r="1" stroke="none"/><circle class="k" cx="18.75" cy="20.5" r="1" stroke="none"/><circle class="k" cx="18.75" cy="24" r="1" stroke="none"/>`,
  // brass
  trumpet: `<path class="f" d="M20.5 11.5L29 6.5v19l-8.5-5z"/><rect class="f" x="4" y="12.6" width="17" height="6" rx="2.2"/><path d="M9 12.6V8.6M12.6 12.6V8.6M16.2 12.6V8.6" stroke-width="2"/>
    <path d="M7.9 7.8h2.2M11.5 7.8h2.2M15.1 7.8h2.2" stroke="var(--ic)" stroke-width="2.6"/><path d="M4 15.6H1.5"/><path d="M7.5 18.6v2.6c0 1.4 1 2.3 2.4 2.3h8.6"/>`,
  trombone: `<path class="f" d="M2.5 4.5l8 4v5.5l-8 4z"/><path d="M10.5 11.2h13.2a2.6 2.6 0 010 5.2H12.5v4.4"/><path d="M8 20.8h21.5v4.4H8"/><path d="M14 18.6v8.8" stroke="var(--ic)" stroke-width="2.4"/>`,
  'french-horn': `<circle class="f" cx="13.5" cy="15.5" r="9.5"/><circle cx="13.5" cy="15.5" r="5.5"/><circle class="a" cx="13.5" cy="15.5" r="2.2"/><path d="M13.5 10V5.5L10 2.8"/><path class="f" d="M20.5 21.5l9 1-2 7.2-9-4.7z"/>`,
  tuba: `<path class="f" d="M9 3.5h14l-2.5 5.5v12.5a5 5 0 01-5 5h-.5a5 5 0 01-5-5V9z"/><ellipse class="a" cx="16" cy="3.8" rx="7" ry="1.4"/><path d="M20.5 13h4.5v8h-4.5"/><path d="M22.2 13v-2.8M24 13v-2.8" stroke-width="1.8"/><path d="M11.5 18c-3 0-5 2-5 4.5"/>`,
};
const DRUM_SVG = {
  kick: `<circle class="f" cx="12" cy="11" r="8"/><circle class="a" cx="12" cy="11" r="3"/><path d="M7 18.5l-1.5 3M17 18.5l1.5 3"/>`,
  snare: `<path class="f" d="M4 11v5c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-5"/><ellipse class="f" cx="12" cy="11" rx="8" ry="2.5"/>
    <path d="M6.5 14.5l1.8 1.8 1.8-1.8 1.8 1.8 1.8-1.8 1.8 1.8 1.8-1.8" stroke-width="1.1"/><path class="a" d="M3.5 3l6.5 6M20.5 3L14 9" stroke-width="2"/>`,
  clap: `<ellipse class="f" cx="9.3" cy="14.5" rx="3.8" ry="6.5" transform="rotate(-18 9.3 14.5)"/><ellipse class="f" cx="14.7" cy="14.5" rx="3.8" ry="6.5" transform="rotate(18 14.7 14.5)"/>
    <path d="M7.6 10.4l1.1 3.4M10 9.6l.7 3.6M16.4 10.4l-1.1 3.4M14 9.6l-.7 3.6" stroke-width="1.1"/>
    <path class="a" d="M12 2.5v3M7 4l1.6 2.2M17 4l-1.6 2.2" stroke-width="1.8"/>`,
  chat: `<ellipse class="a" cx="12" cy="8.6" rx="8.5" ry="1.8"/><ellipse class="f" cx="12" cy="11" rx="8.5" ry="1.8"/><path d="M12 6.8V3.5M12 12.8V21M9 21h6"/>`,
  ohat: `<ellipse class="a" cx="12" cy="6.5" rx="8.5" ry="1.8"/><ellipse class="f" cx="12" cy="12" rx="8.5" ry="1.8"/><path d="M12 8.3v1.9M12 13.8V21M9 21h6"/><path d="M1.8 2.8l1.6 1.2M22.2 2.8l-1.6 1.2" stroke-width="1.4"/>`,
  tom: `<path class="f" d="M4.5 10v5.5c0 1.5 3.4 2.7 7.5 2.7s7.5-1.2 7.5-2.7V10"/><ellipse class="f" cx="12" cy="10" rx="7.5" ry="2.5"/><path d="M12 18.2v3.3"/><path class="a" d="M16 2.5l-3.8 5.5" stroke-width="2"/>`,
  rim: `<path class="f" d="M3 13v4c0 1.7 3.8 3 8.5 3s8.5-1.3 8.5-3v-4"/><ellipse class="f" cx="11.5" cy="13" rx="8.5" ry="3"/><path class="a" d="M5 11.6L22.5 5.5" stroke-width="2.2"/><path d="M2.5 8.5l1.2 1.3M5.5 6.8l.4 1.6" stroke-width="1.3"/>`,
  perc: `<ellipse class="f" cx="12" cy="12.5" rx="5" ry="7.2" transform="rotate(28 12 12.5)"/><path class="a" d="M7.8 11.2l8.2 3.6" stroke-width="2"/><path d="M3.2 6.5c-.9 1.6-.9 3.2 0 4.8M20.8 13.5c.9 1.6.9 3.2 0 4.8" stroke-width="1.4"/>`,
};
const INST_DESC = {
  classic: 'A real acoustic drum kit', boom: 'Huge booming 808 kick', lofi: 'Real drums, slowed down and dusty',
  'deep-bass': 'A real bass guitar, warm and round', 'sub-808': 'Rumbling sub bass for trap and hip-hop', 'pluck-bass': 'A plucked double bass, jazzy and bouncy',
  piano: 'A classic acoustic grand piano', 'soft-keys': 'Gentle electric piano', organ: 'A real pipe organ, church and gospel', 'warm-pad': 'Soft, dreamy background chords',
  'bright-pluck': 'A real concert harp, sparkly and gentle', 'retro-lead': 'Video-game style beeps', 'music-box': 'Tiny tinkling bells (a real glockenspiel)', flute: 'A real concert flute, airy and soft',
  violin: 'A real solo violin, bright and singing', viola: 'A section of violas, warm and rich', cello: 'A section of cellos, deep and emotional', strings: 'A whole violin section, big movie strings',
  sax: 'A real saxophone, smooth and jazzy', clarinet: 'A real clarinet, round and woody', oboe: 'A real oboe, sweet and reedy', bassoon: 'A real bassoon, low and playful',
  trumpet: 'A real trumpet, bold and bright', trombone: 'A real trombone, big and brassy', 'french-horn': 'A real French horn, heroic and warm', tuba: 'A real tuba, the deepest brass',
};
const FAMILY_COLOR = { 'Drum kit': 't1', Bass: 't2', Keys: 't3', Pad: 't6', Lead: 't4', Strings: 't5', Woodwinds: 't7', Brass: 't8' };
const instFamily = key => KITS[key] ? 'Drum kit' : (SYNTHS[key] || {}).cat || 'Lead';
function svgIcon(body, view, size, family, label) {
  return `<svg class="ii" viewBox="0 0 ${view} ${view}" width="${size}" height="${size}" style="--ic:var(--${FAMILY_COLOR[family] || 't3'})" fill="none" stroke="currentColor"
    stroke-width="${view === 32 ? 1.7 : 1.5}" stroke-linecap="round" stroke-linejoin="round" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${body}</svg>`;
}
const instIcon = (key, size = 24) => svgIcon(INST_SVG[key] || INST_SVG['soft-keys'], 32, size, instFamily(key));
const drumIcon = (row, size = 20) => svgIcon(DRUM_SVG[row] || DRUM_SVG.kick, 24, size, 'Drum kit');
