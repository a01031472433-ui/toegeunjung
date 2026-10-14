/* 퇴근중 · 돌퇴근 — 그림 (캔버스)
   돌대리·장애물·배경·도착지·엔딩을 코드로 그려요. 색은 크림·베이지 중심, 사원증만 브랜드 파랑. */
(function(){
"use strict";
const FONT='"Jua","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
const C={ink:"#4A3F35",cream:"#FBF5EA",beige:"#EFE3CF",line:"#D8C9B0",blue:"#3557D8",limb:"#EEEAE3",limbS:"#D9D2C6",stone0:"#DAD7D2",stone1:"#ADAAA5",stone2:"#8C8984",stem:"#5B3D2E",pink:"#F2A3A3",orange:"#F28C38",white:"#FFFDF8"};
function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function ell(ctx,x,y,rx,ry,fill,rot){ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot||0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill()}}
function txt(ctx,s,x,y,size,color,align){ctx.font=`${size}px ${FONT}`;ctx.fillStyle=color;ctx.textAlign=align||"center";ctx.textBaseline="middle";ctx.fillText(s,x,y)}
function seeded(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function off(w,h,scale,draw){const c=document.createElement("canvas");c.width=Math.max(1,Math.ceil(w*scale));c.height=Math.max(1,Math.ceil(h*scale));const x=c.getContext("2d");x.scale(scale,scale);draw(x);return c}

/* ================= 돌대리 ================= */
const BODY_W=56,BODY_H=64; // 몸통 스프라이트 크기 (발 가운데 아래가 기준점)
function bodyPath(ctx){
 ctx.beginPath();ctx.moveTo(0,-42);
 ctx.bezierCurveTo(16,-43,25,-28,24,-14);ctx.bezierCurveTo(23,-3,14,1,0,1);
 ctx.bezierCurveTo(-15,1,-24,-4,-23,-16);ctx.bezierCurveTo(-22,-31,-14,-42,0,-42);ctx.closePath();
}
let bodyCache=null,bodyScale=0;
function bodySprite(scale){
 if(bodyCache&&bodyScale===scale)return bodyCache;bodyScale=scale;
 bodyCache=off(BODY_W,BODY_H,scale,ctx=>{
  ctx.translate(BODY_W/2,BODY_H-6);
  /* 꼭지 */
  ctx.lineCap="round";ctx.strokeStyle=C.stem;ctx.lineWidth=3.2;ctx.beginPath();ctx.moveTo(-1,-40);ctx.bezierCurveTo(-2,-47,0,-54,6,-54);ctx.bezierCurveTo(11,-54,12,-48,7.5,-47.5);ctx.stroke();
  /* 몸 */
  bodyPath(ctx);const g=ctx.createRadialGradient(-9,-30,3,-2,-18,34);g.addColorStop(0,C.stone0);g.addColorStop(.55,C.stone1);g.addColorStop(1,C.stone2);ctx.fillStyle=g;ctx.fill();
  ctx.save();bodyPath(ctx);ctx.clip();
  const r=seeded(7);for(let i=0;i<70;i++){const x=-24+r()*48,y=-42+r()*43;ctx.fillStyle=r()<.5?"rgba(255,255,255,.28)":"rgba(70,66,62,.22)";ctx.fillRect(x,y,.9+r()*.8,.9+r()*.8)}
  const sh=ctx.createLinearGradient(0,-10,0,2);sh.addColorStop(0,"rgba(60,55,50,0)");sh.addColorStop(1,"rgba(60,55,50,.25)");ctx.fillStyle=sh;ctx.fillRect(-26,-12,52,14);
  ell(ctx,-10,-32,7,4.5,"rgba(255,255,255,.35)",-.5);
  ctx.restore();
 });
 return bodyCache;
}
function limb(ctx,x,y,rx,ry,rot){ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot||0,0,Math.PI*2);const g=ctx.createLinearGradient(x,y-ry,x,y+ry);g.addColorStop(0,"#F7F4EF");g.addColorStop(1,C.limbS);ctx.fillStyle=g;ctx.fill()}
function face(ctx,mood,t){
 ctx.save();ctx.translate(5,0);
 ctx.fillStyle="#1F1B18";ctx.strokeStyle="#1F1B18";ctx.lineCap="round";
 const eye=(x,y,r)=>{ell(ctx,x,y,r,r*1.08,"#1F1B18");ell(ctx,x-r*.35,y-r*.4,r*.32,r*.32,"rgba(255,255,255,.85)")};
 const line=(x1,y1,x2,y2,w)=>{ctx.lineWidth=w||2.3;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()};
 if(mood==="jump"){
  eye(-4,-17,3.3);eye(12,-18,3.3);line(-8,-25,-1,-26.5);line(9,-27,15,-25.5);ell(ctx,4,-10.5,1.9,2.5,"#1F1B18");
 }else if(mood==="hit"){
  line(-7,-20,-2,-17,2);line(-7,-14,-2,-17,2);line(15,-21,10,-18,2);line(15,-15,10,-18,2);
  line(-8,-23,-1,-25,2);line(9,-26,15,-23,2);
  ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(0,-9);ctx.quadraticCurveTo(2,-11,4,-9);ctx.quadraticCurveTo(6,-7,8,-9);ctx.stroke();
  ctx.fillStyle="#8EC5F0";ctx.beginPath();ctx.moveTo(19,-34);ctx.quadraticCurveTo(14,-27,19,-26);ctx.quadraticCurveTo(24,-27,19,-34);ctx.fill();
 }else if(mood==="win"){
  ctx.lineWidth=2.4;ctx.beginPath();ctx.arc(-4,-16,3.2,Math.PI*1.1,Math.PI*1.9);ctx.stroke();ctx.beginPath();ctx.arc(12,-17,3.2,Math.PI*1.1,Math.PI*1.9);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-1,-11);ctx.quadraticCurveTo(4,-4,9,-11);ctx.closePath();ctx.fillStyle="#7A2E2E";ctx.fill();
  ell(ctx,-9,-11,3.6,2,"rgba(242,140,140,.55)");ell(ctx,17,-12,3.6,2,"rgba(242,140,140,.55)");
 }else if(mood==="sleep"){
  line(-7,-16,-1,-16,2);line(9,-17,15,-17,2);ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(4,-11,2,0,Math.PI);ctx.stroke();
  ell(ctx,-9,-11,3.6,2,"rgba(242,140,140,.45)");ell(ctx,17,-12,3.6,2,"rgba(242,140,140,.45)");
 }else{
  const blink=t!=null&&(t%3.2)<.12;
  if(blink){line(-6,-17,-2,-17,2);line(10,-18,14,-18,2)}else{eye(-4,-17,2.7);eye(12,-18,2.7)}
  line(-8,-23,-1,-24);line(9,-25,15,-24);line(1,-12,8,-12.5,2.2);
 }
 ctx.restore();
}
function badge(ctx){
 ctx.save();ctx.translate(-4,-1);
 ctx.strokeStyle=C.blue;ctx.lineWidth=1.3;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(-9,-11);ctx.quadraticCurveTo(-3,-3,2,-3.5);ctx.quadraticCurveTo(8,-4,13,-12);ctx.stroke();
 rr(ctx,-1.5,-4.5,7.5,9,1.6);ctx.fillStyle="#fff";ctx.fill();ctx.lineWidth=.9;ctx.stroke();
 ctx.fillStyle=C.blue;ctx.fillRect(-.3,-3.3,5,2.2);ctx.fillStyle="#C7CDD8";ctx.fillRect(0,0,4.4,.9);ctx.fillRect(0,1.8,3,.9);
 ctx.restore();
}
/* o: {phase, mood, air(0/1), sx, sy(스쿼시), rot, t, shoes, scale} — (x,y) = 발 가운데 바닥 */
function pebble(ctx,x,y,o){
 const s=o.scale||1, ph=o.phase||0, air=o.air, k=Math.cos(ph), k2=Math.sin(ph);
 ctx.save();ctx.translate(x,y);ctx.scale(s*(o.sx||1),s*(o.sy||1));ctx.rotate(o.rot||0);
 const shoe=o.shoes?"#F0614F":null;
 const foot=(fx,fy,rot)=>{if(shoe){ell(ctx,fx,fy,7.5,5.6,shoe,rot);ell(ctx,fx-1,fy+2.6,7.6,2,"#fff",rot)}else limb(ctx,fx,fy,7,5.4,rot)};
 let bf,ff,ba,fa;
 if(o.mood==="hit"){bf=[-10,-4];ff=[12,-6];ba=[-27,-24];fa=[28,-26]}
 else if(o.mood==="win"&&!air){const w=Math.sin((o.t||0)*14)*4;bf=[-8,-2];ff=[9,-2];ba=[-27,-26+w];fa=[28,-28-w]}
 else if(air){bf=[-7,-4];ff=[10,-6];ba=[-25,-17];fa=[26,-19]}
 else{bf=[-7+k*7,-2-Math.max(0,k2)*5];ff=[8-k*7,-2-Math.max(0,-k2)*5];ba=[-21-k*3,-8-Math.max(0,k)*2];fa=[22+k*3,-8-Math.max(0,-k)*2]}
 if(!o.noLimbs){limb(ctx,ba[0],ba[1],5.4,4.4,-.4);foot(bf[0],bf[1],-.1)}
 const b=bodySprite(o.res||2);ctx.drawImage(b,-BODY_W/2,-(BODY_H-6),BODY_W,BODY_H);
 if(o.badge!==false)badge(ctx);
 face(ctx,o.mood,o.t);
 if(!o.noLimbs){foot(ff[0],ff[1],.1);limb(ctx,fa[0],fa[1],5.6,4.6,.4)}
 ctx.restore();
}

