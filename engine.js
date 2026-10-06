const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const W=canvas.width,H=canvas.height;

const screens={
 menu:document.getElementById("menu"),
 levels:document.getElementById("levels"),
 icons:document.getElementById("icons"),
 editor:document.getElementById("editor")
};
const hud=document.getElementById("hud"), progress=document.getElementById("progress");
const editorHud=document.getElementById("editorHud"), selectedTool=document.getElementById("selectedTool");

let mode="menu",currentLevel=null,cameraX=0,cameraY=0,editorZoom=1;
let jumpQueued=false,mouseDown=false,selectedToolName="block";
let iconIndex=0;

const icons=["🟩","🟦","🟨","🟪","🟥","🟧","⬜","🔷"];
const player={
 x:100,y:350,vx:300,vy:0,size:32,grounded:false,
 gravity:1,gameMode:"cube",rotation:0,dead:false,won:false
};

const PH={
 gravity:1750,jump:-610,run:300,shipGravity:900,shipThrust:-1150,
 waveSpeed:360,ufoJump:-470,ballGravity:1,fixed:1/120
};

function rect(x,y,w,h){return{x,y,w,h}}
function clone(o){return JSON.parse(JSON.stringify(o))}

function makeLevel(name,theme,objects,finish=4000){
 return {name,theme,objects,finish};
}

const levels=[
 makeLevel("Stereo Sprint","#152b48",[
  rect(0,450,4500,90),rect(650,400,120,50),rect(1050,360,120,50),
  rect(1550,390,160,60),rect(2200,350,180,100),rect(2800,400,160,50)
 ]),
 makeLevel("Portal Practice","#2b183d",[
  rect(0,450,5000,90),
  {type:"spike",x:500,y:416,s:34},{type:"spike",x:540,y:416,s:34},
  {type:"pad",x:900,y:410,w:45,h:12},
  {type:"gravity",x:1300,y:370,w:35,h:80,gravity:-1},
  rect(1450,100,700,45),{type:"gravity",x:2100,y:100,w:35,h:80,gravity:1},
  {type:"mirror",x:2450,y:300,w:35,h:80,flip:1},
  {type:"portal",x:2850,y:380,w:35,h:80,mode:"ship"},
  rect(3300,300,1000,30)
 ]),
 makeLevel("Skybound","#102d2c",[
  rect(0,450,500,90),{type:"portal",x:500,y:370,w:35,h:80,mode:"ship"},
  {type:"spike",x:1000,y:360,s:34},{type:"spike",x:1400,y:300,s:34},
  {type:"portal",x:1800,y:250,w:35,h:80,mode:"wave"},
  rect(2100,100,500,30),rect(2100,410,500,30),
  {type:"portal",x:2700,y:250,w:35,h:80,mode:"cube"},
  rect(2800,450,2200,90)
 ]),
 makeLevel("Gravity Lab","#352514",[
  rect(0,450,6000,90),
  {type:"gravity",x:700,y:370,w:35,h:80,gravity:-1},
  {type:"gravity",x:1400,y:90,w:35,h:80,gravity:1},
  {type:"gravity",x:2100,y:370,w:35,h:80,gravity:-1},
  {type:"portal",x:2800,y:370,w:35,h:80,mode:"ball"},
  {type:"portal",x:3500,y:370,w:35,h:80,mode:"ufo"},
  {type:"spike",x:4200,y:416,s:34}
 ])
];

let editorObjects=[
 rect(0,450,4000,90),
 {type:"spike",x:500,y:416,s:34},
 {type:"pad",x:750,y:410,w:45,h:12},
 {type:"gravity",x:1100,y:370,w:35,h:80,gravity:-1},
 {type:"portal",x:1450,y:370,w:35,h:80,mode:"ship"}
];

function show(name){
 Object.values(screens).forEach(s=>s.classList.add("hidden"));
 if(name) screens[name].classList.remove("hidden");
 hud.classList.add("hidden");editorHud.classList.add("hidden");
 mode=name;
}

document.getElementById("playBtn").onclick=()=>{
 buildLevelButtons();show("levels");
};
document.getElementById("editorBtn").onclick=()=>{
 buildEditorTools();show("editor");
};
document.getElementById("iconBtn").onclick=()=>{
 buildIcons();show("icons");
};
document.querySelectorAll(".backBtn").forEach(b=>b.onclick=()=>show("menu"));

function buildLevelButtons(){
 const box=document.getElementById("levelButtons");box.innerHTML="";
 levels.forEach((l,i)=>{
  const b=document.createElement("button");b.textContent=`${i+1}. ${l.name}`;
  b.onclick=()=>startLevel(l);box.appendChild(b);
 });
}

function buildIcons(){
 const box=document.getElementById("iconGrid");box.innerHTML="";
 icons.forEach((ic,i)=>{
  const b=document.createElement("button");b.textContent=ic;
  b.onclick=()=>{iconIndex=i;};
  box.appendChild(b);
 });
}

const tools=[
 ["block","Block"],["spike","Spike"],["pad","Jump Pad"],
 ["gravity","Gravity Portal"],["mirror","Mirror Portal"],
 ["portal","Gamemode Portal"]
];

