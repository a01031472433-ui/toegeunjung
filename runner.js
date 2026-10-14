/* 퇴근중 · 돌퇴근 — 게임 화면 (HUD · 입력 · 루프 · 결과 · 효과음 · 공유)
   규칙은 runner-core.js, 그림은 runner-art.js. 앱과는 open(opt)의 콜백으로만 이야기해요. */
(function(){
"use strict";
const K=window.TG_RUNNER_CORE, A=window.TG_RUNNER_ART;
const VW=380, PX=56, DRAW_SCALE=.92;
const fmt=ms=>{const s=Math.max(0,ms)/1000,m=Math.floor(s/60);return m+":"+(s-m*60).toFixed(2).padStart(5,"0")};
const won=n=>Number(n).toLocaleString("ko-KR");
const CAUSE={papers:"서류더미에 걸려 넘어졌어요",cup:"커피를 엎질렀어요… 닦고 가야 해요",chair:"굴러온 회의실 의자에 실려 회의에 들어갔어요",boss:"팀장님이 「잠깐 얘기 좀」 하셨어요",
 crowd:"출근길 인파에 휩쓸렸어요",bag:"누군가의 가방에 걸렸어요",stairs:"계단에서 발이 꼬였어요",door:"지하철 문이 눈앞에서 닫혔어요",puddle:"물웅덩이에 첨벙! 신발이 다 젖었어요",
 pigeon:"비둘기에 놀라 멈칫했어요",fpig:"날아온 비둘기와 정면충돌했어요",cone:"라바콘에 걸렸어요",phone:"업무 전화를 받아버렸어요…",drunk:"「딱 한 잔만」에 붙잡혔어요",
 talk:"거대 팀장님께 「회의합시다!」 붙잡혀 회의실로 끌려갔어요",squeeze:"인파에 꽉 낑겨서 내릴 역을 지나쳤어요",plane:"날아온 결재 서류에 이마를 정통으로 맞았어요",moto:"배달 오토바이에 놀라 배달 음식이랑 같이 굴렀어요",zone:"고기 냄새에 끌려 회식 2차 자리에 앉아버렸어요",
 sheep:"양을 세다가 스르륵 다시 잠들었어요",pillow:"베개에 얼굴을 묻어버렸어요",clone:"복제된 팀장님한테 둘러싸였어요",zzz:"날아온 Zzz에 맞고 꾸벅…",monday:"거대한 월요일에 깔렸어요",sleep:"알람시계를 다 못 모아서 다시 잠들었어요",dzone:"이불 속으로 끌려가 다시 잠들었어요"};
const QUIP={papers:"서류 폭탄!",cup:"앗 뜨거!",chair:"의자 직격!",boss:"네…?",crowd:"죄송합니다~",bag:"가방 공격!",stairs:"발 꼬임!",door:"문에 쾅!",puddle:"첨벙!",pigeon:"구구?!",fpig:"비둘기 헤딩!",cone:"콩!",phone:"네 팀장님…",drunk:"한 잔만…?",talk:"회의라뇨?!",squeeze:"으아 낑김!",plane:"결재 맞음!",moto:"빵빵!",sheep:"음메…zz",pillow:"푹신…",clone:"팀장님이 셋?!",zzz:"꾸벅!",monday:"월요일이다!"};
const TIP={1:"「회의합시다!」 거대 팀장님은 🙇 숙여서 다리 사이로!",2:"꽉 낀 인파는 🙇 숙여서 다리 사이로 · 💬 알림은 눌러 닫기",3:"🍖 회식 구간은 연타로 버텨요",fri:"🙇 숙이기 · 💬 알림 닫기 · 🍖 연타",4:"⏰ 알람 3개 모으기 · ⚠️ 조작이 반대로 바뀌어요 · 😪 눈꺼풀은 눌러서 떠요"};
const NOTES=[["팀장님","?"],["팀장님","잠깐 통화 가능?"],["팀장님","(부재중 전화 3통)"],["팀 단톡방","팀장님: 다들 퇴근 전에 이것만 확인하고 가요"],["부장님","혹시 지금 회사야?"],["팀장님","이거 누가 한 거예요?"],["팀 단톡방","팀장님이 회의를 잡았습니다 · 오늘 18:00"],["팀장님","내일 아침에 얘기 좀 해요"],["팀 단톡방","팀장님: 보고서_최종_진짜최종_v3 다시 봐 줘요"],["부장님","주말에 잠깐 시간 돼?"],["거래처","급하게 수정 하나만 부탁드려요 🙏"],["팀장님","전화 좀 받아요"],["팀 단톡방","팀장님: 다들 보셨죠? ^^"],["부장님","내일 7시 조찬 회의 알지?"]];
const GOAL_ICON={office:"🚪",subway:"🚇",street:"🏠",friday:"🏮",dream:"⏰"};
const NOTES_DREAM=[["꿈속 팀장님","자니?"],["꿈속 팀장님","꿈에서라도 보고서 좀"],["꿈속 단톡방","부장님: 내일 7시 회의 (꿈 아님)"],["꿈속 팀장님","(부재중 전화 99통)"],["꿈속 부장님","월요일인데 어디야?"],["알 수 없음","출근하세요 출근하세요 출근하세요"]];

/* ---------- 효과음 (WebAudio로 짧게 합성) ---------- */
const SFX={ac:null,on:true,
 init(){if(!this.ac){try{this.ac=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(this.ac&&this.ac.state==="suspended")this.ac.resume().catch(()=>{})},
 tone(f,d,type,vol,f2,delay){const ac=this.ac;if(!ac||!this.on)return;const t=ac.currentTime+(delay||0);const o=ac.createOscillator(),g=ac.createGain();o.type=type||"sine";o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol||.12,t+.012);g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+d+.02)},
 play(n){switch(n){
  case"jump":this.tone(380,.14,"square",.05,620);break;
  case"jump2":this.tone(520,.16,"square",.05,900);break;
  case"pebble":this.tone(1046,.07,"triangle",.08);this.tone(1568,.1,"triangle",.07,null,.05);break;
  case"item":[660,880,1175].forEach((f,i)=>this.tone(f,.12,"triangle",.09,null,i*.06));break;
  case"smash":this.tone(220,.18,"sawtooth",.06,90);break;
  case"hit":this.tone(160,.35,"sawtooth",.1,60);break;
  case"count":this.tone(660,.12,"sine",.1);break;
  case"go":this.tone(990,.25,"sine",.12);break;
  case"win":[523,659,784,1046].forEach((f,i)=>this.tone(f,.2,"triangle",.1,null,i*.11));break;
  case"note":this.tone(1320,.08,"sine",.09);this.tone(1760,.12,"sine",.08,null,.07);break;
  case"dism":this.tone(700,.08,"triangle",.06,420);break;
  case"duck":this.tone(300,.1,"square",.04,180);break;
  case"resist":this.tone(240+Math.random()*60,.05,"square",.035);break;
  case"zone":[392,330,262].forEach((f,i)=>this.tone(f,.16,"triangle",.07,null,i*.09));break;
 }}};

/* ---------- 스타일 ---------- */
const CSS=`
.rn{position:fixed;inset:0;z-index:80;background:#F3E9D8;display:flex;justify-content:center;touch-action:none;overscroll-behavior:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;font-family:var(--font,"Jua",sans-serif);color:#4A3F35}
.rn *{box-sizing:border-box}
.rn-in{width:100%;max-width:520px;height:100%;display:flex;flex-direction:column;background:#FBF5EA;position:relative;overflow:hidden;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
.rn-top{padding:10px 14px 8px;display:flex;flex-direction:column;gap:7px;background:#FBF5EA;border-bottom:1px solid #EADCC4}
.rn-r1{display:flex;align-items:center;justify-content:space-between;gap:8px}
.rn-lives{font-size:17px;letter-spacing:1px;white-space:nowrap;margin-right:auto}
.rn-lives.rn-pop{animation:rnpop .35s ease}
.rn-stage{min-width:0}
.rn-stage{font-size:15px;background:#EFE3CF;border-radius:999px;padding:4px 11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rn-stage b{font-weight:400;color:#C8641C}
.rn-btns{display:flex;gap:6px}
.rn-ib{width:38px;height:38px;border-radius:12px;border:0;background:#EFE3CF;color:#4A3F35;font-size:17px;display:grid;place-items:center;cursor:pointer;font-family:inherit}
.rn-ib:active{transform:scale(.94)}
.rn-prog{display:flex;align-items:center;gap:10px}
.rn-bar{position:relative;flex:1;height:12px;border-radius:999px;background:#EFE3CF}
.rn-bar>i{position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:linear-gradient(90deg,#F6C27F,#F28C38);width:0}
.rn-bar>span{position:absolute;top:50%;width:20px;height:20px;border-radius:50%;background:#A8A49E;border:2px solid #fff;transform:translate(-50%,-50%);left:0;box-shadow:0 1px 2px rgba(0,0,0,.15)}
.rn-bar>em{position:absolute;right:-6px;top:50%;transform:translateY(-50%);font-style:normal;font-size:16px}
.rn-left{font-size:14px;white-space:nowrap;min-width:92px;text-align:right}
.rn-left b{font-weight:400;font-size:17px;font-variant-numeric:tabular-nums}
.rn-stats{display:flex;gap:6px}
.rn-stats>span{flex:1;background:#fff;border:1px solid #EADCC4;border-radius:10px;padding:4px 8px;font-size:12px;color:#8B7F70;display:flex;justify-content:space-between;align-items:baseline;gap:4px}
.rn-stats b{font-weight:400;font-size:16px;color:#4A3F35;font-variant-numeric:tabular-nums}
.rn-stats .rn-pop{animation:rnpop .3s ease}
@keyframes rnpop{50%{transform:scale(1.25);color:#C8641C}}
.rn-play{position:relative;flex:1;min-height:0;cursor:pointer}
.rn-play canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.rn-cd{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;font-size:84px;color:#C8641C;text-shadow:0 3px 0 #fff,0 6px 18px rgba(200,100,28,.25)}
.rn-cd span{animation:rncd .9s ease both;display:flex;flex-direction:column;align-items:center;line-height:1}
.rn-cd small{display:block;font-size:20px;text-align:center;color:#4A3F35;text-shadow:none;margin-top:14px;line-height:1.4}
@keyframes rncd{0%{transform:scale(1.6);opacity:0}25%{transform:scale(1);opacity:1}85%{opacity:1}100%{opacity:0;transform:scale(.9)}}
.rn-bot{padding:8px 14px 10px;display:flex;flex-direction:column;gap:6px;background:#FBF5EA;border-top:1px solid #EADCC4;min-height:64px}
.rn-fx{display:flex;gap:6px;min-height:26px;flex-wrap:wrap}
.rn-fx>span{position:relative;overflow:hidden;background:#fff;border:1px solid #EADCC4;border-radius:999px;padding:3px 10px;font-size:13px}
.rn-fx>span>i{position:absolute;left:0;bottom:0;height:3px;background:#F28C38;border-radius:2px}
.rn-fx .none{background:transparent;border-color:transparent;color:#A89A87;padding-left:0}
.rn-guide{margin:0;font-size:13px;color:#8B7F70;display:flex;gap:10px;flex-wrap:wrap}
.rn-guide b{font-weight:400;color:#4A3F35}
@media (hover:none){.rn-guide .kb{display:none}}
.rn-over{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(74,63,53,.35);z-index:3;cursor:default}
.rn-over.ending{background:linear-gradient(transparent 40%,rgba(74,63,53,.35));align-items:flex-end}
.rn-card{width:100%;max-width:400px;background:#FBF5EA;border-radius:24px;padding:20px 18px 16px;display:flex;flex-direction:column;gap:12px;box-shadow:0 10px 30px rgba(74,63,53,.25);animation:rnup .3s ease;max-height:100%;overflow:auto}
@keyframes rnup{from{transform:translateY(16px);opacity:0}}
.rn-card .eb{font-size:13px;letter-spacing:.06em;color:#C8641C;text-align:center}
.rn-card h2{margin:0;font-weight:400;font-size:28px;text-align:center;line-height:1.2}
.rn-card .sub{margin:0;text-align:center;color:#8B7F70;font-size:15px;line-height:1.4}
.rn-card canvas.peb{width:110px;height:100px;align-self:center}
.rn-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.rn-grid>div{background:#fff;border:1px solid #EADCC4;border-radius:14px;padding:8px 6px;text-align:center;display:flex;flex-direction:column;gap:2px}
.rn-grid span{font-size:12px;color:#8B7F70}
.rn-grid b{font-weight:400;font-size:19px;font-variant-numeric:tabular-nums}
.rn-grid em{font-style:normal;font-size:11px;color:#C8641C}
.rn-note{margin:0;font-size:13px;color:#8B7F70;text-align:center;line-height:1.45}
.rn-note b{font-weight:400;color:#2F8A5B}
.rn-new{display:inline-block;background:#F28C38;color:#fff;border-radius:999px;font-size:11px;padding:1px 7px;margin-left:4px;vertical-align:middle}
.rn-b{border:0;border-radius:16px;padding:14px;font-size:18px;font-family:inherit;cursor:pointer;background:#F28C38;color:#fff;width:100%}
.rn-b.ghost{background:#EFE3CF;color:#4A3F35}
.rn-b:active{transform:scale(.98)}
.rn-row{display:flex;gap:8px}
.rn-links{justify-content:center;gap:18px}
.rn-link{border:0;background:none;color:#8B7F70;font-family:inherit;font-size:15px;padding:6px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.rn-title{align-self:center;background:#3D2C4A;color:#FFB8CF;border-radius:999px;padding:4px 12px;font-size:14px}
.rn-endtxt{position:absolute;left:0;right:0;top:22px;text-align:center;pointer-events:none;animation:rnup .6s ease both;display:flex;flex-direction:column;gap:4px}
.rn-endtxt b{font-weight:400;font-size:32px;color:#4A3F35}
.rn-endtxt i{font-style:normal;font-size:17px;color:#8B7F70}
.rn-endtxt small{font-size:12.5px;color:#A89A87;margin-top:6px}
body.rn-open{overflow:hidden}
.rn-bot{flex-direction:row;align-items:center;gap:10px}
.rn-botl{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.rn-duck{flex:none;width:86px;height:56px;border:0;border-radius:16px;background:#E2D3BA;color:#4A3F35;font-family:inherit;font-size:15px;line-height:1.15;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 3px 0 #CDB998;touch-action:none;cursor:pointer}
.rn-duck span{font-size:22px}
.rn-duck.on{transform:translateY(3px);box-shadow:none;background:#F6C27F}
.rn-duck.warn{animation:rnwarn .5s ease-in-out infinite alternate}
@keyframes rnwarn{to{background:#F6C27F;box-shadow:0 3px 0 #E09A4E}}
.rn-notes{position:absolute;right:6px;top:6px;width:66%;display:flex;flex-direction:column;gap:6px;z-index:2;pointer-events:none}
.rn-nb{pointer-events:auto;background:rgba(255,255,255,.97);border-radius:16px;padding:10px 12px;box-shadow:0 6px 18px rgba(40,30,20,.22);display:flex;gap:9px;align-items:center;height:58px;overflow:hidden;animation:rnslide .25s ease;cursor:pointer;touch-action:none}
.rn-nb i{font-style:normal;width:30px;height:30px;border-radius:9px;background:#FEE500;display:grid;place-items:center;font-size:16px;flex:none}
.rn-nb div{flex:1;min-width:0;font-size:12px;color:#8B7F70;line-height:1.35}
.rn-nb b{display:block;font-weight:400;font-size:14px;color:#2B2420}
.rn-nb em{font-style:normal;font-size:16px;color:#A89A87;align-self:center}
@keyframes rnslide{from{transform:translateX(30px);opacity:0}}
.rn-lids{position:absolute;inset:0;z-index:3;pointer-events:none}
.rn-lids i{position:absolute;left:0;right:0;height:0;background:#8E8994;pointer-events:auto;cursor:pointer;transition:height .08s linear}
.rn-lids .t{top:0;border-radius:0 0 50% 50%/0 0 26px 26px;background:linear-gradient(#A9A4AE,#7D7884);border-bottom:4px solid #2B2420;box-shadow:0 6px 14px rgba(20,10,40,.4)}
.rn-lids .b{bottom:0;border-radius:50% 50% 0 0/26px 26px 0 0;background:linear-gradient(#7D7884,#A9A4AE);border-top:4px solid #2B2420;box-shadow:0 -6px 14px rgba(20,10,40,.4)}
.rn-lids span{position:absolute;left:50%;top:8px;transform:translateX(-50%);background:rgba(255,255,255,.92);color:#4B3F86;border-radius:999px;padding:5px 12px;font-size:13.5px;white-space:nowrap;pointer-events:auto;cursor:pointer;animation:rnwarn .5s ease-in-out infinite alternate}
.rn-lids.deep span{background:#F6C453;color:#2B2350}
.rn-twist{position:absolute;left:50%;top:46px;transform:translateX(-50%);z-index:4;background:#2B2350;color:#FFE08A;border-radius:14px;padding:7px 14px;text-align:center;font-size:16px;pointer-events:none;box-shadow:0 4px 14px rgba(20,10,40,.35);white-space:nowrap}
.rn-twist small{display:block;font-size:12px;color:#E6DDFF;margin-top:2px}
.rn-twist.warn{animation:rnwarn .3s ease-in-out infinite alternate;background:#E2553C;color:#fff}
.rn.twisted canvas{filter:hue-rotate(150deg) saturate(1.3);animation:rnwob 1.4s ease-in-out infinite}
@keyframes rnwob{0%,100%{transform:rotate(-.6deg)}50%{transform:rotate(.6deg) scale(1.01)}}
.rn.twisted .rn-duck{background:#F6C453}
.rn-duck .dl{font-style:normal}
.rn-zone{position:absolute;left:50%;top:10px;transform:translateX(-50%);width:min(74%,300px);background:rgba(61,44,42,.92);color:#FFE9B8;border-radius:14px;padding:8px 12px 10px;text-align:center;z-index:2;pointer-events:none;font-size:14px}
.rn-zone b{font-weight:400;font-size:16px;color:#fff;display:block;margin-bottom:5px}
.rn-zone .m{height:12px;border-radius:999px;background:rgba(255,255,255,.18);overflow:hidden}
.rn-zone .m i{display:block;height:100%;width:0;background:linear-gradient(90deg,#F6C27F,#E2553C);border-radius:999px}
`;
let styled=false;
function style(){if(styled)return;styled=true;const s=document.createElement("style");s.textContent=CSS;document.head.appendChild(s)}
function el(html){const d=document.createElement("div");d.innerHTML=html.trim();return d.firstChild}

/* ---------- 게임 ---------- */
let G=null;
function open(opt){if(G)G.destroy(true);style();G=new Game(opt);return G}
function Game(opt){
 this.opt=opt;this.sid=opt.sid;
 this.chain=opt.sid==1?{ms:0,done:[]}:null;
 SFX.on=!opt.mute;
 const root=this.root=el(`<div class="rn" role="application" aria-label="돌퇴근 게임"><div class="rn-in">
  <div class="rn-top">
   <div class="rn-r1"><span class="rn-stage" id="rnStage"></span><span class="rn-lives" id="rnLives" aria-label="남은 목숨"></span><div class="rn-btns"><button class="rn-ib" data-rn="mute" aria-label="소리 켜기/끄기"></button><button class="rn-ib" data-rn="pause" aria-label="일시정지">⏸</button></div></div>
   <div class="rn-prog"><div class="rn-bar" aria-hidden="true"><i></i><span></span><em></em></div><span class="rn-left">퇴근까지 <b id="rnLeft">0</b>m</span></div>
   <div class="rn-stats"><span>점수 <b id="rnScore">0</b></span><span>⚪ 자갈 <b id="rnPeb">0</b></span><span>⏱ <b id="rnTime">0:00.00</b></span></div>
  </div>
  <div class="rn-play"><canvas></canvas><div class="rn-notes" aria-live="polite"></div><div class="rn-zone" hidden><b>🍖 연타해서 버텨요!</b><div class="m"><i></i></div></div><div class="rn-lids" hidden><i class="t"></i><i class="b"></i><span>😪 눈꺼풀을 톡톡 눌러 눈 떠요!</span></div><div class="rn-twist" hidden></div><div class="rn-cd" aria-live="assertive"></div></div>
  <div class="rn-bot"><div class="rn-botl"><div class="rn-fx" aria-live="polite"></div><p class="rn-guide"><span><b>탭</b> 점프 · <b>길게</b> 높이 · <b>공중 탭</b> 2단</span><span>❤️ 3개 · ☕로 회복</span><span class="kb">PC는 <b>스페이스</b> · 숙이기 <b>↓</b></span></p></div><button class="rn-duck" type="button" aria-label="숙이기 (누르고 있는 동안)"><span>🙇</span><em class="dl">숙이기</em></button></div>
 </div></div>`);
 document.body.appendChild(root);document.body.classList.add("rn-open");
 this.$={stage:root.querySelector("#rnStage"),lives:root.querySelector("#rnLives"),left:root.querySelector("#rnLeft"),score:root.querySelector("#rnScore"),peb:root.querySelector("#rnPeb"),time:root.querySelector("#rnTime"),
  bar:root.querySelector(".rn-bar>i"),dot:root.querySelector(".rn-bar>span"),goal:root.querySelector(".rn-bar>em"),fx:root.querySelector(".rn-fx"),cd:root.querySelector(".rn-cd"),
  play:root.querySelector(".rn-play"),cv:root.querySelector("canvas"),notes:root.querySelector(".rn-notes"),zone:root.querySelector(".rn-zone"),zbar:root.querySelector(".rn-zone .m i"),duck:root.querySelector(".rn-duck"),lids:root.querySelector(".rn-lids"),lidT:root.querySelector(".rn-lids .t"),lidB:root.querySelector(".rn-lids .b"),twist:root.querySelector(".rn-twist"),dl:root.querySelector(".rn-duck .dl"),mute:root.querySelector('[data-rn="mute"]'),inner:root.querySelector(".rn-in")};
 this.ctx=this.$.cv.getContext("2d");
 this.cache={};this.q=[];this.pointers=new Set();this.keyDown=false;
 this.bind();this.resize();this.setMute(!SFX.on,true);
 this.start(this.sid);
 this.raf=requestAnimationFrame(t=>this.frame(t));
}
const P=Game.prototype;
P.start=function(sid){
 this.sid=sid;this.S=K.STAGES[sid];
 const seed=(Math.random()*4294967296)>>>0;
 this.R=K.newRun(sid,seed);this.runId=Date.now().toString(36)+Math.random().toString(36).slice(2,8);
 this.parts=[];this.vis={sx:1,sy:1,ph:0,mood:"run",moodT:0,dx:0,dy:0,dvx:0,dvy:0,rot:0,fade:1,shake:0,t:0};
 this.wallMs=0;this.acc=0;this.over(null);
 this.layersFor();
 this.stageLabel();this.root.classList.remove("twisted");if(this.$.twist){this.$.twist.hidden=true;this.$.lids.hidden=true;this.$.dl.textContent="숙이기"}
 {const zb=this.$.zone&&this.$.zone.querySelector("b");if(zb)zb.textContent=this.S.key==="dream"?"🛏 연타해서 일어나요!":"🍖 연타해서 버텨요!"}
 this.$.goal.textContent=GOAL_ICON[this.S.key];
 this.cache={};this.hud(true);
 this.count(3,"run");
};
P.stageLabel=function(){const sid=this.sid,R=this.R;this.$.stage.innerHTML=this.S.need?`STAGE ${sid} · 꿈 · ⏰ <b>${R?R.alarms:0}/${this.S.need}</b>`:`STAGE ${sid==="fri"?"🔥":sid} · <b>${this.S.name}</b>`};
P.layersFor=function(){const k=this.S.key+"|"+this.LH+"|"+this.scale;if(this.Lkey===k)return;this.Lkey=k;this.L=A.layers(this.S.key,this.LH,this.gy,this.scale*this.dpr)};
P.count=function(n,next){this.phase="count";this.cdLeft=n;this.cdNext=next;this.cdShown=null;this.q.length=0;this.pointers.clear();this.keyDown=false;this.duckKey=false;this.duckPtr=null;if(this.$.duck)this.$.duck.classList.remove("on");if(this.R&&this.R.duckHold)this.q.push(3)};
P.resize=function(){
 const r=this.$.play.getBoundingClientRect();this.dpr=Math.min(2,window.devicePixelRatio||1);
 const s=Math.min(r.width/VW,r.height/300);this.scale=s;this.LW=r.width/s;this.LH=r.height/s;
 this.gy=Math.round(this.LH-Math.min(140,Math.max(56,this.LH*.22)));
 this.$.cv.width=Math.round(r.width*this.dpr);this.$.cv.height=Math.round(r.height*this.dpr);
 if(this.S)this.layersFor();
 /* 알림 3장이 쌓이면 마지막 장이 달리는 길(오른쪽)을 가리도록 */
 if(this.$.notes)this.$.notes.style.top=Math.max(6,Math.round(this.gy*this.scale-3*64-2))+"px";
};
P.bind=function(){
 const play=this.$.play,root=this.root;
 const down=e=>{if(e.target.closest(".rn-over,button,.rn-notes,.rn-lids i,.rn-lids span"))return;e.preventDefault();SFX.init();
  if(this.phase==="ending"){this.endingSkip();return}
  if(this.phase!=="run")return;
  try{e.target.setPointerCapture&&e.target.setPointerCapture(e.pointerId)}catch(x){}
  this.pointers.add(e.pointerId);this.q.push(1)};
 const up=e=>{if(!this.pointers.has(e.pointerId))return;this.pointers.delete(e.pointerId);if(!this.pointers.size&&!this.keyDown)this.q.push(0)};
 this.h={
  down,up,
  key:e=>{
   if(e.code==="Escape"||e.code==="KeyP"){if(this.phase==="run"||this.phase==="count"){e.preventDefault();this.pause()}else if(this.phase==="paused"){e.preventDefault();this.resume()}return}
   if(e.code==="ArrowDown"||e.code==="KeyS"){if(this.phase!=="run")return;e.preventDefault();if(e.repeat||this.duckKey)return;SFX.init();this.duckKey=true;this.duckDown();return}
   if(!(e.code==="Space"||e.code==="ArrowUp"||e.code==="KeyW"))return;
   if(this.phase==="ending"){e.preventDefault();this.endingSkip();return}
   if(this.phase!=="run"&&this.phase!=="count")return;
   e.preventDefault();if(e.repeat||this.keyDown)return;SFX.init();if(this.phase!=="run")return;this.keyDown=true;this.q.push(1)},
  keyup:e=>{if(e.code==="ArrowDown"||e.code==="KeyS"){if(this.duckKey){this.duckKey=false;if(!this.duckPtr)this.duckUp()}return}
   if(!(e.code==="Space"||e.code==="ArrowUp"||e.code==="KeyW"))return;if(!this.keyDown)return;this.keyDown=false;if(!this.pointers.size)this.q.push(0)},
  vis:()=>{if(document.hidden&&(this.phase==="run"||this.phase==="count"))this.pause()},
  blur:()=>{if(this.phase==="run")this.pause()},
  resize:()=>{this.resize()},
  click:e=>{const b=e.target.closest("[data-rn]");if(!b)return;SFX.init();this.cmd(b.dataset.rn,b)},
  ctx:e=>e.preventDefault(),
 };
 const bot=root.querySelector(".rn-bot");
 [play,bot].forEach(x=>{x.addEventListener("pointerdown",down);x.addEventListener("pointerup",up);x.addEventListener("pointercancel",up);x.addEventListener("lostpointercapture",up)});
 root.addEventListener("click",this.h.click);root.addEventListener("contextmenu",this.h.ctx);
 /* 숙이기 버튼: 누르는 동안 숙여요 */
 const dk=this.$.duck;
 dk.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();SFX.init();if(this.phase!=="run")return;try{dk.setPointerCapture(e.pointerId)}catch(x){}this.duckPtr=e.pointerId;this.duckDown()});
 const dup=e=>{if(this.duckPtr!==e.pointerId)return;this.duckPtr=null;if(!this.duckKey)this.duckUp()};
 ["pointerup","pointercancel","lostpointercapture"].forEach(n=>dk.addEventListener(n,dup));
 /* 단톡방 알림: 누르면 한 장씩 닫혀요 (점프는 안 돼요) */
 this.$.lids.addEventListener("pointerdown",e=>{if(!e.target.closest("i,span"))return;e.preventDefault();e.stopPropagation();SFX.init();if(this.phase==="run")this.q.push(5)});
 this.$.notes.addEventListener("pointerdown",e=>{const b=e.target.closest(".rn-nb");if(!b)return;e.preventDefault();e.stopPropagation();SFX.init();if(this.phase==="run")this.q.push(4)});
 window.addEventListener("keydown",this.h.key);window.addEventListener("keyup",this.h.keyup);
 document.addEventListener("visibilitychange",this.h.vis);window.addEventListener("blur",this.h.blur);window.addEventListener("resize",this.h.resize);
};
P.duckDown=function(){this.q.push(2);this.$.duck.classList.add("on")};
P.duckUp=function(){this.q.push(3);this.$.duck.classList.remove("on")};
P.destroy=function(silent){
 cancelAnimationFrame(this.raf);this.dead=true;
 window.removeEventListener("keydown",this.h.key);window.removeEventListener("keyup",this.h.keyup);
 document.removeEventListener("visibilitychange",this.h.vis);window.removeEventListener("blur",this.h.blur);window.removeEventListener("resize",this.h.resize);
 this.root.remove();document.body.classList.remove("rn-open");if(G===this)G=null;
 if(!silent&&this.opt.onExit)this.opt.onExit();
};
P.setMute=function(m,quiet){SFX.on=!m;this.$.mute.textContent=m?"🔇":"🔊";this.$.mute.setAttribute("aria-pressed",String(m));if(!quiet&&this.opt.onMute)this.opt.onMute(m)};
P.cmd=function(c,b){
 if(c==="mute")return this.setMute(SFX.on);
 if(c==="pause")return this.phase==="paused"?this.resume():this.pause();
 if(c==="resume")return this.resume();
 if(c==="retry"){return this.start(this.sid)}
 if(c==="next"){const n=this.sid==1?2:this.sid==2?3:this.sid==3?4:null;if(n)this.start(n);return}
 if(c==="exit")return this.destroy();
 if(c==="share")return this.share(b);
 if(c==="ending")return this.showEnding();
 if(c==="restart1"){this.chain={ms:0,done:[]};return this.start(1)}
};
P.pause=function(){
 if(this.phase!=="run"&&this.phase!=="count")return;
 this.pausedFrom=this.phase;this.phase="paused";this.q.length=0;this.pointers.clear();this.keyDown=false;this.duckKey=false;this.duckPtr=null;this.$.duck.classList.remove("on");this.$.cd.innerHTML="";
 this.over(`<div class="rn-card" role="dialog" aria-label="일시정지"><p class="eb">일시정지</p><h2>잠깐 숨 돌리돌</h2>
  <p class="sub">STAGE ${this.sid==="fri"?"불금":this.sid} · ${this.S.name} · 퇴근까지 ${won(Math.max(0,Math.round((this.S.len-this.R.x)/K.M)))}m</p>
  <button class="rn-b" data-rn="resume">계속 달리기</button><div class="rn-row"><button class="rn-b ghost" data-rn="retry">처음부터</button><button class="rn-b ghost" data-rn="exit">게임 나가기</button></div></div>`);
};
P.resume=function(){if(this.phase!=="paused")return;this.over(null);this.count(3,"run")};
P.over=function(html,cls){let o=this.root.querySelector(".rn-over");if(!html){if(o)o.remove();return}if(!o){o=document.createElement("div");this.$.inner.appendChild(o)}o.className="rn-over"+(cls?" "+cls:"");o.innerHTML=html;const f=o.querySelector(".rn-b");if(f)setTimeout(()=>{try{f.focus({preventScroll:true})}catch(e){}},50)};