/* ================= 장애물 ================= */
function person(ctx,x,g,w,h,o){
 /* x,g = 왼쪽 아래 / 서 있는 사람 (왼쪽을 봄) */
 const cx=x+w/2,t=o.t||0;
 const leg=Math.sin(t*10)*(o.walk?3:0);
 ctx.fillStyle="#4C4552";ctx.fillRect(cx-6+leg,g-14,5,14);ctx.fillRect(cx+1-leg,g-14,5,14);
 ell(ctx,cx-4+leg,g-1,4.6,2.2,"#2E2A30");ell(ctx,cx+4-leg,g-1,4.6,2.2,"#2E2A30");
 rr(ctx,cx-w/2-1,g-h+14,w+2,h-26,7);ctx.fillStyle=o.coat;ctx.fill();
 if(o.shirt){ctx.fillStyle="#fff";ctx.beginPath();ctx.moveTo(cx-5,g-h+15);ctx.lineTo(cx+5,g-h+15);ctx.lineTo(cx,g-h+27);ctx.fill();
  ctx.fillStyle="#D9534F";ctx.beginPath();ctx.moveTo(cx-1.6,g-h+17);ctx.lineTo(cx+1.6,g-h+17);ctx.lineTo(cx+2.2,g-h+30);ctx.lineTo(cx,g-h+33);ctx.lineTo(cx-2.2,g-h+30);ctx.fill()}
 ell(ctx,cx,g-h+6,9,9.5,"#F2CFAE");
 ctx.fillStyle=o.hair||"#3B302B";ctx.beginPath();ctx.ellipse(cx+1,g-h+2,9.4,6.4,0,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(cx+4,g-h+1,6,6);
 ell(ctx,cx-4,g-h+7,1.3,1.4,"#2B2420");
 if(o.glasses){ctx.strokeStyle="#2B2420";ctx.lineWidth=1.1;ctx.beginPath();ctx.arc(cx-4,g-h+7,3,0,Math.PI*2);ctx.stroke()}
 if(o.brow){ctx.strokeStyle="#2B2420";ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(cx-8,g-h+2);ctx.lineTo(cx-2,g-h+4);ctx.stroke()}
 if(o.blush)ell(ctx,cx-5,g-h+10,2.6,1.5,"rgba(240,110,110,.6)");
 if(o.phone){ctx.fillStyle="#2B2F3A";rr(ctx,cx-11,g-h+20,5,8,1.2);ctx.fill();ctx.fillStyle="rgba(255,230,160,.6)";ctx.fillRect(cx-10.2,g-h+21,3.4,5.6);ell(ctx,cx-8,g-h+28,3.2,2.5,"#F2CFAE")}
 if(o.mug){ctx.fillStyle="#F6C453";rr(ctx,cx-14,g-h+22,7,9,1.5);ctx.fill();ctx.fillStyle="#fff";rr(ctx,cx-14.5,g-h+20.5,8,3,1.5);ctx.fill()}
}
function bubble(ctx,cx,y,s){
 ctx.font=`11px ${FONT}`;const w=ctx.measureText(s).width+12;
 rr(ctx,cx-w/2,y-17,w,17,8);ctx.fillStyle="#fff";ctx.fill();ctx.strokeStyle="#D8C9B0";ctx.lineWidth=1;ctx.stroke();
 ctx.beginPath();ctx.moveTo(cx-2,y);ctx.lineTo(cx+3,y+5);ctx.lineTo(cx+5,y);ctx.fillStyle="#fff";ctx.fill();
 txt(ctx,s,cx,y-8.2,11,C.ink);
}
const DRAW={
 papers(ctx,x,g,w,h){const cols=["#FFFDF8","#F7F1E4","#FFFDF8","#F3EADB","#FFFDF8"];
  for(let i=0;i<5;i++){const yy=g-(i+1)*6.2,dx=(i%2?1.5:-1.5);rr(ctx,x-2+dx,yy,w+4,6,1);ctx.fillStyle=cols[i];ctx.fill();ctx.strokeStyle="#D8C9B0";ctx.lineWidth=.8;ctx.stroke()}
  ctx.fillStyle="#C9B48F";ctx.fillRect(x+4,g-31.5,w-8,1);ctx.fillRect(x+4,g-29.5,w-12,1);
  ctx.strokeStyle="#D9534F";ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(x+w-5,g-14,4,0,Math.PI*2);ctx.stroke();txt(ctx,"결",x+w-5,g-13.8,5.5,"#D9534F")},
 cup(ctx,x,g,w,h,t){ctx.fillStyle=C.white;ctx.beginPath();ctx.moveTo(x-1,g-h+3);ctx.lineTo(x+w+1,g-h+3);ctx.lineTo(x+w-2,g);ctx.lineTo(x+2,g);ctx.closePath();ctx.fill();ctx.strokeStyle="#D8C9B0";ctx.lineWidth=.8;ctx.stroke();
  ctx.fillStyle="#C99A6B";ctx.fillRect(x+.5,g-h+9,w-1,7);ell(ctx,x+w/2,g-h+12.5,2.2,2.2,"#fff");
  rr(ctx,x-2,g-h,w+4,4,1.5);ctx.fillStyle="#7A5A43";ctx.fill();
  ctx.strokeStyle="rgba(150,130,110,.45)";ctx.lineWidth=1.2;for(const d of [3,9]){ctx.beginPath();const s=Math.sin(t*3+d)*1.5;ctx.moveTo(x+d,g-h-2);ctx.quadraticCurveTo(x+d-3+s,g-h-6,x+d+s,g-h-10);ctx.stroke()}},
 chair(ctx,x,g,w,h,t){const cx=x+w/2;
  rr(ctx,x+w-9,g-h,8,22,3);ctx.fillStyle="#5A5E78";ctx.fill();
  rr(ctx,x+1,g-h+18,w-2,6,3);ctx.fillStyle="#6B708C";ctx.fill();
  ctx.fillStyle="#8B8FA3";ctx.fillRect(cx-1.5,g-h+24,3,7);ctx.fillRect(x+2,g-6,w-4,2.4);
  for(const wx of [x+4,cx,x+w-4]){ell(ctx,wx,g-2.6,2.8,2.8,"#3C3F52");ctx.strokeStyle="#9AA0B5";ctx.lineWidth=.8;ctx.beginPath();const a=-t*12;ctx.moveTo(wx,g-2.6);ctx.lineTo(wx+Math.cos(a)*2.4,g-2.6+Math.sin(a)*2.4);ctx.stroke()}},
 boss(ctx,x,g,w,h,t){person(ctx,x,g,w,h,{coat:"#3D4A6B",shirt:1,glasses:1,brow:1,t});bubble(ctx,x+w/2,g-h-6,"잠깐 얘기 좀…")},
 drunk(ctx,x,g,w,h,t){person(ctx,x,g,w,h,{coat:"#6B4A5A",shirt:1,blush:1,mug:1,walk:1,t});bubble(ctx,x+w/2,g-h-6,"딱 한 잔만?")},
 crowd(ctx,x,g,w,h,t,i){const coats=["#8A9BB0","#B07D62","#7C8C6E","#9A7FA0"];person(ctx,x,g,w,h,{coat:coats[i%4],hair:i%3===1?"#6B4B3A":"#3B302B",phone:1,walk:1,t})},
 bag(ctx,x,g,w,h){rr(ctx,x,g-h+4,w,h-4,4);ctx.fillStyle="#9B6A4B";ctx.fill();ctx.strokeStyle="#7A5038";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+w/2-6,g-h+4);ctx.quadraticCurveTo(x+w/2,g-h-4,x+w/2+6,g-h+4);ctx.stroke();
  ctx.fillStyle="#7A5038";ctx.fillRect(x,g-h+10,w,2);rr(ctx,x+w/2-3,g-h+8,6,6,1);ctx.fillStyle="#E8C46A";ctx.fill()},
 stairs(ctx,x,g,w,h){const n=3,sw=w/(n+1),sh=h/n;
  for(let i=0;i<n;i++){const xx=x+i*sw,top=g-(i+1)*sh;ctx.fillStyle=i%2?"#D9CDBA":"#E1D6C4";ctx.fillRect(xx,top,w-i*sw,sh+.5);ctx.fillStyle="#F2C94C";ctx.fillRect(xx,top,w-i*sw,2)}
  ctx.fillStyle="#C9BBA4";ctx.fillRect(x+w-2,g-h,2,h)},
 door(ctx,x,g,w,h,t){rr(ctx,x-2,g-h,w+4,h,3);ctx.fillStyle="#C9CDD3";ctx.fill();ctx.strokeStyle="#9EA4AE";ctx.lineWidth=1;ctx.stroke();
  rr(ctx,x+2,g-h+8,w-4,24,2);ctx.fillStyle="#E7EEF2";ctx.fill();ctx.fillStyle="#F2C94C";ctx.fillRect(x-2,g-h+40,w+4,5);
  ell(ctx,x+w/2,g-h-4,3,3,Math.sin(t*14)>0?"#F25C54":"#B8463F");
  txt(ctx,"◀▶",x+w/2,g-18,8,"#7B818C")},
 puddle(ctx,x,g,w,h,t){ell(ctx,x+w/2,g-2,w/2+3,5,"#9CCBE6");ell(ctx,x+w/2-6,g-3,w/4,1.8,"rgba(255,255,255,.7)");
  ctx.strokeStyle="rgba(255,255,255,.8)";ctx.lineWidth=.9;const r=(t*14)%12;ctx.beginPath();ctx.ellipse(x+w*.7,g-2,r,r*.3,0,0,Math.PI*2);ctx.stroke()},
 pigeon(ctx,x,g,w,h,t){const peck=Math.max(0,Math.sin(t*5))*4;
  ell(ctx,x+w/2+2,g-8,10,7,"#9AA0A8");ctx.fillStyle="#7E848E";ctx.beginPath();ctx.moveTo(x+w-2,g-10);ctx.lineTo(x+w+6,g-6);ctx.lineTo(x+w-2,g-5);ctx.fill();
  ell(ctx,x+3,g-14+peck,5,5,"#8B91A0");ell(ctx,x+5,g-11+peck,4,2.8,"#6FA39A");ell(ctx,x+1.6,g-15+peck,1.1,1.1,"#E25D38");
  ctx.fillStyle="#E8A13B";ctx.beginPath();ctx.moveTo(x-1,g-14+peck);ctx.lineTo(x-5,g-13+peck);ctx.lineTo(x-1,g-12+peck);ctx.fill();
  ctx.strokeStyle="#E07B5F";ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(x+w/2,g-2);ctx.lineTo(x+w/2-1,g);ctx.moveTo(x+w/2+4,g-2);ctx.lineTo(x+w/2+5,g);ctx.stroke()},
 fpig(ctx,x,g,w,h,t){const y=g-h/2,f=Math.sin(t*18);
  ell(ctx,x+w/2,y,11,6,"#9AA0A8");ell(ctx,x+2,y-2,5,4.6,"#8B91A0");ell(ctx,x+.5,y-3,1.1,1.1,"#E25D38");
  ctx.fillStyle="#E8A13B";ctx.beginPath();ctx.moveTo(x-2,y-2);ctx.lineTo(x-6,y-1);ctx.lineTo(x-2,y);ctx.fill();
  ctx.fillStyle="#B3B8C0";ctx.beginPath();ctx.moveTo(x+w/2-6,y-2);ctx.lineTo(x+w/2+2,y-2-14*f);ctx.lineTo(x+w/2+8,y-2);ctx.fill()},
 cone(ctx,x,g,w,h){ctx.fillStyle="#F28C38";ctx.beginPath();ctx.moveTo(x+w/2-3,g-h);ctx.lineTo(x+w/2+3,g-h);ctx.lineTo(x+w-2,g-4);ctx.lineTo(x+2,g-4);ctx.closePath();ctx.fill();
  ctx.fillStyle="#fff";ctx.fillRect(x+w/2-5.5,g-h+9,11,4);ctx.fillRect(x+w/2-8,g-h+18,16,4);rr(ctx,x-2,g-5,w+4,5,1.5);ctx.fillStyle="#D9732A";ctx.fill()},
 phone(ctx,x,g,w,h,t,i,fri){const y=g-h;ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate(Math.sin(t*40)*.06);
  rr(ctx,-w/2,-h/2,w,h,4);ctx.fillStyle="#2B2F3A";ctx.fill();rr(ctx,-w/2+2,-h/2+3,w-4,h-6,2);ctx.fillStyle="#FFF8EC";ctx.fill();
  txt(ctx,fri?"부장님":"팀장님",0,-h/2+10,6.4,C.ink);ell(ctx,-4,h/2-7,2.6,2.6,"#2FA36B");ell(ctx,4,h/2-7,2.6,2.6,"#E25D4F");ctx.restore();
  ctx.strokeStyle="rgba(242,140,56,.85)";ctx.lineWidth=1.4;const p=(t*6)%1;for(const s of [-1,1]){ctx.beginPath();ctx.arc(x+w/2,y+h/2,w/2+4+p*4,s<0?Math.PI*.8:-.2*Math.PI,s<0?Math.PI*1.2:.2*Math.PI);ctx.stroke()}},
};
/* v14: 거대 팀장님 — 다리를 벌리고 버티고 선 팀장님. g = 가랑이 높이(바닥에서 24 위).
   몸이 화면 위까지 닿아서 점프로는 못 넘고, 숙여서 다리 사이로만 빠져나가요 (충돌 상자는 다리 사이 위쪽) */
