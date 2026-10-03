/* listeners angle 0 · THE HUNDRED JUMPS (R5 L4): of 100 genre-tagged jumps, how many crossed genre, my pick (left ear) vs
   autoplay (right ear). data: twolisteners.json full_transition_crossing + its edges. */
const el=(t,c,x)=>{const e=document.createElement(t);if(c) e.className=c;if(x != null) e.textContent=x;return e;};
const fmt=(v)=>String(v).replace(/\B(?=(\d{3})+(?!\d))/g,',');
const abgr=(v)=>(0xff000000 |((v & 0xff) << 16) |(v & 0xff00) |((v >> 16) & 0xff)) >>> 0;
const DIM=0x3a3846,STEP=30;
const S ='html.atlas section[data-room="listeners"] ';
const CSS=[
'.hd{position:absolute;inset:0;pointer-events:none}',
'.hd[hidden]{display:none}',
'.hd-hit{position:absolute;pointer-events:auto;touch-action:none;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}',
'.hd-h{position:absolute;display:flex;align-items:baseline;gap:7px;font:600 11px/1.2 var(--mono);letter-spacing:.06em;color:var(--ink);white-space:nowrap;margin:0}',
'.hd-h i{display:block;width:12px;height:3px;border-radius:2px;flex:none;align-self:center}',
'.hd-h .hd-n{font-weight:400;color:var(--mute);overflow:hidden;text-overflow:ellipsis}',
'.hd-h .hd-v{margin-left:auto;font-size:14px}',
'.hd-kb{position:absolute;pointer-events:none;border-radius:4px}',
'.hd-kb:focus{outline:none}',
'.hd-kb:focus-visible{outline:2px solid var(--ice);outline-offset:6px}',
'.hd-kb div{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}',
'.hd-f{position:absolute;display:flex;flex-wrap:wrap;align-items:center;gap:4px 14px;pointer-events:none}',
'.hd-f p{margin:0;font:400 11.5px/1.4 var(--mono);color:var(--mute)}',
'.hd-f .hd-r{font-weight:600;color:var(--ink);font-size:12.5px}',
'.hd-f .hd-c{flex:1 1 100%;max-width:46rem}',
'.hd.nr .hd-r{flex:1 1 0;font-size:11.5px;line-height:1.3}',
'.hd.bs .hd-r{flex:1 1 100%;font-size:10.5px}',
'.hd.nr .hd-c{font-size:10.5px;line-height:1.35}',
'.hd.nr .hd-n{display:none}',
'.hd-h.xs{font-size:10px;letter-spacing:0;gap:4px}',
'.hd-h.xs i{display:none}',
'.hd-h.xs .hd-v{font-size:12px}',
'.hd-play{pointer-events:auto;display:flex;align-items:center;gap:7px;font:600 11px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ice);background:rgba(10,1,24,.6);border:1px solid rgba(134,203,254,.45);border-radius:999px;padding:0 15px;min-height:44px;cursor:pointer;white-space:nowrap}',
'.hd-play:hover{border-color:var(--ice);background:rgba(134,203,254,.1)}',
'.hd-play:focus-visible{outline:2px solid var(--ice);outline-offset:3px}',
'.hd-tag{position:absolute;z-index:2;max-width:260px;font:400 10.5px/1.4 var(--mono);color:var(--ink);background:rgba(10,1,24,.88);border:1px solid rgba(134,203,254,.35);border-radius:6px;padding:5px 8px;margin:0;pointer-events:none}',
'.hd-tag b{font-weight:600;color:var(--ice)}',
'.hd-tag span{display:block;color:var(--mute)}',
'@media (forced-colors:active){'+ S +'.hd-play{forced-color-adjust:none;background:Canvas;color:CanvasText;border:1px solid CanvasText}'+ S +'.hd-tag{border:1px solid CanvasText}}',
'@media print{'+ S +'.hd-hit,'+ S +'.hd-play{display:none}}',
].map((r)=>(r[0] ==='@'? r:S+r)).join('\n');
const H={
on: false,L: null,root: null,hov: -1,kb: -1,lit: -1,run: null,demoT: [],

attach(L,ctx){
if(L.__hd) return;L.__hd=this;this.L=L;
const o={};['enter','leave','setAngle','frame','hoverAt','pick','pushLabels','showIntro','demo','stopDemo'].forEach((k)=>{o[k]=L[k];});
L.enter=function(c){o.enter.call(L,c);H.sync(c);};
L.leave=function(c){H.hide(c);return o.leave.call(L,c);};
L.setAngle=function(k,c,op){
const a=L.angles[k];if(!a||!L.ready) return 0;
if(a.id ==='hundred'){H.sync(c,true);return 0;}
if(H.on){H.hide(c);o.enter.call(L,c);}
return o.setAngle.call(L,k,c,op||{});
};
L.frame=function(g,t,b,w,h,c){return H.on?H.frame(g,c):o.frame.call(L,g,t,b,w,h,c);};
L.hoverAt=function(x,y){if(!H.on) o.hoverAt.call(L,x,y);};
L.pick=function(x,y,c){return H.on?null:o.pick.call(L,x,y,c);};
L.pushLabels=function(c){if(H.on){L.labOn=false;try {c.labels.clear('listeners');} catch(e){} return;} o.pushLabels.call(L,c);};

L.demo=function(c){if(!H.on) return o.demo.call(L,c);H.play(c);H.demo(c,H.run.end-performance.now()+500);};
L.stopDemo=function(c){H.demoT.forEach(clearTimeout);H.demoT=[];return o.stopDemo.call(L,c);};
L.showIntro=function(){if(H.on){L.introShown=false;return;} o.showIntro.call(L);};

if(L.ready&&L.root&&L.root.parentElement.classList.contains('is-active')) this.sync(ctx);
},
sync(ctx,want){
const L=this.L;if(!L||!L.ready||!L.atlasOn) return;
if(want == null){try {want=ctx.angle.get().id ==='hundred';} catch(e){want=false;}}
if(want) this.show(ctx);else this.hide(ctx);
},
build(ctx){
const L=this.L,fx=L.d.full_transition_crossing,P=ctx.particles,N=P.n;
this.ctx=ctx;
document.head.appendChild(el('style')).textContent=CSS;

const pct=[fx.tap*100,fx.auto*100];
this.fill=[new Float32Array(100),new Float32Array(100)];
for(let g=0;g<2;g++) for(let k=0;k<100;k++) this.fill[g][k]=Math.max(0,Math.min(1,pct[g]-k));
this.last=[Math.ceil(pct[0])-1,Math.ceil(pct[1])-1];
const r1=(v)=>(Math.round(v*1000) / 10).toFixed(1);
this.t1=r1(fx.tap);this.a1=r1(fx.auto);this.ratio=(fx.tap / fx.auto).toFixed(2);
this.col=[ctx.PAL.tap,ctx.PAL.violet];this.cA=[abgr(ctx.PAL.tap),abgr(ctx.PAL.violet)];this.cD=abgr(DIM);

const nodes=L.d.nodes,ex=(list)=>{const x=[],s=[];for(const e of list){const a=nodes[e[0]],b=nodes[e[1]];if(!a||!b||a.community ==='untagged'|| b.community ==='untagged') continue;(a.community!==b.community?x:s).push(e);} return [x,s];};
this.ex=[ex(L.d.tap_edges),ex(L.d.auto_edges)];

this.cell=new Uint8Array(N);this.u=new Float32Array(N);this.v=new Float32Array(N);
const cnt=new Int32Array(201);
for(let i=0;i<N;i++){const c=Math.min(199,Math.floor(ctx.hash(i*3+7)*200));this.cell[i]=c;this.u[i]=ctx.hash(i*3+8);this.v[i]=ctx.hash(i*3+9);cnt[c+1]++;}
for(let c=0;c<200;c++) cnt[c+1]+=cnt[c];
this.off=cnt.slice();this.idx=new Int32Array(N);const w=cnt.slice();
for(let i=0;i<N;i++) this.idx[w[this.cell[i]]++]=i;
const root=this.root=el('div','hd');root.hidden=true;
L.root.insertBefore(root,L.hit.nextSibling);
const head=(g,who,n)=>{
const h=el('p','hd-h');const sw=el('i');sw.style.background ='#'+ this.col[g].toString(16).padStart(6,'0');sw.setAttribute('aria-hidden','true');
h.append(sw,el('span','',who),el('span','hd-n','· '+ fmt(n) +' jumps'),el('span','hd-v',g?this.a1:this.t1));
return root.appendChild(h);
};
this.heads=[head(0,'when i picked',fx.n_tap),head(1,'when autoplay ran on',fx.n_auto)];
this.hit=root.appendChild(el('div','hd-hit'));this.hit.setAttribute('aria-hidden','true');
this.offHit=ctx.gesture.bind(this.hit,{
hover:(p)=>this.hover(this.cellAt(p.sx,p.sy),ctx,'mouse'),
leave:()=>this.hover(-1,ctx),
tap:(p)=>this.hover(this.cellAt(p.sx,p.sy),ctx,'touch',true),
hold: {delay: 160,press:(p)=>this.hover(this.cellAt(p.sx,p.sy),ctx,'touch',true),move:(p)=>this.hover(this.cellAt(p.sx,p.sy),ctx,'touch'),end:()=>{try {ctx.post.undwell({keep: true});} catch(e){}}},
cursor:(p)=>(this.cellAt(p.sx,p.sy)>=0 ?'pointer':'default'),
});

const kb=this.kbEl=root.appendChild(el('div','hd-kb'));kb.tabIndex=0;kb.setAttribute('role','listbox');
kb.setAttribute('aria-label','the hundred jumps, 100 cells per listener. arrows walk the cells, enter plays the run');
const frag=document.createDocumentFragment();
for(let id=0;id<200;id++){const o=el('div','',this.cellText(id));o.id ='hd-o'+ id;o.setAttribute('role','option');o.setAttribute('aria-selected','false');frag.appendChild(o);}
kb.appendChild(frag);
kb.addEventListener('focus',()=>{if(this.kb<0) this.kbTo(0,ctx);else this.kbTo(this.kb,ctx);});
kb.addEventListener('blur',()=>{this.hover(-1,ctx);});
kb.addEventListener('keydown',(e)=>{
let k=this.kb<0?0:this.kb;const g=k>=100?100:0,c=k-g;
if(e.key ==='Enter'|| e.key ===' '){e.preventDefault();e.stopPropagation();this.play(ctx);return;}
if(e.key ==='ArrowRight') k=Math.min(199,k+1);
else if(e.key ==='ArrowLeft') k=Math.max(0,k-1);
else if(e.key ==='ArrowDown') k=g+Math.min(99,c+10);
else if(e.key ==='ArrowUp') k=g+Math.max(0,c-10);
else if(e.key ==='Home') k=0;
else if(e.key ==='End') k=199;
else return;
e.preventDefault();e.stopPropagation();this.kbTo(k,ctx);
});
const f=this.foot=root.appendChild(el('div','hd-f'));
const b=this.btn=f.appendChild(el('button','hd-play'));b.type ='button';
b.append(el('span','','▸'));this.btnT=b.appendChild(el('span','','play the hundred'));b.firstChild.setAttribute('aria-hidden','true');b.setAttribute('aria-label','play the hundred');
b.addEventListener('click',()=>this.play(ctx));
f.appendChild(el('p','hd-r',this.t1 +' ÷ '+ this.a1 +' = '+ this.ratio +' [1.03, 1.08]: the bridge index'));
this.cond=f.appendChild(el('p','hd-c'));
this.tag=root.appendChild(el('p','hd-tag'));this.tag.hidden=true;
},
cellText(id){
const g=id>=100?1:0,k=id % 100,f=this.fill[g][k],who=g ?'autoplay':'my pick';
const st=f>=1 ?'crossed into another genre': f>0?Math.round(f*100) / 100 +' of a jump crossed ('+(g?this.a1:this.t1) +' of 100)':'stayed in its genre';
return who +', jump '+(k+1) +' of 100: '+ st+(g===0&&k>this.last[1]-1&&f>0 ?', part of the difference':'');
},
show(ctx){
const L=this.L,first=!this.on;
if(!this.root) this.build(ctx);
this.on=true;this.root.hidden=false;
L.hit.style.display ='none';L.listbox.hidden=true;L.tag.hidden=true;L.cue.hidden=true;L.pinned=false;L.kbFocusIdx=null;L.hoverI=-1;
clearTimeout(L.labT);clearTimeout(L._introT);if(!L.interacted) L.introShown=false;L.labOn=false;try {ctx.labels.clear('listeners');} catch(e){}
try {ctx.atlas.setLines(null);} catch(e){}
try {ctx.view.configure({mode:'none'});} catch(e){}
[L.bTap,L.bAuto].forEach((x,i)=>{x.className ='';x.setAttribute('aria-checked','false');x.tabIndex=i?-1:0;});
L.live.textContent ='showing: the hundred jumps';L.live.classList.add('clip');
this.layout(ctx);
if(first){
this.stopRun();this.hov=-1;this.tag.hidden=true;
const anim=!ctx.reduced;
this.lit=anim?-1:99;this.paint(ctx);
if(anim){clearTimeout(this.autoT);this.autoT=setTimeout(()=>{if(this.on) this.play(ctx,true);},650);}
} else this.paint(ctx);
},
hide(ctx){
if(!this.on) return;
const L=this.L;this.on=false;this.stopRun();clearTimeout(this.autoT);this.demoT.forEach(clearTimeout);this.demoT=[];
this.root.hidden=true;this.tag.hidden=true;this.hov=-1;
L.hit.style.display ='';L.listbox.hidden=false;try {ctx.particles.w.fill(255);} catch(e){}
const m=L.mode;L.bTap.className=m ==='tap'?'on':'';L.bTap.setAttribute('aria-checked',String(m ==='tap'));L.bTap.tabIndex=m ==='tap'? 0:-1;
L.bAuto.className=m ==='auto'?'on':'';L.bAuto.setAttribute('aria-checked',String(m ==='auto'));L.bAuto.tabIndex=m ==='auto'? 0:-1;
L.announce();L.fitLive();
try {ctx.audio.tick(null);} catch(e){}
try {ctx.post.undwell();} catch(e){}
},

layout(ctx){
const L=this.L,s=ctx.stage(),narrow=s.w<560;
const pad=narrow?14:24,hH=22,top=s.y+pad+hH,bot=s.y+s.h-(L.tgH||56)-30;
const aw=s.w-pad*2,beside=bot-top<300&&aw>=300,fs=this.foot.style;
const fw=beside?Math.max(160,Math.min(300,aw*0.45)):Math.min(aw,720),nr=narrow||beside;
this.root.classList.toggle('nr',nr);this.root.classList.toggle('bs',beside);this.btnT.textContent=nr ?'play':'play the hundred';

this.cond.textContent=beside ?'a direction, not a size: how untagged jumps are handled moves it 1.00 to 1.13.':'a direction, not a size: a third of my jumps carry no genre tag; how they are handled moves the index '+(nr ?'1.00 to 1.13. lit: crossed · dark: stayed · dashes: 1.00.':'anywhere from 1.00 to 1.13. lit: crossed genre · dark: stayed · dashes: where 1.00 would stop.');
fs.width=fw +'px';fs.justifyContent=nr ?'flex-start':'center';fs.textAlign=nr ?'left':'center';
const fH=this.foot.offsetHeight||90,footH=beside?0:fH+14,ah=bot-top-footH,gw=beside?aw-fw-20:aw;
const gap=narrow||beside?12:40;
const side=Math.min((gw-gap) / 2,ah),stack=beside?0:Math.min(gw,(ah-hH-gap) / 2);
const wide=side>=stack*0.92,G=Math.max(60,Math.floor(Math.min(wide?side:stack,narrow?300:380)));
const tw=wide?G*2+gap:G,th=wide?G:G*2+gap+hH,all=beside?tw+20+fw:tw;
const x0=Math.round(s.x+(s.w-all) / 2),y0=Math.round(top+Math.max(0,(ah-th) / 2));
this.G=G;this.cp=G / 10;
this.gx=[x0,wide?x0+G+gap:x0];this.gy=[y0,wide?y0:y0+G+gap+hH];
if(beside){fs.left=(x0+tw+20) +'px';fs.top=Math.round(Math.max(s.y+4,Math.min(y0+(th-fH) / 2,bot+18-fH))) +'px';}
else {fs.left=Math.round(s.x+(s.w-fw) / 2) +'px';fs.top=(y0+th+14) +'px';}
for(let g=0;g<2;g++){const h=this.heads[g].style;h.left=this.gx[g] +'px';h.top=(this.gy[g]-hH) +'px';h.width=G +'px';this.heads[g].children[1].textContent=G<100?(g ?'auto':'mine'):G<170?(g ?'autoplay':'mine'):G<210?(g ?'autoplay ran on':'i picked'):g ?'when autoplay ran on':'when i picked';this.heads[g].classList.toggle('xs',G<140);}
const hs=this.hit.style;hs.left=x0 +'px';hs.top=y0 +'px';hs.width=tw +'px';hs.height=th +'px';
const ks=this.kbEl.style;ks.left=x0 +'px';ks.top=(y0-hH) +'px';ks.width=tw +'px';ks.height=(th+hH) +'px';
},

paint(ctx){for(let c=0;c<200;c++) this.paintCell(ctx,c);},
paintCell(ctx,c){
const P=ctx.particles,g=c>=100?1:0,k=c-g*100,f=k<=this.lit?this.fill[g][k]:0,on=this.cA[g],off=this.cD;
const I=this.idx,U=this.u,V=this.v,TC=P.tc,TX=P.tx,TY=P.ty,W=P.w,a=this.off[c],b=this.off[c+1];
const cp=this.cp,inn=cp*0.8,x0=this.gx[g]+(k % 10)*cp+cp*0.1,y0=this.gy[g]+((k / 10) | 0)*cp+cp*0.1,q=f>0?1:0.64,o=(1-q) / 2;
for(let j=a;j<b;j++){const i=I[j],l=U[i]<f;TC[i]=l?on:off;W[i]=l?255:46;TX[i]=x0+(o+U[i]*q)*inn;TY[i]=y0+(o+V[i]*q)*inn;}
if(ctx.reduced) for(let j=a;j<b;j++){const i=I[j];P.c[i]=TC[i];P.x[i]=TX[i];P.y[i]=TY[i];}
},
cellAt(x,y){
for(let g=0;g<2;g++){
const lx=x-this.gx[g],ly=y-this.gy[g];
if(lx>=0&&ly>=0&&lx<this.G&&ly<this.G) return g*100+Math.min(9,(ly / this.cp) | 0)*10+Math.min(9,(lx / this.cp) | 0);
}
return -1;
},
centre(id){const g=id>=100?1:0,k=id % 100;return [this.gx[g]+(k % 10+0.5)*this.cp,this.gy[g]+(((k / 10) | 0)+0.5)*this.cp];},

deg(k){return(k % 10)+((k / 10) | 0);},
octUp(k){return k>=50;},
example(id){
const g=id>=100?1:0,k=id % 100,f=this.fill[g][k],set=this.ex[g][f>=0.5?0:1];
if(!set.length) return null;
const e=set[(k*7+g*3) % set.length],n=this.L.d.nodes;
return {a: n[e[0]],b: n[e[1]]};
},
hover(id,ctx,via,force){
if(id===this.hov&&!force) return;
this.hov=id;
if(id<0){this.tag.hidden=true;try {ctx.audio.tick(null);} catch(e){} try {ctx.post.undwell();} catch(e){} return;}
const g=id>=100?1:0,k=id % 100,f=this.fill[g][k],[x,y]=this.centre(id);
try {ctx.audio.tick('hd:'+ id,{deg: this.deg(k),plays: this.octUp(k)?10:100,x,y,kind:'glyph',force: !!force});} catch(e){}
const ex=this.example(id),t=this.tag;t.textContent ='';
const st=f>=1 ?'crossed': f>0?Math.round(f*100) / 100 +' of a jump crossed: '+(g?this.a1:this.t1) +' of 100':'stayed';
t.append(el('b','',(g ?'autoplay':'my pick') +' · jump '+(k+1) +' · '+ st));
if(ex){t.append(el('span','',ex.a.name +' → '+ ex.b.name),el('span','',ex.a.community +' → '+ ex.b.community),el('span','','an example, not this cell'));}
t.hidden=false;
const s=ctx.stage(),w=Math.min(260,s.w-16),right=x+this.cp+w<s.x+s.w;
t.style.left=Math.round(right?x+this.cp*0.7:Math.max(s.x+8,x-this.cp*0.7-w)) +'px';t.style.top=Math.round(Math.max(s.y+4,y-this.cp*0.5-6)) +'px';
if(ex&&via&&ctx.post&&ctx.post.dwell){try {ctx.post.dwell(ex.b.name,{x: x+12,y: y+12,touch: via ==='touch'});} catch(e){}}
},
kbTo(id,ctx){
const kb=this.kbEl;if(this.kb>=0&&kb.children[this.kb]) kb.children[this.kb].setAttribute('aria-selected','false');
this.kb=id;const o=kb.children[id];if(o){o.setAttribute('aria-selected','true');kb.setAttribute('aria-activedescendant',o.id);}
this.hover(id,ctx,null,true);
},

play(ctx,auto){
this.stopRun();
clearTimeout(this.autoT);
const A=ctx.audio,run=this.run={t0: performance.now()+40,k: -1,oscs: [],nodes: [],pans: []};
if(!ctx.reduced){this.lit=-1;this.paint(ctx);}
if(!auto) this.demoT.forEach(clearTimeout);
if(A&&A.ac&&A.on&&!A.muted&&A.sfx){
try {
const ac=A.ac,t0=ac.currentTime+0.04,pcs=(A.pitches?A.pitches():[2,5,7,9,0]).map((p)=>(p-2+12) % 12).sort((a,b)=>a-b),L=pcs.length;
const semi=(k)=>pcs[this.deg(k) % L]+(this.octUp(k)?12:0);
const voice=(pan)=>{const g=ac.createGain();g.gain.value=1;let out=g;if(typeof ac.createStereoPanner ==='function'){const p=ac.createStereoPanner();p.pan.value=pan;g.connect(p);out=p;run.pans.push(p);} out.connect(A.sfx);run.nodes.push(g,out);return g;};
const vs=[voice(-0.8),voice(0.8)],type=['triangle','sine'];
const blip=(dst,f,at,vol,ty,dur)=>{const o=ac.createOscillator(),g=ac.createGain();o.type=ty;o.frequency.value=f;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(vol,at+0.006);g.gain.exponentialRampToValueAtTime(0.0001,at+dur);o.connect(g);g.connect(dst);o.start(at);o.stop(at+dur+0.05);run.oscs.push(o);};
for(let v=0;v<2;v++) for(let k=0;k<=this.last[v];k++) blip(vs[v],293.66*Math.pow(2,semi(k) / 12),t0+k*STEP / 1000,0.022*Math.max(0.25,this.fill[v][k]),type[v],0.14);

const tb=t0+(this.last[0]+1.6)*STEP / 1000,fb=293.66*Math.pow(2,(pcs[0]+24) / 12);
blip(vs[0],fb,tb,0.05,'sine',1.8);blip(vs[0],fb*2.76,tb,0.012,'sine',0.7);
run.voices=[{pan: -0.8,notes: this.last[0]+2},{pan: 0.8,notes: this.last[1]+1}];
} catch(e){}
}
run.end=run.t0+(this.last[0]+2)*STEP;
if(auto&&ctx.tour&&ctx.tour.active&&ctx.tour.active.playing) this.demo(ctx,run.end-performance.now()+500);
},
stopRun(){
const r=this.run;if(!r) return;this.run=null;
const t=this.ctx&&this.ctx.audio&&this.ctx.audio.ac?this.ctx.audio.ac.currentTime:0;
r.oscs.forEach((o)=>{try {o.stop(t);} catch(e){}});
r.nodes.forEach((n)=>{try {n.disconnect();} catch(e){}});
if(this.lit<99&&this.on&&this.ctx){this.lit=99;this.paint(this.ctx);}
},

demo(ctx,wait){
const at=(ms,f)=>this.demoT.push(setTimeout(()=>{if(this.on) f();},ms));
at(wait,()=>this.hover(68,ctx,null,true));
at(wait+1800,()=>this.hover(130,ctx,null,true));
at(wait+3600,()=>this.hover(-1,ctx));
},
frame(g,ctx){
if(!this.root) return;
const r=this.run;
if(r){
const k=Math.min(99,Math.floor((performance.now()-r.t0) / STEP));
while(r.k<k){r.k++;this.lit=r.k;this.paintCell(ctx,r.k);this.paintCell(ctx,100+r.k);}
if(performance.now()>r.end+2000){this.run=null;r.oscs.length=0;}
}
/* reduced motion holds the grid still: shell warmField (apple engines) nudges dots 0..143 once, on the first glyph frame, and never puts them back */
if(ctx.reduced){const P=ctx.particles,X=P.x,Y=P.y,C=P.c,TX=P.tx,TY=P.ty,TC=P.tc,I=this.idx;for(let j=this.off[0],n=this.off[200];j<n;j++){const i=I[j];X[i]=TX[i];Y[i]=TY[i];C[i]=TC[i];}}
const cp=this.cp,G=this.G,sz=cp*0.84,pd=cp*0.08;
g.lineWidth=1;
for(let q=0;q<2;q++){
const x0=this.gx[q],y0=this.gy[q],F=this.fill[q];

g.globalAlpha=0.22;g.strokeStyle ='#7d7396';g.beginPath();
for(let k=0;k<100;k++) g.rect(x0+(k % 10)*cp+pd+0.5,y0+((k / 10) | 0)*cp+pd+0.5,sz-1,sz-1);
g.stroke();

const a=this.fill[1],whole=Math.floor(this.last[1]),fr=a[whole],rw=(whole / 10) | 0,cw=whole % 10;
g.globalAlpha=0.55;g.strokeStyle ='#86cbfe';g.setLineDash([3,3]);g.beginPath();
g.moveTo(x0,y0);g.lineTo(x0+G,y0);g.lineTo(x0+G,y0+rw*cp);g.lineTo(x0+(cw+fr)*cp,y0+rw*cp);
g.lineTo(x0+(cw+fr)*cp,y0+(rw+1)*cp);g.lineTo(x0,y0+(rw+1)*cp);g.closePath();g.stroke();g.setLineDash([]);

if(q===0){
g.globalAlpha=0.95;g.strokeStyle ='#86cbfe';g.lineWidth=1.6;g.beginPath();
for(let k=this.last[1];k<=this.last[0];k++) if(k<=this.lit&&F[k]>0) g.rect(x0+(k % 10)*cp+pd-1.5,y0+((k / 10) | 0)*cp+pd-1.5,sz+3,sz+3);
g.stroke();g.lineWidth=1;
}
}
const mark=(id,a,w)=>{if(id<0) return;const [x,y]=this.centre(id);g.globalAlpha=a;g.strokeStyle ='#86cbfe';g.lineWidth=w;g.strokeRect(x-sz / 2-2.5,y-sz / 2-2.5,sz+5,sz+5);g.lineWidth=1;};
if(r&&r.k>=0){if(r.k<=this.last[0]) mark(r.k,0.9,2);if(r.k<=this.last[1]) mark(100+r.k,0.9,2);}
mark(this.hov,1,2);
g.globalAlpha=1;
},

state(){
const sum=(F)=>{let s=0;for(let k=0;k<100;k++) s+=F[k];return Math.round(s*1000) / 1000;};
return {on: this.on,fills: this.fill&&[Array.from(this.fill[0]),Array.from(this.fill[1])],sums: this.fill&&[sum(this.fill[0]),sum(this.fill[1])],
lit: this.lit,last: this.last,run: this.run?{k: this.run.k,voices: this.run.voices||null,pans: this.run.pans.map((p)=>p.pan.value)}:null,
grid: this.gx&&{G: this.G,gx: this.gx.slice(),gy: this.gy.slice()},ratio: this.ratio,t1: this.t1,a1: this.a1};
},
};
export default H;