/* ---------- 루프 ---------- */
P.frame=function(ts){
 if(this.dead)return;this.raf=requestAnimationFrame(t=>this.frame(t));
 const dt=this.last?Math.min(.1,(ts-this.last)/1000):0;this.last=ts;
 this.vis.t+=dt;
 if(this.phase==="count"){
  this.cdLeft-=dt;const n=Math.ceil(this.cdLeft);
  if(n!==this.cdShown){this.cdShown=n;
   if(n>0){this.$.cd.innerHTML=`<span>${n}${this.pausedFrom?"":(n===3?`<small>${this.S.goal}까지 달려요<br>화면을 누르면 점프!${TIP[this.sid]?`<br>${TIP[this.sid]}`:""}</small>`:"")}</span>`;SFX.play("count")}
   else{this.$.cd.innerHTML=`<span style="font-size:52px">퇴근 시작!</span>`;SFX.play("go");this.phase=this.cdNext;this.pausedFrom=null;this.acc=0;setTimeout(()=>{if(this.phase!=="count")this.$.cd.innerHTML=""},700)}}
 }else if(this.phase==="run"){
  this.wallMs+=dt*1000;this.acc+=dt;
  while(this.acc>=K.TICK&&this.phase==="run"){this.acc-=K.TICK;this.tick()}
 }else if(this.phase==="dying"){this.animDying(dt)}
 else if(this.phase==="winning"){this.animWinning(dt)}
 this.animVis(dt);this.animParts(dt);
 if(this.phase==="ending"||this.phase==="endcard")this.drawEnding();else this.draw();
 if(this.phase==="run"||this.phase==="count")this.hud();
};
P.tick=function(){
 const R=this.R;let p=false,r=false;
 const o={};
 while(this.q.length){const e=this.q[0];
  if(e===1){if(p||r)break;p=true;this.q.shift()}
  else if(e===0){r=true;this.q.shift();if(p)break}
  else{const k=e===2?"dd":e===3?"du":e===5?"bl":"dis";if(o[k]||(k==="dd"&&o.du))break;o[k]=1;this.q.shift()}}
 K.step(R,p,r,o);
 if(R.ev.length){for(const e of R.ev)this.event(e);R.ev.length=0}
};
P.event=function(e){
 const R=this.R,V=this.vis,[k,a,b]=e.split(":");
 const wx=R.x+K.PB.w/2,wy=R.y;
 if(k==="jump"){SFX.play("jump");V.sx=.86;V.sy=1.16;V.mood="jump";this.dust(wx,0,5)}
 else if(k==="jump2"){SFX.play("jump2");V.sx=.86;V.sy=1.14;V.mood="jump";for(let i=0;i<10;i++){const an=i/10*Math.PI*2;this.parts.push({k:"ring",x:wx,y:wy+10,vx:Math.cos(an)*90,vy:Math.sin(an)*90,g:0,life:.35,max:.35,c:"#fff"})}}
 else if(k==="land"){V.sx=1.16;V.sy=.84;V.mood="run";this.dust(wx,0,4)}
 else if(k==="pebble"){SFX.play("pebble");const it=R.C.items[+a];this.float(it.x,it.y+18,"+1 ⚪","#8B7F70");this.spark(it.x+6,it.y+6,"#C9C4BC",5);this.bump("peb")}
 else if(k==="alarm"){SFX.play("item");const it=R.C.items[+a];const n=R.alarms,need=this.S.need||3;this.float(it.x,it.y+34,n>=need?`⏰ ${n}개! 이제 깰 수 있어요`:`⏰ 알람 ${n}/${need}`,"#C8641C",1.2);this.spark(it.x+11,it.y+11,"#FFE08A",16);this.stageLabel()}
 else if(k==="item"){SFX.play("item");const it=R.C.items[+b];const I=K.ITEMS[a];this.float(it.x,it.y+30,I.icon+" "+I.name+"!","#C8641C",1.1);this.spark(it.x+11,it.y+11,"#F6C27F",14)}
 else if(k==="smash"){SFX.play("smash");const o=R.C.obs[+a];this.parts.push({k:"debris",t:o.t,w:o.w,h:o.h,x:R.O[+a].x,y:o.y,vx:260,vy:420,g:1400,rot:0,vr:9,life:1.2,max:1.2,i:+a});this.float(R.O[+a].x,o.h+30,"연차 방어!","#2F8A5B")}
 else if(k==="hurt"){SFX.play("smash");V.mood="hit";V.moodT=.5;V.shake=.25;const o=R.C.obs[+a];this.parts.push({k:"debris",t:o.t,w:o.w,h:o.h,x:R.O[+a].x,y:o.y,vx:220,vy:380,g:1400,rot:0,vr:-8,life:1.1,max:1.1,i:+a});this.float(wx,60,(QUIP[o.t]||"앗!")+" -1❤️","#D9534F",1);V.dizzy=.9;this.bump("lives");try{navigator.vibrate&&navigator.vibrate(40)}catch(x){}}
 else if(k==="duck"){SFX.play("duck")}
 else if(k==="resist"){SFX.play("resist");V.sx=1.1;V.sy=.9;if(Math.random()<.5)this.dust(wx-10,0,2)}
 else if(k==="zone"){
  const dr=this.S.key==="dream";
  if(a==="in"){SFX.play("zone");this.float(wx+40,96,dr?"🛏 5분만 더…":"🍖 고기 냄새가…","#C8462E",1)}
  else if(a==="out"){SFX.play("item");this.float(wx,86,`${dr?"이불 탈출!":"회식 탈출!"} +${K.ZONE.esc}`,"#2F8A5B",1);this.bump("score")}
  else if(a==="shield"){SFX.play("smash");this.float(wx,86,"연차 방어! 회식 패스","#2F8A5B",1)}
  else if(a==="free"){this.float(wx,86,"휴, 겨우 빠져나왔다","#8B7F70")}}
 else if(k==="zhurt"){SFX.play("hit");V.mood="hit";V.moodT=.5;V.shake=.25;V.dizzy=.9;this.float(wx,70,"끌려갔다… -1 ❤️","#D9534F",1);this.bump("lives");try{navigator.vibrate&&navigator.vibrate(40)}catch(x){}}
 else if(k==="note"){SFX.play("note");try{navigator.vibrate&&navigator.vibrate(15)}catch(x){}}
 else if(k==="dism"){SFX.play("dism");this.bump("score")}
 else if(k==="blink"){SFX.play("dism")}
 else if(k==="twist"){
  if(a==="warn"){SFX.play("note");this.$.twist.hidden=false;this.$.twist.className="rn-twist warn";this.$.twist.innerHTML="⚠️ 꿈이 뒤틀려요!<small>곧 조작이 반대로 바뀌어요</small>";try{navigator.vibrate&&navigator.vibrate([30,40,30])}catch(x){}}
  else if(a==="on"){SFX.play("zone");this.root.classList.add("twisted");this.$.twist.hidden=false;this.$.twist.className="rn-twist on";this.$.twist.innerHTML="🔄 조작 반전!<small>탭 = 숙이기 · 🙇 버튼 = 점프</small>";this.$.dl.textContent="점프";this.pointers.clear();this.duckPtr=null;this.$.duck.classList.remove("on")}
  else{this.root.classList.remove("twisted");this.$.twist.hidden=true;this.$.dl.textContent="숙이기";this.float(wx,80,"휴, 정신 차렸다","#2F8A5B")}}
 else if(k==="lid"){if(a==="on"){SFX.play("zone");this.$.lids.hidden=false;this.float(wx+30,96,"😪 눈이 감겨요…","#8C7FC0",1)}else{this.$.lids.hidden=true;this.float(wx,86,"번쩍! 눈 떴다","#2F8A5B")}}
 else if(k==="heal"){this.float(wx,74,"+1 ❤️","#2F8A5B",1);this.bump("lives")}
 else if(k==="hit"){SFX.play("hit");V.mood="hit";V.dvx=-110;V.dvy=330;V.shake=.35;this.phase="dying";this.dieT=0;try{navigator.vibrate&&navigator.vibrate(60)}catch(x){}}
 else if(k==="win"){SFX.play("win");V.mood="win";this.phase="winning";this.winT=0;for(let i=0;i<40;i++)this.parts.push({k:"conf",x:R.x+40+Math.random()*120,y:140+Math.random()*80,vx:-60+Math.random()*120,vy:Math.random()*120,g:-260,life:2,max:2,c:["#F28C38","#F6C27F","#3557D8","#2FA36B","#F2A3A3"][i%5],rot:Math.random()*6,vr:-6+Math.random()*12})}
};
P.bump=function(id){const e=id==="peb"?this.$.peb:id==="lives"?this.$.lives:this.$.score;e.classList.remove("rn-pop");void e.offsetWidth;e.classList.add("rn-pop")};
P.dust=function(x,y,n){for(let i=0;i<n;i++)this.parts.push({k:"dust",x:x-8+Math.random()*16,y:y+2,vx:-40-Math.random()*60,vy:30+Math.random()*50,g:-60,life:.4,max:.4,s:2+Math.random()*3})};
P.spark=function(x,y,c,n){for(let i=0;i<n;i++){const an=Math.random()*Math.PI*2,sp=40+Math.random()*90;this.parts.push({k:"spark",x,y,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp,g:0,life:.45,max:.45,c})}};
P.float=function(x,y,s,c,big){this.parts.push({k:"txt",x,y,vx:0,vy:40,g:0,life:.9,max:.9,s,c,big})};
P.animParts=function(dt){const a=this.parts;for(let i=a.length-1;i>=0;i--){const p=a[i];p.life-=dt;if(p.life<=0){a.splice(i,1);continue}p.vy-=(p.g||0)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.vr)p.rot+=p.vr*dt}};
P.animVis=function(dt){const V=this.vis,R=this.R;
 V.sx+=(1-V.sx)*Math.min(1,dt*14);V.sy+=(1-V.sy)*Math.min(1,dt*14);
 if(V.moodT>0){V.moodT-=dt;if(V.moodT<=0&&V.mood==="hit"&&this.phase==="run")V.mood=R&&R.ground?"run":"jump"}
 if(R&&this.phase==="run"){V.ph+=dt*K.speed(R)/9;if(V.moodT>0){}else if(R.ground&&V.mood==="jump")V.mood="run";if(!R.ground&&V.mood==="run"&&R.vy<-200)V.mood="jump"}
 if(V.shake>0)V.shake=Math.max(0,V.shake-dt);if(V.dizzy>0)V.dizzy=Math.max(0,V.dizzy-dt)};
