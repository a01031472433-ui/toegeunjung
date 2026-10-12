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
const SPACES=[
 {id:"toilet",   emoji:"🚽",name:"화장실",  tags:"아무말 · 속마음 · 월급루팡",        desc:"회사에서 못 하는 말, 여기서 다 털어놔!"},
 {id:"pantry",   emoji:"☕",name:"탕비실",  tags:"연애 · 썸 · 사내연애",              desc:"커피 한잔하면서 연애 얘기나 할까?"},
 {id:"meeting",  emoji:"🪑",name:"회의실",  tags:"회사 고민 · 직장 인간관계 · 의견",  desc:"이 안건, 돌들의 의견은?"},
 {id:"cafeteria",emoji:"🍚",name:"구내식당",tags:"점심 메뉴 · 음식 · 일상",           desc:"오늘 점심 뭐 먹돌?"},
 {id:"commute",  emoji:"🚪",name:"퇴근길",  tags:"퇴근 후 일상 · 취미 · 자유수다",     desc:"퇴근했으면 이제 진짜 놀자!"},
];
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
 nickChangeDays:7,     /* 닉네임 변경 간격 */
 dmNewPerDay:5,        /* 하루에 새로 거는 쪽지 대화 수 */
 dmOpenDefault:false,  /* 쪽지 받기 기본값: 꺼짐 */
 fetchPosts:300, fetchComments:1000, fetchLikes:2000, fetchReports:1000, fetchKeys:1000, fetchMsgs:1000,
};
const ADJ=["졸린","배고픈","퇴근하고픈","월급 기다리는","커피 수혈한","눈치 보는","칼퇴하는","멍때리는","출근한","점심 고민하는","회의 탈출한","야근 피한"];
const STONE=["몽돌","차돌","자갈","조약돌","짱돌","맷돌","공깃돌","디딤돌","주춧돌","섬돌"];
const SURNAMES="김이박최정강조윤장임한오서신권황안송류유전홍고문양손배백허남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예경봉";
const RESERVED=["운영자","관리자","admin","퇴근중","돌대리","공지"];

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
const EQ_OK={head:["beanie","headset","crown"],face:["glasses","shades"],body:["tie","hoodie","suit"]};
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
     S.peers=ch.peers.filter(p=>!p.isMe&&p.kind==="viewer"&&p.presence&&typeof p.presence.x==="number"&&typeof p.presence.y==="number").map(p=>({key:p.peer,x:Math.max(0,Math.min(360,p.presence.x)),y:Math.max(0,Math.min(560,p.presence.y)),nick:String(p.presence.nick||"").slice(0,12),
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
 try{for(const m of S.msgs){if(S.plain[m.id]!=null)continue;const c=S.convs.find(x=>x.id===m.cid);try{const k=await msgKey(m,c);S.plain[m.id]=k?await dec(k,m.iv,m.ct):"(풀 수 없는 쪽지)"}catch(e){S.plain[m.id]="(풀 수 없는 쪽지)"}}}
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
 if(S.mode!=="shared")return {ok:false,why:"쪽지는 서버가 연결되면 열려요."};
 if(!S.dmReady)return {ok:false,why:"이 브라우저에서는 쪽지를 쓸 수 없어요."};
 if(other===S.me.anon)return {ok:false,why:"나에게는 쪽지를 보낼 수 없어요."};
 if(!S.canWrite)return {ok:false,why:S.notice||"지금은 쪽지를 보낼 수 없어요."};
 if(blocked(other))return {ok:false,why:"차단한 돌이에요."};
 if(c&&c.status==="blocked")return {ok:false,why:"대화가 차단됐어요.",cid:c.id};
 if(c&&c.status==="declined")return {ok:false,why:"상대가 대화를 원하지 않았어요."};
 if(c)return {ok:true,cid:c.id,existing:true};
 if(!k||!k.pub)return {ok:false,why:"이 돌은 아직 쪽지를 받을 준비가 안 됐어요."};
 if(!k.dmOpen)return {ok:false,why:"이 돌은 쪽지를 받지 않아요."};
 const today=dayKey(Date.now());const n=S.convs.filter(x=>x.by===S.me.anon&&dayKey(x.createdAt)===today).length;
 if(n>=CFG.dmNewPerDay)return {ok:false,why:`새 쪽지 대화는 하루 ${CFG.dmNewPerDay}개까지 걸 수 있어요.`};
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
 const ch=nickChange();if(!ch.ok){const d=new Date(ch.next);throw {code:"nick",message:`닉네임은 ${CFG.nickChangeDays}일에 한 번 바꿀 수 있어요. ${d.getMonth()+1}월 ${d.getDate()}일부터 다시 바꿀 수 있어요.`}}
 if(!(await backend.claimNick(n)))throw {code:"nick",message:"이미 다른 돌이 쓰는 닉네임이에요."};
 const old=S.me.nick;await backend.saveMe({nick:n,nickAt:Date.now()});await backend.releaseNick(old);
}
async function setDmOpen(on){guard();await backend.saveMe({dmOpen:!!on})}
async function block(anon){const b=(S.me.blocked||[]).filter(x=>x!==anon).concat([anon]);await backend.saveMe({blocked:b});const c=convOf(anon);if(c&&backend.upd)await backend.upd("convs",c.id,{status:"blocked",blockedBy:S.me.anon}).catch(()=>{})}
async function unblock(anon){await backend.saveMe({blocked:(S.me.blocked||[]).filter(x=>x!==anon)});const c=convOf(anon);if(c&&c.status==="blocked"&&c.blockedBy===S.me.anon&&backend.upd)await backend.upd("convs",c.id,{status:"accepted",blockedBy:null}).catch(()=>{})}
async function putMsg(cid,other,text,pinnedPub){
 const k=pinnedPub?await derive(S.me.priv,pinnedPub):await convKey(other);
 if(!k)throw {code:"dm",message:"상대의 쪽지 열쇠를 찾지 못했어요."};
 const e=await enc(k,text);const id=rid(),at=Date.now();
 await backend.put("msgs",id,{cid,from:S.me.anon,to:other,iv:e.iv,ct:e.ct,at});
 S.plain[id]=text;return at;
}
async function startDm(other,raw){
 guard();const text=clean(raw,CFG.dmMax);if(!text)throw {code:"dm",message:"쪽지 내용을 써 주세요."};
 const t=dmTarget(other);if(!t.ok)throw {code:"dm",message:t.why};
 if(t.existing)return sendDm(t.cid,text);
 const k=S.keys[other],cid=cidOf(other),[a,b]=[S.me.anon,other].sort(),now=Date.now();
 const pubA=a===S.me.anon?S.me.pub:k.pub, pubB=b===S.me.anon?S.me.pub:k.pub;
 await backend.put("convs",cid,{a,b,pubA,pubB,nickA:a===S.me.anon?S.me.nick:k.nick,nickB:b===S.me.anon?S.me.nick:k.nick,by:S.me.anon,status:"requested",createdAt:now,lastAt:now});
 await putMsg(cid,other,text,k.pub);
 return cid;
}
async function sendDm(cid,raw){
 guard();const text=clean(raw,CFG.dmMax);if(!text)throw {code:"dm",message:"쪽지 내용을 써 주세요."};
 const c=S.convs.find(x=>x.id===cid);if(!c)throw {code:"dm",message:"대화를 찾을 수 없어요."};
 const other=c.a===S.me.anon?c.b:c.a;
 if(blocked(other)||c.status==="blocked")throw {code:"dm",message:"차단된 대화예요."};
 if(c.status==="declined")throw {code:"dm",message:"상대가 대화를 원하지 않았어요."};
 if(c.status==="requested"&&c.by===S.me.anon)throw {code:"dm",message:"상대가 쪽지를 수락하면 이어서 보낼 수 있어요."};
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

/* ---- 돌퇴근 주간 랭킹 (함께 쓰는 저장소가 있을 때만. 로컬에선 null → 화면은 "내 기록"만 보여줘요) ----
   SERVER TODO: 지금은 기기에서 검증(runner-core verify)한 뒤 올려요. 서버가 생기면 입력 기록(inputs)을 함께 올리고
   서버에서 같은 runner-core.js로 다시 돌려 확인한 기록만 랭킹에 넣어야 조작을 막을 수 있어요. */
async function runSubmit(r){
 if(!backend||backend.mode!=="shared"||!S.canWrite||!S.me.anon)return false;
 const wk=r.week+"_"+r.sid, id=(wk+"_"+S.me.anon).replace(/[^\w-]/g,"_");
 try{const ref=backend.db.collection("runs").doc(id);const cur=await ref.get();if(cur.exists&&cur.data().ms<=r.ms)return true;
  await ref.set({wk,week:r.week,sid:String(r.sid),ms:r.ms,score:r.score,nick:S.me.nick||"익명의 돌",anon:S.me.anon,at:Date.now()});return true}catch(e){return false}
}
async function runBoard(week,sid){
 if(!backend||backend.mode!=="shared")return null;
 try{const s=await backend.db.collection("runs").where("wk","==",week+"_"+sid).limit(300).get();
  return s.docs.map(d=>d.data()).filter(x=>typeof x.ms==="number"&&!S.banned.includes(x.anon)).sort((a,b)=>a.ms-b.ms||a.at-b.at).map(x=>Object.assign({me:x.anon===S.me.anon},x))}catch(e){return []}
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

window.TG_COMMUNITY={SPACES,REPORT_REASONS,DM_REPORT_REASONS,CFG,state:S,subscribe:f=>{subs.add(f);return()=>subs.delete(f)},init,
 likeCount,commentCount,commentsOf,liked,reportedByMe,isHidden,mine,hot,recent,bySpace,post,nickOf,blocked,
 addPost,deletePost,addComment,deleteComment,toggleLike,report,
 nickProblem,nickChange,setNickname,contactRisk,
 setDmOpen,dmTarget,startDm,sendDm,acceptDm,declineDm,block,unblock,reportDm,convList,messages,markRead,unreadTotal,
 ban,unban,presence,runSubmit,runBoard,EMOTES,cleanEq};
})();