DRAW.talk=function(ctx,x,g,w,h,t,i){
 const say=["회의합시다!","5분만 회의할까?","회의합시다!","잠깐 회의 좀!"][(i||0)%4];
 const G=g+24, cx=x+w/2, crotch=g-6, sway=Math.sin(t*2.2)*1.5;
 const navy="#3D4A6B", navyD="#2E3854", skin="#F2CFAE";
 ell(ctx,cx,G+1,48,5,"rgba(74,63,53,.2)");
 /* 다리 (뒷다리 먼저) */
 ctx.fillStyle=navyD;ctx.beginPath();ctx.moveTo(x+w-6,crotch);ctx.lineTo(x+w+10,crotch);ctx.lineTo(x+w+24,G-5);ctx.lineTo(x+w+8,G-5);ctx.closePath();ctx.fill();
 ell(ctx,x+w+18,G-3,12,4.5,"#1F2433");
 ctx.fillStyle=navy;ctx.beginPath();ctx.moveTo(x-10,crotch);ctx.lineTo(x+6,crotch);ctx.lineTo(x-8,G-5);ctx.lineTo(x-24,G-5);ctx.closePath();ctx.fill();
 ell(ctx,x-20,G-3,13,4.5,"#1F2433");
 /* 바지 · 벨트 */
 rr(ctx,x-14,crotch-84,w+28,84,6);ctx.fillStyle=navy;ctx.fill();
 ctx.fillStyle=navyD;ctx.beginPath();ctx.moveTo(cx-7,crotch);ctx.lineTo(cx,crotch-26);ctx.lineTo(cx+7,crotch);ctx.fill();
 ctx.fillStyle="#2B2420";ctx.fillRect(x-14,crotch-90,w+28,8);rr(ctx,cx-6,crotch-91,12,10,2);ctx.fillStyle="#E8C46A";ctx.fill();
 /* 상체: 셔츠 · 넥타이 · 재킷 */
 const top=crotch-200;
 rr(ctx,x-20,top+sway,w+40,112,12);ctx.fillStyle=navy;ctx.fill();
 ctx.fillStyle="#fff";ctx.beginPath();ctx.moveTo(cx-14,top+2+sway);ctx.lineTo(cx+14,top+2+sway);ctx.lineTo(cx,top+52+sway);ctx.fill();
 ctx.fillStyle="#D9534F";ctx.beginPath();ctx.moveTo(cx-4,top+6+sway);ctx.lineTo(cx+4,top+6+sway);ctx.lineTo(cx+6,top+44+sway);ctx.lineTo(cx,top+52+sway);ctx.lineTo(cx-6,top+44+sway);ctx.fill();
 ctx.fillStyle="#fff";rr(ctx,x-12,top+24+sway,10,7,2);ctx.fill();
 /* 허리에 손 (양팔) */
 ctx.strokeStyle=navy;ctx.lineWidth=13;ctx.lineCap="round";
 ctx.beginPath();ctx.moveTo(x-16,top+16+sway);ctx.quadraticCurveTo(x-48,top+52,x-20,crotch-86);ctx.stroke();
 ctx.beginPath();ctx.moveTo(x+w+16,top+16+sway);ctx.quadraticCurveTo(x+w+48,top+52,x+w+20,crotch-86);ctx.stroke();
 ell(ctx,x-18,crotch-88,7,6,skin);ell(ctx,x+w+18,crotch-88,7,6,skin);
 /* 머리 */
 const hy=top-24+sway;
 ell(ctx,cx,hy+22,8,6,skin);
 ell(ctx,cx,hy,24,25,skin);
 ctx.fillStyle="#3B302B";ctx.beginPath();ctx.ellipse(cx+2,hy-10,25,15,0,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(cx+10,hy-12,15,12);
 ctx.strokeStyle="#2B2420";ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx-10,hy+2,7,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(cx+8,hy+2,7,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(cx-3,hy+2);ctx.lineTo(cx+1,hy+2);ctx.stroke();
 ell(ctx,cx-10,hy+3,2,2.2,"#2B2420");ell(ctx,cx+8,hy+3,2,2.2,"#2B2420");
 ctx.lineWidth=2.6;ctx.beginPath();ctx.moveTo(cx-18,hy-9);ctx.lineTo(cx-4,hy-5);ctx.moveTo(cx+16,hy-9);ctx.lineTo(cx+3,hy-5);ctx.stroke();
 ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx-6,hy+15);ctx.quadraticCurveTo(cx,hy+11,cx+6,hy+15);ctx.stroke();
 ctx.font=`13px ${FONT}`;const bw=ctx.measureText(say).width+14;
 rr(ctx,cx-30-bw,hy-30,bw,22,9);ctx.fillStyle="#fff";ctx.fill();ctx.strokeStyle="#D8C9B0";ctx.lineWidth=1;ctx.stroke();
 ctx.beginPath();ctx.moveTo(cx-34,hy-12);ctx.lineTo(cx-22,hy-6);ctx.lineTo(cx-28,hy-12);ctx.fillStyle="#fff";ctx.fill();
 txt(ctx,say,cx-30-bw/2,hy-18.6,13,C.ink);
 /* 숙이기 안내 */
 const a=.55+.45*Math.sin(t*8);ctx.save();ctx.globalAlpha=a;rr(ctx,cx-22,crotch-62,44,17,5);ctx.fillStyle="#F6C453";ctx.fill();txt(ctx,"⬇ 숙여!",cx,crotch-53.5,10,C.ink);ctx.restore();
};
/* v14.3: 꽉 낀 인파 — 손잡이 잡고 어깨를 맞댄 출근길 사람들. g = 바닥에서 24 위. 다리 사이로 숙여서 비집고 지나가요 */
DRAW.squeeze=function(ctx,x,g,w,h,t,i){
 const G=g+24, bot=g-6, coats=["#8A9BB0","#B07D62","#7C8C6E","#9A7FA0"], skin="#F2CFAE";
 const n=4, pw=(w+52)/n, x0=x-26;
 ell(ctx,x+w/2,G+1,w/2+18,5,"rgba(74,63,53,.18)");
 /* 손잡이 봉 */
 ctx.fillStyle="#B9BEC6";ctx.fillRect(x0-10,bot-176,w+44,4);
 for(let k=0;k<n;k++){
  const cx=x0+pw*(k+.5), sq=Math.sin(t*5+k*1.7)*1.2, top=bot-118+(k%2?6:0), c=coats[(k+(i||0))%4];
  /* 다리 */
  ctx.fillStyle="#4C4552";ctx.fillRect(cx-8,bot,4,G-bot-3);ctx.fillRect(cx+4,bot,4,G-bot-3);
  ell(ctx,cx-7,G-2,5,2.2,"#2E2A30");ell(ctx,cx+7,G-2,5,2.2,"#2E2A30");
  /* 몸 (서로 밀려서 눌린 모양) */
  rr(ctx,cx-pw/2-5+sq,top,pw+10,bot-top,11);ctx.fillStyle=c;ctx.fill();
  ctx.strokeStyle="rgba(0,0,0,.08)";ctx.lineWidth=1;ctx.stroke();
  /* 손잡이 잡은 팔 */
  ctx.strokeStyle=c;ctx.lineWidth=7;ctx.lineCap="round";const hx=cx+(k%2?-6:6);
  ctx.beginPath();ctx.moveTo(hx,top+8);ctx.lineTo(hx,bot-160);ctx.stroke();
  ctx.strokeStyle="#9AA0A8";ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(hx,bot-172);ctx.lineTo(hx,bot-162);ctx.stroke();
  ctx.beginPath();ctx.arc(hx,bot-157,5,0,Math.PI*2);ctx.stroke();ell(ctx,hx,bot-157,3.6,3.6,skin);
  /* 얼굴 (찌그러진 표정) */
  const hy=top-12;ell(ctx,cx+sq,hy,11,10,skin);
  ctx.fillStyle=k===1?"#6B4B3A":"#3B302B";ctx.beginPath();ctx.ellipse(cx+sq,hy-5,11.4,7,0,Math.PI,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#2B2420";ctx.lineWidth=1.3;
  ctx.beginPath();ctx.moveTo(cx-6+sq,hy);ctx.lineTo(cx-2+sq,hy+1.5);ctx.moveTo(cx+6+sq,hy);ctx.lineTo(cx+2+sq,hy+1.5);ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx-3+sq,hy+6);ctx.lineTo(cx-1+sq,hy+5);ctx.lineTo(cx+1+sq,hy+6);ctx.lineTo(cx+3+sq,hy+5);ctx.stroke();
 }
 /* 꾹꾹 눌린 표시 */
 ctx.strokeStyle="rgba(200,100,28,.6)";ctx.lineWidth=1.6;
 for(const sx of [x0-4,x0+w+28]){ctx.beginPath();ctx.moveTo(sx,bot-80);ctx.lineTo(sx+(sx<x?-6:6),bot-86);ctx.moveTo(sx,bot-70);ctx.lineTo(sx+(sx<x?-7:7),bot-70);ctx.stroke()}
 bubble(ctx,x+w/2,bot-140-14,["밀지 마세요!","내려요 내려요!","숨 막혀…"][(i||0)%3]);
 const a=.55+.45*Math.sin(t*8);ctx.save();ctx.globalAlpha=a;rr(ctx,x+w/2-22,bot-40,44,17,5);ctx.fillStyle="#F6C453";ctx.fill();txt(ctx,"⬇ 숙여!",x+w/2,bot-31.5,10,C.ink);ctx.restore();
};
/* v17 코믹 장애물 */
DRAW.plane=function(ctx,x,g,w,h,t){const y=g-h/2+Math.sin(t*9)*2.5;ctx.save();ctx.translate(x+w/2,y);ctx.rotate(Math.sin(t*6)*.12);ctx.scale(1.35,1.35);
 ctx.fillStyle="#FFFDF8";ctx.strokeStyle="#C9B48F";ctx.lineWidth=.9;
 ctx.beginPath();ctx.moveTo(-14,0);ctx.lineTo(14,-7);ctx.lineTo(4,0);ctx.lineTo(14,7);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle="#EFE6D4";ctx.beginPath();ctx.moveTo(-14,0);ctx.lineTo(4,0);ctx.lineTo(14,7);ctx.closePath();ctx.fill();
 ctx.strokeStyle="#D9534F";ctx.lineWidth=1.1;ctx.beginPath();ctx.arc(6,-2.5,3.2,0,Math.PI*2);ctx.stroke();txt(ctx,"결",6,-2.3,4.4,"#D9534F");
 ctx.restore();ctx.strokeStyle="rgba(139,127,112,.5)";ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(x+w+4,y);ctx.lineTo(x+w+22,y+Math.sin(t*9-1)*3);ctx.stroke();ctx.setLineDash([])};
DRAW.moto=function(ctx,x,g,w,h,t){const b=Math.abs(Math.sin(t*14))*1.2;
 for(const wx of [x+6,x+w-6]){ell(ctx,wx,g-5,5.4,5.4,"#2E2A30");ell(ctx,wx,g-5,2.2,2.2,"#9AA0A8")}
 rr(ctx,x+2,g-15-b,w-4,8,4);ctx.fillStyle="#E25D4F";ctx.fill();
 ctx.fillStyle="#9AA0A8";ctx.fillRect(x+1,g-24-b,3,12);ell(ctx,x+2,g-24-b,2.6,2,"#F6C453");
 rr(ctx,x+w-15,g-31-b,14,13,2);ctx.fillStyle="#F2B84B";ctx.fill();txt(ctx,"배달",x+w-8,g-24.2-b,5.4,"#7A5038");
 ctx.fillStyle="#3D6FB0";rr(ctx,x+12,g-28-b,10,14,4);ctx.fill();
 ell(ctx,x+15,g-33-b,6.4,6.4,"#F2F2F2");ctx.fillStyle="#3D6FB0";ctx.beginPath();ctx.ellipse(x+15,g-34-b,6.6,5,0,Math.PI,Math.PI*2);ctx.fill();
 ctx.strokeStyle="rgba(139,127,112,.55)";ctx.lineWidth=1.2;for(let k=0;k<3;k++){const yy=g-10-k*7,o=(t*80+k*9)%14;ctx.beginPath();ctx.moveTo(x+w+4+o,yy);ctx.lineTo(x+w+14+o,yy);ctx.stroke()}
 bubble(ctx,x+w/2,g-44-b,"띵동~ 배달이요!")};
function dizzy(ctx,x,y,t,a){ctx.save();ctx.globalAlpha=a;for(let k=0;k<3;k++){const an=t*6+k*2.1;txt(ctx,"★",x+Math.cos(an)*16,y+Math.sin(an)*5,9,"#F2B84B")}ctx.restore()}

/* ================= v19 STAGE 4 · 꿈에서 야근하기 ================= */
DRAW.sheep=function(ctx,x,g,w,h,t,i){const b=Math.abs(Math.sin(t*6+(i||0)))*2;
 ctx.fillStyle="#3B3346";ctx.fillRect(x+5,g-7,3,7);ctx.fillRect(x+w-8,g-7,3,7);
 for(const [dx,dy,r] of [[6,-12,7],[13,-15,8],[20,-12,7],[9,-8,6],[17,-8,6]])ell(ctx,x+dx,g-dy*-1-24+12+dy+12-b,r,r*.9,"#F7F4FB");
 ell(ctx,x+w-2,g-15-b,6,5.4,"#3B3346");ell(ctx,x+w-4,g-16-b,1.2,1.2,"#fff");ell(ctx,x+w-6,g-20-b,3,2,"#3B3346");
 txt(ctx,(13+(i||0)%40)+"…",x+w/2,g-h-8-b,9,"#C9BFF0")};
DRAW.pillow=function(ctx,x,g,w,h,t){
 rr(ctx,x-2,g-12,w+4,12,6);ctx.fillStyle="#C9B8F2";ctx.fill();
 rr(ctx,x+3,g-h,w-6,13,6);ctx.fillStyle="#F4F0FF";ctx.fill();ctx.strokeStyle="#B7A6E6";ctx.lineWidth=1;ctx.stroke();
 ctx.strokeStyle="rgba(150,130,210,.6)";ctx.beginPath();ctx.moveTo(x+w/2-6,g-h+6);ctx.lineTo(x+w/2+6,g-h+6);ctx.stroke();
 const p=(t*.8)%1;ctx.globalAlpha=1-p;txt(ctx,"z",x+w-4+p*6,g-h-6-p*14,9+p*5,"#B7A6E6");ctx.globalAlpha=1};
DRAW.clone=function(ctx,x,g,w,h,t,i){
 for(const k of [2,1]){ctx.save();ctx.globalAlpha=.28/k;person(ctx,x+k*9,g,w,h,{coat:"#6A5AA8",shirt:1,glasses:1,brow:1,t:t+k});ctx.restore()}
 person(ctx,x,g,w,h,{coat:"#4B3F86",shirt:1,glasses:1,brow:1,t});
 bubble(ctx,x+w/2,g-h-6,["나도 팀장","나도 팀장","나도 팀장"][(i||0)%3]+"이에요")};
DRAW.zzz=function(ctx,x,g,w,h,t){const y=g-h/2;
 ctx.save();ctx.shadowColor="#B9A6FF";ctx.shadowBlur=8;
 txt(ctx,"Z",x+6,y+Math.sin(t*7)*2,16,"#E6DDFF");txt(ctx,"z",x+16,y-6+Math.sin(t*7+1)*2,12,"#CFC2FF");txt(ctx,"z",x+23,y-12+Math.sin(t*7+2)*2,9,"#B9A6FF");ctx.restore();
 ctx.strokeStyle="rgba(201,191,240,.5)";ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(x+w+4,y);ctx.lineTo(x+w+20,y);ctx.stroke();ctx.setLineDash([])};
/* 거대 월요일 달력: 하늘에서 내려온 달력 한 장. 아래 끝(g)이 바닥에서 24 위라 숙여서 밑으로 빠져나가요 */
DRAW.monday=function(ctx,x,g,w,h,t){const cx=x+w/2,sw=Math.sin(t*2)*2,top=g-230;
 ell(ctx,cx,g+25,w/2+10,4,"rgba(30,20,60,.25)");
 ctx.strokeStyle="#8C7FC0";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx-20,-10);ctx.lineTo(cx-20+sw,top);ctx.moveTo(cx+20,-10);ctx.lineTo(cx+20+sw,top);ctx.stroke();
 ctx.save();ctx.translate(sw,0);
 rr(ctx,x-22,top,w+44,g-top,8);ctx.fillStyle="#FFFDF8";ctx.fill();ctx.strokeStyle="#B7A6E6";ctx.lineWidth=2;ctx.stroke();
 rr(ctx,x-22,top,w+44,46,8);ctx.fillStyle="#E2553C";ctx.fill();ctx.fillRect(x-22,top+30,w+44,16);
 for(const dx of [-10,0,10])ell(ctx,cx+dx*1.6,top+4,3,3,"#4B3F86");
 txt(ctx,"MONDAY",cx,top+24,11,"#fff");txt(ctx,"월",cx,top+100,58,"#E2553C");txt(ctx,"요일",cx,top+150,16,"#8B7F70");
 for(let k=0;k<3;k++){ctx.fillStyle="#E8E2F7";ctx.fillRect(x-12,top+172+k*12,w+24,6)}
 ctx.restore();
 const a=.55+.45*Math.sin(t*8);ctx.save();ctx.globalAlpha=a;rr(ctx,cx-22,g-10,44,17,5);ctx.fillStyle="#F6C453";ctx.fill();txt(ctx,"⬇ 숙여!",cx,g-1.5,10,C.ink);ctx.restore()};
