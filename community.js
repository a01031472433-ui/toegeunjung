/* 퇴근중 · 동네 커뮤니티 데이터 층 (v6)
   화면 코드와 분리된 저장소. 두 가지 저장소를 같은 모양으로 제공해요.
   - shared: Claude 플레이 페이지에서 동작. 공유 db(글·댓글·돌이뻐요·신고·쪽지) + room(현재 접속자 수)
   - local : 서버가 없는 곳(GitHub Pages 등). 이 기기 브라우저에만 저장, 쪽지는 꺼짐
   나중에 실제 서버를 붙일 때는 makeShared() 자리에 새 저장소를 같은 메서드로 만들면 돼요.

   쪽지 보안: 쪽지는 보내는 기기에서 받는 사람만 풀 수 있게 암호화(ECDH P-256 + AES-GCM, 브라우저 내장 WebCrypto)해서 저장해요.
   운영자도 내용을 볼 수 없고, 신고할 때만 신고한 사람이 대화를 운영자 키로 다시 암호화해 첨부해요. */
(function(){
"use strict";

/* ---- 설정: 숫자·문구는 여기서만 바꾸면 돼요 ---- */
const SPACES=[ /* v34: 탕비실 안 카테고리 (id는 예전 공간 그대로라 옛 글도 이어져요) */
 {id:"pantry",   emoji:"💕",name:"연애",    tags:"연애 · 썸 · 사내연애",              desc:"커피 한잔하면서 연애 얘기나 할까?"},
 {id:"meeting",  emoji:"🏢",name:"회사생활",tags:"회사 고민 · 직장 인간관계 · 의견",  desc:"이 안건, 돌들의 의견은?"},
 {id:"toilet",   emoji:"💬",name:"아무말",  tags:"아무말 · 속마음 · 월급루팡",        desc:"회사에서 못 하는 말, 여기서 다 털어놔!"},
 {id:"commute",  emoji:"🏃",name:"퇴근길",  tags:"퇴근 후 일상 · 취미 · 자유수다",     desc:"퇴근했으면 이제 진짜 놀자!"},
 {id:"cafeteria",emoji:"🍚",name:"맛집",    tags:"점심 메뉴 · 맛집 · 음식",           desc:"오늘 점심 뭐 먹돌?"},
 {id:"money",    emoji:"💸",name:"재테크",  tags:"칼퇴증시 · 월급 · 짠테크",          desc:"물렸어? 떡상했어? 여기서 털어놔"},
 {id:"q",        emoji:"💬",name:"오늘의 질문",hidden:true,tags:"",desc:""},
];
/* v18: 업무지구 광장 익명 게시판 (회사 밖). district가 있는 공간은 회사 게시판 목록에는 안 보여요 */
const DISTRICTS=[["yeouido","여의도"],["gangnam","강남"],["pangyo","판교"],["gwanghwamun","광화문"],["seongsu","성수"],["magok","마곡"]];
DISTRICTS.forEach(([k,n])=>SPACES.push({id:"d_"+k,emoji:"📍",name:n+" 광장",district:n,dkey:k,tags:n+" 직장인 익명 게시판",desc:n+" 업무지구 돌들의 이야기"}));
const REPORT_REASONS=[
 {id:"privacy",label:"사내 특정 인물의 실명·개인정보 노출",hideNow:true},
 {id:"abuse",  label:"욕설·비방·괴롭힘"},
 {id:"sexual", label:"음란·불쾌한 내용"},
 {id:"spam",   label:"광고·도배"},
 {id:"etc",    label:"기타"},
];
const DM_REPORT_REASONS=[
 {id:"harass", label:"괴롭힘·스토킹"},
 {id:"sexual", label:"성희롱·불쾌한 접근"},
 {id:"privacy",label:"실명·연락처·개인정보 요구나 노출"},
 {id:"scam",   label:"사기·광고·금전 요구"},
 {id:"etc",    label:"기타"},
];
const CFG={
 hideAfterReports:3,   /* 이 횟수 이상 신고되면 가림 (실명·개인정보 사유는 1회로 바로 가림) */
 titleMax:40, bodyMax:1000, commentMax:300, dmMax:500,
 postCooldownMs:20000, /* 글 연속 작성 간격 */
 hotDays:7,            /* 인기글 집계 기간 */
 nickMin:2, nickMax:10,
 nickChangeDays:0,     /* 닉네임 변경 간격 (0 = 제한 없음, 대신 앱에서 50코인) */
 dmNewPerDay:5,
 gbMax:120,            /* 방명록 한 줄 최대 글자 */        /* 하루에 새로 거는 쪽지 대화 수 */
 dmOpenDefault:false,  /* 쪽지 받기 기본값: 꺼짐 */
 fetchPosts:300, fetchComments:1000, fetchLikes:2000, fetchReports:1000, fetchKeys:1000, fetchMsgs:1000,
};
const ADJ=["졸린","배고픈","퇴근하고픈","월급 기다리는","커피 수혈한","눈치 보는","칼퇴하는","멍때리는","출근한","점심 고민하는","회의 탈출한","야근 피한"];
const STONE=["몽돌","차돌","자갈","조약돌","짱돌","맷돌","공깃돌","디딤돌","주춧돌","섬돌"];
const SURNAMES="김이박최정강조윤장임한오서신권황안송류유전홍고문양손배백허남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예경봉";
const RESERVED=["운영자","관리자","admin","퇴근중","돌대리","돌대리는퇴근중","공지"];

const rid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,9);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const newNick=()=>pick(ADJ)+" "+pick(STONE);
const clean=(s,max)=>String(s||"").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f​-‏‪-‮⁦-⁩]/g,"").trim().slice(0,max);
const hex=s=>Array.from(new TextEncoder().encode(s)).map(b=>b.toString(16).padStart(2,"0")).join("");
const dayKey=t=>{const d=new Date(t);return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate()};

/* 닉네임 검사: 문제가 있으면 이유를, 괜찮으면 null */
function nickProblem(raw){
 const n=String(raw||"").replace(/\s+/g," ").trim();
 if(n.length<CFG.nickMin||n.length>CFG.nickMax)return `닉네임은 ${CFG.nickMin}~${CFG.nickMax}자로 지어 주세요.`;
 if(!/^[가-힣a-zA-Z0-9 ]+$/.test(n))return "한글·영문·숫자·띄어쓰기만 쓸 수 있어요.";
 if(RESERVED.some(w=>n.toLowerCase().includes(w.toLowerCase())))return "운영자나 서비스로 오해할 수 있는 이름은 쓸 수 없어요.";
 if(/^[가-힣]{3}$/.test(n)&&SURNAMES.includes(n[0]))return "실명처럼 보이는 닉네임은 쓸 수 없어요. 돌다운 이름을 지어 주세요.";
 if(/\d{4,}/.test(n))return "숫자 네 자리 이상은 연락처처럼 보여서 쓸 수 없어요.";
 if(/주식회사|\(주\)|카톡|카카오|오픈채팅|인스타|insta|kakao/i.test(n))return "회사명이나 연락처를 떠올리게 하는 말은 쓸 수 없어요.";
 return null;
}
/* 연락처처럼 보이는 내용 */
function contactRisk(t){t=String(t||"");return /01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}|[\w.+-]+@[\w-]+\.[\w.]+|카톡|카카오\s*id|오픈\s*채팅|open\.kakao|인스타|instagram|insta|텔레그램|telegram|라인\s*id/i.test(t)}

