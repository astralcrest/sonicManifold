import re
"""editions data pack: one honest window.SM for every edition. python3 editions/build_pack.py"""
import json, re, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
J = lambda p: json.load(open(R + p))
hall = J('editions/data/hall.json')
tracks = J('exhibit/data/tracks.json')['tracks']
meta = J('audio/bed_meta.json')
genre = J('front/data/genre.json'); pairs = J('front/data/pairs.json'); hear = J('front/data/hear.json')
grave = J('front/data/graveyard.json'); clock = J('exhibit/data/clock.json'); bail = J('exhibit/data/bail.json')
# editions copy: no "N-year" phrasing and no split years beyond the two dates the site discloses
_gsub = [('The 4-year reign', 'The long reign'), ('the 4-year reign', 'the long reign'), ('a 4-year reign', 'a long reign'),('train ≤2024, test ≥2025', 'train on the earlier years, test on the later')]
for g in grave['graves']:
  for k, v in list(g.items()):
    if isinstance(v, str):
      for a, b in _gsub: v = v.replace(a, b)
      g[k] = v

_gsub2 = [('narrowed 2026-07-19', 'narrowed later'), ('first logged 2023-08, plus a device flip', 'a new back-button code entered the log, plus a change in how starts were recorded'),
  ('device-standardized', 'standardized for the logging change'), ('entered the vocabulary in 2023, and the device mix flipped', 'entered the log, and the way starts were recorded changed'),
  ('2023-10 era boundary', 'the october 2023 logging change'), ('4 straight years', 'year after year'), ('skin-temp', 'a body signal'), ('skin temp', 'a body signal')]
for g in grave['graves']:
  for k, v in list(g.items()):
    if isinstance(v, str):
      for a, b in _gsub2: v = v.replace(a, b)
      v = re.sub(r'\b20(19|2[0-6])-[01]\d(-[0-3]\d)?\b', 'later', v)
      v = re.sub(r'\bdevice\b', 'logging', v)
      g[k] = v
arr = J('exhibit/data/arrivals.json'); nodes = J('exhibit/data/universe_nodes.json')
old = re.search(r'window\.SM\s*=\s*(\{.*\})\s*;?\s*$', open(R + '.playwright-mcp/atlas/R22/DESIGNS/data.js').read(), re.S)
old = json.loads(old.group(1)) if old else {}
fam = hall['families']
artists = [{'n': a['n'], 'f': fam[a['f']], 'p': a['p'], 't': a['t'], 's': a['s'], 'v': a['v'], 'xyz': a['xyz']} for a in hall['artists']]
top = sorted(artists, key=lambda a: -a['p'])[:80]
months = hall['months']
defs = dict(old.get('defs') or {})
defs['tapped'] = 'a play i started by hand: track row, play button, remote, skip forward or back'
defs['strict'] = 'play button, track row or remote; back and skip presses left out'
SM = {
  'v': 2, 'built': '2026-10',
  'total': hall['total'], 'pct': hall['pct'], 'strict': 11.5, 'all': 19, 'chosen_for_me': 81,
  'headline': 'i pressed play on 19 of every 100 plays. the strictest count says 11.5. shuffle picked 17. the queue served 64.',
  'direction': {'bi': 1.05, 'lo': 1.03, 'hi': 1.08, 'words': 'a direction, not a size', 'tap': 69.9, 'queue': 66.3, 'copy': 'when i press play, the next track crosses to another genre family a little more often: 69.9 vs 66.3 of 100. 1.05 [1.03, 1.08], a direction, not a size.', 'short': 'the next track crosses to another genre family a little more often when i press play: 69.9 vs 66.3 of 100'},
  'defs': defs, 'families': fam, 'copy': {'artists': '6,277 named artists (the whole log holds 6,288)', 'genre_arms': 'the i tapped arm is the strict count (n 11,547); the queue arm is served only (n 61,963)', 'clock_note': 'a share, not a volume: the 3 am share rests on 110 plays; tap volume peaks at noon', 'left_out': '7.6 of the 19 were my back and skip presses'},
  'genre_anchor': {'over_served': {'family': 'ambient/lofi', 'strict': 0.636, 'lo': 0.569, 'hi': 0.710}, 'chosen': {'family': 'hip-hop · r&b', 'strict': 1.22, 'lo': None, 'hi': None, 'caveat': 'the less firm of the two: counted per track, not per play, hip-hop reads below 1'}},
  'top': top, 'hall': {'artists': artists, 'placed': hall['placed'], 'placed_plays': hall['placed_plays'], 'sessions': hall.get('sessions')},
  'months': months, 'nodes': old.get('nodes'), 'edges_sample': old.get('edges_sample'),
  'soundtrack': [{'f': t['f'], 't': t['t'].lower(), 'k': t['k'], 'bpm': t['bpm'], 'src': 'audio/bed/' + t['f'] + '.mp3', 'dur': meta.get(t['f'] + '.mp3', {}).get('dur'), 'b0': meta.get(t['f'] + '.mp3', {}).get('b0')} for t in tracks],
  'genre': genre, 'pairs': pairs, 'hear': hear, 'graveyard': grave['graves'], 'clock': clock, 'bail': bail,
  'arrivals': {'n': arr['n'], 'arm_order': arr['arm_order'], 'counts': arr['counts'], 'pb_edges': arr['pb_edges']},
  'era_note': 'october 2023: the app changed how it records a start',
  'span': '2019 to 2026',
}

