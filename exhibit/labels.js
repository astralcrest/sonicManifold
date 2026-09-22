/* wall labels. the art is on the wall; the method is on the label, and reading it is a choice.
   every figure here is quoted from a file this site already publishes: exhibit/data/*.json, researcher.html, index.html. */
export const LABELS = {
  threshold: {
    kicker: 'wall label',
    title: 'mostly the machine',
    by: 'astralcrest, 2026',
    rows: [
      ['medium', 'a browser exhibit in nine screens: a threshold and eight rooms, with one side room for your own export. one particle field, web audio, no frameworks. one dot per play; on a small screen, one dot per four.'],
      ['materials', '97,427 logged plays, september 2019 to may 2026. one recommender. 22 original tracks. 120 artists drawn twice. 300 artists on seven retrained maps.'],
      ['method', 'spotify’s export records who started every play. split on that one field, 19 in every 100 i tapped, 17 arrived shuffled, 64 the queue served. every claim was run against a kill condition written down before the number was seen. sixteen died and have a card in the graveyard.'],
      ['the finding', 'when i pick the next track it crosses into another genre family more often than when autoplay picks: bridge index 1.05, 95% interval 1.03 to 1.08. a third to two fifths of my jumps carry no public genre tag, and reasonable ways of handling them put the number anywhere from 1.00 to 1.13. with the loosest definitions of a tap and of autoplay it reads 1.01, interval 0.99 to 1.03, and when both sides are held to artists with at least 50 plays it reads 1.01, interval 0.98 to 1.04. neither separates from 1. it holds across partitions, by device and by era. a direction, not a size.'],
      ['withdrawn', 'the same measurement taken on a map the algorithm helped draw first read 1.61. that map was trained mostly on plays the algorithm chose. room 05 is that map.'],
      ['what the colours mean', 'two codes, used the same way in every room. who pressed play: mint is a play i tapped, amber is one that arrived on shuffle, violet is one the queue served, rose is a finding of mine that was killed or withdrawn. ice is the interface and nothing else: links, axes, the ring around whatever you have selected. the second code is the genre family, one fixed pastel hue for each of the thirteen families the artists are labelled into, grey for an artist with no public tag. no colour here is decoration: if it is on screen it is answering one of those two questions.'],
    ],
    more: ['researcher.html', 'the technical summary'],
  },
  wall: {
    kicker: 'how this was measured', title: 'the log',
    rows: [
      ['count', '97,427 logged plays, seven years, one listener.'],
      ['split', 'by the export’s own reason_start field, which says what started each play: 19% i tapped, 17% i shuffled, 64% were served.'],
      ['caveat', 'the tapped share moves with the logging code and not only with me: 11.8% before october 2023, 22.7% after the app changed how it records a start.'],
      ['the guess', 'the slider before you press asks for your number. it is kept in this tab only and is never sent anywhere. the line after the sort compares it to 19 and says nothing about anyone else, because nobody else’s guess is collected.'],
      ['sound', 'when the piles land you hear the split once: 100 ticks in 2.4 seconds, 19 high for the plays i tapped, 17 in the middle for shuffle, 64 low for the ones served to me.'],
      ['test', 'none here. this room is a count. the claims built on it are in the next rooms.'],
    ],
    more: ['lab.html#apple-leadhero', 'the split, in the lab'],
  },
  calendar: {
    kicker: 'how this was measured', title: 'the ruler changed',
    rows: [
      ['the ribbon', '81 months, september 2019 to may 2026, left to right. one column per month, stacked by who pressed play, at the real monthly counts from exhibit/data/wall.json.'],
      ['the line', 'october 2023, a changepoint the logger shows in its own vocabulary. the app began recording what started a play differently around it.'],
      ['the swing', 'the bundled tapped rate reads 11.8% before that line and 22.7% after: 10.9 points, against a stability bar of 3 points written down before the split was run. the claim that my tap rate was flat across seven years died there.'],
      ['what survived', 'the strict reading of a tap, clickrow, playbtn and remote only, is 11.5% and swings 1.87 points. that is the arm the bridge index uses, which is why the headline is not built on the bundled rate.'],
      ['caveat', 'this room is why no claim here compares provenance shares across eras. the cross-sectional split pools the whole window instead.'],
    ],
    more: ['researcher.html#graveyard', 'the era-stability kill'],
  },
  game: {
    kicker: 'how this was measured', title: 'who pressed play?',
    rows: [
      ['deck', 'five rounds drawn at random from 80 real transitions in my log, balanced 40 tapped and 40 queued.'],
      ['chance', 'because the deck is balanced, always giving the same answer averages 2.5 of 5, the same as a coin.'],
      ['labels', 'they come from the export’s reason_start field, spotify’s own label for what started each play, not from my memory of what i did.'],
      ['caveat', 'the deck is not the population. in the real log about four plays in five were advanced by the app.'],
    ],
    more: ['lab.html#toy-whopressed', 'ten rounds, in the lab'],
  },
  clock: {
    kicker: 'how this was measured', title: 'what held',
    rows: [
      ['the dial', 'all 97,427 plays placed on the hour they started and folded across the seven years. what i tapped rides the outer band, shuffle under it, the served queue under that. counts from exhibit/data/clock.json.'],
      ['the hour', 'a fixed utc-7 approximation applied to the whole record. no per-play timezone or daylight-saving information was kept in the export, so this is an approximation of local time and not local time.'],
      ['why this room is calm', 'the shape of the day is a count, not a contested claim, and nothing in the audit ever came for it. where the hour does enter a test it goes in as a control: split the headline into six-hour bins and the bins do not separate from one another, though that contrast is underpowered rather than reassuring.'],
      ['caveat', 'a histogram over seven years hides drift. what counted as night for me early on is not what it counted as later, and the fixed offset is wrong for however much of this was not lived in that timezone.'],
    ],
    more: ['lab.html#fig-4', 'the hour against the weekday, in the lab'],
  },
  map: {
    kicker: 'how this was measured', title: 'the map that lied',
    rows: [
      ['what the dial does', 'seven embeddings (learned maps of which artists sit near each other), each retrained on a different mix of plays, from 12% to 100% chosen by the algorithm. my listening is the same in all seven.'],
      ['bridge index', 'how often my taps cross between neighbourhoods of the map, divided by how often autoplay does. 1.00 means no difference.'],
      ['the rings', 'four of my most-played artists, the four that move furthest between the first map and the last. they keep full colour on every map, and their plays are the same on all seven.'],
      ['the curve', 'it rises with contamination, 0.99 at 12% to 1.46 at 100%, mean of 3 retrains per level. the picture places 300 artists; the number uses every transition.'],
      ['withdrawn, then killed', 'the first reading on a map like this, 1.61, was inflated by the map itself and withdrawn. a later version balanced for who chose the training plays read 1.15 and failed a harder test: 500 surrogate maps allowed to re-learn their own geometry put it at their 1st percentile. my headline uses no map at all.'],
    ],
    more: ['lab.html#toy-leakdial', 'the leakage dial, in the lab'],
  },
  listeners: {
    kicker: 'how this was measured', title: 'two listeners',
    rows: [
      ['picture', '120 artists, drawn twice: the jumps i tapped, and the jumps autoplay made.'],
      ['count', '4,876 tapped jumps against 26,938 autoplay jumps. of every 100, mine cross scenes about 70 times and autoplay’s about 66.'],
      ['left out', '33.8% of my jumps and 40.9% of autoplay’s touch an artist with no public genre tag and are not scored.'],
      ['the number', 'the ratio of the two crossing rates is the 1.05 headline, p = 0.0012 after correcting across eight ways of drawing the scenes. a direction, not a size: it survives clustering by artist, by device and by era. it does not survive the loosest definitions of a tap and of autoplay, or matching the two sides on how well their artists are tagged. both read 1.01 with an interval that includes 1.'],
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
      ['the ending', 'the sorted wall from room 01 comes back, the 81% that the queue or shuffle started falls away, and the 19% i tapped becomes the wheel.'],
      ['the wheel', '22 tracks i made, placed by musical key. the glow when you tap one marks the keys that mix cleanly with it. that is music theory, not a finding.'],
      ['metadata', 'key and tempo are production notes i entered myself, not something derived from the log.'],
      ['side room', 'if you already have your own spotify export, the line at the end of this wall opens a quiet side room that reads it in this tab and puts your three shares next to mine.'],
    ],
    more: ['bridge-index.html', 'run it on your data'],
  },
  yours: {
    kicker: 'how this was measured', title: 'your turn',
    rows: [
      ['what it does', 'your extended streaming history json is parsed in this browser tab and sorted on the same field mine was. a tap here is the same bundled reading my 19% is drawn on: track row, play button, remote, or a skip forward or back. the stricter set the bridge index uses (track row, play button, remote only) is printed next to it. served means the track ended and the next one arrived with shuffle off. the categories are copied from the probe, not reinvented here.'],
      ['privacy', 'nothing is uploaded and nothing is stored. no request carries your file anywhere. closing the tab ends it.'],
      ['the comparison', 'your three shares are drawn beside mine, which are 19% tapped, 17% shuffled and 64% served over 97,427 plays and seven years.'],
      ['limits', 'one listener is one listener. your split describes your log and is not evidence about recommenders in general, and the untagged tail that widens my interval will widen yours.'],
    ],
    more: ['bridge-index.html#sec-howto', 'the full probe, with its method'],
  },
};

/* one line per room, shown only if a visitor has done nothing for a while */
export const HINTS = {
  wall: 'press and hold anywhere on the dots',
  calendar: 'the dotted line is where the logger changed, not where i did',
  game: 'pick one: did i tap it, or did the app queue it?',
  clock: 'midnight at the top, noon at the bottom',
  graveyard: 'pick a finding and watch the null fall',
  yours: 'your file is read here and never sent anywhere',
};
