/* R19 LABEL: every word the wall's invite, key, title slate, credits and statement say, in one place. no DOM and no imports, so a
   test can load it in node. exhibit.html?wall=1 only (wallcard.js imports it). strings are the wall's own voice: lowercase i, and
   Spotify and Suno capitalized (D8 option A, the digest's default; brand: 'lower' writes them the way the exhibit's labels do).
   every owner decision from the R19 digest is one flag away below; nothing here picks a side the owner has not picked. */

/* the owner's calls (DIGEST section 4). the defaults are the "build-for" column. */
export const FLAGS = {
  statement: 'bolder',   /* D5: 'bolder' | 'science' | 'plain' */
  medium: 'suno',        /* D6: 'suno' (made on suno in the medium line) | 'tracks' ("22 original tracks" only) | 'colophon' (the colophon's own words) */
  debt: false,
  brand: 'proper',       /* D8: 'proper' capitalizes Spotify and Suno (the digest's default, as in the colophon, researcher page and lab) | 'lower' writes them lowercase, as the exhibit's labels do */
  runningTime: false,    /* D9: the tombstone's dimensions line carries no running time */
  epigraph: null,        /* D10: none. the owner supplies a line if she wants one; no lane drafts a lyric, so this stays null */
  contact: true,         /* D14: the lab contact line in the credits */
  qrTarget: 'ninety',    /* D16: 'ninety' (the ninety-second cut, sound off) | 'landing' (the landing page) */
  handBackLine: true,    /* the "it takes it back when you go" invite: true once KIOSK_TOUR's K1 (hand-back counts from the last touch) is merged; false before */
  keyWhenOff: false,     /* attract=off hides the invite, the slate and the key; true keeps the key up with the other two gone */
};

/* the paused-by-hand toast is KIOSK_TOUR's (COPY.chrome.toasts.tourPausedKiosk, shown by chrome.js under the wall); this file adds no second one */

export const TIMING = {
  slateMs: 14000,     /* how long the title slate stays when nobody touches it */
  slateFadeMs: 900,
  inviteFadeMs: 450,
  handHideMs: 300,    /* the invite is gone this long after the first trusted pointerdown (the gate asks for 500) */
};

/* the invite, per sound state, longest first. the wall picks the longest one that fits the free band it found, so a narrow
   room never shortens the line for a wide one. 'locked' and 'dozed' say what a touch does to the sound; 'on' and 'off' do not
   promise a sound that is already playing or switched off. none of these is a caption: they sit alone on a pill. */
export const INVITE = {
  locked: [
    'the machine has the needle. take it, and the sound starts.',
    'take the needle. the sound starts when you do.',
    'take the needle.',
  ],
  dozed: [
    'the machine has the needle. take it, and the sound comes back.',
    'take the needle. the sound comes back when you do.',
    'take the needle back.',
  ],
  on: [
    'the machine has the needle. take it. it takes it back when you go.',
    'the machine has the needle. your hand can take it.',
    'the machine has the needle. take it.',
    'take the needle.',
  ],
  off: [
    'the machine has the needle. take it. it takes it back when you go.',
    'the machine has the needle. your hand can take it.',
    'the machine has the needle. take it.',
    'take the needle.',
  ],
};
/* the options STATEMENT wrote that the lists above do not lead with, for the owner to swap in */
export const INVITE_ALT = {
  long: 'it plays itself, the way most of my log did. put a hand on it.',
  afterFix: 'the machine has the needle. take it. it takes it back when you go.',
};

/* the color key, left to right. PAL names: tap = mint, shuffle = amber, violet = the machine served it, rose = killed or
   withdrawn, ice = the interface. wallcard.js paints the swatches from ctx.PAL; nothing here is a color. */
export const KEY = {
  full: [['tap', 'i tapped'], ['shuffle', 'shuffle picked'], ['violet', 'the queue served'], ['rose', 'killed or withdrawn'], ['ice', 'the interface']],
  compact: [['tap', 'i tapped'], ['shuffle', 'shuffle'], ['violet', 'queue'], ['rose', 'killed'], ['ice', 'interface']],
  genre: 'in the universe, color is genre.',
  label: 'color key',
};

export const SIGNATURE = 'mostly the machine · astralcrest';

export const QR = {
  ninety: {
    url: 'https://astralcrest.github.io/sonicManifold/exhibit.html?enter=quiet#tour=ninety&stop=1',
    caption: 'the ninety-second cut, on your phone. it opens with the sound off.',
    captionAlt: 'take it with you: the ninety-second cut. sound off until you turn it on.',
    typed: 'astralcrest.github.io/sonicManifold',
  },
  landing: {
    url: 'https://astralcrest.github.io/sonicManifold/',
    caption: 'the whole piece, on your phone.',
    captionAlt: 'take it with you.',
    typed: 'astralcrest.github.io/sonicManifold',
  },
  label: 'qr code',
  units: 9.2,   /* the code may take at most this many percent of the sheet's width (STATEMENT: it scans from about ten times its width; raise it for a longer reach) */
};

