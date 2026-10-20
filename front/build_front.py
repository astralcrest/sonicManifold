#!/usr/bin/env python3
"""Build the front page (index.html) from a template and the data sidecars in front/data/.

  python3 front/build_front.py                  refresh the derived sidecars, stamp them, write index.html
  python3 front/build_front.py --check          validate the sidecars, the template and the output; write nothing
  python3 front/build_front.py --pack DIR       first re-cut taste/genre/graveyard from a proto_data pack
  python3 front/build_front.py --template front/template_B.html --out OUT.html
                                                the same data, inlined, for a template that carries prototype B's
                                                /*__DATA__*/ marker (or prototype A's original /*@DATA@*/ marker)

The default template (front/template.html) loads its data lazily: the build writes the content stamps into its
/*@STAMPS@*/{} marker, and the page fetches front/data/<name>.json?v=<stamp> when a section nears the screen.
Derived sidecars come from public, already-shipping files under exhibit/data/; taste, genre and graveyard are kept here,
and so are hear.json and the taste rows' "u" (Spotify track ids for the front's "hear it" chips: titles, artists, ids only).
A script the template loads as front/<name>.js?v=@HASH@ gets the first 10 hex of its sha1 in place of @HASH@.
The name and privacy gates live with the private tests (atlas_door.mjs scans index.html and every sidecar), not in this
public script.
"""
import argparse
import hashlib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(HERE, 'data')
EXH = os.path.join(ROOT, 'exhibit', 'data')
LAZY_BUDGET = 120 * 1024
INLINE_BUDGET = int(1.5 * 1024 * 1024)
NAMES = ['taste', 'genre', 'nodes', 'pairs', 'graveyard', 'tracks', 'hear']
TASTE_KEYS = ('t', 'a', 'h', 'w', 'p', 'n', 'pt', 'pa', 'pe', 'pm', 'arm')
TID = re.compile(r'^[0-9A-Za-z]{22}$')
SCRIPT = re.compile(r'(front/[a-z0-9_]+\.js)\?v=@HASH@')
ARMS = ['tap', 'shuffle', 'served']

# the lab's graveyard text (R20/LAB_MUSIC/lab.html.before, card 10) and the paper's month wording (researcher.html: "the
# bundled-share audit boundary at 2023-10"); grave 4's "2023-08" is already the paper's backbtn step and stays
G10_VERDICT = ('narrowed 2026-07-19: whatever drives a next press isn\u2019t in the audio; session-sequence features reach '
               '0.815 held-out, and two features (my last press + the session\u2019s next-press rate so far) give 0.80. '
               'the spiral predicts; the song doesn\u2019t.')
G15_FROM, G15_TO = 'across the october 2023 logger change', 'across the 2023-10 era boundary'