# R23 science (2026-10-19): seven pre-declared tests, refereed; public.json copies live in editions/data/r23/
R23 = [
  ('entrain', 'does my cadence lock to the music while i walk?', 'null', 'i found no sign that my steps lock to the tempo of the track playing (a lock in fewer than about 1 in 20 intervals could hide here).', ['20.1% of walking minutes within 4% of a beat harmonic vs 18.8% by chance', '+1.3 points [-2.0, +4.8], MDE 4.9', 'n 1,127 walking intervals, 271 tracks, 372 days'], 'no step-to-beat lock above 5 points: 20.1% vs 18.8% by chance'),
  ('loudness', 'the ear\'s thermostat', 'killed', 'i can\'t find the room, the song, or how a track arrived in my headphone level once i control for the year; the big shuffle gap was a change of era, not a habit.', ['shuffle minus served -3.75 dB raw, then -0.30 dB [-1.19, +0.66] with a year control', 'tap minus served +0.62 dB raw, then +0.47 dB [-0.02, +0.98] with a year control', 'room to headphone level: partial rho -0.03 [-0.10, +0.09], MDE 0.14'], 'headphone output level by hour and arm; no arm or room effect survives a year control.'),
  ('hands', 'does moving make me passive?', 'reversed', 'within a day, my moving minutes are more shuffle and a bit more tapping, not less (tap +3 to +8 points depending on the step sensor).', ['shuffle share +14.6 points [6.8, 21.6] in 400-plus-step minutes vs still minutes', 'tap share +6.2 points [3.3, 10.4] all sensors; +3.3 [0.8, 5.4] on the Watch alone', 'part of the extra tapping is forward skips; the dose is not monotone'], 'within a day, moving minutes are more shuffle and a bit more tapping, not less'),
  ('wake', 'minutes from waking to the first song', 'descriptive', 'my first full song comes about an hour after the ring says i woke (median 66 min), later on weekends by 42 min, and how well i slept shows no detectable link.', ['median 66 min, IQR 29 to 155 (648 waking days with a play)', 'weekend minus weekday +42 min [17, 64]', 'readiness vs latency -0.06 [-0.15, +0.03], MDE 0.13; sleep score -0.03 [-0.13, +0.05]'], 'median 66 min from waking to the first song; later on weekends, unmoved by sleep scores'),
  ('clocks', 'the listening clock and the sleep clock', 'killed', 'my listening clock moves with my sleep clock, but so does my step clock: once the step clock is held fixed, the music adds nothing i can detect.', ['listening vs sleep clock r 0.83 over 24 months, really 12 year-over-year pairs [0.27, 0.97]', 'with the step clock held fixed: partial r 0.49, p 0.11, MDE 0.76', 'served plays sit 19 min later only because autoplay follows the tap that opened the session'], 'listening, sleep and step clocks drift together; music adds nothing beyond that'),
  ('bodystate', 'does morning physiology predict the shape of the day\'s listening?', 'null', 'i found no sign that how my body felt in the morning changes how i listen that day: every interval stays inside plus or minus 0.2, and the estimates are all under 0.1.', ['8 cells (readiness, overnight rest HR x skip, repeat, tap, novelty), about 490 days: 0 survive', 'largest estimate rho 0.08 [0.00, 0.16]; MDE 0.15 to 0.21', 'a daytime Apple resting-HR correlate of skipping (rho 0.18, then 0.13 with activity) is one signal, partly an active day'], 'no link of 0.2 or more between morning body state and what i skip, repeat, tap or try'),
  ('stressmin', 'what plays in a stressed minute', 'null', 'i found no sign that what plays follows my stress state: when music is on, tapped share, tempo and loudness look the same in stress and recovery minutes.', ['tap share recovery minus stress +0.012 [-0.024, +0.048], MDE 0.050 (7,408 five-minute intervals)', 'tempo +0.02 SD [-0.13, +0.15]; loudness +0.03 SD [-0.21, +0.19]', 'music-on share before a stress-to-recovery flip -0.009 [-0.026, +0.010], MDE 0.026'], 'when music is on, tap share, tempo and loudness look the same in stress and recovery'),
]
SM['r23'] = {
  'title': 'seven more tests, from scratch',
  'frame': 'seven pre-declared tests over my music, my watch and my ring, each refereed. most died or came back null with a stated smallest detectable effect. nothing here says music changes the body. a clean null with its blind spot is a finding.',
  'tiers': {'null': 'null, with the smallest effect it could have seen', 'killed': 'killed', 'reversed': 'killed and reversed', 'descriptive': 'descriptive, survives with caveats'},
  'lanes': [{'id': i, 'q': q, 'tier': t, 'sentence': s_, 'numbers': n, 'caption': c, 'data': json.load(open(R + 'editions/data/r23/' + i + '.json'))} for (i, q, t, s_, n, c) in R23],
}

