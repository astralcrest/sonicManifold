const CSS = 'section[data-room="listeners"].lst-sw .lst-tgw,section[data-room="listeners"].lst-sw .lst-cue,section[data-room="listeners"].lst-sw .lst-tag,section[data-room="listeners"].lst-sw .lst-post{display:none!important}@media (max-aspect-ratio:115/100){html.lst-sw-on .atlas-ladder-chip,html.lst-sw-on #atlas-info .ai-caption{display:none!important}}';
const V = new URL(import.meta.url).search || '';
let P = null, on = false;
const q = (f) => { try { return f(); } catch (e) { return undefined; } };
const open = (L, ctx) => {
  if (on) return;
  on = true;
  const sec = L.root.parentElement;
  if (!document.getElementById('lst-sw-css')) { const s = document.createElement('style'); s.id = 'lst-sw-css'; s.textContent = CSS; document.head.appendChild(s); }
  sec.classList.add('lst-sw'); document.documentElement.classList.add('lst-sw-on');
  q(() => ctx.labels.clear('listeners'));
  q(() => { L.hoverI = -1; L.tag.hidden = true; });
  (P = P || import('./showwork.js' + V)).then((m) => { if (on) m.default.mount(sec, ctx); }, (e) => console.warn('showwork', e));
};
const close = (L) => {
  if (!on) return;
  on = false;
  q(() => L.root.parentElement.classList.remove('lst-sw')); document.documentElement.classList.remove('lst-sw-on');
  if (P) P.then((m) => m.default.unmount(), () => {});
};
export default {
  attach(L, ctx) {
    if (L.__sw) return; L.__sw = 1;
    const o = {}; ['enter', 'leave', 'setAngle', 'pushLabels'].forEach((k) => { o[k] = L[k]; });
    const sync = (c) => { if (q(() => c.angle.get().id) === 'showwork') open(L, c); };
    L.setAngle = function (k, c, op) {
      const a = L.angles[k], r = o.setAngle.call(L, k, c, op || {});
      if (a && L.ready) { if (a.id === 'showwork') open(L, c); else close(L); }
      return r;
    };
    L.pushLabels = function (c) { if (on) { L.labOn = false; q(() => c.labels.clear('listeners')); return; } return o.pushLabels.call(L, c); };
    L.leave = function (c) { close(L); return o.leave.call(L, c); };
    L.enter = function (c) { const r = o.enter.call(L, c); sync(c); return r; };
    if (L.ready && L.root && L.root.parentElement.classList.contains('is-active')) sync(ctx);
  },
};
