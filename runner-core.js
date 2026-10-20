/* 퇴근중 · 돌퇴근 — 게임 규칙 (화면과 분리된 순수 로직)
   - 고정 틱(1/120초) 시뮬레이션이라 같은 시드 + 같은 입력이면 항상 같은 결과가 나와요.
   - 그래서 기록 검증(verify)은 "입력 기록을 다시 돌려 보기"로 해요. 서버가 생기면 이 파일을 그대로 서버에서 돌리면 돼요.
   - 단위: 1m = 20u. y는 땅에서 위로 잰 높이. */
(function(root){
"use strict";
const TICK=1/120, M=20;
const LIVES=3, INV=1.5; // v12: 목숨 3개, 부딪힌 뒤 1.5초 무적
const PHY={G:2700,G_HOLD:1500,JV:640,DJV:560,HOLD:0.24,BUFFER:0.12,COYOTE:0.08,BOOST_SPEED:1.3,BOOST_JUMP:1.16,EFFECT:5,ACT:400,
 DUCK_MIN:.35,FASTFALL:900};
/* v13 방해 요소
   - 거대 팀장님(talk): 다리를 벌리고 선 커다란 팀장님 → 점프로는 못 넘고 「숙이기」로 다리 사이를 통과
   - 회식 2차 권유 구간(ZONE): 고기 냄새에 끌려 느려지고 「끌림」 게이지가 차요. 탭을 연타해서 버티면 탈출, 꽉 차면 ❤️ -1
     (구간 안에서는 탭이 점프가 아니라 버티기예요)
   - 단톡방 알림(NOTE): 화면 오른쪽을 가리는 알림이 1.1초마다 한 장씩(최대 3장) 쌓여요. 눌러서 닫기 → 목숨에는 영향 없고 점수만 +5 */
const ZONE={len:720,rate:1,push:.2,slow:.72,esc:50}; // 초당 약 3.5번 이상 눌러야 버텨요
const NOTE={grow:1.1,max:3,pts:5};
const TWIST={warn:420}; /* 반전 400u쯤 전에 경고 */
const LID={rate:.5,open:.3,pts:3}; /* 초당 0.62씩 감기고, 한 번 누를 때 0.3씩 떠요 */
/* 돌대리 충돌 상자 (그림보다 조금 작게 → 억울한 충돌 방지) */
const PB={w:28,h:36,dh:17}; // dh = 숙였을 때 높이
const PICK=8; // 아이템은 조금 넉넉하게 먹혀요

/* 장애물: w,h = 충돌 상자 / y = 떠 있는 높이 / vx = 다가오는 속도 / bob = 위아래 흔들림 */
const OBS={
 papers:{name:"서류더미",w:24,h:30,low:1},
 cup:{name:"커피컵",w:15,h:21,low:1},
 chair:{name:"회의실 의자",w:30,h:36,vx:-45},
 boss:{name:"팀장",w:22,h:56,tall:1},
 crowd:{name:"출근길 사람",w:26,h:58,vx:-35,tall:1},
 bag:{name:"가방",w:26,h:22,low:1},
 stairs:{name:"계단",w:52,h:28,wide:1},
 door:{name:"닫히는 문",w:16,h:70,tall:1},
 puddle:{name:"물웅덩이",w:58,h:6,wide:1},
 pigeon:{name:"비둘기",w:20,h:18,low:1},
 fpig:{name:"날아오는 비둘기",w:24,h:14,y:66,vx:-70,fly:1},
 cone:{name:"라바콘",w:20,h:32,low:1},
 phone:{name:"업무 전화",w:22,h:28,y:18,bob:5,tall:1},
 drunk:{name:"회식 권유",w:24,h:56,vx:-20,tall:1},
 talk:{name:"거대 팀장님",w:34,h:300,y:24,duck:1},
 plane:{name:"날아오는 결재 서류",w:24,h:12,y:62,vx:-85,fly:1},
 moto:{name:"배달 오토바이",w:38,h:30,vx:-60,low:1},
 squeeze:{name:"꽉 낀 인파",w:58,h:300,y:24,duck:1}, // v14.3 지옥철: 사람들 다리 사이로 숙여서 비집고 지나가기
 /* v19 STAGE 4 꿈속 회사 */
 sheep:{name:"세다 만 양",w:26,h:24,low:1},
 pillow:{name:"베개 더미",w:54,h:24,wide:1},
 clone:{name:"복제 팀장님",w:22,h:56,tall:1},
 zzz:{name:"날아오는 Zzz",w:24,h:16,y:64,vx:-60,fly:1},
 monday:{name:"거대 월요일 달력",w:44,h:300,y:24,duck:1},
};
const ITEMS={
 coffee:{name:"커피",icon:"☕",desc:"5초 동안 속도 UP"},
 shield:{name:"연차권",icon:"🛡️",desc:"5초 동안 충돌 방어"},
 shoes:{name:"운동화",icon:"👟",desc:"5초 동안 점프력 UP"},
};
/* 스테이지: len = 거리(u), v0→v1 = 시작→끝 속도(u/s), pool = 장애물 비율, extra = 추가 간격(시작, 끝), pair = 2연속 장애물 확률 */
const STAGES={
 1:{id:1,key:"office",name:"사무실 탈출",goal:"회사 출입문",win:"회사 탈출 성공!",len:9000,v0:233,v1:281,first:760,
    pool:{papers:3,cup:3,chair:2,boss:2,talk:1.3,plane:1.2},extra:[135,70],pair:.08,clear:300,notes:[.42]},
 2:{id:2,key:"subway",name:"지옥철 탈출",goal:"지하철 출구",win:"지옥철 탈출 성공!",len:11000,v0:263,v1:316,first:760,
    pool:{bag:3,crowd:2,stairs:2,door:2,squeeze:1.4},extra:[115,52],pair:.2,clear:400,notes:[.3,.72]},
 3:{id:3,key:"street",name:"집까지 질주",goal:"따뜻한 우리 집",win:"오늘도 칼퇴 성공!",len:13000,v0:288,v1:348,first:760,
    pool:{puddle:3,pigeon:2,fpig:1,cone:2,phone:2,moto:1.3},extra:[98,44],pair:.26,clear:500,zones:[.55],notes:[.25,.8]},
 /* v19: 퇴근하고 잠들었더니 꿈에서 야근 중 → 알람시계 ⏰ 3개(5개 중)를 모아 끝까지 가야 깨요. 1~3단계보다 확실히 어렵게:
   더 빠르고(330→400), 간격이 좁고, 2연속이 잦고, 「이불 속으로 5분만…」 구간 2번 · 꿈속 단톡 3번 */
 4:{id:4,key:"dream",name:"꿈에서 야근하기",goal:"알람시계",win:"꿈에서 깼다!",len:11000,v0:330,v1:400,first:760,
    pool:{sheep:3,pillow:2,clone:2,zzz:1.3,monday:1.4,plane:1},extra:[52,16],pair:.45,tight:.9,pwEvery:9,clear:900,zones:[.56],notes:[],
    alarms:[.14,.31,.48,.66,.84],need:3,title:"꿈 탈출러",
    twists:[[.2,1050],[.66,1150]], /* v19.1 😵 조작 반전 구간 [시작, 길이u]: 탭=숙이기, 숙이기=점프 */
    lids:[[.38,1300],[.86,1000]]}, /* v19.1 😪 눈꺼풀 구간: 점점 화면이 감기고, 눈꺼풀을 눌러야 떠요 */
 fri:{id:"fri",key:"friday",name:"불금 탈출",goal:"불금 포차",win:"불금 탈출 성공!",len:13000,v0:314,v1:369,first:760,
    pool:{drunk:2,phone:2,crowd:2,door:1,cone:2,cup:1,fpig:1,bag:1,stairs:1,talk:1,plane:1,moto:1},extra:[90,36],pair:.32,clear:700,title:"불금 탈출러",zones:[.36,.7],notes:[.2,.52,.86]},
};
STAGES[1].par=par(STAGES[1]);STAGES[4].par=par(STAGES[4]);STAGES[2].par=par(STAGES[2]);STAGES[3].par=par(STAGES[3]);STAGES.fri.par=par(STAGES.fri);
function par(S){return S.len/((S.v0+S.v1)/2)*1.12}

/* ---- v50: 퇴근길 이어 달리기 (1~4단계를 한 판으로) ----
   구간마다 원래 스테이지의 장애물·간격을 쓰고, 속도는 거리에 따라 계속 올라가요. 결승선은 없고 ❤️ 3개를 다 쓰면 끝.
   4구간(꿈) 뒤로는 「야근 N회차」가 사무실→지옥철→거리→꿈 순서로 계속 돌고, 더 빽빽하고 더 빨라져요. */
const SEG_BASE=[{sid:1,len:4000},{sid:2,len:5000},{sid:3,len:6000},{sid:4,len:6000}];
const LOOP_LEN=5000, RUN_LEN=200000;
const SPD=[[0,245],[4000,300],[9000,345],[15000,388],[21000,425],[41000,480],[81000,540],[200000,580]];
const SEGS=(function(){const a=[];let x=0;SEG_BASE.forEach((b,i)=>{a.push({i,sid:b.sid,key:STAGES[b.sid].key,name:STAGES[b.sid].name,x0:x,x1:x+b.len,loop:0});x+=b.len});
 let k=0;while(x<RUN_LEN){const sid=[1,2,3,4][k%4];a.push({i:a.length,sid,key:STAGES[sid].key,name:STAGES[sid].name,x0:x,x1:Math.min(RUN_LEN,x+LOOP_LEN),loop:1+Math.floor(k/4)});x+=LOOP_LEN;k++}return a})();
function segAt(x){let lo=0,hi=SEGS.length-1;while(lo<hi){const m=(lo+hi+1)>>1;if(SEGS[m].x0<=x)lo=m;else hi=m-1}return SEGS[lo]}
/* 특수 구간 위치(절대 좌표): 원래 스테이지와 같은 장치를 그 구간 안에 */
const RUN_FX=(function(){const zones=[],notes=[],twists=[],lids=[];
 SEGS.forEach(g=>{const L=g.x1-g.x0,at=f=>Math.round(g.x0+L*f);
  if(g.key==="office"){notes.push(at(.45));if(g.loop)zones.push(at(.6))}
  else if(g.key==="subway"){notes.push(at(.3),at(.75))}
  else if(g.key==="street"){zones.push(at(.5));notes.push(at(.2),at(.85))}
  else if(g.key==="dream"){if(!g.loop){twists.push([g.x0+600,1000]);lids.push([g.x0+1900,1100]);zones.push(g.x0+3300);twists.push([g.x0+4400,1000])}
   else{twists.push([at(.15),900]);lids.push([at(.55),1000])}}});
 return {zones,notes,twists,lids}})();
STAGES.run={id:"run",key:"office",name:"퇴근길 이어 달리기",goal:"갈 수 있는 데까지",win:"전설의 칼퇴!",len:RUN_LEN,v0:235,v1:560,first:760,endless:true,clear:0,
 twistsAbs:RUN_FX.twists,lidsAbs:RUN_FX.lids,pool:STAGES[1].pool};
STAGES.run.par=Infinity;
/* 구간별 장애물 설정: 원래 스테이지 값 + 야근 회차가 올라갈수록 더 빽빽하게 */
/* 난이도 손잡이(구간별): tight = 장애물 사이 간격 배율(작을수록 빽빽), pw = 몇 칸마다 아이템, pairAdd = 2연속 확률 추가 */
const RUN_TUNE=[{tight:.98,pw:11,pairAdd:.04,ex:.8},{tight:.94,pw:12,pairAdd:.08,ex:.7},{tight:.9,pw:13,pairAdd:.1,ex:.6},{tight:.88,pw:14,pairAdd:.06,ex:.6}];
function segParams(g){const S=STAGES[g.sid];if(!g.loop){const T=RUN_TUNE[g.i]||RUN_TUNE[3];return {pool:S.pool,extra:[S.extra[0]*T.ex,S.extra[1]*T.ex],pair:Math.min(.6,S.pair+T.pairAdd),tight:(S.tight||1)*T.tight,pwEvery:T.pw}}
 const k=Math.min(4,g.loop);const pool=Object.assign({},S.pool);if(g.sid!==4){pool.plane=(pool.plane||0)+.8;pool.fpig=(pool.fpig||0)+.5}
 return {pool,extra:[Math.max(14,44-k*8),Math.max(8,18-k*3)],pair:Math.min(.62,.46+k*.04),tight:Math.max(.8,.86-k*.02),pwEvery:15}}

function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const lerp=(a,b,p)=>a+(b-a)*p;
function speedAt(S,x){
 if(S.endless){for(let i=1;i<SPD.length;i++){if(x<SPD[i][0]){const [a,va]=SPD[i-1],[b,vb]=SPD[i];return lerp(va,vb,(x-a)/(b-a))}}return SPD[SPD.length-1][1]}
 return lerp(S.v0,S.v1,Math.min(1,Math.max(0,x/S.len)))}
function pick(r,pool){const e=Object.entries(pool);let t=e.reduce((a,[,w])=>a+w,0)*r();for(const [k,w] of e){if((t-=w)<0)return k}return e[0][0]}

/* 점프 궤적 (아이템 배치용): 길게 누른 점프의 시간별 높이 */
function arc(hold){const pts=[];let y=0,vy=PHY.JV,ht=0,t=0;while(t<2){const g=hold&&vy>0&&ht<PHY.HOLD?PHY.G_HOLD:PHY.G;if(hold&&vy>0)ht+=TICK;vy-=g*TICK;y+=vy*TICK;t+=TICK;if(y<=0)break;pts.push([t,y])}return pts}
const ARC_HOLD=arc(true);

/* ---- 코스 만들기 ----
   장애물 사이 간격 = (커피 먹은 최고 속도) × (점프하고 착지해서 다시 반응할 시간) + 무작위 여유.
   그래서 아무리 운이 나빠도 "넘을 수 없는 조합"은 나오지 않아요. (tests/runner-fair.js 로봇이 수천 판으로 확인) */
const T_AFTER={low:.71,tall:.82,wide:.77,fly:.64,pair:.83,duck:.7}; // v12 리듬 조이기 → v17 한 번 더 (약 4%)
function course(sid,seed){
 if(STAGES[sid]&&STAGES[sid].endless)return courseRun(sid,seed);
 const S=STAGES[sid], r=rng(seed>>>0), obs=[], items=[], zones=[], notes=(S.notes||[]).map(f=>({x:Math.round(S.len*f)}));
 let x=S.first, n=0, lastKind="low", zq=(S.zones||[]).slice(), aq=(S.alarms||[]).slice();
 const kindOf=o=>o.duck?"duck":o.fly?"fly":o.tall?"tall":o.wide?"wide":"low";
 while(x<S.len-520){
  const p=x/S.len, vmax=speedAt(S,x+400)*PHY.BOOST_SPEED;
  /* 회식 2차 권유 구간: 이 안에는 장애물이 없고 바닥에 자갈만 */
  if(zq.length&&x>=S.len*zq[0]){zq.shift();
   const z={x0:x,x1:x+ZONE.len};zones.push(z);
   for(let zx=z.x0+60;zx<z.x1-40;zx+=48)items.push({t:"pebble",x:zx,y:12});
   x=z.x1+speedAt(S,z.x1)*PHY.BOOST_SPEED*.8+120;lastKind="low";continue}
  let t=pick(r,S.pool);
  if(OBS[t].duck&&lastKind==="duck")t=Object.keys(S.pool)[0];
  if(OBS[t].fly&&lastKind==="fly")t="cone"in S.pool?"cone":Object.keys(S.pool)[0];
  const d=OBS[t];
  const o={i:obs.length,t,x:x,w:d.w,h:d.h,y:d.y||0};obs.push(o);
  let end=x+d.w, kind=kindOf(d);
  /* 2연속: 낮은 장애물 두 개를 붙여서 → 길게 눌러야 넘을 수 있어요 */
  if(d.low&&r()<S.pair*(.4+.6*p)){
   const lows=Object.keys(S.pool).filter(k=>OBS[k].low);const t2=lows[Math.floor(r()*lows.length)]||t;
   const gx=end+26+Math.floor(r()*10);const d2=OBS[t2];
   obs.push({i:obs.length,t:t2,x:gx,w:d2.w,h:d2.h,y:0,pair:1});end=gx+d2.w;kind="pair";
  }
  /* 자갈: 장애물 위로 점프 궤적을 따라 */
  if(kind!=="fly"&&r()<.62){
   const v=speedAt(S,x), mid=(x+end)/2, apexT=ARC_HOLD.reduce((a,b)=>b[1]>a[1]?b:a)[0];
   const n5=kind==="pair"?5:4;
   for(let k=0;k<n5;k++){const tt=apexT*(0.3+1.4*k/(n5-1));const pt=ARC_HOLD[Math.min(ARC_HOLD.length-1,Math.round(tt/TICK))];
    items.push({t:"pebble",x:mid-apexT*v+tt*v+PB.w/2-6,y:pt[1]+PB.h/2+4})}
  }
  lastKind=kind;
  /* 다음 장애물까지 간격 */
  let gap=vmax*T_AFTER[kind]*(S.tight||1)+r()*lerp(S.extra[0],S.extra[1],p);
  const nt=null; // 다음 종류는 아직 몰라요 → 움직이는 장애물 여유는 넉넉히 고정 반영
  gap+=36;
  /* v19 알람시계: 정해진 지점을 지나면 다음 빈칸을 넓히고 가운데 점프 높이에 ⏰ */
  if(aq.length&&end>=S.len*aq[0]){aq.shift();gap+=240;items.push({t:"alarm",x:end+gap/2-11,y:58});x=end+gap;lastKind=kind;continue}
  /* 간격 안 아이템: 땅 위 자갈 줄 / 파워업 */
  const g0=end+70, g1=end+gap-70;
  if(g1-g0>120){
   n++;
   if(n%(S.pwEvery||6)===3){const types=["coffee","shield","shoes"];items.push({t:types[Math.floor(r()*3)],x:(g0+g1)/2-11,y:58})}
   else if(r()<.5){const cnt=3+Math.floor(r()*3);for(let k=0;k<cnt;k++)items.push({t:"pebble",x:g0+20+k*26,y:12})}
   else if(r()<.25){const cnt=3;const hx=(g0+g1)/2-26;for(let k=0;k<cnt;k++)items.push({t:"pebble",x:hx+k*26,y:150})} // 2단 점프 보너스
  }
  x=end+gap;
 }
 aq.forEach((_,k)=>items.push({t:"alarm",x:S.len-440+k*90,y:58})); /* 남은 알람은 결승선 앞 빈 길에 */
 if(S.alarms)items.sort((a,b)=>a.x-b.x);
 return {sid,seed:seed>>>0,obs,items,zones,notes,len:S.len};
}

function courseRun(sid,seed){
 const S=STAGES[sid], r=rng(seed>>>0), obs=[], items=[], zones=[], notes=RUN_FX.notes.map(x=>({x}));
 let x=S.first, n=0, lastKind="low", zq=RUN_FX.zones.slice();
 const kindOf=o=>o.duck?"duck":o.fly?"fly":o.tall?"tall":o.wide?"wide":"low";
 const inFx=(x0,x1)=>S.twistsAbs.some(([a,l])=>x1>a-120&&x0<a+l+60)||S.lidsAbs.some(([a,l])=>x1>a-60&&x0<a+l+60);
 while(x<S.len-520){
  const g=segAt(x),G=segParams(g),p=(x-g.x0)/(g.x1-g.x0),vmax=speedAt(S,x+400)*PHY.BOOST_SPEED;
  if(zq.length&&x>=zq[0]){zq.shift();
   const z={x0:x,x1:x+ZONE.len};zones.push(z);
   for(let zx=z.x0+60;zx<z.x1-40;zx+=48)items.push({t:"pebble",x:zx,y:12});
   x=z.x1+speedAt(S,z.x1)*PHY.BOOST_SPEED*.8+120;lastKind="low";continue}
  /* 구간이 바뀌는 자리는 숨 돌릴 빈 길 */
  if(g.x0>0&&x-g.x0<40){x=g.x0+speedAt(S,g.x0)*1.1;lastKind="low";continue}
  let t=pick(r,G.pool);
  if(OBS[t].duck&&lastKind==="duck")t=Object.keys(G.pool)[0];
  if(OBS[t].fly&&lastKind==="fly")t="cone"in G.pool?"cone":Object.keys(G.pool)[0];
  /* 조작 반전·눈꺼풀 구간 안에서는 숙이기 장애물은 빼요 (반전 중에 숙이기는 너무 가혹) */
  if(OBS[t].duck&&inFx(x,x+200))t=Object.keys(G.pool)[0];
  const d=OBS[t];
  const o={i:obs.length,t,x:x,w:d.w,h:d.h,y:d.y||0};obs.push(o);
  let end=x+d.w, kind=kindOf(d);
  if(d.low&&r()<G.pair*(.4+.6*p)){
   const lows=Object.keys(G.pool).filter(k=>OBS[k].low);const t2=lows[Math.floor(r()*lows.length)]||t;
   const gx=end+26+Math.floor(r()*10);const d2=OBS[t2];
   obs.push({i:obs.length,t:t2,x:gx,w:d2.w,h:d2.h,y:0,pair:1});end=gx+d2.w;kind="pair";
  }
  if(kind!=="fly"&&r()<.62){
   const v=speedAt(S,x), mid=(x+end)/2, apexT=ARC_HOLD.reduce((a,b)=>b[1]>a[1]?b:a)[0];
   const n5=kind==="pair"?5:4;
   for(let k=0;k<n5;k++){const tt=apexT*(0.3+1.4*k/(n5-1));const pt=ARC_HOLD[Math.min(ARC_HOLD.length-1,Math.round(tt/TICK))];
    items.push({t:"pebble",x:mid-apexT*v+tt*v+PB.w/2-6,y:pt[1]+PB.h/2+4})}
  }
  lastKind=kind;
  let gap=vmax*T_AFTER[kind]*G.tight+r()*lerp(G.extra[0],G.extra[1],p)+36;
  const g0=end+70, g1=end+gap-70;
  if(g1-g0>120){
   n++;
   if(n%G.pwEvery===3){const types=["coffee","shield","shoes"];items.push({t:types[Math.floor(r()*3)],x:(g0+g1)/2-11,y:58})}
   else if(r()<.5){const cnt=3+Math.floor(r()*3);for(let k=0;k<cnt;k++)items.push({t:"pebble",x:g0+20+k*26,y:12})}
   else if(r()<.25){const cnt=3;const hx=(g0+g1)/2-26;for(let k=0;k<cnt;k++)items.push({t:"pebble",x:hx+k*26,y:150})}
  }
  x=end+gap;
 }
 items.sort((a,b)=>a.x-b.x);
 return {sid,seed:seed>>>0,obs,items,zones,notes,len:S.len};
}

/* ---- 한 판 상태 ---- */
function newRun(sid,seed){
 const S=STAGES[sid], C=course(sid,seed);
 return {sid,seed:C.seed,S,C,tick:0,t:0,x:0,y:0,vy:0,ground:true,jumps:0,holdKey:false,holding:false,holdT:0,buffer:0,coyote:0,
  fx:{coffee:0,shield:0,shoes:0},pebbles:0,items:0,smashed:0,state:"run",lives:LIVES,inv:0,hurts:0,
  O:C.obs.map(o=>({x:o.x,act:false,gone:false})),got:new Uint8Array(C.items.length),ev:[],inputs:[],hitBy:null,hitKind:null,
  duck:false,duckHold:false,duckT:0,zi:0,zin:false,zm:0,zEsc:0,resist:0,ni:0,nb:0,nbT:0,dism:0,alarms:0,tw:0,twWarn:0,lid:0,lidOn:0,blinks:0};
}
function speed(R){return speedAt(R.S,R.x)*(R.fx.coffee>0?PHY.BOOST_SPEED:1)*(R.zin?ZONE.slow:1)}
function jump(R,v){R.duck=false;R.vy=v*(R.fx.shoes>0?PHY.BOOST_JUMP:1);R.holding=R.holdKey;R.holdT=0;R.ground=false;R.jumps++;R.ev.push(R.jumps>1?"jump2":"jump")}
function obsY(R,i){const o=R.C.obs[i],d=OBS[o.t];return o.y+(d.bob?Math.sin(R.t*6+i)*d.bob:0)}
function hurt(R,kind,ev){
 R.lives--;R.hurts++;R.inv=INV;R.hitKind=kind;
 if(R.lives<=0){R.state="dead";R.ev.push("hit:"+ev);return true}
 R.ev.push((kind==="zone"?"zhurt:":"hurt:")+ev);return false;
}
/* 한 틱 진행. press/release = 이번 틱에 점프 누름/뗌, o = {dd:숙이기 누름, du:숙이기 뗌, dis:알림 닫기} */
function twistAt(R,x){if(R.S.twistsAbs){const T=R.S.twistsAbs;for(let k=0;k<T.length;k++){if(x>=T[k][0]&&x<T[k][0]+T[k][1])return k+1;if(T[k][0]>x)break}return 0}const T=R.S.twists;if(!T)return 0;for(let k=0;k<T.length;k++){const a=R.S.len*T[k][0];if(x>=a&&x<a+T[k][1])return k+1}return 0}
function lidAt(R,x){if(R.S.lidsAbs){const L=R.S.lidsAbs;for(let k=0;k<L.length;k++){if(x>=L[k][0]&&x<L[k][0]+L[k][1])return k+1;if(L[k][0]>x)break}return 0}const L=R.S.lids;if(!L)return 0;for(let k=0;k<L.length;k++){const a=R.S.len*L[k][0];if(x>=a&&x<a+L[k][1])return k+1}return 0}
function step(R,press,release,o){
 if(R.state!=="run")return;
 const dt=TICK;o=o||{};
 if(o.dis)R.inputs.push([R.tick,4]);if(o.dd)R.inputs.push([R.tick,2]);if(o.du)R.inputs.push([R.tick,3]);if(press)R.inputs.push([R.tick,1]);if(release)R.inputs.push([R.tick,0]);if(o.bl)R.inputs.push([R.tick,5]);
 /* 😵 조작 반전: 탭 ↔ 숙이기 */
 const tw=twistAt(R,R.x);
 if(tw!==R.tw){R.ev.push(tw?"twist:on":"twist:off");if(!tw&&(R.duckHold||R.holdKey)){R.duckHold=false;R.holdKey=false;R.holding=false}R.tw=tw}
 else if(!tw&&(R.S.twists||R.S.twistsAbs)){const nx=twistAt(R,R.x+TWIST.warn);if(nx&&R.twWarn!==nx){R.twWarn=nx;R.ev.push("twist:warn")}}
 if(tw){const p0=press,r0=release;press=!!o.dd;release=!!o.du;o={dis:o.dis,bl:o.bl,dd:p0,du:r0}}
 /* 😪 눈꺼풀 */
 const ld=lidAt(R,R.x);
 if(ld!==R.lidOn){R.lidOn=ld;R.ev.push(ld?"lid:on":"lid:off");if(!ld)R.lid=0}
 if(ld){R.lid=Math.min(1,R.lid+LID.rate*dt);if(o.bl&&R.lid>.05){R.lid=Math.max(0,R.lid-LID.open);R.blinks++;R.ev.push("blink")}}
 if(o.dis){if(R.nb>0){R.nb--;R.nbT=0;R.dism++;R.ev.push("dism")}}
 if(o.dd){R.duckHold=true;R.duck=true;R.duckT=0;R.buffer=0;
  if(!R.ground){R.vy=Math.min(R.vy,-PHY.FASTFALL);R.holding=false}R.ev.push("duck")}
 if(o.du){R.duckHold=false}
 if(press){R.holdKey=true;
  if(R.zin){R.zm=Math.max(0,R.zm-ZONE.push);R.resist++;R.ev.push("resist")}
  else if(R.ground||R.coyote>0){if(R.jumps===0)jump(R,PHY.JV);else R.buffer=PHY.BUFFER}
  else if(R.jumps<2)jump(R,PHY.DJV);
  else R.buffer=PHY.BUFFER;
 }
 if(release){R.holdKey=false;R.holding=false}
 /* 이동 */
 const v=speed(R);R.x+=v*dt;
 if(!R.ground){
  const g=R.holding&&R.vy>0&&R.holdT<PHY.HOLD?PHY.G_HOLD:PHY.G;
  if(R.holding&&R.vy>0)R.holdT+=dt;
  R.vy-=g*dt;R.y+=R.vy*dt;
  if(R.y<=0){R.y=0;R.vy=0;R.ground=true;R.jumps=0;R.holding=false;R.ev.push("land");
   if(R.buffer>0){R.buffer=0;jump(R,PHY.JV)}}
 }
 if(R.buffer>0)R.buffer-=dt;
 if(R.duck){R.duckT+=dt;if(!R.duckHold&&R.duckT>=PHY.DUCK_MIN)R.duck=false}
 /* 회식 2차 권유 구간 */
 const Z=R.C.zones;
 if(R.zi<Z.length){const z=Z[R.zi];
  if(!R.zin&&R.x+PB.w>=z.x0&&R.x<z.x1){R.zin=true;R.zm=0;R.ev.push("zone:in")}
  if(R.zin){
   if(R.x>=z.x1){R.zin=false;R.zi++;R.zEsc++;R.ev.push("zone:out")}
   else{R.zm+=ZONE.rate*dt;
    if(R.zm>=1){R.zin=false;R.zi++;R.zm=1;
     if(R.fx.shield>0){R.smashed++;R.ev.push("zone:shield")}
     else if(R.inv>0){R.ev.push("zone:free")}
     else if(hurt(R,"zone","zone"))return}}
  }
 }
 /* 단톡방 알림 */
 const NT=R.C.notes;
 if(R.ni<NT.length&&R.x>=NT[R.ni].x){R.ni++;if(R.nb<1){R.nb=1;R.nbT=0}R.ev.push("note")}
 else if(R.nb>0&&R.nb<NOTE.max){R.nbT+=dt;if(R.nbT>=NOTE.grow){R.nb++;R.nbT=0;R.ev.push("note")}}
 for(const k in R.fx)if(R.fx[k]>0)R.fx[k]=Math.max(0,R.fx[k]-dt);
 if(R.inv>0)R.inv=Math.max(0,R.inv-dt);
 /* 장애물 */
 const px0=R.x, px1=R.x+PB.w, py0=R.y, py1=R.y+(R.duck?PB.dh:PB.h);
 const obs=R.C.obs;
 for(let i=0;i<obs.length;i++){
  const o=obs[i], s=R.O[i];
  if(s.gone)continue;
  if(s.x>R.x+PHY.ACT+60)break;
  if(s.x+o.w<R.x-200)continue;
  const d=OBS[o.t];
  if(!s.act&&s.x-R.x<PHY.ACT)s.act=true;
  if(s.act&&d.vx)s.x+=d.vx*dt;
  const oy=obsY(R,i);
  if(px1>s.x&&px0<s.x+o.w&&py1>oy&&py0<oy+o.h){
   if(R.fx.shield>0){s.gone=true;R.smashed++;R.ev.push("smash:"+i)}
   else if(R.inv>0){/* 무적 중: 통과 */}
   else{s.gone=true;R.hitBy=i;if(hurt(R,o.t,i))return}
  }
 }
 /* 아이템 */
 const it=R.C.items;
 for(let i=0;i<it.length;i++){
  if(R.got[i])continue;const a=it[i];
  if(a.x>R.x+80)break;
  const sz=a.t==="pebble"?12:22;
  if(a.x+sz<R.x-PICK)continue;
  if(px1+PICK>a.x&&px0-PICK<a.x+sz&&py1+PICK>a.y&&py0-PICK<a.y+sz){
   R.got[i]=1;
   if(a.t==="pebble"){R.pebbles++;R.ev.push("pebble:"+i)}
   else if(a.t==="alarm"){R.alarms++;R.ev.push("alarm:"+i)}
   else{R.items++;R.fx[a.t]=PHY.EFFECT;R.ev.push("item:"+a.t+":"+i);if(a.t==="coffee"&&R.lives<LIVES){R.lives++;R.ev.push("heal")}}
  }
 }
 R.tick++;R.t=R.tick*TICK;
 if(R.x>=R.S.len){R.x=R.S.len;
  if(R.S.need&&R.alarms<R.S.need){R.state="dead";R.hitKind="sleep";R.ev.push("hit:sleep")} /* 알람이 모자라면 다시 잠들어요 */
  else{R.state="win";R.ev.push("win")}}
}
function meters(R){return Math.floor(Math.min(R.x,R.S.len)/M)}
const NO_HIT=300; // 무사고 퇴근 보너스
function score(R){
 let s=meters(R)+R.pebbles*10+R.items*20+R.smashed*15+R.zEsc*ZONE.esc+R.dism*NOTE.pts+(R.alarms||0)*30+(R.blinks||0)*LID.pts;
 if(R.state==="win")s+=R.S.clear+Math.max(0,Math.round((R.S.par-R.t)*20))+(R.hurts===0?NO_HIT:0);
 return s;
}
function ms(R){return Math.round(R.tick*TICK*1000)}
/* 기록 검증: 입력 기록을 처음부터 다시 돌려서 결과가 같은지 확인 */
function verify(sid,seed,inputs,claim){
 if(!STAGES[sid]||!Array.isArray(inputs)||inputs.length>60000)return {ok:false,why:"형식"};
 const R=newRun(sid,seed);let k=0;const max=Math.ceil(R.S.len/(R.S.v0*ZONE.slow)/TICK)+10;
 while(R.state==="run"&&R.tick<max){
  let p=false,rl=false;const o={};
  while(k<inputs.length&&inputs[k][0]===R.tick){const c=inputs[k][1];if(c===1)p=true;else if(c===0)rl=true;else if(c===2)o.dd=1;else if(c===3)o.du=1;else if(c===4)o.dis=1;else if(c===5)o.bl=1;k++}
  if(k<inputs.length&&inputs[k][0]<R.tick)return {ok:false,why:"순서"};
  step(R,p,rl,o);R.ev.length=0;
 }
 R.inputs=inputs;
 const res={state:R.state,ms:ms(R),score:score(R),pebbles:R.pebbles,meters:meters(R),hurts:R.hurts,alarms:R.alarms};
 const ok=!claim||(claim.state===res.state&&claim.ms===res.ms&&claim.score===res.score&&claim.pebbles===res.pebbles);
 const minMs=R.S.len/(R.S.v1*PHY.BOOST_SPEED)*1000;
 return {ok:ok&&(res.state!=="win"||res.ms>=minMs),res,why:ok?"":"불일치"};
}

const API={segAt,SEGS,SEG_BASE,segParams,RUN_FX,twistAt,lidAt,TWIST,LID,TICK,M,PHY,LIVES,INV,NO_HIT,PB,ZONE,NOTE,OBS,ITEMS,STAGES,rng,course,newRun,step,speed,score,meters,ms,verify,obsY,speedAt};
if(typeof module!=="undefined"&&module.exports)module.exports=API;
root.TG_RUNNER_CORE=API;
})(typeof window!=="undefined"?window:globalThis);