P.animDying=function(dt){const V=this.vis;this.dieT+=dt;V.dvy-=1500*dt;V.dx+=V.dvx*dt;V.dy+=V.dvy*dt;if(this.R.y+V.dy<0){V.dy=-this.R.y;V.dvy=0;V.dvx*=.6}V.rot-=dt*4;if(this.dieT>1.05)this.finish()};
P.animWinning=function(dt){const V=this.vis;this.winT+=dt;V.ph+=dt*28;V.dx+=dt*150;if(V.dx>50)V.fade=Math.max(0,1-(V.dx-50)/40);if(this.winT>1.6)this.finish()};

/* ---------- HUD ---------- */
P.hud=function(force){
 const R=this.R,c=this.cache;
 if(force||c.lives!==R.lives){c.lives=R.lives;this.$.lives.textContent="❤️".repeat(Math.max(0,R.lives))+"🤍".repeat(Math.max(0,K.LIVES-R.lives))}
 const left=Math.max(0,Math.ceil((this.S.len-R.x)/K.M)),sc=K.score(R),pct=Math.min(100,R.x/this.S.len*100);
 if(force||c.left!==left){c.left=left;this.$.left.textContent=won(left)}
 if(force||c.sc!==sc){c.sc=sc;this.$.score.textContent=won(sc)}
 if(force||c.peb!==R.pebbles){c.peb=R.pebbles;this.$.peb.textContent=R.pebbles}
 const tm=fmt(K.ms(R));if(force||c.tm!==tm){c.tm=tm;this.$.time.textContent=tm}
 const pp=pct.toFixed(1);if(force||c.pct!==pp){c.pct=pp;this.$.bar.style.width=pp+"%";this.$.dot.style.left=pp+"%"}
 if(force||c.nb!==R.nb){const add=R.nb>(c.nb||0);c.nb=R.nb;
  let h="";for(let k=0;k<R.nb;k++){const NL=this.S.key==="dream"?NOTES_DREAM:NOTES,m=NL[(R.ni*3+k)%NL.length];h+=`<div class="rn-nb" role="button" aria-label="알림 닫기"><i>💬</i><div><b>${m[0]}</b>${m[1]}</div><em>✕</em></div>`}
  this.$.notes.innerHTML=h;if(!add)this.$.notes.querySelectorAll(".rn-nb").forEach(n=>n.style.animation="none")}
 if(force||c.zin!==R.zin){c.zin=R.zin;this.$.zone.hidden=!R.zin}
 {const lv=R.lidOn?(R.lid*47).toFixed(1):"0";if(force||c.lid!==lv){c.lid=lv;this.$.lidT.style.height=lv+"%";this.$.lidB.style.height=lv+"%";this.$.lids.classList.toggle("deep",R.lid>.6)}}
 if(R.zin){const zp=(R.zm*100).toFixed(0);if(c.zp!==zp){c.zp=zp;this.$.zbar.style.width=zp+"%"}}
 {let warn=false;const ob=R.C.obs;for(let i=0;i<ob.length;i++){const s=R.O[i];if(s.gone)continue;const dx=s.x-R.x;if(dx>K.PHY.ACT)break;if(dx<-40)continue;if(K.OBS[ob[i].t].duck){warn=true;break}}
  if(force||c.warn!==warn){c.warn=warn;this.$.duck.classList.toggle("warn",warn)}}
 const fx=Object.keys(R.fx).filter(k=>R.fx[k]>0);const fk=fx.map(k=>k+Math.ceil(R.fx[k]*4)).join();
 if(force||c.fx!==fk){c.fx=fk;this.$.fx.innerHTML=fx.length?fx.map(k=>{const I=K.ITEMS[k];return `<span>${I.icon} ${I.name} ${R.fx[k].toFixed(1)}초<i style="width:${R.fx[k]/K.PHY.EFFECT*100}%"></i></span>`}).join(""):`<span class="none">☕ 커피 · 🛡️ 연차권 · 👟 운동화 = 5초 동안 효과</span>`}
};