function alarmItem(ctx,x,y,t){const sh=Math.sin(t*30)*1.6,cx=x+11+sh,cy=y+12;
 ctx.save();ctx.globalAlpha=.35+.2*Math.sin(t*8);ell(ctx,cx,cy,18,18,"#FFE08A");ctx.restore();
 ell(ctx,cx-8,cy-10,5,4,"#E2553C");ell(ctx,cx+8,cy-10,5,4,"#E2553C");
 ell(ctx,cx,cy,11,11,"#E2553C");ell(ctx,cx,cy,8.4,8.4,"#FFFDF8");
 ctx.strokeStyle=C.ink;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx,cy-5.5);ctx.moveTo(cx,cy);ctx.lineTo(cx+4,cy+1);ctx.stroke();
 ctx.fillStyle="#3B3346";ctx.fillRect(cx-8,cy+9,3,4);ctx.fillRect(cx+5,cy+9,3,4);
 ctx.strokeStyle="#F6C453";ctx.lineWidth=1.4;for(const sd of [-1,1]){ctx.beginPath();ctx.arc(cx,cy,15,sd<0?Math.PI*1.05:-.35,sd<0?Math.PI*1.35:-.05);ctx.stroke()}}
/* 「이불 속으로 5분만…」 구간 (꿈) */
function zoneDream(ctx,x0,x1,g,t){const w=x1-x0;
 ctx.fillStyle="rgba(185,166,255,.10)";ctx.fillRect(x0,g-150,w,150);
 rr(ctx,x0+8,g-46,w-16,46,16);ctx.fillStyle="#8C7FC0";ctx.fill();
 rr(ctx,x0+4,g-60,w-8,30,14);ctx.fillStyle="#C9B8F2";ctx.fill();ctx.save();ctx.clip();ctx.fillStyle="rgba(255,255,255,.35)";for(let sx=x0;sx<x1;sx+=26)ctx.fillRect(sx,g-60,10,30);ctx.restore();
 for(let k=0;k<Math.floor((w-40)/120);k++){const px=x0+30+k*120;rr(ctx,px,g-78,58,22,10);ctx.fillStyle="#F4F0FF";ctx.fill()}
 rr(ctx,x0+w/2-80,g-150,160,24,6);ctx.fillStyle="#2B2350";ctx.fill();txt(ctx,"🛏 이불 속으로 5분만…",x0+w/2,g-137.5,12,"#E6DDFF");
 for(let k=0;k<5;k++){const p=((t*.4+k/5)%1);ctx.globalAlpha=Math.max(0,1-p);txt(ctx,k%2?"z":"Z",x0+30+k*(w-60)/4+p*10,g-90-p*40,11+p*8,"#E6DDFF");ctx.globalAlpha=1}}

