/* 퇴근중 · 돌마을 지도 (v9)
   동네 탭의 걸어 다니는 마을. 지도 그림과 건물 위치만 담당하고, 이동·입장은 index.html이 맡아요.
   좌표는 360 × 560 마을 단위. door = 들어가기가 뜨는 문 앞 위치, hit = 눌러서 그 건물로 걸어가는 영역 */
(function(){
"use strict";
const W=360,H=560;
const PLACES=[
 {id:"meeting",  kind:"space", emoji:"🪑",name:"회의실",  door:{x:90, y:156},hit:{x:36, y:58, w:110,h:98}},
 {id:"pantry",   kind:"space", emoji:"☕",name:"탕비실",  door:{x:270,y:156},hit:{x:214,y:74, w:112,h:82}},
 {id:"board",    kind:"board", emoji:"📋",name:"마을 게시판",door:{x:180,y:270},hit:{x:142,y:212,w:76, h:58}},
 {id:"toilet",   kind:"space", emoji:"🚽",name:"화장실",  door:{x:62, y:342},hit:{x:32, y:278,w:62, h:64}},
 {id:"cafeteria",kind:"space", emoji:"🍚",name:"구내식당",door:{x:290,y:342},hit:{x:232,y:268,w:116,h:74}},
 {id:"mail",     kind:"inbox", emoji:"📮",name:"우체통",  door:{x:122,y:420},hit:{x:104,y:372,w:36, h:48}},
 {id:"commute",  kind:"space", emoji:"🚪",name:"퇴근길",  door:{x:180,y:520},hit:{x:128,y:470,w:104,h:56}},
];
const SPAWN={x:180,y:420};
const BOUNDS={x0:14,x1:346,y0:150,y1:548};

const C={grass:"#A9D98B",grass2:"#97CD78",grass3:"#BDE4A2",path:"#EEDDB0",path2:"#E2CC97",water:"#9ED9EC",water2:"#7FC6DE",
 tree:"#6DBE5A",tree2:"#4F9F45",trunk:"#9C6B4A",wood:"#B98A5E",wood2:"#8E6440",cream:"#FFF7E6",ink:"#4A3B2C",
 office:"#7FB2E5",office2:"#5B90C7",cafe:"#F6B3C3",cafe2:"#E98AA3",rest:"#E8836A",rest2:"#C9654D",hut:"#D7AE82",hut2:"#B98C60",
 red:"#E35D5D",yellow:"#F6C34A",flower1:"#FFB3C7",flower2:"#FFF2A6",flower3:"#C9B6FF",win:"#FFF4CF"};
const tree=(x,y,s)=>{s=s||1;return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="26" rx="16" ry="5" fill="#000" opacity=".10"/><rect x="-3" y="10" width="6" height="16" rx="2" fill="${C.trunk}"/><circle cx="0" cy="0" r="17" fill="${C.tree2}"/><circle cx="-6" cy="-5" r="12" fill="${C.tree}"/><circle cx="7" cy="-2" r="11" fill="${C.tree}"/><circle cx="-2" cy="-9" r="4" fill="#fff" opacity=".25"/></g>`};
const flowers=(x,y,c)=>`<g transform="translate(${x} ${y})"><circle r="2.6" fill="${c}"/><circle cx="6" cy="3" r="2.4" fill="${c}"/><circle cx="2" cy="7" r="2.6" fill="${c}"/><circle r="1" fill="#fff8" /></g>`;
const plaque=(x,y,t,w)=>{w=w||t.length*11+18;return `<g transform="translate(${x-w/2} ${y})"><rect width="${w}" height="18" rx="6" fill="${C.cream}" stroke="${C.wood2}" stroke-width="1.5"/><text x="${w/2}" y="13" text-anchor="middle" font-size="11" fill="${C.ink}" font-family="Jua, sans-serif">${t}</text></g>`};

function svg(hour){
 hour=hour==null?new Date().getHours():hour;
 const tint=hour>=19||hour<6?"rgba(40,50,110,.38)":hour>=17?"rgba(255,140,60,.16)":null;
 let s=`<svg viewBox="0 0 ${W} ${H}" class="vmap" aria-hidden="true" preserveAspectRatio="xMidYMid slice">`;
 /* 땅 */
 s+=`<rect width="${W}" height="${H}" fill="${C.grass}"/>`;
 [[60,110,50,18],[300,250,46,16],[90,480,60,20],[250,420,30,10],[30,260,36,12],[320,500,40,14]].forEach(([x,y,rx,ry])=>s+=`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${C.grass2}"/>`);
 [[150,95],[230,215],[110,390],[330,380],[60,530],[210,470]].forEach(([x,y])=>s+=`<path d="M${x} ${y}l3 -6l3 6M${x+8} ${y}l3 -7l3 7" stroke="${C.grass3}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`);
 /* 연못 */
 s+=`<ellipse cx="292" cy="430" rx="44" ry="24" fill="${C.water2}"/><ellipse cx="292" cy="427" rx="40" ry="20" fill="${C.water}"/><ellipse cx="280" cy="422" rx="10" ry="3" fill="#fff" opacity=".5"/><ellipse cx="306" cy="436" rx="7" ry="4" fill="#7CC36A"/>`;
 /* 길 */
 s+=`<g fill="${C.path}" stroke="${C.path2}" stroke-width="2"><rect x="60" y="150" width="240" height="22" rx="11"/><rect x="168" y="150" width="24" height="410"/><circle cx="180" cy="262" r="50"/><rect x="50" y="332" width="260" height="20" rx="10"/><rect x="112" y="406" width="70" height="18" rx="9"/></g>`;
 s+=`<g fill="${C.path}"><rect x="62" y="152" width="236" height="18" rx="9"/><rect x="170" y="152" width="20" height="408"/><circle cx="180" cy="262" r="48"/><rect x="52" y="334" width="256" height="16" rx="8"/><rect x="114" y="408" width="66" height="14" rx="7"/></g>`;
 [[176,190],[186,300],[175,380],[184,450],[178,510],[120,160],[240,162],[110,342],[250,340]].forEach(([x,y])=>s+=`<circle cx="${x}" cy="${y}" r="2" fill="${C.path2}"/>`);
 /* 나무·꽃 (뒤쪽) */
 [[20,40,1],[70,30,.9],[200,40,.95],[330,40,1],[160,58,.8],[18,200,1],[338,220,1],[18,420,.95],[340,330,.85]].forEach(([x,y,k])=>s+=tree(x,y,k));
 [[120,230,C.flower1],[226,222,C.flower2],[40,380,C.flower3],[330,470,C.flower1],[140,500,C.flower2],[250,500,C.flower3],[110,120,C.flower1],[250,120,C.flower2]].forEach(([x,y,c])=>s+=flowers(x,y,c));
 /* 회의실: 파란 지붕 사무동 */
 s+=`<g><ellipse cx="90" cy="156" rx="52" ry="7" fill="#000" opacity=".10"/><rect x="44" y="92" width="92" height="62" rx="6" fill="${C.cream}" stroke="${C.wood2}" stroke-width="1.5"/>
  <path d="M36 96 L90 58 L144 96 Z" fill="${C.office}" stroke="${C.office2}" stroke-width="2" stroke-linejoin="round"/>
  <rect x="56" y="104" width="18" height="16" rx="3" fill="${C.win}" stroke="${C.wood2}"/><rect x="106" y="104" width="18" height="16" rx="3" fill="${C.win}" stroke="${C.wood2}"/>
  <rect x="80" y="126" width="20" height="28" rx="8" fill="${C.office2}"/><circle cx="96" cy="141" r="1.6" fill="${C.yellow}"/></g>`;
 s+=plaque(90,64,"🪑 회의실",76);
 /* 탕비실: 분홍 차양 카페 */
 s+=`<g><ellipse cx="270" cy="156" rx="54" ry="7" fill="#000" opacity=".10"/><rect x="222" y="100" width="96" height="54" rx="6" fill="${C.cream}" stroke="${C.wood2}" stroke-width="1.5"/>
  <path d="M216 100 h108 v-14 a8 8 0 0 0 -8 -8 h-92 a8 8 0 0 0 -8 8z" fill="${C.cafe2}"/>
  ${[0,1,2,3,4,5].map(i=>`<path d="M${216+i*18} 100 q9 10 18 0" fill="${i%2?C.cafe:"#fff"}"/>`).join("")}
  <rect x="232" y="114" width="22" height="18" rx="3" fill="${C.win}" stroke="${C.wood2}"/><rect x="286" y="114" width="22" height="18" rx="3" fill="${C.win}" stroke="${C.wood2}"/>
  <rect x="260" y="124" width="20" height="30" rx="8" fill="${C.cafe2}"/><path d="M296 92 q3 -8 0 -12" stroke="#fff" stroke-width="2" fill="none" opacity=".8"/></g>`;
 s+=plaque(270,66,"☕ 탕비실",76);
 /* 마을 게시판 */
 s+=`<g><ellipse cx="180" cy="268" rx="36" ry="6" fill="#000" opacity=".10"/><rect x="152" y="234" width="6" height="34" fill="${C.wood2}"/><rect x="202" y="234" width="6" height="34" fill="${C.wood2}"/>
  <rect x="146" y="216" width="68" height="36" rx="5" fill="${C.wood}" stroke="${C.wood2}" stroke-width="2"/>
  <rect x="152" y="222" width="20" height="14" fill="${C.cream}" transform="rotate(-4 162 229)"/><rect x="176" y="221" width="16" height="18" fill="#FFE3A3" transform="rotate(3 184 230)"/><rect x="196" y="224" width="14" height="12" fill="#CFE7FF"/>
  <circle cx="162" cy="223" r="1.6" fill="${C.red}"/><circle cx="184" cy="222" r="1.6" fill="${C.red}"/><circle cx="203" cy="225" r="1.6" fill="${C.red}"/></g>`;
 s+=plaque(180,196,"📋 마을 게시판",96);
 /* 화장실: 작은 오두막 */
 s+=`<g><ellipse cx="62" cy="342" rx="30" ry="6" fill="#000" opacity=".10"/><rect x="38" y="296" width="48" height="44" rx="5" fill="${C.hut}" stroke="${C.hut2}" stroke-width="2"/>
  <path d="M32 300 L62 278 L92 300 Z" fill="${C.hut2}" stroke-linejoin="round"/>
  <rect x="50" y="306" width="24" height="34" rx="4" fill="${C.wood2}"/><path d="M60 314 a5 5 0 1 0 6 6 a4 4 0 1 1 -6 -6z" fill="${C.yellow}"/></g>`;
 s+=plaque(62,262,"🚽 화장실",74);
 /* 구내식당: 빨간 지붕 식당 */
 s+=`<g><ellipse cx="290" cy="342" rx="56" ry="7" fill="#000" opacity=".10"/><rect x="240" y="292" width="100" height="48" rx="6" fill="${C.cream}" stroke="${C.wood2}" stroke-width="1.5"/>
  <path d="M232 296 L290 266 L348 296 Z" fill="${C.rest}" stroke="${C.rest2}" stroke-width="2" stroke-linejoin="round"/>
  <rect x="250" y="304" width="22" height="16" rx="3" fill="${C.win}" stroke="${C.wood2}"/><rect x="308" y="304" width="22" height="16" rx="3" fill="${C.win}" stroke="${C.wood2}"/>
  <rect x="280" y="312" width="20" height="28" rx="8" fill="${C.rest2}"/><circle cx="324" cy="282" r="7" fill="#fff"/><text x="324" y="286" text-anchor="middle" font-size="9">🍚</text></g>`;
 s+=plaque(290,250,"🍚 구내식당",86);
 /* 우체통 */
 s+=`<g><ellipse cx="122" cy="420" rx="14" ry="4" fill="#000" opacity=".12"/><rect x="119" y="396" width="6" height="24" fill="${C.wood2}"/><rect x="108" y="376" width="28" height="24" rx="8" fill="${C.red}" stroke="#B94343" stroke-width="2"/><rect x="114" y="384" width="16" height="3" rx="1.5" fill="#7A2B2B"/><path d="M136 380 v-8 h7 v5 z" fill="${C.yellow}"/></g>`;
 s+=plaque(122,356,"📮 우체통",72);
 /* 퇴근길: 정류장 아치 */
 s+=`<g><rect x="134" y="476" width="8" height="52" rx="3" fill="${C.wood2}"/><rect x="218" y="476" width="8" height="52" rx="3" fill="${C.wood2}"/>
  <path d="M130 484 Q180 452 230 484" stroke="${C.wood}" stroke-width="10" fill="none" stroke-linecap="round"/>
  <rect x="146" y="460" width="68" height="20" rx="6" fill="${C.yellow}" stroke="${C.wood2}" stroke-width="1.5"/><text x="180" y="474" text-anchor="middle" font-size="12" fill="${C.ink}" font-family="Jua, sans-serif">🚪 퇴근길</text>
  <rect x="236" y="500" width="22" height="16" rx="4" fill="#5B90C7"/><text x="247" y="511" text-anchor="middle" font-size="8" fill="#fff" font-family="Jua, sans-serif">BUS</text><rect x="245" y="516" width="4" height="12" fill="${C.wood2}"/></g>`;
 /* 앞쪽 나무 */
 [[34,500,1.05],[330,540,1],[100,548,.9],[262,548,.9]].forEach(([x,y,k])=>s+=tree(x,y,k));
 if(tint)s+=`<rect width="${W}" height="${H}" fill="${tint}"/>`;
 if(hour>=19||hour<6)[[60,80],[150,40],[300,90],[230,30],[330,170]].forEach(([x,y])=>s+=`<circle cx="${x}" cy="${y}" r="1.6" fill="#FFF8D6"/>`);
 return s+`</svg>`;
}
window.TG_VILLAGE={W,H,PLACES,SPAWN,BOUNDS,svg};
})();
