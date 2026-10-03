/* R5 FIX6 (atlas only, lazy): on a short stage (landscape phone) the tight curve fills the stage's bottom-right corner
   column, and so do its head, caption, toggle row and slider, so the ladder chip (ladder.js placeChip, pinned to that
   corner's x) had no y clear of text, controls and canvas ink at once. the chart gives up the chip's column (kr), and
   its drawn rect becomes a keepout, so the chip settles beside the curve, between the head and the caption */
const chipW = () => {
  const c = document.querySelector('.atlas-ladder-chip');
  if (!c || getComputedStyle(c).display === 'none') return 0; /* the desktop strip has no chip: the chart keeps its width */
  return Math.ceil(c.getBoundingClientRect().width);
};
/* the width the chart leaves free at its right edge: the chip, its 10px corner gap and 10px clear of the chart */
export function kr(M, s) {
  if (!M.atlasOn || M.mode !== 'curve' || !M.tight || s.h >= 360 || M.ghost) return 0;
  const w = chipW();
  return w ? w + 20 : 0;
}
/* the curve's drawn rect: tick gutter to the parity line's end, the value above the tallest column to the x caption */
export function ko(M, ctx) {
  const s = M.s;
  if (!s || !M.atlasOn || M.mode !== 'curve' || M.ghost) return [];
  /* the chip's text changes after the curve opens (ladder.js polls every 250ms): re-lay the chart once to its real width */
  if (M.kr && kr(M, s) !== M.kr && !M.krq) { M.krq = 1; requestAnimationFrame(() => { M.krq = 0; if (M.alive()) M.setLevel(M.level, ctx); }); }
  const x1 = s.x + s.w - 6 - (M.kr || 0), y = M.cTop - 14;
  return [{ x: s.x, y, w: x1 - s.x, h: M.cBase + (M.small ? 34 : 38) - y }];
}
