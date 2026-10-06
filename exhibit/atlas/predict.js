const V=new URL(import.meta.url).search,KEY='exhibit.predict';
const sg=()=>{try{return JSON.parse(sessionStorage.getItem(KEY))||{}}catch{return {}}};
const ss=o=>{try{sessionStorage.setItem(KEY,JSON.stringify(o))}catch{}};
const n0=v=>Number(v).toLocaleString('en-US'),hh=h=>(h<10?'0':'')+h+':00';
const COND='1.05 [1.03, 1.08], a direction, not a size: how the untagged jumps are handled moves it 1.00 to 1.13; the loosest or 50-play definitions read 1.01.';
const Q={
clock:{f:'clock',lab:'peak hour',ask:'which hour of the day did i play the most?',lo:0,hi:23,st:1,fmt:hh,circ:1,
truth:d=>{let v=0,n=-1;d.hours.forEach((h,i)=>{const s=d.tap[i]+d.shuffle[i]+d.served[i];if(s>n){n=s;v=h}});return {v,n}},
say:t=>hh(t.v)+': '+n0(t.n)+' plays, the peak hour on one fixed clock, all year; 13:00 trails by 55.'},
listeners:{f:'twolisteners',lab:'my jumps crossing',ask:'100 jumps between two genre-tagged artists, each time i picked the next song. how many crossed into another genre?',lo:0,hi:100,st:1,
truth:d=>{const c=d.full_transition_crossing,p=x=>Math.round(x*1000)/10;return {v:Math.round(c.tap*100),x:p(c.tap),a:Math.round(c.auto*100),ax:p(c.auto)}},
say:t=>'about '+t.v+' ('+t.x+'). when autoplay ran on (the next song starting on its own, shuffle off), about '+t.a+' ('+t.ax+'). '+t.x+' ÷ '+t.ax+' is the bridge index: '+COND},
bail:{f:'bail',lab:'skip-fwd in 5 s',ask:'of every 100 times i pressed skip-forward, how many came inside the first five seconds of the song?',lo:0,hi:100,st:1,no:'guess',
truth:d=>({v:Math.round(d.bins[0][2]/d.n_fwd*100),n:d.bins[0][2],N:d.n_fwd,r:d.n_in5_in_runs}),
say:t=>t.v+': '+n0(t.n)+' of '+n0(t.N)+' skip-forwards inside 5 s; '+n0(t.r)+' of them in runs.'},
loop:{f:'loops',lab:'songs played 10+',ask:'how many different songs did i play 10 times or more?',lo:0,hi:5000,st:50,fmt:n0,
truth:d=>({v:d.tracks_10plus}),
say:t=>n0(t.v)+' songs my log counts 10 times or more (counted plays: 30 s or more).'},
graveyard:{on:'kill',f:'killit',lab:'a claim: loops',ask:'a claim i tried to kill: my listening network has real topological loops, not just tight neighborhoods. did it survive?',opts:['survived','died'],
truth:d=>({v:d.cases[1].v==='s'?0:1,x:d.cases[1].x}),
say:t=>'it '+(t.v?'died':'survived')+': '+t.x+'.'},
};
const OR=['wall','clock','listeners','bail','loop','graveyard'];
const miss=(q,g,v)=>{const d=Math.abs(g-v);return q.opts?+(g!==v):q.circ?Math.min(d,24-d)/12:d/(q.hi-q.lo)};
const fmt=(q,v)=>q.opts?q.opts[v]:q.fmt?q.fmt(v):String(v);
const D=document,mk=(t,c,x)=>{const e=D.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const btn=(x,c,f)=>{const b=mk('button',c,x);b.type='button';b.addEventListener('click',f);return b};
const at=(e,k,v)=>e.setAttribute(k,v);
const foc=e=>{try{e.focus({preventScroll:!0})}catch{}};
const wallG=()=>{try{const g=sessionStorage.getItem('exhibit.wall.guess');return g?Math.round(+g):null}catch{return null}};
const count=S=>OR.filter(id=>id==='wall'?wallG()!=null:S[id]&&S[id].t!=null).length;
function boot(X){
const ctx=X.ctx,A=ctx.audio,html=D.documentElement;
if(ctx.atlas.kiosk||navigator.webdriver&&!sg().on)return;
const L=mk('link');L.rel='stylesheet';L.href='exhibit/atlas/predict.css'+V;L.onerror=()=>{L.href+='&r=1'};D.head.appendChild(L);
let veil=null,box=null,pill=null,ent=null,mode='',cur=null,tk=0;
const note=(s,t)=>{try{A.note(s,{type:'triangle',vol:.05,dur:.6,at:t})}catch{}};
const sec=()=>D.querySelector('section[data-room].is-active')||D.body;
const grp=(e,l)=>{at(e,'role','group');at(e,'aria-label',l);return e};
const px=o=>{for(const k in o)o[k]+='px';return o};
function place(){const s=ctx.stage();
if(veil)Object.assign(veil.style,px({left:s.x,top:s.y,width:s.w,height:s.h}));
if(pill)Object.assign(pill.style,px({left:s.x,top:s.y+6,maxWidth:s.w}));
if(ent)Object.assign(ent.style,px({left:s.x+8,top:s.y+s.h-ent.offsetHeight-8}));
}
function close(){[veil,pill,ent].forEach(e=>e&&e.remove());veil=box=pill=ent=cur=null;mode='';html.classList.remove('pq-on');clearInterval(tk);tk=0}
const tick=()=>{if(!tk)tk=setInterval(place,250);place()};
function open(m,l){veil=mk('div','pq-veil');box=grp(mk('div','pq'),l);box.dataset.keepout='';veil.appendChild(box);sec().appendChild(veil);html.classList.add('pq-on');mode=m;tick()}
function ask(id){
const q=Q[id];close();
cur={id,q,g:q.opts?-1:(q.lo+q.hi)/2,set:0};
open('ask','call it first: '+q.ask);
box.append(mk('p','pq-k','call it first'),mk('p','pq-q',q.ask));
const go=cur.go=btn('call it','pq-go',commit);go.disabled=true;
if(q.opts){const r=mk('div','pq-row');cur.ob=q.opts.map((o,i)=>{const b=btn(o,'',()=>setG(i));at(b,'aria-pressed','false');r.appendChild(b);return b});box.appendChild(r)}
else{const v=cur.v=mk('span','pq-v','?'),i=cur.i=mk('input');at(v,'aria-hidden','true');
Object.assign(i,{type:'range',min:q.lo,max:q.hi,step:q.st,value:cur.g});at(i,'aria-label','your guess');at(i,'aria-valuetext','not set');
i.addEventListener('input',()=>setG(+i.value));box.append(v,i)}
const r=mk('div','pq-row');r.append(go,btn('skip','',skip));box.appendChild(r);
const o=cur.out=mk('p','pq-r');at(o,'role','status');box.appendChild(o);
if(!ctx.coarse)setTimeout(()=>foc(box.querySelector('input,button')),0);
}
function setG(g){
const q=cur.q;if(!q.opts)g=Math.max(q.lo,Math.min(q.hi,g));cur.g=g;cur.set=1;cur.go.disabled=false;
if(q.opts)cur.ob.forEach((b,i)=>at(b,'aria-pressed',String(i===g)));
else{cur.i.value=g;cur.v.textContent=fmt(q,g);at(cur.i,'aria-valuetext',fmt(q,g))}
}
function skip(){if(cur){const S=sg();S[cur.id]={skip:1};ss(S)}close()}
async function commit(){
if(!cur||!cur.set||mode!=='ask')return;
const c=cur,q=c.q;mode='wait';c.go.disabled=true;note(5);
const d=await ctx.data(q.f).catch(()=>0);
if(c!==cur)return;
if(!d){c.out.textContent='not loaded. try again.';mode='ask';c.go.disabled=false;return}
const t=q.truth(d),f=miss(q,c.g,t.v),S=sg();
S[c.id]={g:c.g,t:t.v,f:Math.round(f*1000)/1000};ss(S);
note(5,0.25);note(5-(f<0.02?0:Math.min(7,1+Math.round(f*9))),0.55);
mode='reveal';if(c.i)c.i.disabled=true;if(c.ob)c.ob.forEach(b=>{b.disabled=true});
if(!q.opts){
const tr=mk('div','pq-t'),P=v=>((v-q.lo)/(q.hi-q.lo)*100).toFixed(1)+'%',a=mk('i'),b=mk('i'),la=mk('b','',f<.12?'':'you'),lb=mk('b','','my log');
at(tr,'aria-hidden','true');a.style.left=b.style.left=la.style.left=P(c.g);lb.style.left=P(t.v);
tr.append(a,b,la,lb);c.v.after(tr);requestAnimationFrame(()=>{b.style.left=P(t.v)});
c.v.textContent=fmt(q,c.g)+' · '+fmt(q,t.v);
}
c.out.textContent=(f<0.02?'dead on. ':f<=0.1?'close. ':'you said '+fmt(q,c.g)+'. ')+q.say(t);
const r=c.go.parentNode,n=count(S);r.textContent='';
r.appendChild(btn('continue','pq-go',close));if(n>=2)r.appendChild(btn('your calls · '+n,'',showCard));
foc(r.firstChild);
}
async function rows(){
const S=sg(),out=[];let near=0;
for(const id of OR){
let g,v,f,lab=id==='wall'?'tapped of 100':Q[id].lab;
if(id==='wall'){g=wallG();if(g==null)continue;const w=await ctx.data('wall').catch(()=>0);if(!w)continue;v=w.pct_rounded.tap;f=Math.abs(g-v)/100;v+=' (strict 11.5)'}
else{const s=S[id];if(!s||s.t==null)continue;g=fmt(Q[id],s.g);v=fmt(Q[id],s.t);f=s.f}
if(f<=0.1)near++;
out.push({cells:[lab,String(g),String(v)],colors:['ink',f<=0.1?'ice':'mute','ink']});
}
return {out,near};
}
async function showCard(){
const R=await rows();if(!R.out.length)return;
let C;try{C=await import('./card.js'+V)}catch{return}
close();open('card','your calls');
const J=R.out.some(r=>r.cells[0]===Q.listeners.lab),nt='you called '+R.near+' of '+R.out.length+' close (within a tenth of the range).';
const spec={kicker:'CALL IT FIRST',title:'your guesses against my log',rows:R.out,cols:['','you','my log'],note:nt,
fine:'this scores your guesses, not my listening.'+(J?' the 100 jumps: '+COND:'')};
const text='call it first · '+R.out.map(r=>r.cells[0]+': you '+r.cells[1]+', my log '+r.cells[2]).join(' · ')+' · '+nt+(J?' bridge index '+COND:'')+' astralcrest.github.io/sonicManifold/exhibit.html';
const img=mk('img');img.alt=text;
box.append(mk('p','pq-k','your calls'),mk('p','',nt),img);
const bar=C.bar(box,{ctx,label:'share your calls'}),r=mk('div','pq-row');r.appendChild(btn('close','',close));box.appendChild(r);
const f=await bar.set(spec,text,'call-it-first.png');
if(f&&img.isConnected)img.src=URL.createObjectURL(f);
if(!ctx.coarse&&bar.el.isConnected)foc(bar.el.querySelector('button'));
}
function entry(){
const n=count(sg());if(veil||pill||ent||!n)return;
ent=grp(mk('div','pq pq-end'),'your calls');ent.dataset.keepout='';
ent.appendChild(btn('your calls · '+n,'',showCard));sec().appendChild(ent);tick();
}
function arrive(ev){
close();const id=ev&&ev.id,q=Q[id];
if(q&&!sg()[id]){
let a=null;try{a=ctx.angle.get().id}catch{}
if(q.on&&a!==q.on)return;
if(ctx.tour&&ctx.tour.isPlaying&&ctx.tour.isPlaying()){
pill=grp(mk('div','pq-pill'),'call it first');cur={id};
pill.append(btn('call it first: '+q.ask,'pq-po',()=>{try{ctx.tour.pause('user')}catch{}ask(id)}),btn('skip','',skip));
D.body.appendChild(pill);tick();return;
}
return ask(id);
}
const w=X.atlas.walk(),l=w[w.length-1];
if(id==='yours'||l&&(l.id||l)===id)entry();
}
ctx.onStop(arrive);
try{ctx.angle.onChange(a=>{if(a&&a.id==='kill')arrive({id:'graveyard'})})}catch{}
try{ctx.tour.on('end',()=>setTimeout(entry,600))}catch{}
addEventListener('resize',()=>{if(tk)place()});
D.addEventListener('keydown',e=>{
if(!mode||e.metaKey||e.ctrlKey||e.altKey)return;
const t=e.target,k=e.key;
if(!(box&&box.contains(t))&&t!==D.body&&t!==html&&t.id!=='atlas-stage')return;
if(t.tagName==='BUTTON'&&(k==='Enter'||k===' '))return;
let hit=1;
if(k==='Escape'||k==='s'&&mode!=='card')mode==='ask'?skip():close();
else if(k==='Enter')mode==='ask'?commit():mode==='reveal'?close():hit=0;
else if(mode==='ask'&&/^[0-9]$/.test(k)){if(cur.q.opts){if(k<'3'&&k>'0'){setG(k-1);foc(cur.go)}}else{const n=performance.now();cur.buf=(n-cur.bt<1500?cur.buf:'')+k;cur.bt=n;setG(+cur.buf)}}
else hit=0;
if(hit){e.preventDefault();e.stopPropagation()}
},true);
X.atlas.predict={showCard,close,get mode(){return mode}};
}
(function wait(k){
const X=window.__exhibit;
if(X&&X.atlas){X.ctx.atlas.ready.then(()=>boot(X));return}
if(k<200)setTimeout(()=>wait(k+1),100);
})(0);