def dump(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + '\n'


def load(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def write_if_changed(name, text):
    path = os.path.join(DATA, name + '.json')
    old = None
    if os.path.exists(path):
        with open(path, encoding='utf-8') as f:
            old = f.read()
    if old != text:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(text)
        return True
    return False


def cut_pack(pack):
    """taste, genre and graveyard from a proto_data pack (the 2026-10-16 takeaways pack)."""
    t = load(os.path.join(pack, 'taste_sample.json'))
    rows = t['rows']  # unfiltered: a '!' in a song title is data, not copy
    tp = os.path.join(DATA, 'taste.json')
    ids = {(r['t'], r['a']): r['u'] for r in load(tp)['rows'] if 'u' in r} if os.path.exists(tp) else {}
    for r in rows:  # a re-cut keeps the track ids already matched
        if (r['t'], r['a']) in ids:
            r['u'] = ids[(r['t'], r['a'])]
    write_if_changed('taste', dump({'v': 1, 'n': len(rows), 'rows': rows}))
    g = load(os.path.join(pack, 'genre_strict.json'))
    write_if_changed('genre', dump({'v': 1, 'fam_order': g['fam_order'],
                                    'comp': {'tap': g['comp']['tap'], 'queue': g['comp']['queue']},
                                    'tap_n': g['comp']['tap_n'], 'queue_n': g['comp']['queue_n']}))
    graves = load(os.path.join(pack, 'graveyard.json'))
    for x in graves:
        if x['n'] == 10 and not x['verdict'].endswith('.'):
            x['verdict'] = G10_VERDICT
        if x['n'] == 15:
            x['result'] = x['result'].replace(G15_FROM, G15_TO)
    write_if_changed('graveyard', dump({'v': 1, 'graves': graves}))


def derive():
    """nodes, pairs and tracks from the public exhibit data (the map's 388 artists, its weft, the 23 tracks)."""
    un = load(os.path.join(EXH, 'universe_nodes.json'))
    nodes = []
    for k, n in enumerate(un['nodes']):
        assert n['id'] == k, 'universe node ids are their positions'
        c = n.get('community')
        nodes.append([k, round(n['xy'][0], 4), round(n['xy'][1], 4), -1 if c is None else int(c), int(n['family']), int(n['plays_bucket'])])
    changed = write_if_changed('nodes', dump({'v': 1, 'src': 'exhibit/data/universe_nodes.json',
                                              'fields': ['id', 'x', 'y', 'community', 'family', 'bucket'], 'nodes': nodes}))
    ub = load(os.path.join(EXH, 'universe_bridges.json'))
    fam = load(os.path.join(DATA, 'genre.json'))['fam_order']
    counts = [[[0] * 14 for _ in range(14)] for _ in range(3)]
    for w in ub['weft']:
        counts[w['arm']][w['a']][w['b']] += w['n']
    changed |= write_if_changed('pairs', dump({'v': 1, 'src': 'exhibit/data/universe_bridges.json (months summed)',
                                               'fam_order': fam, 'arms': ARMS, 'counts': counts}))
    tr = load(os.path.join(EXH, 'tracks.json'))
    changed |= write_if_changed('tracks', dump({'v': 1, 'src': 'exhibit/data/tracks.json', 'tracks': [
        {'f': t['f'], 't': t['t'], 'k': t['k'], 'bpm': t['bpm']} for t in tr['tracks']]}))
    return changed


def validate():
    errs = []
    d = {k: load(os.path.join(DATA, k + '.json')) for k in NAMES}
    rows = d['taste']['rows']
    if len(rows) != 180 or sum(r['arm'] == 'me' for r in rows) != 90 or sum(r['arm'] == 'app' for r in rows) != 90:
        errs.append('taste: 180 rows, 90 me and 90 app')
    for r in rows:
        if not all(k in r for k in TASTE_KEYS):
            errs.append('taste: a row lacks a field'); break
    for r in rows:
        if set(r) - set(TASTE_KEYS) - {'u'} or ('u' in r and not TID.match(r['u'])):
            errs.append('taste: a row carries more than the game\'s fields and one track id'); break
    h = d['hear']
    if set(h) != {'v', 'tap', 'queue'} or any(set(h[k]) != {'t', 'a', 'u'} or not TID.match(h[k]['u']) for k in ('tap', 'queue')):
        errs.append('hear: tap and queue, each a title, an artist and a track id, nothing else')
    if len(d['genre']['fam_order']) != 14:
        errs.append('genre: 14 families')
    if d['pairs']['fam_order'] != d['genre']['fam_order']:
        errs.append('pairs: family order differs from genre')
    idx = os.path.join(EXH, 'universe_days_index.json')
    if os.path.exists(idx) and load(idx).get('fam_order') not in (None, d['genre']['fam_order']):
        errs.append('genre: family order differs from the exhibit index')
    if len(d['nodes']['nodes']) != 388:
        errs.append('nodes: 388 artists')
    g = d['graveyard']['graves']
    if [x['n'] for x in g] != list(range(1, 17)):
        errs.append('graveyard: graves 1 to 16')
    for x in g:
        for k in ('title', 'claim', 'killed_by', 'result', 'verdict'):
            if not str(x.get(k, '')).strip():
                errs.append('graveyard %d: empty %s' % (x['n'], k))
        if not x['verdict'].rstrip().endswith('.'):
            errs.append('graveyard %d: verdict cut short' % x['n'])
    if G15_TO not in g[14]['result'] or G15_FROM in json.dumps(g, ensure_ascii=False):
        errs.append('graveyard 15: month wording is not the paper\'s')
    if len(d['tracks']['tracks']) != 23:
        errs.append('tracks: 23 tracks')
    return d, errs


def stamp(k):
    with open(os.path.join(DATA, k + '.json'), 'rb') as f:
        return hashlib.sha1(f.read()).hexdigest()[:10]


def js_const(name, obj):
    js = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
    js = js.replace('</', '<\\/').replace('<!--', '<\\!--').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
    return 'const %s=%s;' % (name, js)


def inline_consts(d, prefix):
    n = d['nodes']
    nodes = [{'id': r[0], 'xy': [r[1], r[2]], 'community': None if r[3] < 0 else r[3], 'family': r[4], 'plays_bucket': r[5]} for r in n['nodes']]
    weft = []
    for arm, M in enumerate(d['pairs']['counts']):
        for a in range(14):
            for b in range(14):
                if M[a][b]:
                    weft.append({'a': a, 'b': b, 'arm': arm, 'n': M[a][b]})
    parts = [
        js_const(prefix + 'TASTE_SAMPLE', {'rows': d['taste']['rows']}),
        js_const(prefix + 'GENRE_STRICT', {'fam_order': d['genre']['fam_order'], 'comp': d['genre']['comp']}),
        js_const(prefix + 'UNIVERSE_NODES', {'nodes': nodes}),
        js_const(prefix + 'UNIVERSE_BRIDGES', {'weft': weft}),
        js_const(prefix + 'GRAVEYARD', d['graveyard']['graves']),
        js_const(prefix + 'TRACKS', {'tracks': d['tracks']['tracks']}),
    ]
    return '\n'.join(parts)


def build(tpl_path, d):
    with open(tpl_path, encoding='utf-8') as f:
        tpl = f.read()
    if '/*@STAMPS@*/{}' in tpl:
        if tpl.count('/*@STAMPS@*/{}') != 1:
            sys.exit('the template must hold /*@STAMPS@*/{} exactly once')
        stamps = {k: stamp(k) for k in NAMES}
        out = tpl.replace('/*@STAMPS@*/{}', json.dumps(stamps, separators=(',', ':')))
        for src in sorted(set(SCRIPT.findall(out))):
            p = os.path.join(ROOT, src)
            if not os.path.exists(p):
                sys.exit('the template loads %s, which is not there' % src)
            with open(p, 'rb') as f:
                b = f.read()
            if '\u2014'.encode('utf-8') in b:
                sys.exit('%s: an em-dash' % src)
            out = out.replace(src + '?v=@HASH@', src + '?v=' + hashlib.sha1(b).hexdigest()[:10])
        if '@HASH@' in out:
            sys.exit('a @HASH@ the build cannot resolve')
        return out, LAZY_BUDGET, True
    for marker, prefix in (('/*__DATA__*/', ''), ('/*@DATA@*/', 'D_')):
        if marker in tpl:
            if tpl.count(marker) != 1:
                sys.exit('the template must hold %s exactly once' % marker)
            return tpl.replace(marker, inline_consts(d, prefix)), INLINE_BUDGET, False
    sys.exit('no data marker in %s' % tpl_path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--template', default=os.path.join(HERE, 'template.html'))
    ap.add_argument('--out', default=os.path.join(ROOT, 'index.html'))
    ap.add_argument('--pack', default=None)
    ap.add_argument('--check', action='store_true')
    a = ap.parse_args()
    if a.pack and not a.check:
        cut_pack(a.pack)
    if not a.check:
        derive()
    d, errs = validate()
    out, budget, lazy = build(a.template, d)
    size = len(out.encode('utf-8'))
    if size > budget:
        errs.append('output %d bytes is over the %d budget' % (size, budget))
    if lazy:
        if '\u2014' in out:
            errs.append('output: an em-dash')
    for e in errs:
        print('FAIL ' + e)
    if errs:
        sys.exit(1)
    sizes = ', '.join('%s %d' % (k, os.path.getsize(os.path.join(DATA, k + '.json'))) for k in NAMES)
    if a.check:
        print('ok (check only): output would be %d bytes; sidecars: %s' % (size, sizes))
        return
    with open(a.out, 'w', encoding='utf-8') as f:
        f.write(out)
    print('wrote %s: %d bytes (budget %d); sidecars: %s' % (os.path.relpath(a.out, ROOT), size, budget, sizes))


if __name__ == '__main__':
    main()