/* ---- 암호화 (WebCrypto) ---- */
const sub=(window.crypto||{}).subtle;
const b64=buf=>btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const ECDH={name:"ECDH",namedCurve:"P-256"};
async function genKeys(){const k=await sub.generateKey(ECDH,true,["deriveKey"]);return {pub:await sub.exportKey("jwk",k.publicKey),priv:await sub.exportKey("jwk",k.privateKey)}}
const impPub=j=>sub.importKey("jwk",j,ECDH,true,[]);
const impPriv=j=>sub.importKey("jwk",j,ECDH,false,["deriveKey"]);
async function derive(privJwk,pubJwk){return sub.deriveKey({name:"ECDH",public:await impPub(pubJwk)},await impPriv(privJwk),{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
async function enc(key,text){const iv=crypto.getRandomValues(new Uint8Array(12));const ct=await sub.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(text));return {iv:b64(iv),ct:b64(ct)}}
async function dec(key,iv,ct){const pt=await sub.decrypt({name:"AES-GCM",iv:unb64(iv)},key,unb64(ct));return new TextDecoder().decode(pt)}
const pubSame=(a,b)=>!!a&&!!b&&a.x===b.x&&a.y===b.y;

/* ---- 공용 상태 ---- */
const S={peers:[],mode:"init",posts:[],comments:[],likes:[],reports:[],keys:{},convs:[],msgs:[],plain:{},
 me:{anon:null,nick:null,nickAt:null,dmOpen:CFG.dmOpenDefault,blocked:[]},online:null,canWrite:true,isOwner:false,banned:[],opsReports:[],notice:null,dmReady:false};
const subs=new Set();
let emitT=null;
function emit(){if(emitT)return;emitT=setTimeout(()=>{emitT=null;subs.forEach(f=>{try{f(S)}catch(e){console.error(e)}})},30)}
let backend=null, lastPostAt=0;

/* ---- 마을 프레젠스: 꾸민 모습·인사 (정해진 값만 통과) ---- */
const EQ_OK={head:["beanie","headset","crown","golfcap"],face:["glasses","shades"],body:["tie","hoodie","suit","goldtie"]};
const EMOTES=[{e:"👋",t:"안녕!"},{e:"☕",t:"커피 한잔?"},{e:"🔥",t:"힘내!"},{e:"😮‍💨",t:"퇴근하고 싶다"}];
function cleanEq(e){const o={};if(e&&typeof e==="object")for(const k in EQ_OK){if(EQ_OK[k].includes(e[k]))o[k]=e[k]}return o}
function cleanEmo(m){if(!m||typeof m!=="object"||!EMOTES.some(x=>x.e===m.e)||typeof m.at!=="number")return null;return {e:m.e,at:m.at,to:typeof m.to==="string"?m.to.slice(0,40):null}}
/* ---- 로컬 저장소 ---- */
function makeLocal(){
 const KEY="toegeunjung-community-v1";
 let d={posts:[],comments:[],likes:[],reports:[],me:null};
 try{d=Object.assign(d,JSON.parse(localStorage.getItem(KEY))||{})}catch(e){}
 if(!d.me)d.me={anon:rid(),nick:newNick()};
 d.me=Object.assign({nickAt:null,dmOpen:false,blocked:[]},d.me);
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(d))}catch(e){}};
 const sync=()=>{["posts","comments","likes","reports"].forEach(k=>S[k]=d[k].slice());S.me=d.me;emit()};
 save();
 return {
  mode:"local",
  start(){S.online=null;sync()},
  async put(col,id,doc){const a=d[col]||(d[col]=[]),i=a.findIndex(x=>x.id===id);const v=Object.assign({id},doc);if(i<0)a.push(v);else a[i]=v;save();sync()},
  async del(col,id){d[col]=(d[col]||[]).filter(x=>x.id!==id);save();sync()},
  async saveMe(patch){Object.assign(d.me,patch);save();sync()},
  async claimNick(){return true},
  async releaseNick(){},
 };
}

/* ---- 공유 저장소 (Claude 플레이 페이지의 db + room) ---- */
async function makeShared(db,user,room){
 const uid=user?await user.id():null;
 S.isOwner=user?!!(await user.isOwner()):false;
 const cw=user&&user.can?await user.can("data.write"):null;
 if(cw===false)S.canWrite=false;
 const LKEY="toegeunjung-community-me";
 const profRef=uid?db.doc("data/users/"+uid+"/profile"):null;
 /* 익명 키·닉네임·쪽지 개인키: 본인만 읽는 개인 영역에 보관 (다른 사람·운영자도 누가 썼는지 알 수 없음) */
 let me=null;
 if(profRef){try{const s=await profRef.get();if(s.exists)me=Object.assign({},s.data())}catch(e){}}
 if(!me||!me.anon){try{const l=JSON.parse(localStorage.getItem(LKEY));if(l&&l.anon)me=l}catch(e){}}
 if(!me||!me.anon)me={anon:rid(),nick:null};
 me=Object.assign({nickAt:null,dmOpen:CFG.dmOpenDefault,blocked:[]},me);
 if(sub&&(!me.priv||!me.pub)){try{Object.assign(me,await genKeys())}catch(e){}}
 S.me=me;
 const persistMe=async()=>{try{localStorage.setItem(LKEY,JSON.stringify(S.me))}catch(e){};if(profRef&&S.canWrite){try{await profRef.set(Object.assign({},S.me))}catch(e){}}};
 const failWrite=e=>{if(e&&e.code==="invalid_argument"){S.canWrite=false;S.notice="이 링크에서는 글을 쓸 수 없어요. 공유한 사람에게 '참여(Contributor)' 권한을 받아야 해요.";emit()}else if(e&&e.code==="quota_exceeded"){S.notice="저장 공간이 가득 찼어요. 오래된 글을 정리해야 해요.";emit()}throw e};
 const api={
  mode:"shared",db,
  async put(col,id,doc){try{await db.collection(col).doc(id).set(doc)}catch(e){failWrite(e)}},
  async upd(col,id,doc){try{await db.collection(col).doc(id).update(doc)}catch(e){failWrite(e)}},
  async del(col,id){try{await db.collection(col).doc(id).delete()}catch(e){failWrite(e)}},
  async saveMe(patch){S.me=Object.assign({},S.me,patch);await persistMe();await publishKey();emit()},
  /* 닉네임 선점: 같은 닉네임은 한 돌만 */
  async claimNick(n){
   const ref=db.collection("nicknames").doc(hex(n.toLowerCase()));
   try{const l=await ref.acquire({holder:S.me.anon,ttlMs:4000});if(!l.acquired)return false}catch(e){}
   const s=await ref.get();if(s.exists&&s.data().anon&&s.data().anon!==S.me.anon)return false;
   try{await ref.set({anon:S.me.anon,at:Date.now()})}catch(e){failWrite(e)}return true;
  },
  async releaseNick(n){if(!n)return;const ref=db.collection("nicknames").doc(hex(n.toLowerCase()));try{const s=await ref.get();if(s.exists&&s.data().anon===S.me.anon)await ref.delete()}catch(e){}},
  start(){
   const subq=(q,fn)=>q.onSnapshot(s=>{fn(s.docs.map(x=>Object.assign({id:x.id},x.data())));emit()},e=>{if(e&&e.code==="revoked"){S.canWrite=false;S.notice="지금은 읽기만 할 수 있어요.";emit()}});
   subq(db.collection("posts").orderBy("createdAt","desc").limit(CFG.fetchPosts),a=>S.posts=a);
   subq(db.collection("comments").orderBy("createdAt","desc").limit(CFG.fetchComments),a=>S.comments=a);
   subq(db.collection("likes").limit(CFG.fetchLikes),a=>S.likes=a);
   subq(db.collection("reports").limit(CFG.fetchReports),a=>S.reports=a);
   subq(db.collection("keys").limit(CFG.fetchKeys),a=>{const m={};a.forEach(k=>m[k.id]=k);S.keys=m});
   const A=S.me.anon;let ca=[],cb=[],ma=[],mb=[];
   subq(db.collection("convs").where("a","==",A),a=>{ca=a;S.convs=ca.concat(cb)});
   subq(db.collection("convs").where("b","==",A),a=>{cb=a;S.convs=ca.concat(cb)});
   subq(db.collection("msgs").where("to","==",A).limit(CFG.fetchMsgs),a=>{ma=a;S.msgs=ma.concat(mb);decryptAll()});
   subq(db.collection("msgs").where("from","==",A).limit(CFG.fetchMsgs),a=>{mb=a;S.msgs=ma.concat(mb);decryptAll()});
   db.doc("ops/bans").onSnapshot(s=>{S.banned=s.exists?(s.data().anons||[]):[];if(S.banned.includes(S.me.anon)){S.canWrite=false;S.notice="운영 정책 위반으로 이용이 제한됐어요."}emit()},()=>{});
   if(S.isOwner)startOps();
   if(!room)S.roomOff=true;
   if(room){
    const count=ps=>new Set(ps.filter(p=>p.kind==="viewer").map(p=>p.by||p.peer)).size;
    room.onPeers(ch=>{S.online=count(ch.peers);
     /* 마을에 보이는 다른 돌: 위치·닉네임만 (계정 정보 없음) */
     S.peers=ch.peers.filter(p=>!p.isMe&&p.kind==="viewer"&&p.presence&&typeof p.presence.x==="number"&&typeof p.presence.y==="number").map(p=>({key:p.peer,x:Math.max(0,Math.min(5000,p.presence.x)),y:Math.max(0,Math.min(560,p.presence.y)),nick:String(p.presence.nick||"").slice(0,12),
      anon:typeof p.presence.anon==="string"?p.presence.anon.slice(0,40):null,eq:cleanEq(p.presence.eq),emo:cleanEmo(p.presence.emo)}));
     emit()},()=>{S.online=null;S.roomOff=true;S.peers=[];emit()});
    api.presence=patch=>room.presence(patch).catch(()=>{});
   }
  },
 };
 /* 공개키·쪽지 받기 설정·현재 닉네임 공개 (계정 정보는 없음) */
 async function publishKey(){if(!S.me.pub||!S.canWrite)return;try{await db.collection("keys").doc(S.me.anon).set({pub:S.me.pub,nick:S.me.nick,dmOpen:!!S.me.dmOpen,at:Date.now()})}catch(e){}}
 /* 운영자: 신고용 키를 만들고, 들어온 쪽지 신고를 풀어 봄 */
 async function startOps(){
  try{
   if(!S.me.opsPriv){const k=await genKeys();S.me.opsPriv=k.priv;S.me.opsPub=k.pub;await persistMe()}
   const cur=await db.doc("ops/key").get();
   if(!cur.exists||!pubSame(cur.data().pub,S.me.opsPub))await db.doc("ops/key").set({pub:S.me.opsPub,at:Date.now()});
   db.collection("dmReports").orderBy("at","desc").limit(200).onSnapshot(async s=>{
    const out=[];
    for(const x of s.docs){const r=Object.assign({id:x.id},x.data());try{const k=await derive(S.me.opsPriv,r.eph);r.transcript=JSON.parse(await dec(k,r.iv,r.ct))}catch(e){r.transcript=null}out.push(r)}
    S.opsReports=out;emit();
   },()=>{});
  }catch(e){console.error(e)}
 }
 api.publishKey=publishKey;
 /* 처음 들어온 돌: 자동 닉네임을 선점 */
 if(!S.me.nick){let n=newNick();for(let i=0;i<6;i++){if(await api.claimNick(n))break;n=newNick()+" "+(10+Math.floor(Math.random()*90))}S.me.nick=n}
 await persistMe();await publishKey();
 S.dmReady=!!sub&&!!S.me.priv;
 return api;
}

