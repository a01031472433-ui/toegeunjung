/* 퇴근중 · 돌뽑기 로직 (v7) — 오늘의 돌운세 + 자갈복권
   화면 코드와 분리된 순수 계산. 문구·확률·보상은 여기서만 바꾸면 돼요.
   결과는 "사용자 비밀값 + 한국시간 날짜"로 미리 확정돼요. 긁기 전에 이미 정해져 있고,
   새로고침이나 재접속으로 바뀌지 않아요. (서버 검증은 백엔드가 생기면 SERVER TODO 참고) */
(function(){
"use strict";

/* ---- 보상: 요청서의 '자갈' 단위를 월급코인으로 환산 (1자갈 = 10코인) ---- */
const PEBBLE_TO_COIN=10;
const REWARD={fortunePebbles:5};

/* ---- 운세 등급 (가중치 합 100) ---- */
const GRADES=[
 {id:"great",  name:"대길",w:15,mood:"happy",emoji:"🌟",summary:["오늘은 돌대리 인생 최고의 날이돌!","뭘 해도 잘 굴러가는 날이돌.","출근길 신호등이 전부 초록불일 상이돌."]},
 {id:"good",   name:"길",  w:35,mood:"happy",emoji:"🍀",summary:["무난하게 잘 풀리는 하루가 될 상이돌.","작은 행운이 슬쩍 굴러들어오돌.","오늘은 기분 좋은 일이 하나쯤 생기돌."]},
 {id:"normal", name:"보통",w:35,mood:"ok",   emoji:"🪨",summary:["평범함이 최고의 복이돌.","별일 없이 지나가는 게 행운이돌.","오늘은 조용히 굴러가는 날이돌."]},
 {id:"careful",name:"조심",w:15,mood:"tired",emoji:"⚠️",summary:["오늘은 몸을 사리는 게 상책이돌.","말 한마디 신중하게, 메일은 두 번 읽돌.","무리하지 말고 일찍 들어가 쉬돌."]},
];
const LINES={
 work:{
  great:["오늘은 팀장님이 일찍 퇴근할 상이돌!","올린 보고서가 한 번에 통과될 운이돌.","회의가 예정보다 10분 일찍 끝나돌.","칭찬 메일이 참조로 날아오돌."],
  good:["메일을 열기 전에 심호흡 세 번 하면 다 잘 풀리돌.","오전 집중력이 최고조에 달하돌.","미뤄 둔 일이 의외로 금방 끝나돌.","옆자리 동료가 일을 도와줄 상이돌."],
  normal:["오늘은 조용히 월급 루팡하기 좋은 날이돌.","할 일 목록 세 개면 충분하돌.","엑셀이 한 번쯤 멈추겠지만 저장해 두면 괜찮돌.","무난한 회의, 무난한 점심이돌."],
  careful:["'잠깐 시간 돼요?'를 조심하돌.","전체 답장 버튼을 누르기 전에 다시 보돌.","오후 4시 59분 업무 요청 주의보이돌.","프린터가 오늘따라 말을 안 듣돌."]},
 off:{
  great:["오늘의 칼퇴 확률 99%! 단, 방심은 금물이돌.","18시 정각, 엘리베이터가 바로 오돌.","퇴근길 지하철에 빈자리가 기다리돌."],
  good:["정시 퇴근 가능성 높음. 가방은 미리 싸 두돌.","퇴근 10분 전 아무 일도 안 생기돌.","퇴근길에 맛있는 냄새가 손짓하돌."],
  normal:["30분 정도 늦어질 수 있지만 괜찮돌.","퇴근은 하는데 버스가 조금 늦돌.","오늘은 칼퇴보다 정퇴에 만족하돌."],
  careful:["퇴근 3분 전 업무 요청 발생 확률 높음이돌.","'이것만 하고 가죠'가 두 번 나오돌.","오늘은 야근각이 슬금슬금 다가오돌."]},
 love:{
  great:["탕비실에서 뜻밖의 행운이 기다리돌.","오랜만에 연락이 올 상이돌.","오늘 웃는 얼굴이 유난히 빛나돌."],
  good:["점심 메뉴 취향이 통하는 사람이 나타나돌.","가벼운 칭찬 한마디가 좋은 인연을 부르돌.","오늘은 메신저 답장이 빨리 오돌."],
  normal:["연애운은 잠시 휴가 중이돌. 대신 월급운에 집중하돌.","혼밥도 충분히 근사한 날이돌.","무리한 썸보다 편한 대화가 좋돌."],
  careful:["사내연애 티는 오늘 특히 조심하돌.","새벽 감성 메시지는 보내기 전에 저장만 하돌.","오늘은 거울 한 번 더 보고 나가돌."]},
};
const ITEMS=["아이스 아메리카노","포스트잇","무선 이어폰","텀블러","손목 보호대","초코바","사원증 목걸이","보조배터리","립밤","형광펜","탕비실 믹스커피","우산"];

/* ---- 자갈복권 확률표 (합 100) ---- */
const LOTTO=[
 {id:"jackpot",name:"대박",       p:1, pebbles:100,line:"오늘 퇴사해도 될 운이돌?!"},
 {id:"lucky",  name:"행운",       p:9, pebbles:30, line:"오늘 점심은 누가 사주려나돌?"},
 {id:"win",    name:"당첨",       p:25,pebbles:10, line:"작지만 확실한 행복이돌!"},
 {id:"small",  name:"소소한 행운",p:40,pebbles:3,  line:"티끌 모아 돌산이돌!"},
 {id:"miss",   name:"꽝",         p:25,pebbles:0,  line:"인생은 원래 쉽지 않돌… 내일 다시 오돌!"},
];

/* ---- 한국시간 날짜 ---- */
const KST=9*3600e3;
function kstDate(now){const d=new Date((now==null?Date.now():now)+KST);return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0")+"-"+String(d.getUTCDate()).padStart(2,"0")}
function msToReset(now){now=now==null?Date.now():now;const d=new Date(now+KST);const next=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()+1)-KST;return next-now}

/* ---- 결정적 난수: 같은 사용자·같은 날이면 항상 같은 결과 ---- */
function hash(s){let h=2166136261;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function weighted(r,list,key){const tot=list.reduce((a,x)=>a+x[key],0);let x=r()*tot;for(const it of list){x-=it[key];if(x<0)return it}return list[list.length-1]}
const pick=(r,a)=>a[Math.floor(r()*a.length)];

function fortune(secret,date){
 const r=rng(hash(secret+"|fortune|"+date));
 const g=weighted(r,GRADES,"w");
 return {date,grade:g.id,gradeName:g.name,emoji:g.emoji,mood:g.mood,summary:pick(r,g.summary),
  work:pick(r,LINES.work[g.id]),off:pick(r,LINES.off[g.id]),love:pick(r,LINES.love[g.id]),item:pick(r,ITEMS),
  coins:REWARD.fortunePebbles*PEBBLE_TO_COIN,pebbles:REWARD.fortunePebbles};
}
function lotto(secret,date){
 const r=rng(hash(secret+"|lotto|"+date));
 const e=weighted(r,LOTTO,"p");
 return {date,id:e.id,name:e.name,line:e.line,pebbles:e.pebbles,coins:e.pebbles*PEBBLE_TO_COIN};
}
function newSecret(){const a=new Uint32Array(4);(window.crypto||{getRandomValues:x=>x.map(()=>Math.random()*4294967296)}).getRandomValues(a);return Array.from(a,x=>x.toString(36)).join("")}


/* ======================================================================
   사주 기반 오늘의 운세 (v8)
   - 일주: 율리우스일(JDN) 공식, 위키백과 갑자일 목록(1949-10-01, 1981-02-15, 2026-10-17 등)으로 검증
   - 연주·월주: 태양 황경으로 절기 판단(Meeus 저정밀식), 한국천문연구원 2000년 절기 시각과 ±3분 이내
   - 시주: 한국 표준시 보정(30분) 적용, 자시 23:30~01:30, 야자시는 당일 일간 기준
   - 양력 생년월일 기준. 결과 문구는 유머, 판단 근거는 오행 생극과 일지 합·충
   ====================================================================== */
const STEMS="甲乙丙丁戊己庚辛壬癸", STEMS_KO="갑을병정무기경신임계";
const BRANCHES="子丑寅卯辰巳午未申酉戌亥", BRANCHES_KO="자축인묘진사오미신유술해";
const EL=["木","火","土","金","水"], EL_KO=["나무","불","흙","쇠","물"];
const EL_SUBJ=["나무가","불이","흙이","쇠가","물이"], EL_OBJ=["나무를","불을","흙을","쇠를","물을"];
const stemEl=i=>Math.floor(i/2);                       /* 갑을 木, 병정 火, 무기 土, 경신 金, 임계 水 */
const BR_EL=[4,2,0,0,2,1,1,2,3,3,2,4];                  /* 子水 丑土 寅木 卯木 辰土 巳火 午火 未土 申金 酉金 戌土 亥水 */
const RAD=Math.PI/180;
function jdn(y,m,d){const a=Math.floor((14-m)/12),Y=y+4800-a,M=m+12*a-3;return d+Math.floor((153*M+2)/5)+365*Y+Math.floor(Y/4)-Math.floor(Y/100)+Math.floor(Y/400)-32045}
function dayIdx(y,m,d){return ((jdn(y,m,d)-11)%60+60)%60}  /* 0 = 갑자 */
function sunLon(ms){const T=((ms+69e3+180e3)/864e5+2440587.5-2451545)/36525;  /* +69초 ΔT, +3분 보정 */
 const L0=280.46646+36000.76983*T+0.0003032*T*T,M=(357.52911+35999.05029*T-0.0001537*T*T)*RAD;
 const C=(1.914602-0.004817*T-0.000014*T*T)*Math.sin(M)+(0.019993-0.000101*T)*Math.sin(2*M)+0.000289*Math.sin(3*M);
 const om=(125.04-1934.136*T)*RAD;const l=L0+C-0.00569-0.00478*Math.sin(om);return ((l%360)+360)%360}
const gz=(s,b)=>({s,b,ko:STEMS_KO[s]+BRANCHES_KO[b],hanja:STEMS[s]+BRANCHES[b]});
function pillars(dateStr,timeStr){
 const [y,m,d]=dateStr.split("-").map(Number); const hasTime=!!timeStr;
 const [hh,mm]=(timeStr||"12:00").split(":").map(Number);
 const ms=Date.UTC(y,m-1,d,hh,mm)-9*3600e3;               /* 한국시간 → UTC */
 const lon=sunLon(ms), mIdx=Math.floor(((lon-315+360)%360)/30); /* 0=寅월(입춘~) … 11=丑월 */
 const yy=(m<=2&&mIdx>=10)?y-1:y;                          /* 입춘 전이면 전년도 */
 const yi=((yy-4)%60+60)%60, ys=yi%10, yb=yi%12;
 const ms0=((ys%5)*2+2)%10, mS=(ms0+mIdx)%10, mB=(2+mIdx)%12;   /* 오호둔 */
 const di=dayIdx(y,m,d), dS=di%10, dB=di%12;
 let hour=null;
 if(hasTime){const t=(hh*60+mm+30)%1440, hB=Math.floor(t/120), hS=((dS%5)*2+hB)%10;hour=gz(hS,hB)}  /* 오서둔 */
 return {year:gz(ys,yb),month:gz(mS,mB),day:gz(dS,dB),hour,me:dS,meEl:stemEl(dS),hasTime};
}
/* 오늘(한국시간) 일진 */
function todayPillar(date){const [y,m,d]=date.split("-").map(Number);const i=dayIdx(y,m,d);return gz(i%10,i%12)}
/* 오행 관계: 오늘 원소 t가 나 me에게 무엇인가 */
function relation(me,t){if(me===t)return "same";if((t+1)%5===me)return "support";if((me+1)%5===t)return "output";if((me+2)%5===t)return "wealth";return "pressure"}
const REL={support:{name:"인성",score:2,line:(m,t)=>`오늘의 ${EL_SUBJ[t]} 내 ${EL_OBJ[m]} 키워주는 날`},
 same:{name:"비견",score:1,line:(m,t)=>`나와 같은 ${EL_KO[t]} 기운이 모이는 날`},
 output:{name:"식상",score:0,line:(m,t)=>`내 ${EL_SUBJ[m]} 오늘의 ${EL_OBJ[t]} 키워주는 날`},
 wealth:{name:"재성",score:1,line:(m,t)=>`내 ${EL_SUBJ[m]} 오늘의 ${EL_OBJ[t]} 다스리는 날`},
 pressure:{name:"관성",score:-2,line:(m,t)=>`오늘의 ${EL_SUBJ[t]} 내 ${EL_OBJ[m]} 누르는 날`}};
const CHUNG=[[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]], HAP=[[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]];
const pairIn=(list,a,b)=>list.some(([x,y])=>(x===a&&y===b)||(x===b&&y===a));
function sajuFortune(birth,date){
 const P=pillars(birth.date,birth.time), T=todayPillar(date);
 const rs=relation(P.meEl,stemEl(T.s)), rb=relation(P.meEl,BR_EL[T.b]);
 const hap=pairIn(HAP,P.day.b,T.b), chung=pairIn(CHUNG,P.day.b,T.b);
 const score=REL[rs].score*2+REL[rb].score+(hap?2:0)-(chung?2:0);
 const grade=score>=5?"great":score>=2?"good":score>=-1?"normal":"careful";
 const tier=n=>n>=2?"great":n>=1?"good":n>=0?"normal":"careful";
 /* 분야별: 직장운=관성·인성(일과 도움), 퇴근운=재성·식상(내 시간과 성과), 연애운=일지 합·충 */
 const workN=(rs==="support"?2:rs==="same"?1:rs==="pressure"?-1:rs==="wealth"?1:0)+(rb==="support"?1:0)-(chung?1:0);
 const offN=(rs==="wealth"||rb==="wealth"?2:0)+(rs==="output"?1:0)-(rs==="pressure"?1:0)-(chung?1:0);
 const loveN=hap?2:chung?-1:(rs==="support"||rb==="support"?1:0);
 const g=GRADES.find(x=>x.id===grade), r=rng(hash(birth.date+"|"+(birth.time||"")+"|saju|"+date));
 /* 5단계 점수, 행운 오행(나를 돕는 기운), 좋은/조심할 시간(일지와 합·충하는 시) */
 const lv=n=>n>=2?5:n>=1?4:n>=0?3:n>=-1?2:1;
 const luckyEl=(P.meEl+4)%5;
 const hapB=(HAP.find(([x,y])=>x===P.day.b||y===P.day.b)||[]).find(x=>x!==P.day.b);
 const chungB=(P.day.b+6)%12;
 const hourRange=b=>{const st=(b*120-30+1440)%1440,en=(st+120)%1440,f=m=>String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");return `${f(st)}~${f(en)} (${BRANCHES_KO[b]}시)`};
 const counts=[0,0,0,0,0];[P.year,P.month,P.day,P.hour].filter(Boolean).forEach(x=>{counts[stemEl(x.s)]++;counts[BR_EL[x.b]]++});
 return {date,grade,gradeName:g.name,emoji:g.emoji,mood:g.mood,summary:pick(r,g.summary),
  work:pick(r,LINES.work[tier(workN)]),off:pick(r,LINES.off[tier(offN)]),love:pick(r,LINES.love[tier(loveN)]),item:pick(r,ITEMS),
  levels:{total:lv(score>=5?2:score>=2?1:score>=-1?0:-1),work:lv(workN),off:lv(offN),love:lv(loveN)},
  lucky:{el:luckyEl,color:["초록","빨강","노랑","흰색","남색"][luckyEl],nums:[[3,8],[2,7],[5,10],[4,9],[1,6]][luckyEl],dir:["동쪽","남쪽","가운데","서쪽","북쪽"][luckyEl]},
  hours:(()=>{ /* 직장인 활동 시간(진시 07:30 ~ 술시 21:30) 중에서 고름: 시지 오행이 나를 돕는지 + 일지와 합·충 */
   const sc=b=>REL[relation(P.meEl,BR_EL[b])].score+(b===hapB?2:0)-(b===chungB?3:0);
   const c=[4,5,6,7,8,9,10].map(b=>[b,sc(b)]);
   const best=c.reduce((m,x)=>x[1]>m[1]?x:m),worst=c.reduce((m,x)=>x[1]<m[1]?x:m);
   return {good:best[1]>worst[1]?hourRange(best[0]):null,bad:hourRange(worst[0])};})(),
  counts,
  coins:REWARD.fortunePebbles*PEBBLE_TO_COIN,pebbles:REWARD.fortunePebbles,
  saju:{pillars:P,today:T,meName:STEMS_KO[P.me]+"목화토금수"[P.meEl],meHanja:STEMS[P.me]+EL[P.meEl],
   rel:REL[rs].name,relWord:{support:"나를 돕는 기운",same:"나와 같은 기운",output:"내가 쓰는 기운",wealth:"내가 다스리는 기운",pressure:"나를 누르는 기운"}[rs],basis:REL[rs].line(P.meEl,stemEl(T.s)),hap,chung,score}};
}

/* SERVER TODO (백엔드가 생기면):
   1) 결과 생성: 서버가 (사용자, 한국시간 날짜, 종류)로 결과를 만들고 저장 → 클라이언트는 받아서 보여주기만
   2) 1일 1회: (user_id, date, kind) 고유 키 테이블로 중복 참여 차단
   3) 지급: 같은 트랜잭션에서 claim 행 생성 + 잔액 증가 (멱등 키 = user_id:date:kind)
   4) 확률표 LOTTO는 서버 설정으로 이동, 클라이언트에는 결과만 전달 */

window.TG_LUCK={GRADES,LINES,ITEMS,LOTTO,REWARD,PEBBLE_TO_COIN,kstDate,msToReset,fortune,lotto,newSecret,pillars,todayPillar,sajuFortune,relation,STEMS,BRANCHES,STEMS_KO,BRANCHES_KO,EL,EL_KO,stemEl,BR_EL};
})();
