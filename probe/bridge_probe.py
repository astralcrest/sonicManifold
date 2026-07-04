#!/usr/bin/env python3
"""BRIDGE PROBE — privacy-preserving, self-contained cross-subject Bridge Index.

WHAT THIS IS
  You run this locally on YOUR OWN unzipped Spotify Extended Streaming History
  folder. It computes one number — the Bridge Index (BI) — plus its uncertainty,
  entirely on your machine, and prints ONLY aggregate statistics as JSON:
  no track names, no artist names, no timestamps, no playlists, nothing that
  identifies what you listened to. Your raw export never leaves your computer.

  BI = (cross-community transition rate when YOU pick the next track)
       / (cross-community transition rate when the ALGORITHM auto-advances)

  BI > 1 means you bridge between your own listening communities more than
  Spotify's autoplay does.

USAGE
  pip install numpy
  python bridge_probe.py "/path/to/Spotify Extended Streaming History"

REQUIREMENTS
  Python 3.8+, numpy. Nothing else. Reads Streaming_History_Audio_*.json
  (current export format) or endsong_*.json (older format).

DESIGN / PROVENANCE
  The play-qualification, session, and intent-label definitions below are
  copied VERBATIM from the study's reference implementation:
    - qualification: ms_played >= 30000, track URI + artist present
    - session: consecutive plays <= 30 min apart
    - a transition's intent = how the LANDING track started:
        tap  : reason_start in {"playbtn", "clickrow", "remote"}
        algo : reason_start == "trackdone" and not shuffle
        else : dropped (shuffle-autoplay, fwdbtn/backbtn, appload, ...)
  The community partition differs BY DESIGN: the reference uses an
  artist2vec-kNN-Louvain partition (needs gensim/sklearn/networkx); this probe
  builds a session co-occurrence graph from your own log and partitions it with
  an inline, seeded Louvain implementation (Blondel et al. 2008, resolution 1.0
  — same algorithm/resolution as the reference, pure numpy/stdlib, no networkx).
  Plain label propagation was tried first and rejected: it collapses ~80% of
  artists into one giant community on session co-occurrence graphs. Magnitudes
  are therefore compared probe-vs-probe (your probe output vs. the reference
  probe value reported in the paper: BI 1.91, 95% CI [1.82, 2.01]), never
  probe-vs-artist2vec.

OUTPUT (all aggregates; ~25 lines of JSON on stdout; progress on stderr)
  n_plays, n_sessions, n_artists (rounded to nearest 100), date_range (years),
  pct_deliberate, BI, session-block-bootstrap 95% CI, size-preserving
  label-shuffle mechanical floor (mean + 95% CI), permutation p, partition
  stats (n_communities, modularity), script version + parameters.
"""
import glob
import json
import os
import sys
import datetime as dt
from collections import defaultdict

try:
    import numpy as np
except ImportError:
    sys.exit("bridge_probe: numpy is required. Run: pip install numpy")

PROBE_VERSION = "bridge_probe/1.0 (2026-07-03)"
SEED = 1234

# ---- definitions copied verbatim from the reference implementation ---------
TAP = {"playbtn", "clickrow", "remote"}   # STRICT tap = listener-initiated
SESSION_GAP_S = 30 * 60                   # 30-min gap closes a session
MS_PLAYED_MIN = 30000                     # qualified play threshold

# ---- probe-specific partition parameters ------------------------------------
COOC_WINDOW = 5          # session co-occurrence window (word2vec-style context)
MIN_COMM_SIZE = 5        # communities smaller than this are dropped from scoring
N_SHUFFLES = 1000        # size-preserving label shuffles (mechanical floor)
N_BOOT = 2000            # session-block bootstrap resamples
MIN_PLAYS = 5000         # refuse below this: estimates too unstable to compare


def fail(msg):
    sys.stderr.write("\nbridge_probe: ERROR — " + msg + "\n")
    sys.exit(1)


def find_files(root):
    pats = ["Streaming_History_Audio_*.json", "endsong_*.json"]
    files = []
    for p in pats:
        files += glob.glob(os.path.join(root, p))
        files += glob.glob(os.path.join(root, "*", p))
        files += glob.glob(os.path.join(root, "**", p), recursive=True)
    return sorted(set(files))