function obstacle(ctx,type,x,g,w,h,t,i,fri){(DRAW[type]||DRAW.papers)(ctx,x,g,w,h,t,i,fri)}
/* v13: 회식 2차 권유 구간 — 고깃집 가게 앞 (x0~x1 화면 좌표, g = 땅) */
function zoneShop(ctx,x0,x1,g,t,fri){
 const w=x1-x0;
 ctx.fillStyle="rgba(242,140,56,.08)";ctx.fillRect(x0,g-150,w,150);
 rr(ctx,x0+10,g-118,w-20,118,6);ctx.fillStyle="#E9D3B6";ctx.fill();
 ctx.fillStyle="#C8462E";ctx.fillRect(x0+4,g-124,w-8,18);
 ctx.fillStyle="#fff";for(let sx=x0+4;sx<x1-8;sx+=24){ctx.beginPath();ctx.moveTo(sx,g-106);ctx.lineTo(sx+12,g-106);ctx.lineTo(sx+6,g-98);ctx.fill()}
 rr(ctx,x0+w/2-70,g-150,140,24,6);ctx.fillStyle="#3D2C2A";ctx.fill();txt(ctx,fri?"🔥 불금 2차는 고기지":"🍖 회식 2차는 고기지",x0+w/2,g-137.5,12,"#FFD27A");
 for(let k=0;k<Math.floor((w-40)/90);k++){const wx=x0+30+k*90;rr(ctx,wx,g-88,60,44,4);ctx.fillStyle="#FFE9B8";ctx.fill();ctx.strokeStyle="#B88A5A";ctx.lineWidth=1.2;ctx.stroke();
  ell(ctx,wx+30,g-58,14,5,"#6B4A3A");ell(ctx,wx+24,g-60,5,2.4,"#D9785B");ell(ctx,wx+36,g-59,5,2.4,"#D9785B")}
 ctx.strokeStyle="rgba(150,130,110,.35)";ctx.lineWidth=2;ctx.lineCap="round";
 for(let k=0;k<6;k++){const sx=x0+40+k*(w-80)/5,ph=t*2+k;ctx.beginPath();ctx.moveTo(sx,g-96);for(let s=1;s<=6;s++)ctx.lineTo(sx-s*7+Math.sin(ph+s)*4,g-96-s*9);ctx.stroke()}
}
/* 숙인 돌대리: 납작하게 엎드린 모습 */
function duckPose(ctx,x,y,o){pebble(ctx,x,y,Object.assign({},o,{sx:(o.sx||1)*1.24,sy:(o.sy||1)*.44,air:false}))}