/* ---------- 그리기 ---------- */
P.tile=function(img,off,y,h){const ctx=this.ctx,TW=A.TW,k=this.scale*this.dpr;const o=Math.round((((off%TW)+TW)%TW)*k)/k;ctx.drawImage(img,-o,y,TW,h);if(TW-o<this.LW)ctx.drawImage(img,TW-o,y,TW,h);if(2*TW-o<this.LW)ctx.drawImage(img,2*TW-o,y,TW,h)};
P.draw=function(){
 const ctx=this.ctx,R=this.R,S=this.S,V=this.vis,L=this.L,gy=this.gy,t=V.t;
 const k=this.scale*this.dpr;ctx.setTransform(k,0,0,k,0,0);
 if(V.shake>0)ctx.translate((Math.random()-.5)*8*V.shake,(Math.random()-.5)*8*V.shake);
 const camX=Math.min(R.x,S.len)-PX;
 ctx.drawImage(L.sky,0,0,Math.max(A.TW,this.LW),this.LH);
 this.tile(L.far,camX*L.T.far,0,gy);this.tile(L.mid,camX*L.T.mid,0,gy);this.tile(L.ground,camX,gy,this.LH-gy);
 /* 도착지 */
 const gx=S.len+PX+40-camX-PX;if(gx<this.LW+40)A.GOAL[S.key](ctx,gx,gy+1,t);
 for(const z of R.C.zones){const a=z.x0-camX,b=z.x1-camX;if(b<-20||a>this.LW+20)continue;if(S.key==="dream")A.zoneDream(ctx,a,b,gy,t);else A.zoneShop(ctx,a,b,gy,t,S.key==="friday")}
 /* 아이템 */
 const it=R.C.items;for(let i=0;i<it.length;i++){if(R.got[i])continue;const a=it[i],sx=a.x-camX;if(sx>this.LW+30)break;if(sx<-30)continue;
  if(a.t==="pebble")A.pebbleItem(ctx,sx,gy-a.y-12,t);else if(a.t==="alarm")A.alarmItem(ctx,sx,gy-a.y-24,t);else A.powerItem(ctx,a.t,sx,gy-a.y-22,t)}
 /* 장애물 */
 const ob=R.C.obs,fri=S.key==="friday";for(let i=0;i<ob.length;i++){const s=R.O[i];if(s.gone)continue;const o=ob[i],sx=s.x-camX;if(sx>this.LW+60)break;if(sx+o.w<-60)continue;
  A.obstacle(ctx,o.t,sx,gy-K.obsY(R,i),o.w,o.h,t,i,fri)}
 /* 뒤에서 쫓아오는 팀장 */
 {const tgt=R.lives>=3?-70:R.lives===2?-8:PX-50;V.boss=V.boss==null?-70:V.boss+(tgt-V.boss)*Math.min(1,(this.phase==="dying"?6:2.5)*(1/60));if(this.phase==="dying"&&R.lives<=0)V.boss+=(PX-30-V.boss)*.08;
  if(V.boss>-60)A.chaser(ctx,V.boss,gy,t,R.lives<=1,S.key==="friday",S.key==="dream")}
 /* 그림자 + 돌대리 */
 const px=PX+K.PB.w/2+V.dx,py=gy-R.y-V.dy;
 const hgt=R.y+V.dy;ctx.save();ctx.globalAlpha=.18*V.fade;A.ell(ctx,px,gy+1,15*(1-Math.min(.6,hgt/160)),3.4,"#4A3F35");ctx.restore();
 if(R.fx.coffee>0&&this.phase==="run"){ctx.strokeStyle="rgba(200,100,28,.45)";ctx.lineWidth=2;ctx.lineCap="round";for(let i=0;i<3;i++){const yy=py-10-i*10,l=14+((t*40+i*7)%10);ctx.beginPath();ctx.moveTo(px-24-l,yy);ctx.lineTo(px-22,yy);ctx.stroke()}}
 ctx.save();ctx.globalAlpha=V.fade*(R.inv>0&&this.phase==="run"&&Math.floor(t*14)%2?.35:1);
 {const po={phase:V.ph,mood:V.mood,air:!R.ground||this.phase==="dying",sx:V.sx,sy:V.sy,rot:V.rot+(R.ground?.06:-Math.max(-.2,Math.min(.2,R.vy*.0003))),t,shoes:R.fx.shoes>0,scale:DRAW_SCALE,res:this.scale*this.dpr*DRAW_SCALE};
  if(R.duck&&this.phase==="run")A.duckPose(ctx,px,py,po);else A.pebble(ctx,px,py,po)}
 if(V.dizzy>0&&this.phase==="run")A.dizzy(ctx,px,py-(R.duck?28:58),t,Math.min(1,V.dizzy*2));
 if(R.zin&&this.phase==="run"){ctx.strokeStyle="rgba(200,70,46,.55)";ctx.lineWidth=1.6;ctx.lineCap="round";for(let i=0;i<3;i++){const yy=py-14-i*9,o=(t*60+i*9)%22;ctx.beginPath();ctx.moveTo(px+26+o,yy);ctx.quadraticCurveTo(px+36+o,yy-5,px+46+o,yy);ctx.stroke()}}
 ctx.restore();
 if(R.fx.shield>0){const a=R.fx.shield<1.2?(Math.sin(t*30)>0?.9:.3):.9;ctx.save();ctx.globalAlpha=a;ctx.strokeStyle="#5CC3A0";ctx.lineWidth=2.4;ctx.beginPath();ctx.arc(px,py-19,27,0,Math.PI*2);ctx.stroke();ctx.fillStyle="rgba(158,217,195,.18)";ctx.fill();A.txt(ctx,"연차",px,py-50,10,"#2F8A5B");ctx.restore()}
 if(R.fx.shoes>0&&this.phase==="run"&&R.ground&&Math.random()<.3)this.spark(R.x+4,2,"#F6A49A",1);
 if(R.lives===1&&this.phase==="run"){const g=ctx.createRadialGradient(this.LW/2,this.LH/2,Math.min(this.LW,this.LH)*.35,this.LW/2,this.LH/2,Math.max(this.LW,this.LH)*.75);g.addColorStop(0,"rgba(217,83,79,0)");g.addColorStop(1,`rgba(217,83,79,${.22+.08*Math.sin(t*6)})`);ctx.fillStyle=g;ctx.fillRect(0,0,this.LW,this.LH)}
 /* 입자 */
 for(const p of this.parts){const sx=p.x-camX,sy=gy-p.y,al=Math.max(0,p.life/p.max);ctx.save();ctx.globalAlpha=al;
  if(p.k==="dust")A.ell(ctx,sx,sy,p.s,p.s*.8,"#D8C9B0");
  else if(p.k==="spark"||p.k==="ring")A.ell(ctx,sx,sy,2,2,p.c);
  else if(p.k==="conf"){ctx.translate(sx,sy);ctx.rotate(p.rot);ctx.fillStyle=p.c;ctx.fillRect(-3,-1.5,6,3)}
  else if(p.k==="debris"){ctx.translate(sx+p.w/2,sy-p.h/2);ctx.rotate(p.rot);A.obstacle(ctx,p.t,-p.w/2,p.h/2,p.w,p.h,t,p.i,fri)}
  else if(p.k==="txt"){ctx.font=`${p.big?15:12}px ${A.FONT}`;ctx.textAlign="center";ctx.lineWidth=3;ctx.strokeStyle="#fff";ctx.strokeText(p.s,sx,sy);ctx.fillStyle=p.c;ctx.fillText(p.s,sx,sy)}
  ctx.restore()}
};

