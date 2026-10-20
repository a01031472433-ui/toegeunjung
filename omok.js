/* 돌목 — 15×15 오목 규칙과 컴퓨터 돌 (서버 없이 돌아가요) */
(function(){
const N=15;
const DIRS=[[1,0],[0,1],[1,1],[1,-1]];
const idx=(x,y)=>y*N+x;
function boardOf(moves){const b=new Array(N*N).fill(0);moves.forEach((m,i)=>{b[idx(m[0],m[1])]=i%2===0?1:2});return b}
/* 마지막 수로 다섯(이상)이 됐는지 — 이긴 줄 좌표를 돌려줘요 */
function winLine(b,x,y){const c=b[idx(x,y)];if(!c)return null;
 for(const [dx,dy] of DIRS){const line=[[x,y]];
  for(let s=1;s<5;s++){const nx=x+dx*s,ny=y+dy*s;if(nx<0||ny<0||nx>=N||ny>=N||b[idx(nx,ny)]!==c)break;line.push([nx,ny])}
  for(let s=1;s<5;s++){const nx=x-dx*s,ny=y-dy*s;if(nx<0||ny<0||nx>=N||ny>=N||b[idx(nx,ny)]!==c)break;line.unshift([nx,ny])}
  if(line.length>=5)return line}
 return null}
function result(moves){const b=boardOf(moves);if(!moves.length)return {b,win:null,full:false};const [x,y]=moves[moves.length-1];const w=winLine(b,x,y);
 return {b,win:w?{color:moves.length%2===1?1:2,line:w}:null,full:moves.length>=N*N}}
function legal(moves,x,y){if(!(x>=0&&y>=0&&x<N&&y<N))return false;return !moves.some(m=>m[0]===x&&m[1]===y)}

/* ---- 컴퓨터 돌: 줄 모양 점수 ---- */
const S={FIVE:1e7,OPEN4:1e6,FOUR:1.2e5,OPEN3:1e5,CLOSED3:1.5e3,OPEN2:900,CLOSED2:90,ONE:12};
const PAT=[["xxxxx",S.FIVE],[".xxxx.",S.OPEN4],["xxxx.",S.FOUR],[".xxxx",S.FOUR],["xxx.x",S.FOUR],["x.xxx",S.FOUR],["xx.xx",S.FOUR],
 [".xxx..",S.OPEN3],["..xxx.",S.OPEN3],[".xx.x.",S.OPEN3],[".x.xx.",S.OPEN3],
 ["xxx..",S.CLOSED3],["..xxx",S.CLOSED3],["xx.x.",S.CLOSED3],[".x.xx",S.CLOSED3],["x.xx.",S.CLOSED3],[".xx.x",S.CLOSED3],["xx..x",S.CLOSED3],["x..xx",S.CLOSED3],
 ["..xx..",S.OPEN2],[".x.x..",S.OPEN2],["..x.x.",S.OPEN2],[".xx..",S.CLOSED2],["..xx.",S.CLOSED2],["xx...",S.CLOSED2],["...xx",S.CLOSED2]];
function lineStr(b,x,y,dx,dy,c){let s="";for(let k=-5;k<=5;k++){const nx=x+dx*k,ny=y+dy*k;
  if(k===0){s+="x";continue}
  if(nx<0||ny<0||nx>=N||ny>=N){s+="o";continue}const v=b[idx(nx,ny)];s+=v===0?".":v===c?"x":"o"}return s}
function dirScore(str){let best=S.ONE;const C=5;
 for(const [p,v] of PAT){if(v<=best)continue;let from=0;
  while(true){const i=str.indexOf(p,from);if(i<0)break;if(i<=C&&C<i+p.length&&p[C-i]==="x"){best=v;break}from=i+1}}
 return best}
/* c 색이 (x,y)에 두면 얼마나 좋은지 */
function pointScore(b,x,y,c){const ds=DIRS.map(([dx,dy])=>dirScore(lineStr(b,x,y,dx,dy,c)));
 let sum=ds.reduce((a,v)=>a+v,0);
 const fours=ds.filter(v=>v>=S.FOUR&&v<S.FIVE).length,threes=ds.filter(v=>v===S.OPEN3).length;
 if(ds.some(v=>v>=S.FIVE))return S.FIVE*10;
 if(fours>=2||(fours>=1&&threes>=1))sum+=S.OPEN4*0.9;
 else if(threes>=2)sum+=S.OPEN4*0.5;
 return sum}
function candidates(b,moves){if(!moves.length)return [[7,7]];const set=new Set(),out=[];
 moves.forEach(([mx,my])=>{for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=mx+dx,y=my+dy;if(x<0||y<0||x>=N||y>=N||b[idx(x,y)])continue;const k=idx(x,y);if(!set.has(k)){set.add(k);out.push([x,y])}}});
 return out}
function ranked(b,moves,me,defW){const op=me===1?2:1;
 return candidates(b,moves).map(([x,y])=>{const a=pointScore(b,x,y,me),d=pointScore(b,x,y,op);
  const center=7-Math.max(Math.abs(x-7),Math.abs(y-7));
  return {x,y,a,d,s:a+d*defW+center}}).sort((p,q)=>q.s-p.s)}
/* level: 0 쉬움 · 1 보통 · 2 어려움 */
function aiMove(moves,level,rnd){rnd=rnd||Math.random;
 const b=boardOf(moves),me=moves.length%2===0?1:2,op=me===1?2:1;
 if(!moves.length)return [7,7];
 const R=ranked(b,moves,me,level===0?0.75:0.95);
 /* 이기는 수는 무조건 · 막아야 할 수는 쉬움에서도 대부분 막아요 */
 const win=R.find(p=>p.a>=S.FIVE);if(win)return [win.x,win.y];
 const must=R.filter(p=>p.d>=S.FIVE).sort((p,q)=>q.a-p.a)[0];
 if(must&&(level>0||rnd()<0.85))return [must.x,must.y];
 if(level===0){const top=R.slice(0,6),w=top.map((p,i)=>1/(i+1.4));const t=w.reduce((a,v)=>a+v,0);let r=rnd()*t;for(let i=0;i<top.length;i++){r-=w[i];if(r<=0)return [top[i].x,top[i].y]}return [top[0].x,top[0].y]}
 if(level===1){const top=R.slice(0,3);const p=rnd()<0.75?top[0]:top[Math.floor(rnd()*top.length)];return [p.x,p.y]}
 /* 어려움: 상위 후보마다 상대의 가장 좋은 응수를 한 번 더 봐요 */
 let best=null,bv=-Infinity;
 for(const p of R.slice(0,10)){b[idx(p.x,p.y)]=me;
  const rep=ranked(b,moves.concat([[p.x,p.y]]),op,0.9);
  const oppBest=rep.length?Math.max(rep[0].a,0):0;
  const myNext=ranked(b,moves.concat([[p.x,p.y]]),me,0)[0];
  b[idx(p.x,p.y)]=0;
  const v=p.a*1.0+p.d*0.9-oppBest*0.85+(myNext?myNext.a*0.15:0);
  if(v>bv){bv=v;best=p}}
 return [best.x,best.y]}
window.OMOK={N,boardOf,winLine,result,legal,aiMove};
})();
