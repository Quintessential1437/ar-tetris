// AR Tetris - first playable prototype
const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
document.body.appendChild(renderer.domElement);

ZapparThree.glContextSet(renderer.getContext());
const camera = new ZapparThree.Camera();
const scene = new THREE.Scene();
scene.background = camera.backgroundTexture;

const status = document.getElementById('status');
const placeBtn = document.getElementById('place');
const errorBox = document.getElementById('error');
const scoreEl = document.getElementById('score');

let placed=false;
const tracker = new ZapparThree.InstantWorldTracker();
const anchor = new ZapparThree.InstantWorldAnchorGroup(camera,tracker);
scene.add(anchor);

// Board faces the user and is attached to the world anchor.
const board = new THREE.Group();
board.rotation.x = Math.PI/2;
board.position.set(0,0.02,0);
anchor.add(board);

const W=10,H=20,CELL=.14;
const cells=[];
const colors=[0x00e5ff,0x4c6fff,0xff9d00,0xffdf00,0x00e676,0xa855f7,0xff3d71];
const shapes=[[[1,1,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]],[[1,1],[1,1]],[[0,1,1],[1,1,0]],[[0,1,0],[1,1,1]],[[1,1,0],[0,1,1]]];
const grid=Array.from({length:H},()=>Array(W).fill(null));

const frame=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(W*CELL,H*CELL)),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.45}));
frame.rotation.x=Math.PI/2; frame.position.set((W*CELL)/2-CELL/2,(H*CELL)/2-CELL/2,-.012); board.add(frame);

for(let y=0;y<H;y++)for(let x=0;x<W;x++){const g=new THREE.BoxGeometry(CELL*.92,CELL*.92,.045);const m=new THREE.MeshBasicMaterial({color:0x222733,transparent:true,opacity:.42});const c=new THREE.Mesh(g,m);c.position.set(x*CELL-(W*CELL)/2+CELL/2,y*CELL-(H*CELL)/2+CELL/2,0);board.add(c);cells.push(c)}

let active=null,px=4,py=H-1,rot=0,type=0;
function makePiece(){type=Math.floor(Math.random()*shapes.length);rot=0;px=3;py=H-1;draw();}
function rotated(shape,r){let a=shape.map(row=>row.slice());for(let k=0;k<r;k++){const h=a.length,w=a[0].length,n=Array.from({length:w},()=>Array(h));for(let y=0;y<h;y++)for(let x=0;x<w;x++)n[x][h-1-y]=a[y][x];a=n}return a}
function valid(nx,ny,nr){const s=rotated(shapes[type],nr);for(let y=0;y<s.length;y++)for(let x=0;x<s[0].length;x++)if(s[y][x]){const gx=nx+x,gy=ny+y;if(gx<0||gx>=W||gy<0||gy>=H||grid[gy][gx])return false}return true}
function draw(){if(active)active.forEach(o=>board.remove(o));active=[];const s=rotated(shapes[type],rot);for(let y=0;y<s.length;y++)for(let x=0;x<s[0].length;x++)if(s[y][x]){const m=new THREE.MeshBasicMaterial({color:colors[type]});const o=new THREE.Mesh(new THREE.BoxGeometry(CELL*.92,CELL*.92,.06),m);o.position.set((px+x)*CELL-(W*CELL)/2+CELL/2,(py+y)*CELL-(H*CELL)/2+CELL/2,.035);board.add(o);active.push(o)}}
function lock(){const s=rotated(shapes[type],rot);for(let y=0;y<s.length;y++)for(let x=0;x<s[0].length;x++)if(s[y][x])grid[py+y][px+x]=colors[type];clearLines();makePiece();if(!valid(px,py,rot)){status.textContent='Game over — tap PLACE to restart';placed=false;placeBtn.style.display='block'}}
function clearLines(){for(let y=H-1;y>=0;y--){if(grid[y].every(Boolean)){grid.splice(y,1);grid.push(Array(W).fill(null));scoreEl.textContent=+scoreEl.textContent+100;y++}}for(let y=0;y<H;y++)for(let x=0;x<W;x++){const c=cells[y*W+x];c.material.color.set(grid[y][x]||0x222733);c.material.opacity=grid[y][x] ? .9 : .42}}
function move(dx){if(valid(px+dx,py,rot)){px+=dx;draw()}}
function drop(){while(valid(px,py-1,rot))py--;lock()}
function turn(){if(valid(px,py,rot+1)){rot=(rot+1)%4;draw()}}
let timer;
function startGame(){for(let y=0;y<H;y++)for(let x=0;x<W;x++)grid[y][x]=null;scoreEl.textContent='0';clearLines();makePiece();clearInterval(timer);timer=setInterval(()=>{if(!placed)return;if(valid(px,py-1,rot)){py--;draw()}else lock()},650)}

placeBtn.onclick=()=>{if(!placed){tracker.setAnchorPoseFromCameraOffset(0,0,-4);placed=true;placeBtn.style.display='none';status.textContent='Tetris is anchored — play!';startGame()}};
document.getElementById('left').onclick=()=>move(-1);document.getElementById('right').onclick=()=>move(1);document.getElementById('rotate').onclick=turn;document.getElementById('drop').onclick=drop;
addEventListener('keydown',e=>{if(e.key==='ArrowLeft')move(-1);if(e.key==='ArrowRight')move(1);if(e.key==='ArrowUp')turn;if(e.key==='ArrowDown')drop});

ZapparThree.permissionRequestUI().then(granted=>{if(granted){camera.start();status.textContent='Point at the wall, then tap PLACE'}else{ZapparThree.permissionDeniedUI();status.textContent='Camera permission is required'}}).catch(e=>{errorBox.hidden=false;errorBox.textContent='Camera startup failed.\n'+e.message});

function render(){camera.updateFrame(renderer);if(!placed)tracker.setAnchorPoseFromCameraOffset(0,0,-4);renderer.render(scene,camera)}
renderer.setAnimationLoop(render);
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight)});