/* ---------- 끝 ---------- */
P.finish=function(){
 this.cache={};this.hud(true);
 const R=this.R;const win=R.state==="win";
 const res={runId:this.runId,sid:this.sid,seed:R.seed,inputs:R.inputs.slice(),state:R.state,ms:K.ms(R),score:K.score(R),pebbles:R.pebbles,meters:K.meters(R),items:R.items,smashed:R.smashed,hurts:R.hurts,lives:R.lives,wallMs:Math.round(this.wallMs),hitBy:R.hitKind==="zone"&&this.S.key==="dream"?"dzone":R.hitKind||(R.hitBy!=null?R.C.obs[R.hitBy].t:null),alarms:R.alarms,dism:R.dism,zEsc:R.zEsc};
 let chainTotal=null;
 if(win&&this.chain&&this.chain.done.length===(this.sid-1)){this.chain.ms+=res.ms;this.chain.done.push(this.sid);if(this.sid==3){chainTotal=this.chain.ms}}
 res.chainTotal=chainTotal;
 const info=(this.opt.onEnd&&this.opt.onEnd(res))||{};
 this.result={res,info};
 if(win&&this.sid==3){this.showEnding();return}
 this.phase="over";this.showResult();
};
P.peb=function(mood){const c=document.createElement("canvas");c.className="peb";const d=Math.min(2,window.devicePixelRatio||1);c.width=110*d;c.height=100*d;const x=c.getContext("2d");x.scale(d,d);A.pebble(x,55,92,{mood,air:mood==="hit",scale:1.55,res:1.55*d,t:0});return c};
P.showResult=function(){
 const {res,info}=this.result,S=this.S,win=res.state==="win";
 if(!win){
  const dr=S.key==="dream",slept=res.hitBy==="sleep";
  this.over(`<div class="rn-card" role="dialog" aria-label="실패"><div class="pebslot"></div><h2>${slept?"😴 다시 잠들었어요…":dr?"🌙 꿈속 야근 확정!":"🚨 야근 확정!"}</h2><p class="sub">${slept?`알람시계를 ${res.alarms||0}개만 모았어요. ⏰ ${S.need}개를 모아야 깨요`:dr?"꿈속 팀장님에게 붙잡혔어요":"팀장님에게 붙잡혔어요"}${slept?"":`<br><small>마지막 실수: ${CAUSE[res.hitBy]||"앗, 부딪혔어요"}</small>`}</p>
   <div class="rn-grid" style="grid-template-columns:repeat(2,1fr)"><div><span>달린 거리</span><b>${won(res.meters)}m</b>${slept?"<em>끝까지 왔는데…!</em>":`<em>${dr?"기상까지":"퇴근까지"} ${won(Math.round(S.len/K.M)-res.meters)}m 남았었어요</em>`}</div><div><span>획득 점수</span><b>${won(res.score)}</b>${info.bestScore?`<em>최고 ${won(info.bestScore)}</em>`:""}</div></div>
   <p class="rn-note">${res.pebbles?`자갈 ${res.pebbles}개는 퇴근에 성공해야 월급코인으로 바뀌어요.`:"자갈은 퇴근에 성공하면 월급코인으로 바뀌어요."}</p>
   <button class="rn-b" data-rn="retry">다시 도전하기</button><button class="rn-b ghost" data-rn="exit">게임 나가기</button></div>`);
  this.root.querySelector(".pebslot").replaceWith(this.peb("hit"));return}
 const next=this.sid==1||this.sid==2||this.sid==3,dr=this.S.key==="dream";
 const reward=info.invalid?`<p class="rn-note">기록을 확인하지 못해서 이번 판은 저장하지 않았어요.</p>`
  :info.coins?`<p class="rn-note">자갈 ${info.pebblesPaid}개 → <b>월급코인 +${won(info.coins)}</b> 들어갔어요${info.capped?" (오늘 자갈 보상 한도까지만)":""}</p>`
  :res.pebbles?`<p class="rn-note">${info.capNote||"오늘 받을 수 있는 자갈 보상을 다 받았어요. 기록은 저장돼요."}</p>`:"";
 this.over(`<div class="rn-card" role="dialog" aria-label="성공"><p class="eb">${this.sid==="fri"?"불금 스페셜":"STAGE "+this.sid} · ${this.sid==3?"집 도착!":S.win}</p><div class="pebslot"></div><h2>${dr?"⏰ 띠리링! 꿈에서 깼다!":"🎉 오늘도 칼퇴 성공!"}</h2>
  ${(this.sid==="fri"||dr)&&info.title?`<span class="rn-title">${dr?"🌙":"🔥"} 칭호 「${S.title}」 획득</span>`:""}
  ${this.sid==3?`<p class="rn-note">소파에서 잠든 돌대리… 그런데 꿈에서도 회사에 있어요. <b>STAGE 4</b>가 열렸어요!</p>`:""}
  <div class="rn-grid"><div><span>클리어 시간</span><b>${fmt(res.ms)}</b>${info.newBest?`<em>NEW 최고 기록</em>`:info.bestMs?`<em>최고 ${fmt(info.bestMs)}</em>`:""}</div><div><span>최종 점수</span><b>${won(res.score)}</b>${info.newBestScore?`<em>NEW</em>`:""}</div><div><span>획득 자갈</span><b>${res.pebbles}개</b>${info.coins?`<em>+${won(info.coins)}코인</em>`:""}</div></div>
  <p class="rn-note">${res.hurts===0?`🛡 <b>무사고 퇴근</b> 보너스 +${K.NO_HIT}점`:`부딪힌 횟수 ${res.hurts}번 · 남은 ❤️ ${res.lives}개 (무사고면 +${K.NO_HIT}점)`}</p>
  ${reward}${res.chainTotal!=null?`<p class="rn-note">1~3단계 연속 퇴근 <b>${fmt(res.chainTotal)}</b>${info.chainBest?" · NEW 최단 기록":""}</p>`:""}
  ${info.rank?`<p class="rn-note">${info.rank}</p>`:""}
  ${next?`<button class="rn-b" data-rn="next">${this.sid==3?"😴 꿈속으로 → ":"다음 스테이지 → "}${K.STAGES[this.sid+1].name}</button>`:dr?`<button class="rn-b" data-rn="retry">한 번 더 꿈속 야근</button>`:this.sid==="fri"?`<button class="rn-b" data-rn="retry">한 번 더 불금 탈출</button>`:`<button class="rn-b" data-rn="ending">엔딩 다시 보기</button>`}
  <button class="rn-b ghost" data-rn="share">📤 친구에게 결과 공유</button>
  <div class="rn-row rn-links">${this.sid==3?`<button class="rn-link" data-rn="ending">엔딩 다시 보기</button><button class="rn-link" data-rn="restart1">1단계부터 다시</button>`:this.sid==="fri"?"":`<button class="rn-link" data-rn="retry">기록 다시 도전</button>`}<button class="rn-link" data-rn="exit">게임 나가기</button></div></div>`);
 this.root.querySelector(".pebslot").replaceWith(this.peb("win"));
};
P.showEnding=function(){this.phase="ending";this.over(null);this.endTxt(true);this.endTimer=setTimeout(()=>this.endingSkip(),4200)};
P.endTxt=function(on){let e=this.$.play.querySelector(".rn-endtxt");if(!on){if(e)e.remove();return}if(!e){e=document.createElement("div");e.className="rn-endtxt";this.$.play.appendChild(e)}e.innerHTML=`<b>오늘도 칼퇴 성공!</b><i>수고했돌. 내일 또 같이 출근해요</i><small>화면을 누르면 결과를 볼 수 있어요</small>`};
P.endingSkip=function(){if(this.phase!=="ending")return;clearTimeout(this.endTimer);this.phase="endcard";this.endTxt(false);this.showResult();const o=this.root.querySelector(".rn-over");if(o)o.classList.add("ending")};
P.drawEnding=function(){const ctx=this.ctx,k=this.scale*this.dpr;ctx.setTransform(k,0,0,k,0,0);A.ending(ctx,this.LW,this.LH,this.vis.t)};