/* ---- 쪽지 복호화 ---- */
const keyCache={};
async function convKey(other){const k=S.keys[other];if(!k||!k.pub||!S.me.priv)return null;const id=other+":"+k.pub.x;if(!keyCache[id])keyCache[id]=derive(S.me.priv,k.pub);return keyCache[id]}
async function msgKey(m,conv){
 /* 대화를 시작할 때 고정해 둔 상대 공개키를 씀 (중간에 키가 바뀌어도 바꿔치기되지 않게) */
 const other=m.from===S.me.anon?m.to:m.from;
 const pinned=conv&&(conv.a===other?conv.pubA:conv.pubB);
 if(pinned&&S.me.priv){const id=other+":"+pinned.x;if(!keyCache[id])keyCache[id]=derive(S.me.priv,pinned);return keyCache[id]}
 return convKey(other);
}
let decBusy=false;
async function decryptAll(){
 if(decBusy||!S.me.priv)return;decBusy=true;
 try{for(const m of S.msgs){if(S.plain[m.id]!=null)continue;const c=S.convs.find(x=>x.id===m.cid);try{const k=await msgKey(m,c);S.plain[m.id]=k?await dec(k,m.iv,m.ct):"(풀 수 없는 메시지)"}catch(e){S.plain[m.id]="(풀 수 없는 메시지)"}}}
 finally{decBusy=false;emit()}
}

/* ---- 계산 ---- */
const blocked=anon=>(S.me.blocked||[]).includes(anon)||S.banned.includes(anon);
const likeCount=pid=>S.likes.filter(l=>l.pid===pid).length;
const commentsOf=pid=>S.comments.filter(c=>c.pid===pid&&!blocked(c.anon)).sort((a,b)=>a.createdAt-b.createdAt);
const commentCount=pid=>S.comments.filter(c=>c.pid===pid&&!blocked(c.anon)).length;
const liked=pid=>S.likes.some(l=>l.pid===pid&&l.anon===S.me.anon);
const reportsOf=pid=>S.reports.filter(r=>r.pid===pid);
const reportedByMe=pid=>S.reports.some(r=>r.pid===pid&&r.anon===S.me.anon);
function isHidden(p){const rs=reportsOf(p.id);return rs.some(r=>(REPORT_REASONS.find(x=>x.id===r.reason)||{}).hideNow)||rs.length>=CFG.hideAfterReports}
const mine=p=>!!p&&p.anon===S.me.anon;
const score=p=>likeCount(p.id)*2+commentCount(p.id)*3;
function visible(){return S.posts.filter(p=>p&&p.title&&SPACES.some(s=>s.id===p.space)&&!blocked(p.anon)&&(!isHidden(p)||mine(p)||S.isOwner))}
function listed(){return visible().filter(p=>!isHidden(p))}
function hot(n){const since=Date.now()-CFG.hotDays*864e5;return listed().filter(p=>p.createdAt>=since&&score(p)>0).sort((a,b)=>score(b)-score(a)||b.createdAt-a.createdAt).slice(0,n)}
function recent(n){return listed().sort((a,b)=>b.createdAt-a.createdAt).slice(0,n)}
function bySpace(space,sort){const a=visible().filter(p=>p.space===space);return sort==="hot"?a.sort((x,y)=>score(y)-score(x)||y.createdAt-x.createdAt):a.sort((x,y)=>y.createdAt-x.createdAt)}
const post=id=>S.posts.find(p=>p.id===id)||null;
const nickOf=anon=>(S.keys[anon]&&S.keys[anon].nick)||null;

/* 닉네임 변경 가능 여부 */
function nickChange(){if(!S.me.nickAt)return {ok:true};const next=S.me.nickAt+CFG.nickChangeDays*864e5;return {ok:Date.now()>=next,next}}

/* 쪽지 */
const cidOf=other=>[S.me.anon,other].sort().join("__");
const convOf=other=>S.convs.find(c=>c.id===cidOf(other))||null;
const readKey="toegeunjung-dm-read";
let readMap={};try{readMap=JSON.parse(localStorage.getItem(readKey))||{}}catch(e){}
function markRead(cid){
 /* 마지막으로 받은 쪽지 시각까지 읽음 처리. 바뀐 게 없으면 아무것도 하지 않음(새로 그리기 반복 방지) */
 const last=S.msgs.filter(m=>m.cid===cid&&m.to===S.me.anon).reduce((t,m)=>Math.max(t,m.at||0),0);
 if(!last||(readMap[cid]||0)>=last)return;
 readMap[cid]=last;try{localStorage.setItem(readKey,JSON.stringify(readMap))}catch(e){};emit();
}
function convList(){
 return S.convs.filter(c=>c.a&&c.b).map(c=>{
  const other=c.a===S.me.anon?c.b:c.a;
  const ms=S.msgs.filter(m=>m.cid===c.id).sort((x,y)=>x.at-y.at);
  const last=ms[ms.length-1];
  const unread=ms.filter(m=>m.to===S.me.anon&&m.at>(readMap[c.id]||0)).length;
  return {cid:c.id,other,otherNick:nickOf(other)||(c.a===other?c.nickA:c.nickB)||"이름 모를 돌",status:c.status,by:c.by,blockedBy:c.blockedBy,lastAt:c.lastAt||c.createdAt,preview:last?(S.plain[last.id]||"…"):"",unread,iStarted:c.by===S.me.anon};
 }).filter(x=>!(blocked(x.other)&&x.blockedBy!==S.me.anon&&x.status!=="blocked")).sort((a,b)=>b.lastAt-a.lastAt);
}
function messages(cid){return S.msgs.filter(m=>m.cid===cid).sort((a,b)=>a.at-b.at).map(m=>({id:m.id,mine:m.from===S.me.anon,text:S.plain[m.id]!=null?S.plain[m.id]:"…",at:m.at}))}
function unreadTotal(){return convList().reduce((n,c)=>n+(c.status==="accepted"||(!c.iStarted&&c.status==="requested")?c.unread:0),0)}
/* 이 돌에게 쪽지를 보낼 수 있는지 */
function dmTarget(other){
 const k=S.keys[other], c=convOf(other);
 if(S.mode!=="shared")return {ok:false,why:"대화는 서버가 연결되면 열려요."};
 if(!S.dmReady)return {ok:false,why:"이 브라우저에서는 대화를 쓸 수 없어요."};
 if(other===S.me.anon)return {ok:false,why:"나와는 대화할 수 없어요."};
 if(!S.canWrite)return {ok:false,why:S.notice||"지금은 대화를 요청할 수 없어요."};
 if(blocked(other))return {ok:false,why:"차단한 돌이에요."};
 if(c&&c.status==="blocked")return {ok:false,why:"대화가 차단됐어요.",cid:c.id};
 if(c&&c.status==="declined")return {ok:false,why:"상대가 대화를 원하지 않았어요."};
 if(c)return {ok:true,cid:c.id,existing:true};
 if(!k||!k.pub)return {ok:false,why:"이 돌은 아직 대화를 받을 준비가 안 됐어요."};
 if(!k.dmOpen)return {ok:false,why:"이 돌은 대화 받기를 꺼 뒀어요."};
 const today=dayKey(Date.now());const n=S.convs.filter(x=>x.by===S.me.anon&&dayKey(x.createdAt)===today).length;
 if(n>=CFG.dmNewPerDay)return {ok:false,why:`새 대화 요청은 하루 ${CFG.dmNewPerDay}개까지 걸 수 있어요.`};
 return {ok:true,nick:k.nick};
}