export const SLATE = {
  kicker: 'a sonic manifold exhibit · n = 1',
  title: 'mostly the machine',
  by: 'astralcrest · 2026',
  thesis: "i didn't press play on most of my music.",
  splitHead: 'of every 100 plays, one mark each',
  split: [['19', 'tap', '°', 'i tapped'], ['17', 'shuffle', '×', 'shuffle picked'], ['64', 'violet', '≡', 'the queue served']],
  keyRose: 'rose: a finding of mine that died',
  keyIce: 'ice blue is just the interface',
  keyUniverse: 'in the universe, color is genre',
};

export const TOMBSTONE = {
  artist: 'astralcrest',
  title: 'mostly the machine',
  year: '2026',
  medium: {
    suno: 'a browser piece · my whole spotify log, 97,427 plays · one recommender · web audio · 22 original tracks, made on suno',
    tracks: 'a browser piece · my whole spotify log, 97,427 plays · one recommender · web audio · 22 original tracks',
    colophon: 'a browser piece: my whole spotify log, 97,427 plays, one particle field, web audio. the music under the stops is mine: songs i made.',
  },
  dimensions: 'dimensions variable',
  dimensionsTimed: 'dimensions variable · the long play loops in about five minutes',
  credit: 'courtesy of the artist',
};

/* the three statements the STATEMENT lane wrote, verbatim apart from brand case */
export const KILL_LINE = 'eighteen claims withdrawn. sixteen are graves you can visit. 0 of 11 new candidates survived unqualified.';
export const STATEMENT = {
  plain: "my log holds 97,427 plays, september 2019 to may 2026. every dot here is one play. i assumed the log was a record of me. spotify's export records who started every play. i started 19 of every 100 (11.5 by the strictest reading). shuffle started 17. the queue running on started 64. so anything that learns my taste from this log learns the app's, too. i tried to kill my own findings. " + KILL_LINE + " what's left: when i choose the next song myself, i cross genre families slightly more often than the queue does. a direction, not a size. all the music here is mine.",
  bolder: "i didn't press play on most of my music. my log holds 97,427 plays, september 2019 to may 2026, and spotify's export records who started every one. i started 19 of every 100 by hand (11.5 by the strictest reading). shuffle started 17, and the queue running on started 64. so anything that learns my taste from it learns the app's, too. on this wall, mint is my hand and violet is the machine. it's mostly violet. i tried to kill what i found. " + KILL_LINE + " the piece plays itself, the way my log did. a hand can take it.",
  science: "a play in a streaming log has two authors, me and the recommender. spotify's export records who started every play. split on that one field, my 97,427 plays, september 2019 to may 2026, read 19 in every 100 i tapped (11.5 by the strictest reading), 17 shuffle picked, 64 the queue served. my first reading, 1.61, is withdrawn: the algorithm helped draw its map. with no map, my strict picks cross genre families more often than the queue does, 69.9% against 66.3%: bridge index 1.05 [1.03, 1.08], a direction, not a size. " + KILL_LINE + " pre-declared kill conditions were written before the results; post-hoc steps are labeled.",
};

export const HONESTY = {
  ledger: 'every finding on the site has a ledger row: the claim, the script, the data, the result.',
  n1: 'n = 1. one listener is one listener.',
};

/* the credits the printed card carries. "listening posts" has one variant per posts mode: under posts=qr nothing loads from
   spotify, so the original sentence (which says it asks once) would be false there. posts=off has no such row. */
export const CREDITS = {
  heads: { music: 'music', posts: 'listening posts', debt: 'a debt', report: 'the report', privacy: 'privacy', contact: 'contact' },
  music: { suno: '22 original tracks, made on suno. all the music here is mine.', tracks: '22 original tracks. all the music here is mine.', colophon: 'the music under the stops is mine: songs i made.' },
  posts: {
    spotify: "spotify's own player. it asks once; nothing loads from spotify until you say yes.",
    qr: 'a code, not a player. scan it to hear the song on your own phone. nothing reaches spotify from this screen.',
  },
  debt: '',
  report: 'Streaming Logs Are Not Preference Logs: A Single-Subject Provenance Audit of the Human–Recommender Loop.',
  privacy: 'astralcrest is a pseudonym. no device, place or exact timestamp leaves the export.',
  contact: 'questions or a dataset of your own · astralcrestlab@proton.me',
};

/* ---------------------------------------------------------------- helpers (pure) */
const cap = (s) => s.replace(/\bspotify\b/g, 'Spotify').replace(/\bsuno\b/g, 'Suno');
export const brandCase = (s, mode) => ((mode || FLAGS.brand) === 'proper' ? cap(String(s)) : String(s));
/* the printed card always capitalizes; the wall screen follows FLAGS.brand */
export const printCase = (s) => cap(String(s));