/* ================= 아이템 ================= */
function pebbleItem(ctx,x,y,t){const b=Math.sin(t*4+x*.05)*1.5;ell(ctx,x+6,y+6+b,6.5,5.4,"#A8A49E");ell(ctx,x+4.5,y+4.5+b,2.4,1.5,"rgba(255,255,255,.7)")}
function powerItem(ctx,type,x,y,t){const b=Math.sin(t*3.5)*2.5,cx=x+11,cy=y+11+b;
 ctx.save();ctx.globalAlpha=.35+.15*Math.sin(t*6);ell(ctx,cx,cy,16,16,type==="shield"?"#9ED9C3":type==="coffee"?"#F2C28B":"#F6A49A");ctx.restore();
 ell(ctx,cx,cy,12,12,"#fff");ctx.strokeStyle="#E3D3B8";ctx.lineWidth=1.2;ctx.stroke();
 ctx.font=`14px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(type==="coffee"?"☕":type==="shield"?"🛡️":"👟",cx,cy+1)}

/* ================= 도착지 ================= */
const GOAL={
 office(ctx,x,g){ctx.fillStyle="#E9DFCC";ctx.fillRect(x,g-128,96,128);ctx.fillStyle="#CFE3EA";ctx.fillRect(x+8,g-112,38,112);ctx.fillRect(x+50,g-112,38,112);
  ctx.fillStyle="rgba(255,255,255,.55)";ctx.fillRect(x+12,g-108,6,60);ctx.fillRect(x+54,g-108,6,60);ctx.fillStyle="#B9A889";ctx.fillRect(x+40,g-60,3,16);ctx.fillRect(x+53,g-60,3,16);
  rr(ctx,x+24,g-150,48,18,4);ctx.fillStyle="#2FA36B";ctx.fill();txt(ctx,"EXIT 퇴근",x+48,g-140.5,11,"#fff")},
 subway(ctx,x,g){ctx.fillStyle="#D9CDBA";ctx.fillRect(x,g-120,110,120);for(let i=0;i<7;i++){ctx.fillStyle=i%2?"#E3D8C6":"#CFC2AC";ctx.fillRect(x+12+i*4,g-14-i*14,86-i*8,14)}
  ctx.fillStyle="#FFF4CF";ctx.globalAlpha=.6;ctx.fillRect(x+40,g-118,30,18);ctx.globalAlpha=1;
  rr(ctx,x+10,g-150,90,22,5);ctx.fillStyle="#F2C94C";ctx.fill();ell(ctx,x+24,g-139,7,7,"#3FAE5A");txt(ctx,"6",x+24,g-138.6,10,"#fff");txt(ctx,"출구 ↑ 퇴근",x+60,g-138.6,11,C.ink)},
 street(ctx,x,g,t){ctx.fillStyle="#F3E4CC";ctx.fillRect(x,g-92,110,92);ctx.fillStyle="#D9825B";ctx.beginPath();ctx.moveTo(x-12,g-90);ctx.lineTo(x+55,g-140);ctx.lineTo(x+122,g-90);ctx.closePath();ctx.fill();
  ctx.fillStyle="#B9694A";ctx.fillRect(x+80,g-136,12,26);ctx.fillStyle="rgba(255,255,255,.5)";for(let i=0;i<3;i++)ell(ctx,x+86+i*5+Math.sin(t*2+i)*2,g-142-i*9-(t*8%9),4+i,3+i,null),ctx.fill();
  ctx.save();ctx.shadowColor="#FFC86B";ctx.shadowBlur=18;rr(ctx,x+14,g-70,32,26,3);ctx.fillStyle="#FFD98A";ctx.fill();ctx.restore();
  ctx.strokeStyle="#C9A27C";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+30,g-70);ctx.lineTo(x+30,g-44);ctx.moveTo(x+14,g-57);ctx.lineTo(x+46,g-57);ctx.stroke();
  rr(ctx,x+62,g-56,26,56,3);ctx.fillStyle="#9B6A4B";ctx.fill();ell(ctx,x+83,g-28,1.8,1.8,"#F2C94C");
  txt(ctx,"우리 집",x+55,g-104,11,"#fff")},
 friday(ctx,x,g,t){ctx.fillStyle="#E8763E";ctx.beginPath();ctx.moveTo(x,g-90);ctx.lineTo(x+60,g-122);ctx.lineTo(x+120,g-90);ctx.closePath();ctx.fill();
  ctx.fillStyle="rgba(255,190,120,.35)";ctx.fillRect(x+4,g-90,112,90);ctx.strokeStyle="#E8763E";ctx.lineWidth=2;ctx.strokeRect(x+4,g-90,112,90);
  for(let i=0;i<8;i++)ell(ctx,x+10+i*14,g-88+Math.sin(i)*3,2.6,2.6,Math.sin(t*4+i)>0?"#FFE08A":"#FFB86B");
  rr(ctx,x+24,g-116,72,18,5);ctx.fillStyle="#3D2C4A";ctx.fill();txt(ctx,"불금 포차",x+60,g-106.5,11,"#FF9BB8");
  ctx.fillStyle="#C78A5B";ctx.fillRect(x+20,g-30,36,4);ctx.fillRect(x+64,g-30,36,4);ell(ctx,x+38,g-36,5,5,"#F6C453");ell(ctx,x+82,g-36,5,5,"#F0614F")},
};

/* ================= 배경 (반복 타일) ================= */
const TW=880;
const THEME={
 office:{sky:["#F7EFE2","#EFE4D2"],ground:"#E3CFAE",groundTop:"#CDB892",far:.25,mid:.55,
  drawFar(ctx,h,gy){for(let i=0;i<4;i++){const x=40+i*220;ctx.fillStyle="#E6D8C2";ctx.fillRect(x,gy-230,150,150);const gr=ctx.createLinearGradient(0,gy-226,0,gy-84);gr.addColorStop(0,"#FBD9B5");gr.addColorStop(1,"#F7EBDA");ctx.fillStyle=gr;ctx.fillRect(x+6,gy-224,138,138);
    ctx.fillStyle="#EBCBA8";for(let k=0;k<5;k++){const bh=30+((i*7+k*13)%5)*12;ctx.fillRect(x+10+k*27,gy-86-bh,20,bh)}ctx.fillStyle="#E6D8C2";ctx.fillRect(x+73,gy-224,4,138)}
   ell(ctx,190,gy-268,15,15,"#FFFDF8");ctx.strokeStyle="#CDB892";ctx.lineWidth=2;ctx.stroke();ctx.strokeStyle=C.ink;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(190,gy-268);ctx.lineTo(190,gy-279);ctx.moveTo(190,gy-268);ctx.lineTo(190,gy-259);ctx.stroke();
   ctx.fillStyle="#E9DCC6";ctx.fillRect(560,gy-280,120,40);[["#FFE7A3",570],["#F7C6B5",600],["#CFE0E6",630],["#FFE7A3",655]].forEach(([c,xx])=>{ctx.fillStyle=c;ctx.fillRect(xx,gy-274,20,20)});
   for(let i=0;i<4;i++){ctx.fillStyle="rgba(255,250,235,.9)";ctx.fillRect(60+i*220,gy-330,110,6)}
   ctx.fillStyle="#EADFCC";ctx.fillRect(0,0,TW,Math.max(0,gy-372));ctx.fillStyle="#E0D2BA";ctx.fillRect(0,gy-374,TW,4);for(let i=0;i<4;i++){const x=150+i*220;ctx.strokeStyle="#CDB892";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,gy-372);ctx.lineTo(x,gy-356);ctx.stroke()}
   rr(ctx,330,gy-366,200,26,5);ctx.fillStyle="#FFFDF8";ctx.fill();txt(ctx,"이달의 목표 · 전원 칼퇴",430,gy-352.5,13,"#B98E62")},
  drawMid(ctx,h,gy){for(let i=0;i<3;i++){const x=60+i*300;
    ctx.fillStyle="#E8DECF";ctx.fillRect(x-10,gy-70,8,70);ctx.fillStyle="#D9C3A0";ctx.fillRect(x,gy-40,120,7);ctx.fillStyle="#C9B08A";ctx.fillRect(x+6,gy-33,5,33);ctx.fillRect(x+110,gy-33,5,33);
    rr(ctx,x+30,gy-74,46,30,3);ctx.fillStyle="#5A5E6A";ctx.fill();ctx.fillStyle="#DDE6EA";ctx.fillRect(x+33,gy-71,40,24);ctx.fillStyle="#5A5E6A";ctx.fillRect(x+50,gy-44,6,4);
    ctx.fillStyle="#B9814F";ctx.fillRect(x+92,gy-52,14,12);ell(ctx,x+99,gy-60,10,9,"#9DB37E");
    if(i===1){ctx.fillStyle="#E2D6C3";ctx.fillRect(x+170,gy-80,40,80);ctx.fillStyle="#D1C3AD";ctx.fillRect(x+174,gy-74,32,20);ctx.fillRect(x+174,gy-48,32,20)}}}},
 subway:{sky:["#F3EADB","#EDE2CF"],ground:"#D9CFC0",groundTop:"#F2C94C",far:.25,mid:.55,
  drawFar(ctx,h,gy){ctx.strokeStyle="#E4D8C3";ctx.lineWidth=1;for(let y=gy;y>0;y-=22){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(TW,y);ctx.stroke()}for(let x=0;x<TW;x+=44){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,gy);ctx.stroke()}
   for(let i=0;i<2;i++){const x=80+i*440;rr(ctx,x,gy-250,170,40,6);ctx.fillStyle="#FFFDF8";ctx.fill();ell(ctx,x+24,gy-230,13,13,"#3FAE5A");txt(ctx,"2",x+24,gy-229.5,14,"#fff");txt(ctx,"퇴근역",x+92,gy-236,16,C.ink);txt(ctx,"Toegeun",x+92,gy-220,9,"#8B7F70")}
   for(let i=0;i<3;i++){const x=300+i*290;ctx.fillStyle="#E9DCC6";ctx.fillRect(x,gy-200,90,120);ctx.fillStyle=["#F7D6C2","#DCE8E4","#F6E7B8"][i];ctx.fillRect(x+6,gy-194,78,108);txt(ctx,["오늘도 수고","칼퇴 응원","주말까지 D-?"][i],x+45,gy-140,11,"#8B7F70")}
   for(let i=0;i<4;i++){ctx.fillStyle="#E4D7C2";ctx.fillRect(i*220+200,0,26,gy)}},
  drawMid(ctx,h,gy){ctx.fillStyle="#F4EEE3";rr(ctx,20,gy-120,840,92,14);ctx.fill();ctx.fillStyle="#3FAE5A";ctx.fillRect(20,gy-60,840,6);
   for(let i=0;i<9;i++){const x=46+i*92;rr(ctx,x,gy-110,60,36,6);ctx.fillStyle="#DCE7EA";ctx.fill();ctx.fillStyle="rgba(120,110,100,.35)";for(let k=0;k<3;k++){ell(ctx,x+12+k*18,gy-88,5,6,null);ctx.fill();ctx.fillRect(x+7+k*18,gy-82,10,8)}}
   for(let i=0;i<4;i++){ctx.fillStyle="#C9CDD3";ctx.fillRect(110+i*210,gy-118,4,88)}}},
 street:{sky:["#EDB9A9","#FCE3BF"],ground:"#E7D6BE",groundTop:"#CDB89A",far:.18,mid:.5,sun:"#FFD08A",
  drawFar(ctx,h,gy){const r=seeded(11);let x=0;while(x<TW){const w=50+r()*60,bh=60+r()*120;ctx.fillStyle=r()<.5?"#E2B79F":"#D8A893";ctx.fillRect(x,gy-bh,w,bh);
    ctx.fillStyle="#FFE3A3";for(let yy=gy-bh+10;yy<gy-20;yy+=16)for(let xx=x+8;xx<x+w-10;xx+=14)if(r()<.45)ctx.fillRect(xx,yy,6,8);x+=w+4}},
  drawMid(ctx,h,gy){for(let i=0;i<4;i++){const x=40+i*220;ctx.fillStyle="#8B7F78";ctx.fillRect(x,gy-110,4,110);ctx.fillRect(x,gy-110,20,4);
    ctx.save();ctx.shadowColor="#FFD58A";ctx.shadowBlur=14;ell(ctx,x+20,gy-104,6,4,"#FFE7B0");ctx.restore();
    ell(ctx,x+120,gy-56,26,24,"#C9B98F");ctx.fillStyle="#9B7A5E";ctx.fillRect(x+117,gy-36,6,36);
    if(i%2===0){ctx.fillStyle="#F3E4CC";ctx.fillRect(x+150,gy-70,60,70);ctx.fillStyle="#E28B6A";for(let k=0;k<5;k++)ctx.fillRect(x+150+k*12,gy-72,12,10);ctx.fillStyle="#FFE3A3";ctx.fillRect(x+158,gy-50,20,18)}}}},
 friday:{sky:["#3D2C4A","#E07A5F"],ground:"#5A4A55",groundTop:"#7A6470",far:.2,mid:.5,night:1,
  drawFar(ctx,h,gy){const r=seeded(23);for(let i=0;i<30;i++){ctx.fillStyle="rgba(255,240,220,"+(0.3+r()*.5)+")";ctx.fillRect(r()*TW,r()*(gy-200),1.6,1.6)}
   let x=0;while(x<TW){const w=50+r()*60,bh=70+r()*130;ctx.fillStyle="#4A3557";ctx.fillRect(x,gy-bh,w,bh);ctx.fillStyle="#FFCF7A";for(let yy=gy-bh+10;yy<gy-20;yy+=16)for(let xx=x+8;xx<x+w-10;xx+=14)if(r()<.4)ctx.fillRect(xx,yy,6,8);x+=w+4}
   [["불금","#FF7FA8",120],["치킨","#FFB061",420],["노래방","#7FD8FF",700]].forEach(([s,c,xx])=>{ctx.save();ctx.shadowColor=c;ctx.shadowBlur=12;rr(ctx,xx,gy-210,70,26,6);ctx.strokeStyle=c;ctx.lineWidth=2;ctx.stroke();txt(ctx,s,xx+35,gy-196.5,14,c);ctx.restore()})},
  drawMid(ctx,h,gy){ctx.strokeStyle="#2B2030";ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<=TW;x+=110){ctx.moveTo(x,gy-130);ctx.quadraticCurveTo(x+55,gy-112,x+110,gy-130)}ctx.stroke();
   for(let x=0;x<TW;x+=22){const y=gy-130+Math.sin((x%110)/110*Math.PI)*14;ell(ctx,x+11,y+4,3,3.4,x%44?"#FFE08A":"#FF9BB8")}
   for(let i=0;i<2;i++){const x=150+i*440;ctx.fillStyle="#E8763E";ctx.beginPath();ctx.moveTo(x,gy-70);ctx.lineTo(x+50,gy-92);ctx.lineTo(x+100,gy-70);ctx.fill();ctx.fillStyle="rgba(255,180,110,.3)";ctx.fillRect(x+4,gy-70,92,70)}}},
};
GOAL.dream=function(ctx,x,g,t){const sh=Math.sin(t*28)*2.4,cx=x+55+sh,cy=g-70;
 ctx.save();ctx.globalAlpha=.3+.15*Math.sin(t*6);ell(ctx,cx,cy,70,70,"#FFE08A");ctx.restore();
 ell(ctx,cx-30,cy-40,16,13,"#E2553C");ell(ctx,cx+30,cy-40,16,13,"#E2553C");ctx.fillStyle="#3B3346";ctx.fillRect(cx-3,cy-62,6,12);
 ell(ctx,cx,cy,46,46,"#E2553C");ell(ctx,cx,cy,38,38,"#FFFDF8");
 ctx.strokeStyle=C.ink;ctx.lineWidth=4;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx,cy-24);ctx.moveTo(cx,cy);ctx.lineTo(cx+16,cy+4);ctx.stroke();
 ctx.fillStyle="#3B3346";ctx.fillRect(cx-30,cy+40,8,22);ctx.fillRect(cx+22,cy+40,8,22);
 ctx.strokeStyle="#F6C453";ctx.lineWidth=3;for(const sd of [-1,1])for(const r of [56,66]){ctx.beginPath();ctx.arc(cx,cy,r,sd<0?Math.PI*1.05:-.4,sd<0?Math.PI*1.4:-.05);ctx.stroke()}
 txt(ctx,"띠리링! 기상!",cx,cy-82,13,"#FFE08A")};
THEME.dream={sky:["#1F1A3D","#4B3F86"],ground:"#6A5AA8",groundTop:"#B9A6FF",far:.15,mid:.45,night:1,sun:"#FFF1C2",
 drawFar(ctx,h,gy){const r=seeded(41);for(let i=0;i<60;i++){ctx.fillStyle="rgba(255,250,235,"+(0.25+r()*.6)+")";const s=r()<.15?2.4:1.4;ctx.fillRect(r()*TW,r()*(gy-60),s,s)}
  for(let i=0;i<5;i++){const x=40+i*180,y=gy-200+(i%2)*60;ctx.fillStyle="rgba(201,191,240,.18)";for(const [dx,dy,rr_] of [[0,0,26],[26,-8,32],[56,0,24]])ell(ctx,x+dx,y+dy,rr_,rr_*.7,null),ctx.fill()}
  ctx.save();ctx.globalAlpha=.55;[[120,"09:00"],[430,"23:59"],[730,"03:00"]].forEach(([xx,s],k)=>{ell(ctx,xx,gy-120-k*20,22,22,"#E6DDFF");txt(ctx,s,xx,gy-120-k*20,9,"#4B3F86")});ctx.restore()},
 drawMid(ctx,h,gy){for(let i=0;i<3;i++){const x=80+i*300,fy=gy-70-Math.sin(i*2)*20;
   ctx.save();ctx.globalAlpha=.75;ctx.translate(x,fy);ctx.rotate((i-1)*.12);
   ctx.fillStyle="#8C7FC0";ctx.fillRect(-50,0,100,6);ctx.fillRect(-44,6,5,26);ctx.fillRect(39,6,5,26);
   rr(ctx,-20,-28,40,26,3);ctx.fillStyle="#3B3346";ctx.fill();ctx.fillStyle="#9FD0F0";ctx.fillRect(-17,-25,34,20);
   ctx.restore();ell(ctx,x,gy-14,60,8,"rgba(185,166,255,.25)")}
  for(let i=0;i<4;i++){const x=180+i*220;ctx.fillStyle="rgba(230,221,255,.55)";for(const [dx,rr_] of [[0,18],[22,24],[46,16]]){ell(ctx,x+dx,gy-4,rr_,rr_*.55,null);ctx.fill()}}}};
function layers(theme,h,gy,scale){
 const T=THEME[theme];
 return {T,
  sky:off(TW,h,scale,ctx=>{const g=ctx.createLinearGradient(0,0,0,gy);g.addColorStop(0,T.sky[0]);g.addColorStop(1,T.sky[1]);ctx.fillStyle=g;ctx.fillRect(0,0,TW,h);
   if(T.sun){ctx.save();ctx.shadowColor=T.sun;ctx.shadowBlur=30;ell(ctx,TW*.7,gy-150,26,26,T.sun);ctx.restore()}}),
  far:off(TW,gy,scale,ctx=>T.drawFar(ctx,h,gy)),
  mid:off(TW,gy,scale,ctx=>T.drawMid(ctx,h,gy)),
  ground:off(TW,h-gy,scale,ctx=>{ctx.fillStyle=T.ground;ctx.fillRect(0,0,TW,h-gy);ctx.fillStyle=T.groundTop;ctx.fillRect(0,0,TW,4);
   if(theme==="office"){ctx.strokeStyle="#D6BE97";ctx.lineWidth=1;for(let x=0;x<TW;x+=60){ctx.beginPath();ctx.moveTo(x,4);ctx.lineTo(x,h-gy);ctx.stroke()}for(let y=20;y<h-gy;y+=18){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(TW,y);ctx.stroke()}}
   if(theme==="subway"){ctx.fillStyle="#E4BA3E";for(let x=4;x<TW;x+=8)ell(ctx,x,2,1.3,1.3,null),ctx.fill();ctx.fillStyle="#CFC4B3";for(let x=0;x<TW;x+=110)ctx.fillRect(x,10,1,h-gy)}
   if(theme==="street"){ctx.fillStyle="#A39A93";ctx.fillRect(0,22,TW,h-gy-22);ctx.fillStyle="#F7F1E6";for(let k=0;k<7;k++)ctx.fillRect(500+k*20,26,11,h-gy-30);ctx.fillStyle="#E8DCC6";for(let x=0;x<TW;x+=40)ctx.fillRect(x,6,38,14)}
   if(theme==="friday"){ctx.fillStyle="#FFE08A";for(let x=0;x<TW;x+=80)ctx.fillRect(x,30,40,3)}})};
}

/* ================= 엔딩: 소파에서 쉬는 돌대리 ================= */
function ending(ctx,W,H,t){
 const fy=Math.round(H*.74);
 const g=ctx.createLinearGradient(0,0,0,fy);g.addColorStop(0,"#F3DDBB");g.addColorStop(1,"#F6E6CC");ctx.fillStyle=g;ctx.fillRect(0,0,W,fy);
 ctx.fillStyle="#E9D2AE";ctx.fillRect(0,fy-26,W,26);ctx.fillStyle="#D9B88D";ctx.fillRect(0,fy,W,H-fy);ctx.fillStyle="#CFA97B";for(let x=0;x<W;x+=46)ctx.fillRect(x,fy,1.2,H-fy);
 const cx=W/2;
 /* 창문 + 달 */
 const wx=cx-160,wy=fy-250;rr(ctx,wx,wy,110,120,6);ctx.fillStyle="#3D3552";ctx.fill();ell(ctx,wx+76,wy+30,11,11,"#FFF1C2");ell(ctx,wx+81,wy+26,10,10,"#3D3552");
 ctx.fillStyle="rgba(255,240,210,.85)";[[14,20],[40,70],[22,96],[90,90],[60,40],[96,60]].forEach(([a,b])=>ctx.fillRect(wx+a,wy+b,1.8,1.8));
 ctx.strokeStyle="#C9A27C";ctx.lineWidth=4;ctx.strokeRect(wx,wy,110,120);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(wx+55,wy);ctx.lineTo(wx+55,wy+120);ctx.stroke();
 ctx.fillStyle="#E7B9A0";ctx.fillRect(wx-12,wy-8,20,140);ctx.fillRect(wx+102,wy-8,20,140);
 /* 액자 */
 rr(ctx,cx+30,fy-240,70,52,4);ctx.fillStyle="#FFFDF8";ctx.fill();ctx.strokeStyle="#C9A27C";ctx.lineWidth=3;ctx.stroke();txt(ctx,"칼퇴",cx+65,fy-214,16,"#D9825B");
 /* 옷걸이에 걸린 사원증 */
 const hx=cx-10,hy=fy-232;ctx.fillStyle="#B98E62";ctx.fillRect(hx-4,hy-3,8,6);ctx.strokeStyle=C.blue;ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(hx-9,hy+2);ctx.lineTo(hx,hy+24);ctx.lineTo(hx+9,hy+2);ctx.stroke();
 rr(ctx,hx-8,hy+22,16,20,2);ctx.fillStyle="#fff";ctx.fill();ctx.lineWidth=1.2;ctx.stroke();ctx.fillStyle=C.blue;ctx.fillRect(hx-6,hy+25,12,4);ctx.fillStyle="#C7CDD8";ctx.fillRect(hx-6,hy+32,10,1.5);ctx.fillRect(hx-6,hy+35,7,1.5);
 txt(ctx,"오늘은 여기까지",hx,hy+54,9,"#A89A87");
 /* 스탠드 */
 const lx=cx+150;ctx.save();ctx.globalAlpha=.28+.05*Math.sin(t*2);const lg=ctx.createRadialGradient(lx,fy-110,4,lx,fy-110,90);lg.addColorStop(0,"#FFE2A0");lg.addColorStop(1,"rgba(255,226,160,0)");ctx.fillStyle=lg;ctx.fillRect(lx-90,fy-200,180,180);ctx.restore();
 ctx.fillStyle="#8B6A4E";ctx.fillRect(lx-2,fy-110,4,110);ctx.fillRect(lx-12,fy-4,24,4);ctx.fillStyle="#F3D7A6";ctx.beginPath();ctx.moveTo(lx-17,fy-110);ctx.lineTo(lx+17,fy-110);ctx.lineTo(lx+11,fy-134);ctx.lineTo(lx-11,fy-134);ctx.fill();
 /* 소파 */
 const sx=cx-14,sy=fy+6;
 rr(ctx,sx-120,sy-96,240,60,20);ctx.fillStyle="#D98A6C";ctx.fill();
 rr(ctx,sx-128,sy-50,256,44,16);ctx.fillStyle="#E59A7C";ctx.fill();
 rr(ctx,sx-140,sy-74,32,70,14);ctx.fillStyle="#CF7E61";ctx.fill();rr(ctx,sx+108,sy-74,32,70,14);ctx.fill();
 ctx.fillStyle="#8B6A4E";ctx.fillRect(sx-118,sy-6,8,10);ctx.fillRect(sx+110,sy-6,8,10);
 rr(ctx,sx-110,sy-74,46,26,12);ctx.fillStyle="#FFF4E0";ctx.fill();
 /* 누운 돌대리 (숨쉬기) */
 const br=1+Math.sin(t*2)*.025;
 ctx.save();ctx.translate(sx-62,sy-62);ctx.rotate(-Math.PI/2);ctx.scale(br,br);
 pebble(ctx,0,0,{mood:"sleep",air:1,badge:false,scale:1.3,res:3,noLimbs:1});ctx.restore();
 /* 담요 */
 ctx.save();rr(ctx,sx-58,sy-84,128,40,16);ctx.fillStyle="#9DB3D8";ctx.fill();ctx.clip();ctx.fillStyle="rgba(255,255,255,.35)";for(let i=0;i<7;i++)ctx.fillRect(sx-52+i*20,sy-84,8,40);ctx.restore();
 ell(ctx,sx+76,sy-62,8,6,"#F2EEE8");ell(ctx,sx+82,sy-56,8,6,"#E8E2D9");
 /* Zz */
 for(let i=0;i<3;i++){const p=((t*.45+i/3)%1);ctx.globalAlpha=Math.max(0,1-p);txt(ctx,i%2?"z":"Z",sx-70+p*24,sy-112-p*56,13+p*12,"#8B7F70");ctx.globalAlpha=1}
 /* 간식 + 러그 */
 ell(ctx,cx,fy+40,W*.38,12,"#E7C9A0");
 rr(ctx,sx+150,sy-40,40,26,4);ctx.fillStyle="#C78A5B";ctx.fill();ell(ctx,sx+170,sy-44,14,5,"#F6E3C6");ell(ctx,sx+170,sy-47,11,4,"#F2C26B");
}

/* 뒤에서 쫓아오는 팀장 (오른쪽을 보고 달림) */
function chaser(ctx,x,g,t,near,fri,dream){
 ctx.save();ctx.translate(x+12,0);ctx.scale(-1,1);ctx.translate(-(x+12),0);
 person(ctx,x,g,24,58,{coat:dream?"#4B3F86":fri?"#6B4A5A":"#3D4A6B",shirt:1,glasses:!fri,brow:1,blush:fri,walk:1,t:t*1.6});
 ctx.restore();
 ell(ctx,x+12,g+1,13,3,"rgba(74,63,53,.18)");
 const k=Math.floor(t/2.6)%3;
 const b=dream?(near?["꿈에서도 보고서!","자면서 일하면 되잖아?","야근은 꿈에서도!"]:["어디 가, 꿈인데~","아직 퇴근 아니야~","5분만 회의~"])[k]:(near?(fri?["한 잔만 하고 가!","2차 가자~!","노래방 예약했어!"]:["거기 서! 회의합시다!","보고서는?!","칼퇴는 안 돼~!"]):(fri?["딱 한 잔만~","어디 가~?","불금인데~"]:["잠깐 얘기 좀…","어디 가~?","내일 일찍 와~"]))[k];
 ctx.font=`11px ${FONT}`;const bw=ctx.measureText(b).width+12;bubble(ctx,Math.max(x+20,bw/2+4),g-66,b);
}
window.TG_RUNNER_ART={alarmItem,zoneDream,C,FONT,chaser,dizzy,rr,ell,txt,off,pebble,bodySprite,obstacle,pebbleItem,powerItem,GOAL,THEME,TW,layers,ending,zoneShop,duckPose};
})();