/* ---- 쓰기 ---- */
function guard(){if(!S.canWrite)throw {code:"readonly",message:S.notice||"지금은 쓸 수 없어요."}}
async function addPost({space,title,body}){
 guard();
 title=clean(title,CFG.titleMax);body=clean(body,CFG.bodyMax);
 if(!SPACES.some(s=>s.id===space))throw {code:"space",message:"공간을 골라 주세요."};
 if(!title)throw {code:"title",message:"제목을 써 주세요."};
 if(!body)throw {code:"body",message:"내용을 써 주세요."};
 const wait=CFG.postCooldownMs-(Date.now()-lastPostAt);
 if(wait>0)throw {code:"cooldown",message:`조금만 쉬었다 써요. ${Math.ceil(wait/1000)}초 뒤에 올릴 수 있어요.`};
 const id=rid();
 await backend.put("posts",id,{space,title,body,nick:S.me.nick,anon:S.me.anon,createdAt:Date.now()});
 lastPostAt=Date.now();return id;
}
async function deletePost(id){const p=post(id);if(!p||!(mine(p)||S.isOwner))return;await backend.del("posts",id)}
async function addComment(pid,body){guard();body=clean(body,CFG.commentMax);if(!body)throw {code:"body",message:"댓글을 써 주세요."};if(!post(pid))return;await backend.put("comments",rid(),{pid,body,nick:S.me.nick,anon:S.me.anon,createdAt:Date.now()})}
async function deleteComment(id){const c=S.comments.find(x=>x.id===id);if(!c||!(c.anon===S.me.anon||S.isOwner))return;await backend.del("comments",id)}
async function toggleLike(pid){guard();const id=pid+"__"+S.me.anon;if(liked(pid))await backend.del("likes",id);else await backend.put("likes",id,{pid,anon:S.me.anon,at:Date.now()})}
async function report(pid,reason){if(!REPORT_REASONS.some(r=>r.id===reason))return;await backend.put("reports",pid+"__"+S.me.anon,{pid,anon:S.me.anon,reason,at:Date.now()})}
async function setNickname(raw){
 guard();
 const n=String(raw||"").replace(/\s+/g," ").trim();
 const p=nickProblem(n);if(p)throw {code:"nick",message:p};
 if(n===S.me.nick)return;
 const ch=nickChange();if(!ch.ok){const d=new Date(ch.next);throw {code:"nick",message:`이름은 ${CFG.nickChangeDays}일에 한 번 바꿀 수 있어요. ${d.getMonth()+1}월 ${d.getDate()}일부터 다시 바꿀 수 있어요.`}}
 if(!(await backend.claimNick(n)))throw {code:"nick",message:"이미 있는 이름이에요 (중복). 다른 이름을 지어 주세요."};
 const old=S.me.nick;await backend.saveMe({nick:n,nickAt:Date.now()});await backend.releaseNick(old);
}
async function setDmOpen(on){guard();await backend.saveMe({dmOpen:!!on})}
async function block(anon){const b=(S.me.blocked||[]).filter(x=>x!==anon).concat([anon]);await backend.saveMe({blocked:b});const c=convOf(anon);if(c&&backend.upd)await backend.upd("convs",c.id,{status:"blocked",blockedBy:S.me.anon}).catch(()=>{})}
async function unblock(anon){await backend.saveMe({blocked:(S.me.blocked||[]).filter(x=>x!==anon)});const c=convOf(anon);if(c&&c.status==="blocked"&&c.blockedBy===S.me.anon&&backend.upd)await backend.upd("convs",c.id,{status:"accepted",blockedBy:null}).catch(()=>{})}
async function putMsg(cid,other,text,pinnedPub){
 const k=pinnedPub?await derive(S.me.priv,pinnedPub):await convKey(other);
 if(!k)throw {code:"dm",message:"상대의 대화 열쇠를 찾지 못했어요."};
 const e=await enc(k,text);const id=rid(),at=Date.now();
 await backend.put("msgs",id,{cid,from:S.me.anon,to:other,iv:e.iv,ct:e.ct,at});
 S.plain[id]=text;return at;
}
async function startDm(other,raw){
 guard();const text=clean(raw,CFG.dmMax);if(!text)throw {code:"dm",message:"메시지를 써 주세요."};
 const t=dmTarget(other);if(!t.ok)throw {code:"dm",message:t.why};
 if(t.existing)return sendDm(t.cid,text);
 const k=S.keys[other],cid=cidOf(other),[a,b]=[S.me.anon,other].sort(),now=Date.now();
 const pubA=a===S.me.anon?S.me.pub:k.pub, pubB=b===S.me.anon?S.me.pub:k.pub;
 await backend.put("convs",cid,{a,b,pubA,pubB,nickA:a===S.me.anon?S.me.nick:k.nick,nickB:b===S.me.anon?S.me.nick:k.nick,by:S.me.anon,status:"requested",createdAt:now,lastAt:now});
 await putMsg(cid,other,text,k.pub);
 return cid;
}
async function sendDm(cid,raw){
 guard();const text=clean(raw,CFG.dmMax);if(!text)throw {code:"dm",message:"메시지를 써 주세요."};
 const c=S.convs.find(x=>x.id===cid);if(!c)throw {code:"dm",message:"대화를 찾을 수 없어요."};
 const other=c.a===S.me.anon?c.b:c.a;
 if(blocked(other)||c.status==="blocked")throw {code:"dm",message:"차단된 대화예요."};
 if(c.status==="declined")throw {code:"dm",message:"상대가 대화를 원하지 않았어요."};
 if(c.status==="requested"&&c.by===S.me.anon)throw {code:"dm",message:"상대가 대화를 수락하면 이어서 보낼 수 있어요."};
 if(c.status==="requested")await backend.upd("convs",cid,{status:"accepted"});
 const pinned=c.a===other?c.pubA:c.pubB;
 const at=await putMsg(cid,other,text,pinned);
 await backend.upd("convs",cid,{lastAt:at}).catch(()=>{});
}
async function acceptDm(cid){guard();await backend.upd("convs",cid,{status:"accepted"})}
async function declineDm(cid){guard();await backend.upd("convs",cid,{status:"declined"})}
/* 쪽지 신고: 신고한 사람이 대화 내용을 운영자 키로 암호화해 첨부 */
async function reportDm(cid,reason){
 if(!DM_REPORT_REASONS.some(r=>r.id===reason))return;
 const c=S.convs.find(x=>x.id===cid);if(!c)return;
 const other=c.a===S.me.anon?c.b:c.a;
 const ops=await backend.db.doc("ops/key").get();
 if(!ops.exists)throw {code:"dm",message:"아직 운영자 신고함이 열리지 않았어요. 차단은 바로 할 수 있어요."};
 const transcript=messages(cid).slice(-30).map(m=>({from:m.mine?"신고자":"상대",text:m.text,at:m.at}));
 const eph=await genKeys();const k=await derive(eph.priv,ops.data().pub);
 const e=await enc(k,JSON.stringify({otherNick:nickOf(other),messages:transcript}));
 await backend.put("dmReports",rid(),{cid,reported:other,reason,eph:eph.pub,iv:e.iv,ct:e.ct,at:Date.now()});
}
/* 운영자: 이용 제한 */
async function ban(anon){if(!S.isOwner||anon===S.me.anon)return;const ref=backend.db.doc("ops/bans");const s=await ref.get();const list=s.exists?(s.data().anons||[]):[];if(!list.includes(anon))list.push(anon);await ref.set({anons:list,at:Date.now()})}
async function unban(anon){if(!S.isOwner)return;const ref=backend.db.doc("ops/bans");const s=await ref.get();const list=(s.exists?(s.data().anons||[]):[]).filter(x=>x!==anon);await ref.set({anons:list,at:Date.now()})}

function presence(patch){if(backend&&backend.presence)backend.presence(patch)}

/* ---- v19.3: 돌 방 놀러가기 · 방명록 (함께 쓰는 저장소에서만) ----
   rooms/{anon}: 내 방 모습(집·넓이·가구·옷·펫·돌 위치·닉네임) — 계정 정보 없음
   guestbook: {room:방 주인 anon, anon, nick, body, at} — 방 주인과 쓴 돌만 지울 수 있어요 */