def parse_ts(ts):
    # 'YYYY-MM-DDTHH:MM:SSZ' -> epoch seconds (UTC). Same as the reference implementation.
    return dt.datetime.strptime(ts[:19], "%Y-%m-%dT%H:%M:%S").replace(
        tzinfo=dt.timezone.utc).timestamp()


def load_plays(root):
    """Mirror of the reference loader: qualified plays only,
    chronologically sorted. Returns rows of (ts_str, artist, reason_start, shuffle)."""
    files = find_files(root)
    if not files:
        fail("no Streaming_History_Audio_*.json (or endsong_*.json) files found "
             "under\n  %s\nPoint the script at the UNZIPPED export folder — the "
             "one that contains those files." % root)
    sys.stderr.write("reading %d export file(s)...\n" % len(files))
    rows = []
    n_raw = 0
    n_with_reason = 0
    for f in files:
        try:
            data = json.load(open(f, encoding="utf-8"))
        except Exception as e:
            fail("could not parse %s (%s)" % (os.path.basename(f), e))
        for r in data:
            n_raw += 1
            if r.get("reason_start"):
                n_with_reason += 1
            if r.get("ms_played", 0) < MS_PLAYED_MIN:
                continue
            uri = r.get("spotify_track_uri")
            art = r.get("master_metadata_album_artist_name")
            if not uri or not art:
                continue
            rows.append((r["ts"], art, r.get("reason_start"), bool(r.get("shuffle"))))
    rows.sort(key=lambda x: x[0])  # ISO8601 Z sorts lexicographically == chronologically

    if n_raw and n_with_reason / n_raw < 0.5:
        fail("your export appears to lack the 'reason_start' field "
             "(present on %.0f%% of rows). Some Spotify exports omit it; without "
             "it the probe cannot separate your picks from autoplay. Nothing to "
             "send — sorry, and thanks for trying." % (100.0 * n_with_reason / n_raw))
    if len(rows) < MIN_PLAYS:
        fail("only %d qualified plays (>=30s with artist metadata); the probe "
             "needs at least %d for a stable estimate. Nothing to send."
             % (len(rows), MIN_PLAYS))
    return rows


def build_sessions_and_transitions(rows):
    """Mirror of the reference transition builder, plus session ids for
    the block bootstrap. Returns (sessions_artist_seqs, transitions) where
    transitions = list of (prev_artist, cur_artist, intent, session_id)."""
    sessions = []       # list of artist sequences (one per session), for the graph
    trans = []
    prev_art, prev_t = None, None
    sid = -1
    cur_seq = []
    for ts, art, rs, shuf in rows:
        t = parse_ts(ts)
        new_session = prev_art is None or (t - prev_t) > SESSION_GAP_S
        if new_session:
            if cur_seq:
                sessions.append(cur_seq)
            cur_seq = []
            sid += 1
        else:
            # intent of the TRANSITION = how the CURRENT (landing) track started
            if rs in TAP:
                intent = "tap"
            elif rs == "trackdone" and not shuf:
                intent = "algo"
            else:
                intent = None
            if intent is not None:
                trans.append((prev_art, art, intent, sid))
        cur_seq.append(art)
        prev_art, prev_t = art, t
    if cur_seq:
        sessions.append(cur_seq)
    return sessions, trans


# -----------------------------------------------------------------------------
# Inline community detection: seeded Louvain (pure numpy/stdlib, no networkx)
# -----------------------------------------------------------------------------
def build_cooc_graph(sessions, artist_ids):
    """Weighted undirected artist co-occurrence graph from the subject's own
    sessions: for artists d positions apart within a session (d <= COOC_WINDOW),
    edge weight += 1/d. Word2vec-style distance-damped context — the
    dependency-light analog of the reference's artist2vec neighborhood graph."""
    edges = defaultdict(float)
    for seq in sessions:
        idx = [artist_ids[a] for a in seq]
        n = len(idx)
        for i in range(n):
            ai = idx[i]
            for d in range(1, COOC_WINDOW + 1):
                j = i + d
                if j >= n:
                    break
                bj = idx[j]
                if ai == bj:
                    continue
                key = (ai, bj) if ai < bj else (bj, ai)
                edges[key] += 1.0 / d
    return edges