# R25 log lanes (2026-10-20): five pre-declared, log-only; public copies in editions/data/r25/; REPORT in out/r25
R25 = [
  ('intro', 'who introduced us', 'descriptive', 'the artists i went looking for stayed: 55 of 100 were still with me a year after our first play; of the ones the queue brought in, 38 of 100. a sign of what i already knew, not a verdict on the queue.', ['365-day survival 0.55 (my tap) vs 0.38 (the queue) vs 0.37 (shuffle)', '+0.17 [+0.11, +0.24], MDE 0.10, 3,795 artists with two plays or more', 'median life 317 days (my tap) vs 106 (the queue)'], 'the artists i reached for first stayed a year; the queue\'s, less often'),
  ('predict', 'whose next song is easier to guess', 'descriptive', 'the queue\'s next artist is easier to guess than mine: 2.6 bits of surprise against 3.2 for my hand (2.9 by the strictest count). that is what a queue is; it does not say the app knows me.', ['conditional entropy of the next artist: served 2.61 bits, shuffle 3.30, my tap 3.23, strict 2.86', 'tap minus served +0.63 bits [+0.41, +0.67]; strict minus served +0.25 [+0.02, +0.31], MDE 0.21', 'the queue repeats the artist 24 times in 100; my strict tap, 19'], 'the queue\'s next artist is easier to guess than mine'),
  ('xent', 'how far the queue sits from my hand, by year', 'descriptive', 'since 2022, between a fifth and a third of the queue\'s plays each year went to artists i never once pressed play on that year. a curve, not a test.', ['served plays on never-tapped artists: 19, 22, 35, 24, 19 of 100 (2022 to 2026)', 'distance between my strict taps and the queue (jensen-shannon, 0 to 1): 0.45, 0.48, 0.57, 0.49, 0.48', 'october 2023: the app changed how it records a start'], 'a fifth to a third of the queue each year never got a press from me'),
  ('lag', 'does the queue follow last year\'s hand', 'descriptive', 'the queue follows my hand within the year, not the year before: every year it sits far closer to that year\'s taps than to the previous year\'s. no lag i can see.', ['distance to this year\'s taps 0.48 to 0.57; to last year\'s 0.75 to 0.84', 'mean difference -0.29 [-0.31, -0.25], four year pairs, MDE 0.04', 'pre-declared direction; descriptive by the PREREG'], 'the queue tracks this year\'s hand, not last year\'s'),
  ('grammar', 'does a tap steer the queue', 'reversed', 'after i press play, the queue leaves that genre family sooner, not later: 46 of 100 next plays share the family, against 51 when the queue runs on its own, and the gap holds for twelve plays. my hand is a turn, not a steer.', ['same family at the next play: 45.8 of 100 after my strict tap vs 51.0 queue-only', 'excess -5.2 points [-8.2, -2.2], MDE 4.5; negative at every lag 1 to 12', '5,915 taps with twelve plays after them; 30,379 queue-only baselines'], 'a tap is a turn, not a steer: the queue drifts out of the family sooner'),
]
SM['r25'] = {
  'title': 'five more, from the log alone',
  'frame': 'five pre-declared tests over the listening log, no body data: who introduced us, whose next song is easier to guess, how far the queue sits from my hand, whether it lags me, and whether a tap steers it. one died and reversed; the rest are descriptive with intervals.',
  'lanes': [{'id': i, 'q': q, 'tier': t, 'sentence': s_, 'numbers': n, 'caption': c, 'data': json.load(open(R + 'editions/data/r25/' + i + '.json'))} for (i, q, t, s_, n, c) in R25],
}

SM['intro'] = json.load(open(R + 'editions/data/r25/intro_artists.json'))  # born scene: per-artist introducer rows

for k in ('tap_m', 'shuffle_m', 'served_m'):
    if k in old: SM[k] = old[k]
if isinstance(months, dict):
    SM['months'] = months
out = 'window.SM=' + json.dumps(SM, separators=(',', ':'), ensure_ascii=False) + ';\n'
open(R + 'editions/data/pack.js', 'w').write(out)
print('pack.js', len(out), 'bytes; keys:', ', '.join(SM.keys()))
print('months type', type(months).__name__, (list(months.keys())[:6] if isinstance(months, dict) else months[:3]))
print('clock keys', list(clock.keys())[:12]); print('hall sessions', json.dumps(hall.get('sessions'))[:200])
print('soundtrack', len(SM['soundtrack']), SM['soundtrack'][0])