const ROOM_OK={yard:["alley","hangang","beach","night","resort"],home:["gosi","ruin","rooftop","villa","apt","house","country","mansion"],furn:["plant","poster","lamp","coffee","shelf","sofa","bed","tv"],pet:["cloud","bunny","bird","sprout","jelly","turtle"]};
function cleanRoom(r){if(!r||typeof r!=="object")return null;const n=(v,a,b)=>Math.max(a,Math.min(b,Math.round(+v||0)));
 return {nick:String(r.nick||"").slice(0,16),house:n(r.house,0,3),size:n(r.size,0,3),home:ROOM_OK.home.includes(r.home)?r.home:"gosi",yard:ROOM_OK.yard.includes(r.yard)?r.yard:"alley",furn:(Array.isArray(r.furn)?r.furn:[]).filter(x=>ROOM_OK.furn.includes(x)),
  eq:Object.assign(cleanEq(r.eq),ROOM_OK.pet.includes(r.eq&&r.eq.pet)?{pet:r.eq.pet}:{}),pos:r.pos&&typeof r.pos==="object"?{x:n(r.pos.x,0,700),y:n(r.pos.y,0,600)}:null,fp:(()=>{const o={};if(r.fp&&typeof r.fp==="object")Object.keys(r.fp).slice(0,4).forEach(k=>{if(!/^[a-z]+:[01]$/.test(k)||typeof r.fp[k]!=="object")return;const m={};ROOM_OK.furn.forEach(f=>{const v=r.fp[k][f];if(Array.isArray(v))m[f]=[n(v[0],0,900),n(v[1],0,900),n(v[2],0,3)]});o[k]=m});return o})(),fc:(()=>{const o={};if(r.fc&&typeof r.fc==="object")ROOM_OK.furn.forEach(f=>{if(r.fc[f]!=null)o[f]=n(r.fc[f],0,2)});return o})(),ff:(()=>{const o={};if(r.ff&&typeof r.ff==="object")ROOM_OK.furn.forEach(k=>{if(r.ff[k]===1)o[k]=1});return o})(),dex:(Array.isArray(r.dex)?r.dex:[]).filter(x=>/^s(0[1-9]|[12][0-9]|30)$/.test(x)).slice(0,30),at:+r.at||0}}
let lastRoomJson="";
async function putRoom(doc){if(!backend||backend.mode!=="shared"||!S.canWrite||!S.me.anon)return;const d=cleanRoom(Object.assign({},doc,{nick:S.me.nick}));const j=JSON.stringify(d);if(j===lastRoomJson)return;lastRoomJson=j;
 try{await backend.db.collection("rooms").doc(S.me.anon).set(Object.assign(d,{at:Date.now()}))}catch(e){lastRoomJson=""}}
async function getRoom(anon){if(!backend||backend.mode!=="shared")return null;try{const x=await backend.db.collection("rooms").doc(String(anon)).get();return x.exists?cleanRoom(x.data()):null}catch(e){return null}}
async function gbList(room){if(!backend||backend.mode!=="shared")return [];try{const q=await backend.db.collection("guestbook").where("room","==",String(room)).limit(60).get();
 return q.docs.map(d=>Object.assign({id:d.id},d.data())).filter(g=>g.body&&!blocked(g.anon)).sort((a,b)=>b.at-a.at)}catch(e){return []}}
async function addGuest(room,raw){guard();if(backend.mode!=="shared")throw {code:"gb",message:"방명록은 서버가 연결되면 열려요."};
 const body=clean(raw,CFG.gbMax);if(!body)throw {code:"gb",message:"방명록을 써 주세요."};if(room===S.me.anon)throw {code:"gb",message:"내 방에는 방명록을 쓸 수 없어요."};
 const id=rid();await backend.put("guestbook",id,{room:String(room),anon:S.me.anon,nick:S.me.nick,body,at:Date.now()});return id}
async function delGuest(g){if(!g||!(g.anon===S.me.anon||g.room===S.me.anon||S.isOwner))return;await backend.del("guestbook",g.id)}

/* ---- v18: 광장 표시(퇴근 체크·점심 투표·야근·응원) = 돌이뻐요와 같은 저장소에 "표시" 한 줄씩. 한 돌은 한 번만 세요 ---- */
const markId=pid=>(pid+"__"+S.me.anon).replace(/[^\w:.-]/g,"_");
function marked(pid){return S.likes.some(l=>l.pid===pid&&l.anon===S.me.anon)}
function countMark(pid){return new Set(S.likes.filter(l=>l.pid===pid&&!blocked(l.anon)).map(l=>l.anon)).size}
async function mark(pid,on){guard();if(on===false)await backend.del("likes",markId(pid));else await backend.put("likes",markId(pid),{pid,anon:S.me.anon,at:Date.now()})}

/* ---- 돌퇴근 주간 랭킹 (함께 쓰는 저장소가 있을 때만. 로컬에선 null → 화면은 "내 기록"만 보여줘요) ----
   SERVER TODO: 지금은 기기에서 검증(runner-core verify)한 뒤 올려요. 서버가 생기면 입력 기록(inputs)을 함께 올리고
   서버에서 같은 runner-core.js로 다시 돌려 확인한 기록만 랭킹에 넣어야 조작을 막을 수 있어요. */
async function runSubmit(r){
 if(!backend||backend.mode!=="shared"||!S.canWrite||!S.me.anon)return false;
 const wk=r.week+"_"+r.sid, id=(wk+"_"+S.me.anon).replace(/[^\w-]/g,"_");
 try{const ref=backend.db.collection("runs").doc(id);const cur=await ref.get();
  if(r.m!=null){if(cur.exists&&typeof cur.data().m==="number"&&cur.data().m>=r.m)return true}else if(cur.exists&&cur.data().ms<=r.ms)return true;
  const doc={wk,week:r.week,sid:String(r.sid),ms:r.ms,score:r.score,nick:S.me.nick||"익명의 돌",anon:S.me.anon,at:Date.now()};if(r.m!=null)doc.m=Math.max(0,Math.min(100000,Math.floor(r.m)));
  await ref.set(doc);return true}catch(e){return false}
}
async function runBoard(week,sid){
 if(!backend||backend.mode!=="shared")return null;
 try{const s=await backend.db.collection("runs").where("wk","==",week+"_"+sid).limit(300).get();
  const rows=s.docs.map(d=>d.data()).filter(x=>!S.banned.includes(x.anon)&&!blocked(x.anon));
  const out=sid==="run"?rows.filter(x=>typeof x.m==="number").sort((a,b)=>b.m-a.m||a.at-b.at):rows.filter(x=>typeof x.ms==="number").sort((a,b)=>a.ms-b.ms||a.at-b.at);
  return out.map(x=>Object.assign({me:x.anon===S.me.anon},x))}catch(e){return []}
}

/* ---- 시작: 쓸 수 있는 저장소를 고름 ---- */
async function init(){
 if(backend)return;
 backend=makeLocal();S.mode="local";backend.start();
 const c=window.claude;
 if(!c||typeof c.use!=="function")return;
 try{
  const [db,user,room]=await Promise.all([c.use("db"),c.use("user"),c.use("room")]);
  if(!db)return;
  S.posts=[];S.comments=[];S.likes=[];S.reports=[];
  const shared=await makeShared(db,user,room);
  backend=shared;S.mode="shared";
  shared.start();emit();
 }catch(e){console.error(e)}
}


