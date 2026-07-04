# bridge probe — instructions to send a friend

Paste-ready text below the line. Send `bridge_probe.py` along with it.

---

Hey — I'm validating one number from my listening-history project on a second
person, and I built this so I never have to see your data. You run one script
locally; it prints ~40 lines of aggregate statistics; that JSON block is the
only thing you send back. No track names, no artist names, no timestamps — you
can open the script and check, it's a single readable Python file.

**What it measures:** when you pick the next track yourself vs. when Spotify's
autoplay picks it, how often does each jump between your listening "communities"
(clusters of artists you play together)? The ratio is the Bridge Index. On my
own history it's ~1.9 — I bridge across my communities about twice as often as
autoplay does. I need to know whether that's just me.

## 1. Request your data from Spotify (the waiting step)

1. Go to https://www.spotify.com/account/privacy/ (log in).
2. Scroll to "Download your data". Tick **Extended streaming history** —
   NOT just "Account data". The extended history is the one with the
   how-each-track-started field the analysis needs.
3. Confirm via the email Spotify sends you, then wait. It usually takes
   **1–2 weeks** (Spotify says up to 30 days). You'll get an email with a
   download link.
4. Download the zip and unzip it. You'll get a folder (usually
   `Spotify Extended Streaming History`) containing files named like
   `Streaming_History_Audio_2021.json`.

## 2. Run the probe (two minutes)

You need Python 3.8+ (macOS has it; on Windows grab it from python.org and
tick "Add to PATH"). Then, in a terminal:

```
pip install numpy
python bridge_probe.py "/path/to/Spotify Extended Streaming History"
```

(macOS/Linux: `pip3` / `python3` if `pip`/`python` aren't found. The path is
wherever you unzipped — quotes matter because of the spaces.)

It takes on the order of a minute and prints a JSON block at the end.

## 3. Send back the JSON block

That's it — just the JSON (everything from `{` to `}`). It contains only:

- totals: number of plays, sessions, artists (rounded to the nearest 100),
  first/last year of the log
- the Bridge Index, its confidence interval, a shuffled-label baseline, and a
  p-value
- partition stats (number of artist communities, a graph-quality score)
- the script version and its parameters, so I know we ran the same thing

Nothing in it identifies a single track, artist, day, or listening moment, and
your export never leaves your machine.

## If it refuses to run

The script checks itself and will tell you plainly:

- **"export appears to lack the 'reason_start' field"** — some Spotify exports
  (or the non-extended "account data" download) don't include how each track
  started. Nothing to send; if you accidentally requested the basic export,
  step 1 with "Extended streaming history" ticked fixes it.
- **"only N qualified plays"** — under 5,000 plays of 30+ seconds, the estimate
  is too noisy to compare. Nothing to send, but thank you for trying.
- **"no Streaming_History_Audio files found"** — point it at the unzipped
  folder that actually contains those `.json` files.

Thanks. You're literally the replication sample.