def _louvain_level(n, edges, rng, resolution, max_passes=20):
    """One Louvain level: local node moves until no move improves modularity.
    edges may contain self-loops (from aggregation). Deterministic given rng."""
    nbrs = [[] for _ in range(n)]
    strength = np.zeros(n)
    for (a, b), w in edges.items():
        if a == b:
            strength[a] += 2.0 * w
        else:
            nbrs[a].append((b, w)); nbrs[b].append((a, w))
            strength[a] += w; strength[b] += w
    m2 = float(strength.sum())  # = 2m
    labels = np.arange(n)
    if m2 <= 0:
        return labels, False
    comm_tot = strength.copy()
    improved_any = False
    for _ in range(max_passes):
        moves = 0
        for i in rng.permutation(n):
            i = int(i)
            ci = int(labels[i])
            wcom = defaultdict(float)
            for j, w in nbrs[i]:
                wcom[int(labels[j])] += w
            comm_tot[ci] -= strength[i]
            # gain(c) ∝ w_i→c − resolution·k_i·Σtot(c)/2m  (constant terms drop)
            best_c = ci
            best_gain = wcom.get(ci, 0.0) - resolution * strength[i] * comm_tot[ci] / m2
            for c, wc in wcom.items():
                if c == ci:
                    continue
                g = wc - resolution * strength[i] * comm_tot[c] / m2
                if g > best_gain + 1e-12:
                    best_gain, best_c = g, c
            comm_tot[best_c] += strength[i]
            if best_c != ci:
                labels[i] = best_c
                moves += 1
        if moves == 0:
            break
        improved_any = True
    return labels, improved_any


def louvain(n_nodes, edges, rng, resolution=1.0):
    """Seeded inline Louvain (Blondel et al. 2008): local moves + graph
    aggregation, repeated until modularity stops improving. Same algorithm and
    resolution as the reference implementation's networkx Louvain, minus the
    dependency. Returns a community label per original node."""
    orig = np.arange(n_nodes)
    cur_edges = dict(edges)
    cur_n = n_nodes
    level = 0
    while True:
        labels, improved = _louvain_level(cur_n, cur_edges, rng, resolution)
        compact = {}
        for l in labels:
            l = int(l)
            if l not in compact:
                compact[l] = len(compact)
        labels = np.array([compact[int(l)] for l in labels])
        orig = labels[orig]
        level += 1
        n_comm = len(compact)
        sys.stderr.write("  louvain level %d: %d -> %d communities\n"
                         % (level, cur_n, n_comm))
        if not improved or n_comm == cur_n:
            return orig
        agg = defaultdict(float)
        for (a, b), w in cur_edges.items():
            ca, cb = int(labels[a]), int(labels[b])
            key = (ca, cb) if ca <= cb else (cb, ca)
            agg[key] += w
        cur_edges = dict(agg)
        cur_n = n_comm


def modularity(labels, edges):
    """Newman weighted modularity Q = sum_c [ w_in_c/m - (s_c/2m)^2 ]."""
    m = sum(edges.values())
    if m <= 0:
        return 0.0
    strength = defaultdict(float)
    w_in = defaultdict(float)
    s_tot = defaultdict(float)
    for (a, b), w in edges.items():
        strength[a] += w
        strength[b] += w
        if labels[a] == labels[b]:
            w_in[labels[a]] += w
    for i, s in strength.items():
        s_tot[labels[i]] += s
    q = 0.0
    for c in s_tot:
        q += w_in.get(c, 0.0) / m - (s_tot[c] / (2.0 * m)) ** 2
    return q