/* v28: 점심 투표존 — votes 컬렉션: id = 날짜_anon, {date, menu, at}. 하루 한 표, 언제든 바꿀 수 있어요 */
const VOTE_MENUS=["김치찌개","된장찌개","제육볶음","돈까스","짜장면","짬뽕","국밥","비빔밥","냉면","칼국수","떡볶이","김밥","햄버거","샐러드","쌀국수","마라탕","초밥","파스타","카레","부대찌개","순두부찌개","편의점 도시락","치킨마요","오므라이스","닭갈비","육개장","콩국수","샌드위치","우동","라멘"];
function voteMenus(date){let h=2166136261;for(const ch of "lunch"+date){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
 const a=VOTE_MENUS.slice(),out=[];for(let i=0;i<8;i++){h=Math.imul(h^(h>>>15),2246822507)>>>0;out.push(a.splice(h%a.length,1)[0])}return out}
async function castVote(date,menu){guard();if(!backend||!voteMenus(date).includes(menu))return;await backend.put("votes",date+"_"+S.me.anon,{date,menu,at:Date.now()})}
function watchVotes(date,fn){if(!backend)return ()=>{};
 if(backend.mode==="shared"&&backend.db){try{return backend.db.collection("votes").where("date","==",date).limit(2000).onSnapshot(s=>fn(s.docs.map(x=>Object.assign({id:x.id},x.data()))),()=>{})}catch(e){return ()=>{}}}
 let d={};try{d=JSON.parse(localStorage.getItem("toegeunjung-community-v1"))||{}}catch(e){}fn((d.votes||[]).filter(v=>v.date===date));return ()=>{}}

/* v49: 돌목 1:1 방 — omok 컬렉션: id = 4자리 코드
   {code, game, host:{anon,nick}, guest, black:"host"|"guest", moves:[칸 번호…], status:"wait"|"play"|"end", winner, reason, left, at, createdAt}
   지금은 Claude 플레이 페이지의 공유 저장소로 돌아가고, 서버(Supabase)를 붙이면 같은 함수만 바꿔 끼우면 돼요 */
const OM_N=15;
function omOnline(){return !!(backend&&backend.mode==="shared"&&backend.db)}
function omOff(){throw {code:"offline",message:"1:1 대전은 서버가 연결되면 열려요."}}
function omRef(code){return backend.db.collection("omok").doc(String(code))}
function omMe(){return {anon:S.me.anon,nick:S.me.nick||"익명의 돌"}}
function omClean(d){if(!d||typeof d!=="object")return null;const p=x=>x&&typeof x==="object"&&typeof x.anon==="string"?{anon:x.anon.slice(0,40),nick:String(x.nick||"익명의 돌").slice(0,16)}:null;
 const mv=Array.isArray(d.moves)?d.moves.filter(v=>Number.isInteger(v)&&v>=0&&v<OM_N*OM_N).slice(0,OM_N*OM_N):[];
 if(new Set(mv).size!==mv.length)mv.length=0;
 return {code:String(d.code||"").slice(0,6),game:Number.isInteger(d.game)?d.game:1,stake:OM_STAKES.includes(+d.stake)?+d.stake:0,host:p(d.host),guest:p(d.guest),black:d.black==="guest"?"guest":"host",moves:mv,
  status:["wait","play","end"].includes(d.status)?d.status:"wait",winner:["host","guest"].includes(d.winner)?d.winner:null,reason:["five","resign","leave","timeout"].includes(d.reason)?d.reason:null,
  left:d.left&&typeof d.left==="object"?{host:!!d.left.host,guest:!!d.left.guest}:{host:false,guest:false},at:typeof d.at==="number"?d.at:0,createdAt:typeof d.createdAt==="number"?d.createdAt:0}}
function omRole(d){if(!d||!S.me)return null;if(d.host&&d.host.anon===S.me.anon)return "host";if(d.guest&&d.guest.anon===S.me.anon)return "guest";return null}
const OM_STAKES=[0,50];
async function omokCreate(stake){if(!omOnline())omOff();guard();stake=OM_STAKES.includes(+stake)?+stake:0;
 for(let i=0;i<8;i++){const code=String(1000+Math.floor(Math.random()*9000));const ref=omRef(code);
  let ok=true;try{const s=await ref.get();if(s.exists){const d=omClean(s.data());if(d&&Date.now()-d.at<36e5)ok=false}}catch(e){}
  if(!ok)continue;
  await ref.set({code,game:1,stake,host:omMe(),guest:null,black:"host",moves:[],status:"wait",winner:null,reason:null,left:{host:false,guest:false},at:Date.now(),createdAt:Date.now()});
  return code}
 throw {code:"busy",message:"방을 못 만들었어요. 잠시 뒤에 다시 해 주세요."}}
async function omokJoin(code,myCoins){if(!omOnline())omOff();guard();code=String(code||"").replace(/\D/g,"");
 if(code.length!==4)throw {code:"code",message:"방 코드는 숫자 4자리예요."};
 const ref=omRef(code);let lock=null;try{lock=await ref.acquire({holder:S.me.anon,ttlMs:4000})}catch(e){}
 if(lock&&lock.acquired===false)throw {code:"busy",message:"누가 먼저 들어가고 있어요. 다시 해 주세요."};
 const s=await ref.get();const d=s.exists?omClean(s.data()):null;
 if(!d||(d.status==="wait"&&Date.now()-d.at>36e5))throw {code:"none",message:"없는 방이에요. 코드를 확인해 주세요."};
 const r=omRole(d);if(r)return code;
 if(d.guest||d.status!=="wait")throw {code:"full",message:"이미 대전 중인 방이에요."};
 if(d.stake&&myCoins!=null&&myCoins<d.stake)throw {code:"coins",message:`이 방은 ${d.stake}코인 내기예요. 코인이 모자라요.`};
 await ref.update({guest:omMe(),status:"play",at:Date.now()});return code}
function omokWatch(code,fn){if(!omOnline())return ()=>{};try{return omRef(code).onSnapshot(s=>fn(s.exists?omClean(s.data()):null),()=>fn(null))}catch(e){return ()=>{}}}
function omokOpenRooms(fn){if(!omOnline())return ()=>{};
 try{return backend.db.collection("omok").where("status","==","wait").limit(30).onSnapshot(s=>{const now=Date.now();
  fn(s.docs.map(x=>omClean(x.data())).filter(d=>d&&d.host&&now-d.at<15*6e4&&!blocked(d.host.anon)&&!(S.banned||[]).includes(d.host.anon)).sort((a,b)=>b.at-a.at))},()=>fn([]))}catch(e){return ()=>{}}}
async function omokMove(code,d,cell){if(!omOnline())omOff();const r=omRole(d);if(!r||d.status!=="play")return false;
 const myColor=d.black===r?1:2,turn=d.moves.length%2===0?1:2;if(myColor!==turn||d.moves.includes(cell))return false;
 const moves=d.moves.concat([cell]);const b=new Array(OM_N*OM_N).fill(0);moves.forEach((v,i)=>b[v]=i%2===0?1:2);
 const x=cell%OM_N,y=Math.floor(cell/OM_N);let win=false;
 for(const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]]){let n=1;for(const sg of [1,-1])for(let k=1;k<5;k++){const nx=x+dx*k*sg,ny=y+dy*k*sg;if(nx<0||ny<0||nx>=OM_N||ny>=OM_N||b[ny*OM_N+nx]!==myColor)break;n++}if(n>=5)win=true}
 const patch={moves,at:Date.now()};if(win){patch.status="end";patch.winner=r;patch.reason="five"}else if(moves.length>=OM_N*OM_N){patch.status="end";patch.winner=null;patch.reason=null}
 await omRef(code).update(patch);return true}
async function omokResign(code,d,reason){if(!omOnline())omOff();const r=omRole(d);if(!r||d.status!=="play")return;
 await omRef(code).update({status:"end",winner:r==="host"?"guest":"host",reason:reason||"resign",at:Date.now()})}
async function omokClaimTimeout(code,d){if(!omOnline())omOff();const r=omRole(d);if(!r||d.status!=="play")return;
 const turn=d.moves.length%2===0?1:2,myColor=d.black===r?1:2;if(turn===myColor||Date.now()-d.at<3*6e4)return;
 await omRef(code).update({status:"end",winner:r,reason:"timeout",at:Date.now()})}
async function omokRematch(code,d){if(!omOnline())omOff();const r=omRole(d);if(!r||d.status!=="end"||!d.guest||d.left.host||d.left.guest)return;
 await omRef(code).update({game:d.game+1,moves:[],status:"play",winner:null,reason:null,black:d.black==="host"?"guest":"host",at:Date.now()})}
async function omokLeave(code,d){if(!omOnline()||!d)return;const r=omRole(d);if(!r)return;
 try{if(d.status==="wait"&&r==="host"){await omRef(code).delete();return}
  const left=Object.assign({},d.left,{[r]:true});const patch={left,at:Date.now()};
  if(d.status==="play"){patch.status="end";patch.winner=r==="host"?"guest":"host";patch.reason="leave"}
  await omRef(code).update(patch)}catch(e){}}

/* v52: 돌야구(숫자야구 4자리 · 같은 숫자 레이스) — yagu 컬렉션: id = 4자리 코드
   {code, game, seed, host, players:[{anon,nick}](최대 4), status:"wait"|"play"|"end", turn, turnAt, guesses:[{by,g,s,b,at}], winner, at, createdAt}
   비밀 숫자는 seed로 만들어요. (서버를 붙이면 서버만 알게 바꾸면 돼요) */
const YG_MAX=4, YG_TURN_MS=120000;
function ygRef(code){return backend.db.collection("yagu").doc(String(code))}
function ygSecret(seed){let a=(seed>>>0)||1;const r=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
 const d=[0,1,2,3,4,5,6,7,8,9];for(let i=9;i>0;i--){const j=Math.floor(r()*(i+1));[d[i],d[j]]=[d[j],d[i]]}return d.slice(0,4).join("")}