function buildEditorTools(){
 const box=document.getElementById("editorTools");box.innerHTML="";
 tools.forEach(([id,label])=>{
  const b=document.createElement("button");b.textContent=label;
  b.onclick=()=>{selectedToolName=id;selectedTool.textContent="Tool: "+label};
  box.appendChild(b);
 });
}

document.getElementById("testEditor").onclick=()=>{
 currentLevel=makeLevel("Custom","#182844",clone(editorObjects),4500);
 startLevel(currentLevel);
};
document.getElementById("clearEditor").onclick=()=>editorObjects=[];
document.getElementById("saveEditor").onclick=()=>{
 const blob=new Blob([JSON.stringify(editorObjects,null,2)],{type:"application/json"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);
 a.download="custom-level.json";a.click();
};

document.getElementById("menuBtn").onclick=()=>{resetPlayer();show("menu")};

function startLevel(level){
 currentLevel=level;mode="play";
 resetPlayer();
 screens.menu.classList.add("hidden");screens.levels.classList.add("hidden");
 screens.icons.classList.add("hidden");screens.editor.classList.add("hidden");
 hud.classList.remove("hidden");
}

function resetPlayer(){
 player.x=100;player.y=400;player.vx=PH.run;player.vy=0;
 player.grounded=false;player.gravity=1;player.gameMode="cube";
 player.rotation=0;player.dead=false;player.won=false;
 cameraX=0;cameraY=0;jumpQueued=false;
}

function queueJump(){if(mode==="play"&&!player.dead&&!player.won)jumpQueued=true}
window.onkeydown=e=>{
 if(e.code==="Space"||e.code==="ArrowUp"||e.code==="KeyW"){e.preventDefault();queueJump()}
 if(e.code==="KeyR"&&mode==="play")resetPlayer();
};
canvas.onpointerdown=e=>{
 if(mode==="play")queueJump();
 else if(mode==="editor")placeEditorObject(e);
};

function box(){return{x:player.x,y:player.y,w:player.size,h:player.size}}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}

function objectBox(o){
 if(o.type==="spike")return{x:o.x+5,y:o.y+7,w:o.s-10,h:o.s-7};
 return{x:o.x,y:o.y,w:o.w||35,h:o.h||35};
}

function solids(){
 return currentLevel.objects.filter(o=>!o.type||o.type==="block");
}

function update(dt){
 if(mode!=="play"||player.dead||player.won)return;

 const oldY=player.y;
 player.vx=player.gameMode==="wave"?PH.waveSpeed:PH.run;

 // Gamemode movement
 if(player.gameMode==="cube"||player.gameMode==="ball"){
  player.vy+=PH.gravity*player.gravity*dt;
  player.y+=player.vy*dt;

  if(jumpQueued&&player.grounded){
   player.vy=PH.jump*player.gravity;
   player.grounded=false;
  }
 }else if(player.gameMode==="ship"){
  player.vy+=PH.shipGravity*player.gravity*dt;
  if(jumpQueued)player.vy+=PH.shipThrust*player.gravity*dt;
  player.vy=Math.max(-650,Math.min(650,player.vy));
  player.y+=player.vy*dt;
 }else if(player.gameMode==="ufo"){
  player.vy+=PH.gravity*player.gravity*dt;
  if(jumpQueued)player.vy=PH.ufoJump*player.gravity;
  player.y+=player.vy*dt;
 }else if(player.gameMode==="wave"){
  player.y+=(jumpQueued?-PH.waveSpeed:PH.waveSpeed)*player.gravity*dt;
 }
 jumpQueued=false;

 player.x+=player.vx*dt;
 player.grounded=false;

 for(const s of solids()){
  if(overlap(box(),s)){
   if(player.vy>=0&&oldY+player.size<=s.y+10){
    player.y=s.y-player.size;player.vy=0;player.grounded=true;
   }else if(player.vy<0&&oldY>=s.y+s.h-10){
    player.y=s.y+s.h;player.vy=0;
   }else if(player.gameMode==="ship"||player.gameMode==="wave"){
    die();
   }
  }
 }

 for(const o of currentLevel.objects){
  if(o.type==="spike"&&overlap(box(),objectBox(o)))die();

  if(["pad","gravity","mirror","portal"].includes(o.type)&&overlap(box(),objectBox(o))){
   if(o.type==="pad"&&player.grounded)player.vy=PH.jump*1.15*player.gravity;
   if(o.type==="gravity"){player.gravity=o.gravity;player.vy=0;}
   if(o.type==="mirror"){player.vx*=-1;setTimeout(()=>player.vx=PH.run,80)}
   if(o.type==="portal"&&o.mode)player.gameMode=o.mode;
  }
 }

 if(player.y>H+200||player.y<-300)die();
 if(player.x>=currentLevel.finish)player.won=true;

 const target=player.x-260;
 cameraX+=(target-cameraX)*Math.min(1,dt*8);
 cameraX=Math.max(0,Math.min(cameraX,currentLevel.finish-W));
}

function die(){player.dead=true}

