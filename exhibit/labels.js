/* wall labels. the art is on the wall; the method is on the label, and reading it is a choice.
   every figure here is quoted from a file this site already publishes: exhibit/data/*.json, researcher.html, index.html. */
export const LABELS = {
  threshold: {
    kicker: 'wall label',
    title: 'mostly the machine',
    by: 'astralcrest, 2026',
    rows: [
      ['medium', 'a browser exhibit in seven screens: a threshold and six rooms. one particle field, web audio, no frameworks. one dot per play; on a small screen, one dot per four.'],
      ['materials', '97,427 logged plays, september 2019 to may 2026. one recommender. 22 original tracks. 120 artists drawn twice. 300 artists on seven retrained maps.'],
      ['method', 'spotify’s export records who started every play. split on that one field, 19 in every 100 i tapped, 17 arrived shuffled, 64 the queue served. every claim was run against a kill condition written down before the number was seen. sixteen died and have a card in the graveyard.'],
      ['the finding', 'when i pick the next track it crosses into another genre family more often than when autoplay picks: bridge index 1.05, 95% interval 1.03 to 1.08. a third to two fifths of my jumps carry no public genre tag, and reasonable ways of handling them put the number anywhere from 1.00 to 1.13. a direction, not a size.'],
      ['withdrawn', 'the same measurement taken on a map the algorithm helped draw first read 1.61. that map was trained mostly on plays the algorithm chose. room 03 is that map.'],
    ],
    more: ['researcher.html', 'the technical summary'],
  },
  wall: {
    kicker: 'how this was measured', title: 'the log',
    rows: [
      ['count', '97,427 logged plays, seven years, one listener.'],
      ['split', 'by the export’s own reason_start field, which says what started each play: 19% i tapped, 17% i shuffled, 64% were served.'],
      ['caveat', 'the tapped share moves with the logging code and not only with me: 11.8% before october 2023, 22.7% after the app changed how it records a start.'],
      ['test', 'none here. this room is a count. the claims built on it are in the next rooms.'],
    ],
    more: ['lab.html#apple-leadhero', 'the split, in the lab'],
  },
  game: {
    kicker: 'how this was measured', title: 'who pressed play?',
    rows: [
      ['deck', 'five rounds drawn at random from 80 real transitions in my log, balanced 40 tapped and 40 queued.'],
      ['chance', 'because the deck is balanced, always giving the same answer averages 2.5 of 5, the same as a coin.'],
      ['labels', 'they come from the export’s reason_start field, not from my memory of what i did.'],
      ['caveat', 'the deck is not the population. in the real log about four plays in five were advanced by the app.'],
    ],
    more: ['lab.html#toy-whopressed', 'ten rounds, in the lab'],
  },
  map: {
    kicker: 'how this was measured', title: 'the map that lied',
    rows: [
      ['what the dial does', 'seven embeddings (learned maps of which artists sit near each other), each retrained on a different mix of plays, from 12% to 100% chosen by the algorithm. my listening is the same in all seven.'],
      ['bridge index', 'how often my taps cross between neighbourhoods of the map, divided by how often autoplay does. 1.00 means no difference.'],
      ['the curve', 'it rises with contamination, 0.99 at 12% to 1.46 at 100%, mean of 3 retrains per level. the picture places 300 artists; the number uses every transition.'],
      ['killed', 'this arm later failed a harder test: 500 surrogate maps allowed to re-learn their own geometry put the observed value at their 1st percentile. my headline uses no map at all.'],
    ],
    more: ['lab.html#toy-leakdial', 'the leakage dial, in the lab'],
  },
  listeners: {
    kicker: 'how this was measured', title: 'two listeners',
    rows: [
      ['picture', '120 artists, drawn twice: the jumps i tapped, and the jumps autoplay made.'],
      ['count', '4,876 tapped jumps against 26,938 autoplay jumps. of every 100, mine cross scenes about 70 times and autoplay’s about 66.'],
      ['left out', '33.8% of my jumps and 40.9% of autoplay’s touch an artist with no public genre tag and are not scored.'],
      ['the number', 'the ratio of the two crossing rates is the 1.05 headline, p = 0.0012 after correcting across eight ways of drawing the scenes. a direction, not a size.'],
    ],
    more: ['lab.html#fig-26', 'the full network, in the lab'],
  },
  graveyard: {
    kicker: 'how this was measured', title: 'the graveyard',
    rows: [
      ['what falls', 'each card is one of my own tests. the pile is the same data with the part that would carry the effect scrambled, 150 to 500 times.'],
      ['verdict', 'where my real number lands against that pile decides it. inside the pile, the finding dies.'],
      ['tally', 'sixteen findings have a card in the lab’s graveyard. eighteen were killed, retracted or withdrawn in all.'],
      ['caveat', 'no correction is applied across the whole study. this is an exploratory record, not a locked confirmatory battery.'],
    ],
    more: ['lab.html#graveyard', 'all sixteen, with receipts'],
  },
  make: {
    kicker: 'how this was measured', title: 'make your own',
    rows: [
      ['the wheel', '22 tracks i made, placed by musical key. the glow when you tap one marks the keys that mix cleanly with it. that is music theory, not a finding.'],
      ['metadata', 'key and tempo are production notes i entered myself, not something derived from the log.'],
      ['your turn', 'the probe reads your own export in this browser tab and computes your split and your bridge index. nothing is uploaded.'],
    ],
    more: ['bridge-index.html', 'run it on your data'],
  },
};

/* one line per room, shown only if a visitor has done nothing for a while */
export const HINTS = {
  wall: 'press and hold anywhere on the dots',
  game: 'pick one: did i tap it, or did the app queue it?',
  map: 'drag the dial left. the map rearranges; my listening does not',
  listeners: 'flip between my taps and autoplay. tap a cluster to hear that artist',
  graveyard: 'pick a finding and watch the null fall',
  make: 'tap a dot on the wheel to play that track',
};
