/* 퇴근중 · 「오늘의 퇴근각」 v5 — 주제 없는 단어 맞히기
   유사도: 한국어 단어 임베딩(spaCy ko_core_news_lg, floret 300차원)으로 미리 계산한 값.
   데이터: words/vocab.json(인정 명사 목록) + words/YYYY-MM.bin(날짜마다 모든 단어의 정답 유사도 uint8) + .json(정답·힌트 번호)
   (Claude 공유 페이지처럼 .bin을 못 올리는 곳에서는 같은 내용을 base64로 바꾼 YYYY-MM.b64.txt를 읽어요)
   만드는 법: tools/make_words.py (README 참고). 서버 없이 기기에서 읽기만 해요. */
(function(){
"use strict";
const BASE="words-", START="2026-10-12";
const ALIAS={"아아":"아메리카노","라테":"라떼","카페라떼":"라떼","강쥐":"강아지","냥이":"고양이","치느님":"치킨","삼겹":"삼겹살","에어콘":"에어컨","핸드폰":"휴대폰","폰":"휴대폰","노트북컴퓨터":"노트북","지하철역":"지하철","버스정류장":"정류장","월요병":"월요일","불금":"금요일"};
const CHO="ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
let vocab=null, index=null, vocabP=null;
const months={}, days={};
function hashKey(d){
 /* tools/make_words.py 와 같은 값: MurmurHash3 x64_128(seed 7) 첫 64비트의 아래 16비트 */
 const b=new TextEncoder().encode(d);return mm3lo16(b,7);
}
/* --- MurmurHash3 x64_128 (BigInt) — 정답 번호를 살짝 가리는 용도 --- */
const M64=(1n<<64n)-1n;
const rotl=(x,r)=>((x<<BigInt(r))|(x>>BigInt(64-r)))&M64;
const fmix=k=>{k^=k>>33n;k=(k*0xff51afd7ed558ccdn)&M64;k^=k>>33n;k=(k*0xc4ceb9fe1a85ec53n)&M64;k^=k>>33n;return k};
function mm3lo16(data,seed){
 const n=data.length,nb=Math.floor(n/16),c1=0x87c37b91114253d5n,c2=0x4cf5ad432745937fn;let h1=BigInt(seed),h2=BigInt(seed);
 const rd=(o,l)=>{let v=0n;for(let i=l-1;i>=0;i--)v=(v<<8n)|BigInt(data[o+i]);return v};
 for(let i=0;i<nb;i++){let k1=rd(i*16,8),k2=rd(i*16+8,8);
  k1=(k1*c1)&M64;k1=rotl(k1,31);k1=(k1*c2)&M64;h1^=k1;h1=rotl(h1,27);h1=(h1+h2)&M64;h1=(h1*5n+0x52dce729n)&M64;
  k2=(k2*c2)&M64;k2=rotl(k2,33);k2=(k2*c1)&M64;h2^=k2;h2=rotl(h2,31);h2=(h2+h1)&M64;h2=(h2*5n+0x38495ab5n)&M64}
 const t=nb*16,l=n-t;let k1=0n,k2=0n;
 for(let i=l-1;i>=8;i--)k2^=BigInt(data[t+i])<<BigInt((i-8)*8);
 if(l>8){k2=(k2*c2)&M64;k2=rotl(k2,33);k2=(k2*c1)&M64;h2^=k2}
 for(let i=Math.min(l,8)-1;i>=0;i--)k1^=BigInt(data[t+i])<<BigInt(i*8);
 if(l>0){k1=(k1*c1)&M64;k1=rotl(k1,31);k1=(k1*c2)&M64;h1^=k1}
 h1^=BigInt(n);h2^=BigInt(n);h1=(h1+h2)&M64;h2=(h2+h1)&M64;h1=fmix(h1);h2=fmix(h2);h1=(h1+h2)&M64;
 return Number(h1&0xffffn);
}
function loadVocab(){
 if(!vocabP)vocabP=fetch(BASE+"vocab.json").then(r=>{if(!r.ok)throw new Error("vocab");return r.json()}).then(j=>{vocab=j.words;index=new Map(vocab.map((w,i)=>[w,i]))}).catch(e=>{vocabP=null;throw e});
 return vocabP;
}
function loadMonth(m){
 if(!months[m])months[m]=Promise.all([fetch(BASE+m+".json").then(r=>{if(!r.ok)throw new Error("nodata");return r.json()}),fetch(BASE+m+".bin").then(r=>{if(!r.ok)throw new Error("nodata");return r.arrayBuffer()}).catch(()=>fetch(BASE+m+".b64.txt").then(r=>{if(!r.ok)throw new Error("nodata");return r.text()}).then(t=>{const b=atob(t.trim()),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u.buffer}))])
  .then(([meta,buf])=>({meta,buf:new Uint8Array(buf)})).catch(e=>{delete months[m];throw e});
 return months[m];
}
const dayNo=date=>{const [y,m,d]=date.split("-").map(Number),[a,b,c]=START.split("-").map(Number);return Math.round((Date.UTC(y,m-1,d)-Date.UTC(a,b-1,c))/864e5)+1};
const toSim=q=>q===255?100:Math.round(((q/254)*1.1-0.1)*10000)/100;
async function load(date){
 if(days[date])return days[date];
 await loadVocab();
 const {meta,buf}=await loadMonth(date.slice(0,7));
 const k=meta.days.findIndex(x=>x.d===date);if(k<0)throw new Error("nodata");
 const n=meta.n, q=buf.subarray(k*n,(k+1)*n), key=hashKey(date);
 const secret=meta.days[k].s^key, hint=meta.days[k].h^key;
 /* 순위: 유사도 높은 순 (정답 = 0위) */
 const order=Array.from({length:n},(_,i)=>i).sort((a,b)=>q[b]-q[a]||a-b);
 const rank=new Int32Array(n);order.forEach((w,i)=>rank[w]=i);
 return days[date]={date,cat:meta.days[k].c||"",no:dayNo(date),q,rank,secret:vocab[secret],secretIdx:secret,hintWord:vocab[hint],thr:toSim(q[order[Math.min(1000,n-1)]]),near:[1,10,100,1000].map(r=>toSim(q[order[Math.min(r,n-1)]]))};
}
function normalize(x){x=String(x||"").replace(/\s+/g,"").trim();return ALIAS[x]||x}
function score(raw,date){
 const D=days[date];const w=normalize(raw);if(!D||!index)return {w,known:false};
 const i=index.get(w);if(i==null)return {w,known:false};
 return {w,known:true,s:toSim(D.q[i]),rank:D.rank[i]};
}
function initial(w){const c=w.charCodeAt(0)-0xAC00;return c>=0&&c<11172?CHO[Math.floor(c/588)]:w[0]}
window.TG_WORD={load,score,normalize,initial,dayNo,get size(){return vocab?vocab.length:32812},day:d=>days[d]||null};
})();