function ygJudge(secret,g){let s=0,b=0;for(let i=0;i<4;i++){if(g[i]===secret[i])s++;else if(secret.includes(g[i]))b++}return {s,b}}
function ygValid(g){return /^\d{4}$/.test(g)&&new Set(g).size===4}
function ygClean(d){if(!d||typeof d!=="object")return null;const p=x=>x&&typeof x==="object"&&typeof x.anon==="string"?{anon:x.anon.slice(0,40),nick:String(x.nick||"익명의 돌").slice(0,16)}:null;
 const players=(Array.isArray(d.players)?d.players.map(p).filter(Boolean):[]).slice(0,YG_MAX);
 const guesses=(Array.isArray(d.guesses)?d.guesses:[]).filter(x=>x&&typeof x.by==="string"&&ygValid(String(x.g))).slice(0,300).map(x=>({by:x.by.slice(0,40),g:String(x.g),s:+x.s|0,b:+x.b|0,at:+x.at||0}));
 return {code:String(d.code||"").slice(0,6),game:Number.isInteger(d.game)?d.game:1,seed:(+d.seed)>>>0,host:p(d.host),players,status:["wait","play","end"].includes(d.status)?d.status:"wait",
  turn:Number.isInteger(d.turn)?d.turn:0,turnAt:+d.turnAt||0,guesses,winner:typeof d.winner==="string"?d.winner.slice(0,40):null,reason:typeof d.reason==="string"?d.reason.slice(0,12):null,at:+d.at||0,createdAt:+d.createdAt||0}}
function ygIn(d){return !!(d&&S.me&&d.players.some(p=>p.anon===S.me.anon))}
async function ygCreate(){if(!omOnline())omOff();guard();
 for(let i=0;i<8;i++){const code=String(1000+Math.floor(Math.random()*9000));const ref=ygRef(code);let ok=true;
  try{const s=await ref.get();if(s.exists){const d=ygClean(s.data());if(d&&Date.now()-d.at<36e5)ok=false}}catch(e){}
  if(!ok)continue;const now=Date.now();
  await ref.set({code,game:1,seed:(Math.random()*4294967296)>>>0,host:omMe(),players:[omMe()],status:"wait",turn:0,turnAt:0,guesses:[],winner:null,reason:null,at:now,createdAt:now});return code}
 throw {code:"busy",message:"방을 못 만들었어요. 잠시 뒤에 다시 해 주세요."}}
async function ygJoin(code){if(!omOnline())omOff();guard();code=String(code||"").replace(/\D/g,"");
 if(code.length!==4)throw {code:"code",message:"방 코드는 숫자 4자리예요."};
 const ref=ygRef(code);let lock=null;
 /* 여러 명이 동시에 들어와도 한 명씩 차례로 (잠깐 잠그고 들어가요) */
 for(let k=0;k<6;k++){try{lock=await ref.acquire({holder:S.me.anon,ttlMs:4000})}catch(e){lock=null}if(!lock||lock.acquired!==false)break;await new Promise(r=>setTimeout(r,500+Math.random()*400))}
 if(lock&&lock.acquired===false)throw {code:"busy",message:"사람이 몰려서 못 들어갔어요. 다시 눌러 주세요."};
 const s=await ref.get();const d=s.exists?ygClean(s.data()):null;
 if(!d||(d.status==="wait"&&Date.now()-d.at>36e5))throw {code:"none",message:"없는 방이에요. 코드를 확인해 주세요."};
 if(ygIn(d))return code;
 if(d.status!=="wait")throw {code:"full",message:"이미 시작한 방이에요."};
 if(d.players.length>=YG_MAX)throw {code:"full",message:"방이 꽉 찼어요 (최대 4명)."};
 await ref.update({players:d.players.concat([omMe()]),at:Date.now()});try{if(lock&&lock.release)await lock.release()}catch(e){}return code}
function ygWatch(code,fn){if(!omOnline())return ()=>{};try{return ygRef(code).onSnapshot(s=>fn(s.exists?ygClean(s.data()):null),()=>fn(null))}catch(e){return ()=>{}}}
function ygOpenRooms(fn){if(!omOnline())return ()=>{};
 try{return backend.db.collection("yagu").where("status","==","wait").limit(30).onSnapshot(s=>{const now=Date.now();
  fn(s.docs.map(x=>ygClean(x.data())).filter(d=>d&&d.host&&d.players.length<YG_MAX&&now-d.at<15*6e4&&!blocked(d.host.anon)).sort((a,b)=>b.at-a.at))},()=>fn([]))}catch(e){return ()=>{}}}
async function ygStart(code,d){if(!omOnline())omOff();if(!d||!d.host||d.host.anon!==S.me.anon||d.status!=="wait"||d.players.length<2)return;
 await ygRef(code).update({status:"play",turn:0,turnAt:Date.now(),guesses:[],at:Date.now()})}
async function ygGuess(code,d,g){if(!omOnline())omOff();if(!d||d.status!=="play"||!ygValid(g))return false;
 const me=d.players[d.turn%d.players.length];if(!me||me.anon!==S.me.anon)return false;
 const {s,b}=ygJudge(ygSecret(d.seed),g),now=Date.now();
 const patch={guesses:d.guesses.concat([{by:S.me.anon,g,s,b,at:now}]),turn:(d.turn+1)%d.players.length,turnAt:now,at:now};
 if(s===4){patch.status="end";patch.winner=S.me.anon;patch.reason="hit"}
 await ygRef(code).update(patch);return true}
async function ygSkip(code,d){if(!omOnline())omOff();if(!d||d.status!=="play"||!ygIn(d))return;if(Date.now()-d.turnAt<YG_TURN_MS)return;
 await ygRef(code).update({turn:(d.turn+1)%d.players.length,turnAt:Date.now(),at:Date.now()})}
async function ygRematch(code,d){if(!omOnline())omOff();if(!d||d.status!=="end"||!ygIn(d)||d.players.length<2)return;
 await ygRef(code).update({game:d.game+1,seed:(Math.random()*4294967296)>>>0,status:"play",turn:d.game%d.players.length,turnAt:Date.now(),guesses:[],winner:null,reason:null,at:Date.now()})}
async function ygLeave(code,d){if(!omOnline()||!d||!ygIn(d))return;
 try{const rest=d.players.filter(p=>p.anon!==S.me.anon);
  if(!rest.length||(d.status==="wait"&&d.host&&d.host.anon===S.me.anon)){await ygRef(code).delete();return}
  const idx=d.players.findIndex(p=>p.anon===S.me.anon);const patch={players:rest,at:Date.now()};
  if(d.host&&d.host.anon===S.me.anon)patch.host=rest[0];
  if(d.status==="play"){if(rest.length<2){patch.status="end";patch.winner=rest[0].anon;patch.reason="leave"}else{let t=d.turn;if(idx<t)t--;patch.turn=((t%rest.length)+rest.length)%rest.length;if(idx===d.turn)patch.turnAt=Date.now()}}
  await ygRef(code).update(patch)}catch(e){}}

/* v54: 🚽 화장실 칸(단톡방) — stalls 컬렉션(id = 6자리 코드), 메시지는 stallMsgs
   칸 = 최대 8명 · 방장이 200코인 내고 열기 · 들어가기는 무료 · 24시간 뒤 물 내려가요(사라짐)
   아무도 안 들어왔으면 24시간 안에 언제든 「칸 닫고 환불」. 한 명이라도 들어왔으면 환불 없음 */
const ST_MAXM=8, ST_LIFE=864e5, ST_MSG_MAX=200;
const ST_CODE="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function stRef(code){return backend.db.collection("stalls").doc(String(code))}
function stCode(){let c="";const a=crypto.getRandomValues(new Uint8Array(6));for(const v of a)c+=ST_CODE[v%ST_CODE.length];return c}
function stClean(d){if(!d||typeof d!=="object")return null;const p=x=>x&&typeof x==="object"&&typeof x.anon==="string"?{anon:x.anon.slice(0,40),nick:String(x.nick||"익명의 돌").slice(0,16)}:null;
 return {code:String(d.code||"").slice(0,8),title:clean(String(d.title||"이름 없는 칸"),20)||"이름 없는 칸",open:d.open==="secret"?"secret":"public",host:p(d.host),
  members:(Array.isArray(d.members)?d.members.map(p).filter(Boolean):[]).slice(0,ST_MAXM),kicked:(Array.isArray(d.kicked)?d.kicked.filter(x=>typeof x==="string"):[]).slice(0,50),
  joined:!!d.joined,createdAt:+d.createdAt||0,expiresAt:+d.expiresAt||((+d.createdAt||0)+ST_LIFE),at:+d.at||0}}