/* ---------- 공유 이미지 ---------- */
P.share=async function(btn){
 const {res}=this.result,S=this.S,win=res.state==="win";
 const W=1080,H=1350,c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
 try{await document.fonts.load(`40px ${A.FONT}`)}catch(e){}
 x.fillStyle="#FBF5EA";x.fillRect(0,0,W,H);x.fillStyle="#EFE3CF";A.rr(x,60,60,W-120,H-120,60);x.fill();
 A.txt(x,"퇴근중 · 돌퇴근",W/2,170,46,"#8B7F70");
 A.txt(x,`STAGE ${this.sid==="fri"?"불금":this.sid} · ${S.name}`,W/2,250,44,"#C8641C");
 A.pebble(x,W/2,640,{mood:win?"win":"hit",scale:6.4,res:6.4,t:.4});
 A.txt(x,win?"오늘도 칼퇴 성공!":"야근 확정…",W/2,760,84,"#4A3F35");
 const rows=win?[["클리어 시간",fmt(res.ms)],["점수",won(res.score)],["자갈",res.pebbles+"개"]]:[["달린 거리",won(res.meters)+"m"],["점수",won(res.score)],["",""]];
 rows.filter(r=>r[0]).forEach((r,i,arr)=>{const cx=W/2+(i-(arr.length-1)/2)*300;x.fillStyle="#FFFDF8";A.rr(x,cx-130,850,260,170,36);x.fill();A.txt(x,r[0],cx,900,34,"#8B7F70");A.txt(x,r[1],cx,965,54,"#4A3F35")});
 A.txt(x,win?"너도 오늘 칼퇴했어?":"내 대신 퇴근시켜 줄 사람?",W/2,1110,44,"#4A3F35");
 A.txt(x,"#퇴근중 #돌퇴근",W/2,1190,36,"#8B7F70");
 const blob=await new Promise(r=>c.toBlob(r,"image/png"));if(!blob)return;
 const file=new File([blob],"toegeunjung-runner.png",{type:"image/png"});
 const text=win?`돌퇴근 STAGE ${this.sid==="fri"?"불금":this.sid} ${S.name} ${fmt(res.ms)} · ${won(res.score)}점! 오늘도 칼퇴 성공 🏃`:`돌퇴근 ${won(res.meters)}m에서 야근 확정… 😵`;
 if(navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({files:[file],title:"퇴근중 · 돌퇴근",text}).catch(()=>{});return}
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="toegeunjung-runner.png";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
 if(btn)btn.textContent="이미지를 저장했어요";
};

window.TG_RUNNER={open,fmt,get current(){return G}};
})();
