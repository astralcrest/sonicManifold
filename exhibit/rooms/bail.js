/* N1 · where i bail: 1 glyph = 1 skip-forward press (bail.json). hold = my song from 0 s; let go = a cut + low D */
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e;};
const fmt=(n)=>Number(n).toLocaleString('en-US');
const tr=(f)=>{try{return f();}catch(e){}};
const clamp=(v,a,b)=>(v<a?a:v>b?b:v);
const ft=(t)=>(t<60?t.toFixed(1)+' s':floor(t/60)+':'+String(floor(t % 60)).padStart(2,'0'));
const{floor,min,max,round,abs}=Math,MONO='px "JetBrains Mono", ui-monospace, monospace',stop=(e)=>{e.preventDefault();e.stopPropagation();};
const IC='rgba(134,203,254,',on=(e,t,f)=>e.addEventListener(t,f),hz=(p,t)=>{p.cancelScheduledValues(t);p.setValueAtTime(p.value,t);};
const ICE=0x86cbfe,BED='tryin',TMAX=180,REST=[0.16,520];
const ANGLES=[{id:'heap',name:'the heap'},{id:'line',name:'the 30-second line'},{id:'guess',name:'guess first'}];
const BN=['inside 5 s','5 to 15 s','15 to 30 s','30 s to 1 min','1 to 2 min','2 min +'];
const BS=['inside 5 s','between 5 and 15 s','between 15 and 30 s','between 30 s and a minute','between one and two minutes','after two minutes'];
const CSS=`@ .bl-hud{position:absolute;box-sizing:border-box;padding:8px 10px;background:#0a0118c7;border:1px solid #86cbfe3d;border-radius:12px}
@ .bl-line{font:400 12.5px/1.45 var(--mono);color:var(--ink);margin:0 2px 6px;min-height:2.9em}
@ .bl-line b{font-weight:600;color:var(--ice)}
@ .bl-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px}
@ .bl-hold{font:600 11px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ice);background:#86cbfe14;border:1px solid #86cbfe8c;border-radius:999px;padding:0 16px;min-height:44px;min-width:44px;cursor:pointer;touch-action:none;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}
@ .bl-hold[aria-pressed="true"]{background:#86cbfe3d;color:var(--ink)}
@ .bl-hold:focus-visible{outline:2px solid var(--ice);outline-offset:3px}
@ .bl-mine{margin:0;font:400 10.5px/1.4 var(--mono);color:var(--mute)}
@ .bl-g{display:flex;align-items:center;gap:6px;font:400 10.5px/1 var(--mono);color:var(--mute)}
@ .bl-g[hidden]{display:none}
@ .bl-g input{width:120px;min-height:44px;accent-color:#86cbfe}
@ .bl-kb{display:none;margin:0 2px 4px;font:400 10.5px/1.3 var(--mono);color:var(--ice)}
@ .bl-hud.kb .bl-kb{display:block}
@ .bl-hud.cmp .bl-line{font-size:11px;line-height:1.38;margin-bottom:4px}
@ .bl-tag{position:absolute;margin:0;padding:4px 7px;font:400 10.5px/1.35 var(--mono);color:var(--ink);background:#0a0118e6;border:1px solid #86cbfe59;border-radius:6px;pointer-events:none;white-space:nowrap}
@ .bl-tag[hidden]{display:none}@media (forced-colors:active){@ .bl-hud,@ .bl-tag{border:1px solid CanvasText}
@ .bl-hold{forced-color-adjust:none;background:Canvas;color:CanvasText;border:1px solid CanvasText}
@ .bl-hold[aria-pressed="true"]{background:Highlight;color:HighlightText}}`.replace(/@ /g,'html.atlas section[data-room="bail"] ');
const R={
id:'bail',track:BED,glyph:{edges:false},angles:ANGLES,
ready:false,ang:'heap',hold:null,drops:[],guess:-1,guessSet:false,revealed:false,litKey:'',nowT:-1,hov:-1,g:null,poured:false,
ladderNote:()=>'a mark here is one skip-forward press, not a play',
async mount(root,ctx){
R.ctx=ctx;R.root=root;
if(!ctx.atlas||!ctx.atlas.on)return;
document.head.appendChild(el('style')).textContent=CSS;
let d;try{d=await ctx.data('bail');}catch(e){}
if(!d||!d.bins||!d.fine){const w=root.parentElement.querySelector('.wall');if(w)w.appendChild(el('p','say dim','the heap did not load this time.'));return;}
R.d=d;
const cn=R.cn=new Int32Array(33),cb=R.cb=new Uint8Array(33),off=R.off=new Int32Array(34);
for(let c=0;c<30;c++){cn[c]=d.fine[c];cb[c]=c<5?0:c<15?1:2;}
for(let k=3;k<6;k++){cn[27+k]=d.bins[k][2];cb[27+k]=k;}
for(let c=0;c<33;c++)off[c+1]=off[c]+cn[c];
R.n=off[33];
if(R.n!==d.n_fwd||off[5]!==d.bins[0][2]||off[30]-off[15]!==d.bins[2][2])console.warn('bail: counts do not reconcile',R.n,d.n_fwd);
R.pre30=off[30];
R.col=new Uint8Array(R.n);for(let c=0;c<33;c++)R.col.fill(c,off[c],off[c+1]);
let h=0;while(h<30&&off[h+1]<R.n/2)h++;R.half=h+1;
R.build(root,ctx);
tr(()=>ctx.audio.onChange((s)=>{if(s==='on'&&R.active()){R.wire();R.lev(R.hold?'open':'rest');}}));
R.ready=true;
},
build(root,ctx){
const hud=R.hud=root.appendChild(el('div','bl-hud')),at=(e,k,v)=>{e.setAttribute(k,v);return e;};
at(hud.appendChild(el('p','bl-kb','space or enter: hold · esc: cancel · ← →: the three views')),'aria-hidden','true');
R.line=hud.appendChild(el('p','bl-line'));
const row=hud.appendChild(el('div','bl-row')),b=R.btn=row.appendChild(el('button','bl-hold','hold to listen'));
b.type='button';at(b,'aria-pressed','false');
at(b,'aria-label','hold to listen, let go when you would skip. arrow keys: the heap, the 30-second line, guess first');
on(b,'pointerdown',(e)=>{if(e.button>0)return;e.preventDefault();tr(()=>b.setPointerCapture(e.pointerId));R.begin('button');});
const up=(e)=>{if(R.hold&&R.hold.via==='button')(e.type==='pointercancel'?R.cancel():R.drop());};
['pointerup','pointercancel','lostpointercapture'].forEach((t)=>on(b,t,up));
on(b,'contextmenu',(e)=>e.preventDefault());
on(b,'click',(e)=>e.preventDefault());
on(b,'keydown',(e)=>R.key(e,true));
on(b,'keyup',(e)=>R.keyUp(e));
on(b,'focus',()=>hud.classList.add('kb'));
on(b,'blur',()=>{hud.classList.remove('kb');if(R.hold&&R.hold.via==='key')R.drop();});
const g=R.gl=row.appendChild(el('label','bl-g','your guess'));g.hidden=true;
const r=R.range=g.appendChild(el('input'));r.type='range';r.min='0';r.max='1000';r.step='1';
on(r,'input',()=>{R.setGuess(R.tOfF(+r.value/1000),true);});
R.mine=at(row.appendChild(el('p','bl-mine')),'aria-hidden','true');
R.tag=at(root.appendChild(el('p','bl-tag')),'aria-hidden','true');R.tag.hidden=true;
R.onUp=(e)=>R.keyUp(e);
R.onKd=(e)=>{if(e.metaKey||e.ctrlKey||e.altKey)return;if(e.key==='Escape'&&R.hold){stop(e);R.cancel();}else if(e.key===' ')R.key(e);};
},
layout(ctx){
const s=R.st=ctx.stage(),side=s.h<330&&s.w>s.h*1.5,nar=R.nar=s.w<560,H=R.hud.style;
const hw=side?min(250,s.w*0.4):min(s.w,640);
R.hud.classList.toggle('cmp',side||nar);
H.width=hw+'px';H.left=(side?s.x+s.w-hw:s.x+(s.w-hw)/2)+'px';
const hh=R.hud.offsetHeight||110;
H.top=(side?s.y+max(0,(s.h-hh)/2):s.y+s.h-hh)+'px';
const pad=nar?12:26,x0=R.x0=s.x+pad,Wt=R.Wt=(side?s.w-hw-12:s.w)-pad*2;
R.yb=side?s.y+s.h-26:s.y+s.h-hh-30;R.ty=s.y+30;
R.F=nar?0.7:0.74;R.TW=(1-R.F)*Wt/3;
const Hm=R.Hm=max(40,(R.yb-R.ty)*0.8),cw=R.F*Wt/30;
let mx=0;for(let c=0;c<30;c++)mx=max(mx,R.cn[c]);
const a=Hm*cw/mx;
R.cx=new Float32Array(33);R.cw=new Float32Array(33);R.chh=new Float32Array(33);
for(let c=0;c<33;c++){
const lo=c<30?c:[30,60,120][c-30],hi=c<30?c+1:[60,120,TMAX][c-30];
R.cx[c]=R.xOf(lo);R.cw[c]=R.xOf(hi)-R.cx[c];R.chh[c]=R.cn[c]*a/R.cw[c];
}
},
xOf(t){
const F=R.F*R.Wt,T=R.TW,x=R.x0;
return t<=30?x+t/30*F:t<=60?x+F+(t-30)/30*T:t<=120?x+F+T+(t-60)/60*T:x+F+2*T+min(1,(t-120)/60)*T;
},
tOfF(f){return R.tOf(R.x0+f*R.Wt);},
tOf(x){
const F=R.F*R.Wt,T=R.TW,u=x-R.x0;
return u<=F?max(0,u/F*30):u<=F+T?30+(u-F)/T*30:u<=F+2*T?60+(u-F-T)/T*60:min(TMAX,120+(u-F-2*T)/T*60);
},
enter(ctx){
const P=ctx.particles,re=ctx.atlas&&ctx.atlas.reenter;
P.ease=0.075;P.jitter=0.2;P.big=false;P.touch=false;P.swirl=0.15;
if(!R.ready){P.scatter();P.color(()=>0x57507a);return;}
if(!re){R.ang='heap';R.hov=-1;R.tag.hidden=true;}
R.layout(ctx);
tr(()=>ctx.view.configure({mode:'none'}));
P.glyphAll(true);P.glyphMode('cont',{colour:'sample',edges:false});P.glyphCell(R.nar?4:5);
P.color((i)=>(i<R.n?ICE:0x57507a));
R.place(ctx,!re&&!R.poured);
R.poured=true;
R.pushLabels(ctx);if(!re)R.status();
tr(()=>{ctx.ladder.level('oneplay');ctx.ladder.readout('1 mark = 1 skip-forward press');});
R.wire();R.lev('rest');
R.keysOn(false);R.keysOn(true);
if(!re&&ctx.tour&&ctx.tour.active&&ctx.tour.active.playing)R.demo(ctx,1200);
},
pr(v){R.btn.setAttribute('aria-pressed',''+v);},
keysOn(v){const f=v?'addEventListener':'removeEventListener';window[f]('keydown',R.onKd,true);window[f]('keyup',R.onUp);R.keysUp=v;},
hidden(){return R.ang==='guess'&&!R.revealed;},
place(ctx,pour){
const P=ctx.particles,n=R.n,h=ctx.hash,C=R.col,cx=R.cx,cw=R.cw,ch=R.chh,yb=R.yb,cloud=R.hidden();
P.targetPx((i)=>{
if(i>=n)return null;
if(cloud)return[R.x0+h(i*3+1)*R.Wt,R.ty+8+h(i*3+2)*R.Hm*0.16];
const c=C[i],g=cw[c]>6?1:0;
return[cx[c]+g+h(i*3+1)*(cw[c]-2*g),yb-h(i*3+2)*ch[c]];
});
if(pour&&!ctx.reduced){const t=R.st.y;for(let i=0;i<P.n;i++){P.x[i]=P.tx[i];P.y[i]=i<n?t+(P.ty[i]-t)*h(i*5+4)*0.6:P.ty[i];}}
R.litKey='';R.weigh(ctx);
},
weigh(ctx){
const P=ctx.particles,W=P.w,hold=R.hold,cut=hold?R.colAtT(R.tNow()):-1;
const key=R.ang+(R.revealed?1:0)+':'+cut;
if(key===R.litKey)return;R.litKey=key;
for(let c=0;c<33;c++){
const v=R.hidden()?60:hold?(c<cut?255:c===cut?210:70):R.ang==='line'?(c<30?255:40):175;
W.fill(v,R.off[c],R.off[c+1]);
}
},
colAtT(t){return t<30?floor(t):t<60?30:t<120?31:32;},
binOf(t){return t<5?0:t<15?1:t<30?2:t<60?3:t<120?4:5;},
tNow(){return R.hold?(performance.now()-R.hold.t0)/1000:0;},
active(){const p=R.root&&R.root.parentElement;return!!p&&p.classList.contains('is-active');},
wire(){
const A=R.ctx.audio;clearTimeout(R.unT);
if(R.g||!A.ac||!A.lp||!A.an)return!!R.g;
try{const g=A.ac.createGain();A.lp.disconnect(A.an);A.lp.connect(g);g.connect(A.an);R.g=g;}catch(e){tr(()=>A.lp.connect(A.an));}
return!!R.g;
},
unwire(){
const A=R.ctx.audio,g=R.g;if(!g)return;
const t=A.ac.currentTime;
tr(()=>{hz(g.gain,t);g.gain.linearRampToValueAtTime(1,t+0.25);A.lp.frequency.cancelScheduledValues(t);A.lp.frequency.setTargetAtTime(20000,t,0.08);});
clearTimeout(R.unT);
R.unT=setTimeout(()=>{if(R.active()||R.g!==g)return;tr(()=>{A.lp.disconnect(g);g.disconnect();A.lp.connect(A.an);});R.g=null;},450);
},
lev(mode){
const A=R.ctx.audio,g=R.g;if(!g)return;
const t=A.ac.currentTime,G=g.gain,L=A.lp.frequency;
tr(()=>{
hz(G,t);hz(L,t);
if(mode==='open'){G.setTargetAtTime(1,t,0.05);L.setTargetAtTime(20000,t,0.06);}
else if(mode==='cut'){G.linearRampToValueAtTime(0.012,t+0.018);L.setValueAtTime(240,t+0.018);G.setTargetAtTime(REST[0],t+0.4,0.5);L.setTargetAtTime(REST[1],t+0.4,0.5);}
else{G.setTargetAtTime(REST[0],t,0.25);L.setTargetAtTime(REST[1],t,0.25);}
});
},
restart(){
const A=R.ctx.audio,e=A.els&&A.els[A.cur];
if(!A.on||A.muted||!e||e.dataset.t!==BED)return;
tr(()=>{e.currentTime=0;if(e.paused)e.play().catch(()=>{});});
},
begin(via,sx,sy){
const ctx=R.ctx;
if(via!=='demo'){R.stopDemo();tr(()=>{if(ctx.tour.active.playing)ctx.tour.pause('user');});}
if(!R.ready||R.hold||!R.active())return;
R.hold={t0:performance.now(),via};
R.pr(true);R.tag.hidden=true;R.hov=-1;
tr(()=>ctx.audio.tick(null));
R.restart();R.wire();R.lev('open');
R.nowT=-1;R.litKey='';R.weigh(ctx);
R.line.textContent=(via==='demo'?'a demo thumb is holding. ':'')+'holding: a song i made, from its first second. let go when you\'d skip.';
},
drop(){
const h=R.hold;if(!h)return;
const ctx=R.ctx,t=(performance.now()-h.t0)/1000;R.hold=null;
R.pr(false);
R.lev('cut');
tr(()=>ctx.audio.note(-5,{dur:1.4,vol:0.08,type:'sine'}));
tr(()=>ctx.buzz(14));
const demo=h.via==='demo',prev=R.drops.filter((q)=>!q.demo).slice(-1)[0];
R.drops.push({t,at:performance.now(),demo});if(R.drops.length>5)R.drops.shift();
if(R.hidden()){R.revealed=true;R.place(ctx,!ctx.reduced);}
R.litKey='';R.weigh(ctx);
const txt=R.dropText(t,demo,prev);R.line.textContent=txt;tr(()=>ctx.say(txt));
R.mine.textContent=R.drops.filter((q)=>!q.demo).map((q)=>ft(q.t)).join(' · ');
if(R.mine.textContent)R.mine.textContent='your drops: '+R.mine.textContent;
},
dropText(t,demo,prev){
const k=R.binOf(t),n=R.d.bins[k][2],c=R.colAtT(t),f=min(30,floor(t));
let s=(demo?'a demo thumb let go at ':'you let go at ')+ft(t)+': '+BS[k]+', like '+fmt(n)+' of mine.';
if(k===3)s+=' spotify counts that as a play.';
if(t>=R.d.median_counted_s)s+=' you outlasted a median counted play ('+R.d.median_counted_mmss+').';
else if(c<30&&f>=1)s+=' '+fmt(R.off[f])+' of my '+fmt(R.n)+' came before '+f+' s.';
if(R.ang==='guess'&&R.guessSet&&!demo)s+=' you guessed '+ft(R.guess)+'; over half of my skip-forward presses came before '+R.half+' s.';
else if(prev&&!demo)s+=' your last: '+ft(prev.t)+'.';
return s;
},
cancel(){
if(!R.hold)return;
R.hold=null;R.pr(false);R.lev('rest');
R.litKey='';R.weigh(R.ctx);R.line.textContent='cancelled. hold again when you are ready.';
},
key(e,onBtn){
const k=e.key,t=e.target;
if(!R.active()||!R.ready)return false;
if(!onBtn){if(k!==' '||(t&&t.closest&&t.closest('button,a,input,select,textarea,[role=button],dialog')))return false;}
else if(k==='ArrowLeft'||k==='ArrowRight'){stop(e);if(!R.hold)tr(()=>(k==='ArrowLeft'?R.ctx.angle.prev():R.ctx.angle.next()));return true;}
else if(k==='Escape'){if(R.hold){stop(e);R.cancel();}return true;}
else if(k!==' '&&k!=='Enter')return false;
stop(e);
if(!e.repeat&&!R.hold){R.begin('key');if(R.hold)R.hold.key=k;}
return true;
},
keyUp(e){
if(R.hold&&R.hold.via==='key'&&e.key===R.hold.key){e.preventDefault();R.drop();}
},
setGuess(t,fromRange){
R.guess=clamp(t,0,TMAX);R.guessSet=true;
const r=R.range;if(!fromRange)r.value=String(round((R.xOf(R.guess)-R.x0)/R.Wt*1000));
r.setAttribute('aria-valuetext',ft(R.guess));
if(!R.revealed)R.line.textContent='your guess: '+ft(R.guess)+'. now hold, and let go when you\'d skip.';
},
setAngle(k,ctx){
const a=ANGLES[k];if(!a||!R.ready)return 0;
if(R.hold)R.cancel();
R.ang=a.id;R.gl.hidden=a.id!=='guess';
if(a.id==='guess'){R.revealed=false;R.guessSet=false;R.guess=-1;R.range.value='500';R.range.setAttribute('aria-valuetext','not set');}
R.place(ctx,false);R.pushLabels(ctx);R.status();
return 0;
},
status(){
const d=R.d,L=R.line;
if(R.ang==='line')L.textContent=fmt(R.pre30)+' of these skip-forwards stopped before the line. across all '+fmt(d.n_rows)+' track rows, '+fmt(d.n_sub30)+' never reached it.';
else if(R.ang==='guess')L.textContent='where do you think i bail? drag along the line (or use the slider) to guess, then hold.';
else L.textContent='hold anywhere, this button or space: a song i made plays from its first second. let go when you\'d skip it.'+(R.ctx.audio.on&&!R.ctx.audio.muted?'':' sound is off; the heap still keeps your time.');
},
hoverVoice(id){const c=/^b\d$/.test(id)?+id.slice(1):-1;return c>=0?{deg:c,plays:R.d.bins[c][2],kind:'label'}:null;},
pushLabels(ctx){
if(R.hidden()){tr(()=>ctx.labels.clear('bail'));return;}
const it=[];
for(let k=0;k<6;k++){
if(R.nar&&k)break;
const c0=[0,5,15,30,31,32][k],c1=[4,14,29,30,31,32][k];let top=0;
for(let c=c0;c<=c1;c++)top=max(top,R.chh[c]);
it.push({id:'b'+k,text:BN[k]+' · '+fmt(R.d.bins[k][2]),x:(R.cx[c0]+R.cx[c1]+R.cw[c1])/2-10,y:min(R.yb-top-12,R.yb-54),space:'screen',r:4,kind:'obj',pri:10-k,deg:k,plays:R.d.bins[k][2],go:()=>R.showCol(c0)});
}
tr(()=>ctx.labels.set('bail',it));
},
colAt(sx,sy){
if(R.hidden()||sx<R.x0||sx>=R.x0+R.Wt||sy>R.yb+24||sy<R.ty-10)return-1;
const t=R.tOf(sx);return t>=TMAX?32:R.colAtT(t);
},
showCol(c){
const ctx=R.ctx;R.hov=c;
if(c<0){R.tag.hidden=true;tr(()=>ctx.audio.tick(null));return;}
const x=R.cx[c]+R.cw[c]/2,y=R.yb-R.chh[c];
tr(()=>ctx.audio.tick('bail:'+c,{deg:R.cb[c],plays:R.cn[c],x,y}));
const tg=R.tag;tg.textContent=(c<30?c+' to '+(c+1)+' s':BN[c-27])+': '+fmt(R.cn[c])+(R.cn[c]===1?' press':' presses');
tg.hidden=false;
const s=R.st,w=tg.offsetWidth||160;
tg.style.left=clamp(x-w/2,s.x+4,s.x+s.w-w-4)+'px';tg.style.top=max(s.y+2,y-34)+'px';
},
gestures(ctx){
const guessing=(p)=>R.ang==='guess'&&!R.revealed&&(!R.guessSet||abs(p.sx-R.xOf(R.guess))<26);
return{
dbl:false,wheel:false,
hover:(p)=>{if(R.hold)return;const c=R.colAt(p.sx,p.sy);if(c!==R.hov)R.showCol(c);},
leave:()=>{if(!R.hold)R.showCol(-1);},
cursor:()=>'pointer',
hold:{
delay:0,
press:(p)=>{if(guessing(p)){R.drag=true;R.setGuess(R.tOf(p.sx));}else R.begin('stage');},
start(){},
move:(p)=>{if(R.drag)R.setGuess(R.tOf(p.sx));},
end:(p,cancelled)=>{if(R.drag){R.drag=false;return;}if(R.hold&&R.hold.via==='stage')(cancelled?R.cancel():R.drop());},
},
};
},
keepout(){const r=R.hud&&R.hud.getBoundingClientRect(),o=r&&r.width?[{x:r.left-4,y:r.top-4,w:r.width+8,h:r.height+8}]:[];if(R.chh)for(let c=0,h;c<33;c++)if((h=R.chh[c])>0)o.push({x:R.cx[c]-2,y:R.yb-h-6,w:R.cw[c]+4,h:h+8});return o;},
frame(g,t,bands,w,h,ctx){
if(!R.ready||!R.cx)return;
const x0=R.x0,yb=R.yb,ty=R.ty,X=(s)=>R.xOf(s),hold=R.hold,red=ctx.reduced,nar=R.nar;
if(hold){
const tn=R.tNow();R.weigh(ctx);
const q=floor(tn*10);if(q!==R.nowT){R.nowT=q;const f=min(30,floor(tn));R.mine.textContent=ft(tn)+(f>=1&&tn<30?' · '+fmt(R.off[f])+' of my '+fmt(R.n)+' had come before '+f+' s':tn>=30?' · past the 30-second line':'');}
}
g.globalAlpha=1;g.lineWidth=1;g.strokeStyle='#d9d4ee59';
g.beginPath();g.moveTo(x0,yb+0.5);g.lineTo(x0+R.Wt,yb+0.5);g.stroke();
g.font='400 '+(nar?9.5:10.5)+MONO;g.fillStyle='#d9d4ee9e';g.textBaseline='top';g.textAlign='center';
for(const s of nar?[0,5,15,30,60,120]:[0,5,10,15,20,25,30,60,120]){const x=round(X(s))+0.5,lab=s>59?s/60+(nar?(s>99?'m+':'m'):' min'):s===30||(s===5&&!nar)?s+' s':''+s;g.beginPath();g.moveTo(x,yb);g.lineTo(x,yb+4);g.stroke();g.fillText(lab,x,yb+7);}
if(!nar)g.fillText('+',X(150),yb+7);
const x30=round(X(30))+0.5,strong=R.ang==='line';
g.strokeStyle=strong?'#f0eaffeb':'#d9d4ee38';g.lineWidth=strong?2:1;
g.setLineDash(strong?[]:[2,4]);g.beginPath();g.moveTo(x30,ty+22);g.lineTo(x30,yb);g.stroke();g.setLineDash([]);g.lineWidth=1;
if(strong){g.textAlign='right';g.fillStyle='#f0eafff2';g.fillText(nar?'a play counts from here →':'spotify counts a play from here →',x30-6,ty+40);}
if(R.ang==='guess'&&R.guessSet){
const gx=round(X(R.guess))+0.5;g.strokeStyle=IC+'.75)';g.setLineDash([4,3]);
g.beginPath();g.moveTo(gx,ty);g.lineTo(gx,yb);g.stroke();g.setLineDash([]);
g.fillStyle='#86cbfe';g.beginPath();g.moveTo(gx-6,yb+1);g.lineTo(gx+6,yb+1);g.lineTo(gx,yb-9);g.closePath();g.fill();
g.textAlign='center';g.textBaseline='bottom';g.fillText('your guess '+ft(R.guess),clamp(gx,x0+50,x0+R.Wt-50),ty-2);g.textBaseline='top';
}
if(hold){
const tn=R.tNow(),px=round(X(min(TMAX,tn)))+0.5,pulse=red?0:bands.low*0.3;
g.strokeStyle=IC+(0.75+pulse)+')';g.lineWidth=2;g.beginPath();g.moveTo(px,ty);g.lineTo(px,yb);g.stroke();g.lineWidth=1;
g.fillStyle='#86cbfe';g.textAlign=px>x0+R.Wt-60?'right':'left';g.textBaseline='bottom';
g.font='600 '+(nar?13:15)+MONO;g.fillText(ft(tn)+(hold.via==='demo'?' · demo':''),px+(g.textAlign==='right'?-6:6),ty+16);
g.textBaseline='top';
}
const D=R.drops,now=performance.now();
for(let k=0;k<D.length;k++){
const q=D[k],c=R.colAtT(min(TMAX-0.01,q.t)),x=X(min(TMAX,q.t)),land=yb-R.chh[c]-5,age=now-q.at,last=k===D.length-1;
const f=red?1:min(1,age/420),y=ty+(land-ty)*f*f;
g.globalAlpha=last?1:0.3+0.12*k;g.fillStyle=q.demo?'#86cbfe':'#ffffff';
g.fillRect(x-3.5,y-3.5,7,7);
if(last&&f>=1&&age<1100&&!red){const r=(age-420)/680;g.strokeStyle=IC+(1-r)+')';g.lineWidth=1.5;g.beginPath();g.arc(x,land,6+r*26,0,6.283);g.stroke();g.lineWidth=1;}
if(last){const r=x>x0+R.Wt-90;g.textAlign=r?'right':'left';g.textBaseline='middle';g.fillStyle='#fff';g.font='600 10.5'+MONO;g.fillText((q.demo?'demo · ':'you · ')+ft(q.t),x+(r?-9:9),y);g.textBaseline='top';}
}
g.globalAlpha=1;
},
leave(ctx){
R.stopDemo();if(R.hold)R.cancel();R.drag=false;R.hov=-1;
tr(()=>{ctx.stopPosts();ctx.audio.tick(null);});
R.keysOn(false);
tr(()=>ctx.ladder.readout(null));
R.unwire();
},
demo(ctx,wait){
if(!R.ready)return;
R.stopDemo();const T=R._demoT=[],at=(ms,f)=>T.push(setTimeout(()=>{if(R.active()&&R._demoT===T)f();},ms)),w0=wait||700;
at(w0,()=>{if(R.ang==='guess')R.setGuess(10);R.begin('demo');});
at(w0+2600,()=>{if(R.hold&&R.hold.via==='demo')R.drop();});
at(w0+6800,()=>{if(R.ang==='heap'&&!tr(()=>ctx.tour.active.playing))tr(()=>ctx.angle.set('line',{via:'room'}));});
},
stopDemo(){if(R._demoT){R._demoT.forEach(clearTimeout);R._demoT=null;}if(R.hold&&R.hold.via==='demo')R.cancel();},
};
export default R;