function stAlive(d){return !!(d&&Date.now()<d.expiresAt)}
function stIn(d){return !!(d&&S.me&&d.members.some(m=>m.anon===S.me.anon))}
async function stallCreate(o){if(!omOnline())omOff();guard();const title=clean(String(o&&o.title||""),20);if(!title)throw {code:"title",message:"칸 이름을 지어 주세요."};
 if(contactRisk(title))throw {code:"title",message:"칸 이름에 연락처는 넣을 수 없어요."};
 for(let i=0;i<6;i++){const code=stCode(),ref=stRef(code);try{const s=await ref.get();if(s.exists)continue}catch(e){}
  const now=Date.now();await ref.set({code,title,open:o.open==="secret"?"secret":"public",host:omMe(),members:[omMe()],kicked:[],joined:false,createdAt:now,expiresAt:now+ST_LIFE,at:now});return code}
 throw {code:"busy",message:"칸을 못 열었어요. 잠시 뒤에 다시 해 주세요."}}
async function stallJoin(code){if(!omOnline())omOff();guard();code=String(code||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
 if(code.length!==6)throw {code:"code",message:"칸 코드는 6자리예요."};
 const ref=stRef(code);let lock=null;
 for(let k=0;k<6;k++){try{lock=await ref.acquire({holder:S.me.anon,ttlMs:4000})}catch(e){lock=null}if(!lock||lock.acquired!==false)break;await new Promise(r=>setTimeout(r,500+Math.random()*400))}
 if(lock&&lock.acquired===false)throw {code:"busy",message:"사람이 몰려서 못 들어갔어요. 다시 눌러 주세요."};
 const s=await ref.get();const d=s.exists?stClean(s.data()):null;
 if(!d||!stAlive(d))throw {code:"none",message:"없거나 물 내려간 칸이에요."};
 if(stIn(d))return code;
 if(d.kicked.includes(S.me.anon))throw {code:"kicked",message:"이 칸에는 들어갈 수 없어요."};
 if(d.host&&blocked(d.host.anon))throw {code:"blocked",message:"차단한 돌의 칸이에요."};
 if(d.members.length>=ST_MAXM)throw {code:"full",message:"칸이 꽉 찼어요 (최대 8명)."};
 await ref.update({members:d.members.concat([omMe()]),joined:true,at:Date.now()});try{if(lock&&lock.release)await lock.release()}catch(e){}
 try{await backend.db.collection("stallMsgs").doc(rid()).set({code,by:"sys",nick:"",text:`${S.me.nick||"익명의 돌"} 님이 들어왔어요`,at:Date.now()})}catch(e){}
 return code}
function stallWatch(code,fn){if(!omOnline())return ()=>{};try{return stRef(code).onSnapshot(s=>fn(s.exists?stClean(s.data()):null),()=>fn(null))}catch(e){return ()=>{}}}
function stallMsgsWatch(code,fn){if(!omOnline())return ()=>{};
 try{return backend.db.collection("stallMsgs").where("code","==",String(code)).limit(400).onSnapshot(s=>{
  fn(s.docs.map(x=>{const m=x.data()||{};return {id:x.id,by:String(m.by||"").slice(0,40),nick:String(m.nick||"").slice(0,16),text:String(m.text||"").slice(0,ST_MSG_MAX),at:+m.at||0}})
   .filter(m=>m.text&&(m.by==="sys"||!blocked(m.by))).sort((a,b)=>a.at-b.at))},()=>fn([]))}catch(e){return ()=>{}}}
function stallList(fn){if(!omOnline())return ()=>{};
 try{return backend.db.collection("stalls").where("open","==","public").limit(60).onSnapshot(s=>{
  fn(s.docs.map(x=>stClean(x.data())).filter(d=>d&&d.host&&stAlive(d)&&!blocked(d.host.anon)).sort((a,b)=>b.at-a.at))},()=>fn([]))}catch(e){return ()=>{}}}
let stLastSend=0;
async function stallSend(code,d,raw){if(!omOnline())omOff();guard();if(!d||!stAlive(d)||!stIn(d))throw {code:"out",message:"이 칸에 있을 때만 말할 수 있어요."};
 const text=clean(String(raw||""),ST_MSG_MAX);if(!text)return;if(Date.now()-stLastSend<800)throw {code:"slow",message:"조금만 천천히 보내 주세요."};stLastSend=Date.now();
 await backend.db.collection("stallMsgs").doc(rid()).set({code:String(code),by:S.me.anon,nick:S.me.nick||"익명의 돌",text,at:Date.now()});
 try{await stRef(code).update({at:Date.now()})}catch(e){}}
async function stDelMsgs(code){try{const s=await backend.db.collection("stallMsgs").where("code","==",String(code)).limit(400).get();for(const x of s.docs){try{await backend.db.collection("stallMsgs").doc(x.id).delete()}catch(e){}}}catch(e){}}
/* 방장: 아무도 안 들어왔을 때만 닫고 환불 (true = 환불 가능해서 닫음) */
async function stallCloseRefund(code,d){if(!omOnline())omOff();if(!d||!d.host||d.host.anon!==S.me.anon)return false;if(d.joined||!stAlive(d))return false;
 const s=await stRef(code).get();const cur=s.exists?stClean(s.data()):null;if(!cur||cur.joined)return false;
 await stRef(code).delete();await stDelMsgs(code);return true}
async function stallLeave(code,d){if(!omOnline()||!d||!stIn(d))return;
 try{const rest=d.members.filter(m=>m.anon!==S.me.anon);
  if(!rest.length){await stRef(code).delete();await stDelMsgs(code);return}
  const patch={members:rest,at:Date.now()};if(d.host&&d.host.anon===S.me.anon)patch.host=rest[0];
  await stRef(code).update(patch);
  try{await backend.db.collection("stallMsgs").doc(rid()).set({code,by:"sys",nick:"",text:`${S.me.nick||"익명의 돌"} 님이 나갔어요`,at:Date.now()})}catch(e){}}catch(e){}}
async function stallKick(code,d,anon){if(!omOnline())omOff();if(!d||!d.host||d.host.anon!==S.me.anon||anon===S.me.anon)return;
 const m=d.members.find(x=>x.anon===anon);if(!m)return;
 await stRef(code).update({members:d.members.filter(x=>x.anon!==anon),kicked:d.kicked.concat([anon]).slice(-50),at:Date.now()});
 try{await backend.db.collection("stallMsgs").doc(rid()).set({code,by:"sys",nick:"",text:`${m.nick} 님을 방장이 내보냈어요`,at:Date.now()})}catch(e){}}
/* 신고: 최근 대화를 운영자만 열 수 있게 암호화해서 보내요 (칸이 사라져도 남아요) */
async function stallReport(code,d,reason,msgs,target){if(!DM_REPORT_REASONS.some(r=>r.id===reason))return;
 const ops=await backend.db.doc("ops/key").get();if(!ops.exists)throw {code:"dm",message:"아직 운영자 신고함이 열리지 않았어요. 차단은 바로 할 수 있어요."};
 const transcript=(msgs||[]).filter(m=>m.by!=="sys").slice(-40).map(m=>({from:m.by===S.me.anon?"신고자":(m.nick||"익명"),text:m.text,at:m.at}));
 const eph=await genKeys();const k=await derive(eph.priv,ops.data().pub);
 const e=await enc(k,JSON.stringify({otherNick:`🚽 칸 「${d?d.title:code}」${target?" · "+(nickOf(target)||""):""}`,messages:transcript}));
 await backend.put("dmReports",rid(),{cid:"stall:"+code,reported:target||(d&&d.host?d.host.anon:""),reason,eph:eph.pub,iv:e.iv,ct:e.ct,at:Date.now()})}
window.TG_OM_STAKES=OM_STAKES;
window.TG_COMMUNITY={SPACES,REPORT_REASONS,DM_REPORT_REASONS,CFG,state:S,subscribe:f=>{subs.add(f);return()=>subs.delete(f)},init,
 likeCount,commentCount,commentsOf,liked,reportedByMe,isHidden,mine,hot,recent,bySpace,post,nickOf,blocked,
 addPost,deletePost,addComment,deleteComment,toggleLike,report,
 nickProblem,nickChange,setNickname,contactRisk,
 setDmOpen,dmTarget,startDm,sendDm,acceptDm,declineDm,block,unblock,reportDm,convList,messages,markRead,unreadTotal,
 ban,unban,presence,runSubmit,runBoard,EMOTES,cleanEq,DISTRICTS,marked,countMark,mark,putRoom,getRoom,gbList,addGuest,delGuest,cleanRoom,voteMenus,castVote,watchVotes,
 omokCreate,omokJoin,omokWatch,omokOpenRooms,omokMove,omokResign,omokClaimTimeout,omokRematch,omokLeave,omRole,
 ygCreate,ygJoin,ygWatch,ygOpenRooms,ygStart,ygGuess,ygSkip,ygRematch,ygLeave,ygSecret,ygJudge,ygValid,YG_TURN_MS,
 stallCreate,stallJoin,stallWatch,stallMsgsWatch,stallList,stallSend,stallCloseRefund,stallLeave,stallKick,stallReport,ST_MAXM,ST_MSG_MAX,ST_LIFE};
})();