const F = (o) => Object.assign({}, FLAGS, o || {});
const B = (s, f) => brandCase(s, f.brand);

export function inviteVariants(state, o) {
  const f = F(o);
  const list = INVITE[state] || INVITE.on;
  if ((state === 'on' || state === 'off') && !f.handBackLine) return list.filter((s) => s !== INVITE_ALT.afterFix);
  return list.slice();
}
export function keySet(compact) { return (compact ? KEY.compact : KEY.full).map(([k, t]) => [k, t]); }
export function qrFor(o) { const f = F(o); return QR[f.qrTarget] || QR.ninety; }
export function mediumLine(o) { const f = F(o); return B(TOMBSTONE.medium[f.medium] || TOMBSTONE.medium.suno, f); }
export function dimensionsLine(o) { const f = F(o); return f.runningTime ? TOMBSTONE.dimensionsTimed : TOMBSTONE.dimensions; }
/* "every dot here is one play" holds only while every play is drawn (plays=all); with plays=half|third|quarter the sentence goes */
const EVERY_DOT = ' every dot here is one play.';
export function statement(o) {
  const f = F(o);
  let s = B(STATEMENT[f.statement] || STATEMENT.bolder, f);
  if (f.plays && f.plays !== 'all') s = s.replace(EVERY_DOT, '');
  return s;
}
export function creditRows(posts, o) {
  const f = F(o), H = CREDITS.heads, rows = [];
  rows.push([H.music, B(CREDITS.music[f.medium] || CREDITS.music.suno, f)]);
  if (posts === 'qr' || posts === 'spotify') rows.push([H.posts, B(CREDITS.posts[posts], f)]);
  if (f.debt) rows.push([H.debt, CREDITS.debt]);
  rows.push([H.report, CREDITS.report]);
  rows.push([H.privacy, CREDITS.privacy]);
  if (f.contact) rows.push([H.contact, CREDITS.contact]);
  return rows;
}

/* every visible string, for both options of every owner decision and every sound and posts state. kind: 'line' (a caption-class
   string, at most 90 characters), 'body' (a statement, a credit or a note: sentences) or 'name' (a title, a heading, a label).
   the copy gate in R19/LABEL/r19_wall_label.mjs walks this, so a string that is not reachable from here is not shipped. */
export function all() {
  const out = [], add = (id, text, kind) => { if (text != null && text !== '') out.push({ id, text: String(text), kind }); };
  Object.keys(INVITE).forEach((s) => INVITE[s].forEach((t, i) => add('invite.' + s + '.' + i, t, 'line')));
  Object.keys(INVITE_ALT).forEach((k) => add('invite.alt.' + k, INVITE_ALT[k], 'line'));
  ['full', 'compact'].forEach((g) => KEY[g].forEach(([k, t]) => add('key.' + g + '.' + k, t, 'name')));
  add('key.genre', KEY.genre, 'line'); add('key.label', KEY.label, 'name');
  add('signature', SIGNATURE, 'name');
  Object.keys(QR).forEach((k) => { if (k === 'units') return; if (k === 'label') { add('qr.label', QR.label, 'name'); return; } add('qr.' + k + '.caption', QR[k].caption, 'line'); add('qr.' + k + '.captionAlt', QR[k].captionAlt, 'line'); });
  ['kicker', 'title', 'by', 'thesis', 'splitHead', 'keyRose', 'keyIce', 'keyUniverse'].forEach((k) => add('slate.' + k, SLATE[k], k === 'thesis' || k === 'splitHead' || k.indexOf('key') === 0 ? 'line' : 'name'));
  SLATE.split.forEach(([n, , g, t], i) => { add('slate.split.' + i + '.n', n, 'name'); add('slate.split.' + i + '.t', t, 'name'); add('slate.split.' + i + '.g', g, 'name'); });
  ['artist', 'title', 'year', 'dimensions', 'dimensionsTimed', 'credit'].forEach((k) => add('tomb.' + k, TOMBSTONE[k], 'name'));
  Object.keys(TOMBSTONE.medium).forEach((k) => add('tomb.medium.' + k, TOMBSTONE.medium[k], 'body'));
  Object.keys(STATEMENT).forEach((k) => add('statement.' + k, STATEMENT[k], 'body'));
  Object.keys(HONESTY).forEach((k) => add('honesty.' + k, HONESTY[k], 'line'));
  Object.keys(CREDITS.heads).forEach((k) => add('credits.head.' + k, CREDITS.heads[k], 'name'));
  Object.keys(CREDITS.music).forEach((k) => add('credits.music.' + k, CREDITS.music[k], 'body'));
  Object.keys(CREDITS.posts).forEach((k) => add('credits.posts.' + k, CREDITS.posts[k], 'body'));
  ['debt', 'report', 'privacy', 'contact'].forEach((k) => add('credits.' + k, CREDITS[k], 'body'));
  return out;
}