# -----------------------------------------------------------------------------
# BI + uncertainty
# -----------------------------------------------------------------------------
def main():
    import argparse
    ap = argparse.ArgumentParser(
        description="Privacy-preserving Bridge Index probe: runs locally on your "
                    "unzipped Spotify Extended Streaming History and prints ONLY "
                    "aggregate statistics (no track/artist names, no timestamps).")
    ap.add_argument("export_dir", metavar="EXPORT_DIR",
                    help='path to the unzipped export folder, e.g. '
                         '"/path/to/Spotify Extended Streaming History"')
    root = ap.parse_args().export_dir
    rng = np.random.default_rng(SEED)
    warnings = []

    rows = load_plays(root)
    sessions, trans = build_sessions_and_transitions(rows)
    n_plays = len(rows)
    n_sessions = len(sessions)
    years = [int(rows[0][0][:4]), int(rows[-1][0][:4])]
    n_tap_plays = sum(1 for _, _, rs, _ in rows if rs in TAP)
    pct_deliberate = n_tap_plays / n_plays

    artists = sorted({a for _, a, _, _ in rows})
    artist_ids = {a: i for i, a in enumerate(artists)}
    sys.stderr.write("qualified plays=%d sessions=%d artists=%d transitions "
                     "(tap=%d algo=%d)\n"
                     % (n_plays, n_sessions, len(artists),
                        sum(1 for t in trans if t[2] == "tap"),
                        sum(1 for t in trans if t[2] == "algo")))

    # ---- partition: co-occurrence graph -> seeded inline Louvain ----
    sys.stderr.write("building session co-occurrence graph...\n")
    edges = build_cooc_graph(sessions, artist_ids)
    sys.stderr.write("  %d artists, %d weighted edges\n" % (len(artists), len(edges)))
    labels = louvain(len(artists), edges, rng, resolution=1.0)
    q_mod = modularity(labels, edges)

    sizes = defaultdict(int)
    for l in labels:
        sizes[l] += 1
    n_comm_raw = len(sizes)
    kept = {l for l, s in sizes.items() if s >= MIN_COMM_SIZE}
    part = {i: labels[i] for i in range(len(artists)) if labels[i] in kept}
    sys.stderr.write("  communities: %d raw -> %d with >=%d artists "
                     "(modularity %.3f)\n"
                     % (n_comm_raw, len(kept), MIN_COMM_SIZE, q_mod))
    if len(kept) < 2:
        fail("the co-occurrence graph collapsed into a single community — "
             "cross-community rates are undefined on this log. Nothing to send.")

    # ---- observed BI (mirrors the reference BI semantics:
    #      both endpoints must be partitioned, cross = community differs) ----
    tap_a, tap_b, tap_sid = [], [], []
    algo_a, algo_b, algo_sid = [], [], []
    n_class = 0
    for a, b, intent, sid in trans:
        n_class += 1
        ia, ib = artist_ids[a], artist_ids[b]
        if ia not in part or ib not in part:
            continue
        if intent == "tap":
            tap_a.append(ia); tap_b.append(ib); tap_sid.append(sid)
        else:
            algo_a.append(ia); algo_b.append(ib); algo_sid.append(sid)
    if len(tap_a) == 0 or len(algo_a) == 0:
        fail("no usable tap and/or autoplay transitions after partitioning — "
             "the probe cannot form the ratio on this log. Nothing to send.")
    if len(tap_a) < 500:
        warnings.append("fewer than 500 deliberate (tap) transitions — "
                        "expect a wide confidence interval")

    lab_vec = np.full(len(artists), -1, dtype=np.int64)
    for i, l in part.items():
        lab_vec[i] = l
    tap_a = np.array(tap_a); tap_b = np.array(tap_b); tap_sid = np.array(tap_sid)
    algo_a = np.array(algo_a); algo_b = np.array(algo_b); algo_sid = np.array(algo_sid)

    tap_cross = (lab_vec[tap_a] != lab_vec[tap_b]).astype(np.float64)
    algo_cross = (lab_vec[algo_a] != lab_vec[algo_b]).astype(np.float64)
    tap_rate = float(tap_cross.mean())
    algo_rate = float(algo_cross.mean())
    if algo_rate <= 0:
        fail("autoplay cross-community rate is zero — BI undefined on this log.")
    bi_obs = tap_rate / algo_rate
    coverage = (len(tap_cross) + len(algo_cross)) / max(n_class, 1)

    # ---- mechanical floor: size-preserving label shuffles over partitioned
    #      nodes (mirrors the reference label-shuffle null; here on the BI ratio) ----
    sys.stderr.write("label-shuffle floor (%d shuffles)...\n" % N_SHUFFLES)
    part_nodes = np.array(sorted(part.keys()))
    node_pos = np.full(len(artists), -1, dtype=np.int64)
    node_pos[part_nodes] = np.arange(len(part_nodes))
    base_labs = lab_vec[part_nodes]
    ta, tb = node_pos[tap_a], node_pos[tap_b]
    aa, ab = node_pos[algo_a], node_pos[algo_b]
    null_bi = np.empty(N_SHUFFLES)
    null_gap = np.empty(N_SHUFFLES)
    for i in range(N_SHUFFLES):
        pl = rng.permutation(base_labs)
        t = float(np.mean(pl[ta] != pl[tb]))
        a = float(np.mean(pl[aa] != pl[ab]))
        null_bi[i] = t / a if a > 0 else np.nan
        null_gap[i] = t - a
    floor_mean = float(np.nanmean(null_bi))
    floor_ci = [float(x) for x in np.nanpercentile(null_bi, [2.5, 97.5])]
    null_std = float(np.nanstd(null_bi, ddof=1))
    if not (null_std > 0):
        warnings.append("degenerate permutation null (std=0) — p_perm unreliable")
    # empirical one-sided p: how often a shuffled-label BI matches/exceeds observed
    p_perm = float((np.sum(null_bi >= bi_obs) + 1) / (N_SHUFFLES + 1))

    # ---- 95% CI: BLOCK bootstrap by session (30-min-gap sessions) ----
    sys.stderr.write("session-block bootstrap (%d resamples)...\n" % N_BOOT)
    all_sids = np.unique(np.concatenate([tap_sid, algo_sid]))
    sid_pos = {int(s): k for k, s in enumerate(all_sids)}
    S = len(all_sids)
    per_sess = np.zeros((S, 4))  # [tap_n, tap_cross_sum, algo_n, algo_cross_sum]
    for s, c in zip(tap_sid, tap_cross):
        k = sid_pos[int(s)]
        per_sess[k, 0] += 1; per_sess[k, 1] += c
    for s, c in zip(algo_sid, algo_cross):
        k = sid_pos[int(s)]
        per_sess[k, 2] += 1; per_sess[k, 3] += c
    boot = np.empty(N_BOOT)
    for i in range(N_BOOT):
        idx = rng.integers(0, S, S)
        m = per_sess[idx].sum(axis=0)
        if m[0] > 0 and m[2] > 0 and m[3] > 0:
            boot[i] = (m[1] / m[0]) / (m[3] / m[2])
        else:
            boot[i] = np.nan
    bi_ci = [float(x) for x in np.nanpercentile(boot, [2.5, 97.5])]

    # ---- aggregate-only output ----
    result = {
        "script_version": PROBE_VERSION,
        "params": {
            "seed": SEED,
            "ms_played_min": MS_PLAYED_MIN,
            "session_gap_min": SESSION_GAP_S // 60,
            "cooc_window": COOC_WINDOW,
            "min_community_size": MIN_COMM_SIZE,
            "n_shuffles": N_SHUFFLES,
            "n_boot": N_BOOT,
        },
        "n_plays": int(n_plays),
        "n_sessions": int(n_sessions),
        "n_artists_rounded": int(round(len(artists) / 100.0) * 100),
        "date_range_years": [int(years[0]), int(years[1])],
        "pct_deliberate": round(float(pct_deliberate), 4),
        "n_tap_transitions": int(len(tap_cross)),
        "n_algo_transitions": int(len(algo_cross)),
        "tap_cross_rate": round(tap_rate, 4),
        "algo_cross_rate": round(algo_rate, 4),
        "BI": round(float(bi_obs), 4),
        "BI_CI95": [round(bi_ci[0], 4), round(bi_ci[1], 4)],
        "floor_mean": round(floor_mean, 4),
        "floor_CI95": [round(floor_ci[0], 4), round(floor_ci[1], 4)],
        "p_perm": round(p_perm, 6),
        "partition_stats": {
            "n_communities": int(len(kept)),
            "n_communities_raw": int(n_comm_raw),
            "modularity": round(float(q_mod), 4),
            "pct_transitions_covered": round(float(coverage), 4),
        },
        "warnings": warnings,
    }
    sys.stderr.write(
        "\nDONE. BI=%.3f [%.3f, %.3f], mechanical floor %.3f, p_perm=%.4g\n"
        "The JSON below is the ONLY thing to share — it contains no track/artist "
        "names, no timestamps.\n\n" % (bi_obs, bi_ci[0], bi_ci[1], floor_mean, p_perm))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