function render(){
 const theme=currentLevel?.theme||"#15213a";
 ctx.fillStyle=theme;ctx.fillRect(0,0,W,H);

 // grid
 ctx.strokeStyle="rgba(255,255,255,.05)";
 for(let x=-(cameraX%60);x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
 for(let y=30;y<H;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}

 if(mode==="play"){
  for(const o of currentLevel.objects)drawObject(o);
  drawFinish();drawPlayer();
  const p=Math.min(100,Math.floor(player.x/currentLevel.finish*100));
  progress.textContent=p+"%";
  if(player.dead||player.won){
   ctx.fillStyle="rgba(0,0,0,.72)";ctx.fillRect(0,0,W,H);
   ctx.textAlign="center";ctx.fillStyle=player.won?"#55ff88":"#ff6666";
   ctx.font="bold 42px Arial";ctx.fillText(player.won?"LEVEL COMPLETE":"YOU DIED",W/2,H/2-15);
   ctx.font="18px Arial";ctx.fillStyle="#fff";ctx.fillText("R = restart",W/2,H/2+30);
   ctx.textAlign="left";
  }
 }else if(mode==="editor"){
  for(const o of editorObjects)drawObject(o,true);
  editorHud.classList.remove("hidden");
 }
}

function drawObject(o,editing=false){
 const x=o.x-cameraX,y=o.y-cameraY;
 if(o.type==="spike"){
  ctx.beginPath();ctx.moveTo(x,y+o.s);ctx.lineTo(x+o.s/2,y);ctx.lineTo(x+o.s,y+o.s);ctx.closePath();
  ctx.fillStyle="#eee";ctx.fill();return;
 }
 if(o.type==="pad"){
  ctx.fillStyle="#ffe34f";ctx.fillRect(x,y,o.w,o.h);return;
 }
 if(o.type==="gravity"){
  ctx.fillStyle=o.gravity<0?"#ff5de8":"#5de8ff";ctx.fillRect(x,y,o.w,o.h);
  ctx.fillStyle="#fff";ctx.font="bold 20px Arial";ctx.fillText(o.gravity<0?"↑":"↓",x+8,y+27);return;
 }
 if(o.type==="mirror"){
  ctx.fillStyle="#a66cff";ctx.fillRect(x,y,o.w,o.h);ctx.fillStyle="#fff";ctx.font="22px Arial";ctx.fillText("↔",x+4,y+28);return;
 }
 if(o.type==="portal"){
  const colors={ship:"#52d7ff",wave:"#ff5cff",ball:"#ffb52e",ufo:"#65ff8b",cube:"#55aaff"};
  ctx.fillStyle=colors[o.mode]||"#fff";ctx.fillRect(x,y,o.w,o.h);
  ctx.fillStyle="#08101d";ctx.font="bold 11px Arial";ctx.fillText(o.mode.toUpperCase(),x-5,y+27);return;
 }
 ctx.fillStyle="#35a7e8";ctx.fillRect(x,y,o.w,o.h);
 ctx.fillStyle="#66d4ff";ctx.fillRect(x,y,o.w,7);
}

function drawFinish(){
 const x=currentLevel.finish-cameraX;
 ctx.fillStyle="#55ff88";ctx.fillRect(x,260,7,190);
}

function drawPlayer(){
 ctx.save();
 ctx.translate(player.x-cameraX+player.size/2,player.y+player.size/2);
 const angle=player.gameMode==="wave"?Math.atan2(player.vy,player.vx):player.rotation;
 ctx.rotate(angle);
 ctx.fillStyle=["#42ff75","#42a5ff","#ffd342","#ff5de8","#ff6a4d","#a96aff","#fff","#48e0ff"][iconIndex];
 ctx.fillRect(-player.size/2,-player.size/2,player.size,player.size);
 ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.strokeRect(-16,-16,32,32);
 ctx.restore();
}

function placeEditorObject(e){
 const r=canvas.getBoundingClientRect();
 const sx=(e.clientX-r.left)*W/r.width;
 const sy=(e.clientY-r.top)*H/r.height;
 const x=Math.round((sx+cameraX)/10)*10;
 const y=Math.round(sy/10)*10;

 if(selectedToolName==="block")editorObjects.push(rect(x,y,100,40));
 if(selectedToolName==="spike")editorObjects.push({type:"spike",x,y:y-34,s:34});
 if(selectedToolName==="pad")editorObjects.push({type:"pad",x,y:y-12,w:45,h:12});
 if(selectedToolName==="gravity")editorObjects.push({type:"gravity",x,y:y-80,w:35,h:80,gravity:-1});
 if(selectedToolName==="mirror")editorObjects.push({type:"mirror",x,y:y-80,w:35,h:80,flip:1});
 if(selectedToolName==="portal")editorObjects.push({type:"portal",x,y:y-80,w:35,h:80,mode:"ship"});
}

let last=performance.now(),acc=0;
function loop(now){
 const dt=Math.min(.1,(now-last)/1000);last=now;acc+=dt;
 while(acc>=PH.fixed){update(PH.fixed);acc-=PH.fixed}
 render();requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
