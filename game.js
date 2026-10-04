// AR Tetris - Wall Version

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});

renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.domElement.style.position = "fixed";
renderer.domElement.style.left = "0";
renderer.domElement.style.top = "0";
renderer.domElement.style.zIndex = "0";

document.body.appendChild(renderer.domElement);

ZapparThree.glContextSet(renderer.getContext());

const camera = new ZapparThree.Camera();
const scene = new THREE.Scene();

scene.background = camera.backgroundTexture;

const status = document.getElementById("status");
const placeBtn = document.getElementById("place");
const errorBox = document.getElementById("error");
const scoreEl = document.getElementById("score");

let placed = false;
let gameOver = false;

const tracker = new ZapparThree.InstantWorldTracker();
const anchor = new ZapparThree.InstantWorldAnchorGroup(
  camera,
  tracker
);

scene.add(anchor);


// --------------------------------------------------
// BOARD
// --------------------------------------------------

const board = new THREE.Group();

board.position.set(0, 0, 0);

// Make the Tetris board vertical.
board.rotation.x = Math.PI / 2;

anchor.add(board);


// --------------------------------------------------
// TETRIS SETTINGS
// --------------------------------------------------

const W = 10;
const H = 20;
const CELL = 0.14;

const colors = [
  0x00e5ff,
  0x4c6fff,
  0xff9d00,
  0xffdf00,
  0x00e676,
  0xa855f7,
  0xff3d71
];

const shapes = [
  [[1,1,1,1]],

  [[1,0,0],
   [1,1,1]],

  [[0,0,1],
   [1,1,1]],

  [[1,1],
   [1,1]],

  [[0,1,1],
   [1,1,0]],

  [[0,1,0],
   [1,1,1]],

  [[1,1,0],
   [0,1,1]]
];

const grid = Array.from(
  { length: H },
  () => Array(W).fill(null)
);


// --------------------------------------------------
// BOARD FRAME
// --------------------------------------------------

const frame = new THREE.LineSegments(
  new THREE.EdgesGeometry(
    new THREE.PlaneGeometry(
      W * CELL,
      H * CELL
    )
  ),
  new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.55
  })
);

frame.position.set(
  (W * CELL) / 2 - CELL / 2,
  (H * CELL) / 2 - CELL / 2,
  -0.012
);

board.add(frame);


// --------------------------------------------------
// BOARD CELLS
// --------------------------------------------------

const cells = [];

for (let y = 0; y < H; y++) {

  for (let x = 0; x < W; x++) {

    const geometry = new THREE.BoxGeometry(
      CELL * 0.92,
      CELL * 0.92,
      0.045
    );

    const material = new THREE.MeshBasicMaterial({
      color: 0x222733,
      transparent: true,
      opacity: 0.42
    });

    const cell = new THREE.Mesh(
      geometry,
      material
    );

    cell.position.set(
      x * CELL - (W * CELL) / 2 + CELL / 2,
      y * CELL - (H * CELL) / 2 + CELL / 2,
      0
    );

    board.add(cell);
    cells.push(cell);
  }
}


// --------------------------------------------------
// ACTIVE PIECE
// --------------------------------------------------

let active = [];

let px = 3;
let py = 0;
let rot = 0;
let type = 0;


// --------------------------------------------------
// ROTATION
// --------------------------------------------------

function rotated(shape, rotations) {

  let a = shape.map(row => row.slice());

  for (let k = 0; k < rotations; k++) {

    const h = a.length;
    const w = a[0].length;

    const next = Array.from(
      { length: w },
      () => Array(h).fill(0)
    );

    for (let y = 0; y < h; y++) {

      for (let x = 0; x < w; x++) {

        next[x][h - 1 - y] = a[y][x];

      }
    }

    a = next;
  }

  return a;
}


// --------------------------------------------------
// CHECK IF PIECE CAN MOVE
// --------------------------------------------------

function valid(nx, ny, nr) {

  const shape = rotated(
    shapes[type],
    nr
  );

  for (let y = 0; y < shape.length; y++) {

    for (let x = 0; x < shape[0].length; x++) {

      if (!shape[y][x]) continue;

      const gx = nx + x;
      const gy = ny + y;

      if (
        gx < 0 ||
        gx >= W ||
        gy < 0 ||
        gy >= H
      ) {
        return false;
      }

      if (grid[gy][gx]) {
        return false;
      }
    }
  }

  return true;
}


// --------------------------------------------------
// DRAW ACTIVE PIECE
// --------------------------------------------------

function draw() {

  active.forEach(object => {
    board.remove(object);
  });

  active = [];

  const shape = rotated(
    shapes[type],
    rot
  );

  for (let y = 0; y < shape.length; y++) {

    for (let x = 0; x < shape[0].length; x++) {

      if (!shape[y][x]) continue;

      const material =
        new THREE.MeshBasicMaterial({
          color: colors[type]
        });

      const object =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            CELL * 0.92,
            CELL * 0.92,
            0.06
          ),
          material
        );

      object.position.set(
        (px + x) * CELL -
          (W * CELL) / 2 +
          CELL / 2,

        (py + y) * CELL -
          (H * CELL) / 2 +
          CELL / 2,

        0.035
      );

      board.add(object);
      active.push(object);
    }
  }
}


// --------------------------------------------------
// NEW PIECE
// --------------------------------------------------

function makePiece() {

  type = Math.floor(
    Math.random() * shapes.length
  );

  rot = 0;

  const shape = shapes[type];

  // Spawn above the visible bottom area,
  // but completely inside the board.
  px = Math.floor(
    (W - shape[0].length) / 2
  );

  py = H - shape.length;

  draw();

  // Only game over if the new piece
  // actually cannot fit.
  if (!valid(px, py, rot)) {

    gameOver = true;

    status.textContent =
      "GAME OVER — tap PLACE to restart";

    placeBtn.textContent = "RESTART";
    placeBtn.style.display = "block";
  }
}


// --------------------------------------------------
// LOCK PIECE
// --------------------------------------------------

function lock() {

  const shape = rotated(
    shapes[type],
    rot
  );

  for (let y = 0; y < shape.length; y++) {

    for (let x = 0; x < shape[0].length; x++) {

      if (shape[y][x]) {

        const gx = px + x;
        const gy = py + y;

        if (
          gx >= 0 &&
          gx < W &&
          gy >= 0 &&
          gy < H
        ) {

          grid[gy][gx] =
            colors[type];
        }
      }
    }
  }

  clearLines();

  makePiece();
}


// --------------------------------------------------
// CLEAR LINES
// --------------------------------------------------

function clearLines() {

  let lines = 0;

  for (let y = 0; y < H; y++) {

    if (grid[y].every(Boolean)) {

      grid.splice(y, 1);

      grid.push(
        Array(W).fill(null)
      );

      lines++;

      y--;
    }
  }

  if (lines > 0) {

    const current =
      Number(scoreEl.textContent) || 0;

    scoreEl.textContent =
      current + lines * 100;
  }

  updateBoard();
}


// --------------------------------------------------
// UPDATE BOARD
// --------------------------------------------------

function updateBoard() {

  for (let y = 0; y < H; y++) {

    for (let x = 0; x < W; x++) {

      const cell =
        cells[y * W + x];

      if (grid[y][x]) {

        cell.material.color.set(
          grid[y][x]
        );

        cell.material.opacity = 0.9;

      } else {

        cell.material.color.set(
          0x222733
        );

        cell.material.opacity = 0.42;
      }
    }
  }
}


// --------------------------------------------------
// MOVE LEFT / RIGHT
// --------------------------------------------------

function move(dx) {

  if (!placed || gameOver) return;

  if (
    valid(
      px + dx,
      py,
      rot
    )
  ) {

    px += dx;
    draw();
  }
}


// --------------------------------------------------
// ROTATE
// --------------------------------------------------

function turn() {

  if (!placed || gameOver) return;

  const nextRotation =
    (rot + 1) % 4;

  if (
    valid(
      px,
      py,
      nextRotation
    )
  ) {

    rot = nextRotation;
    draw();
  }
}


// --------------------------------------------------
// HARD DROP
// --------------------------------------------------

function hardDrop() {

  if (!placed || gameOver) return;

  while (
    valid(
      px,
      py - 1,
      rot
    )
  ) {

    py--;
  }

  draw();
  lock();
}


// --------------------------------------------------
// AUTOMATIC FALL
// --------------------------------------------------

let timer = null;

function startGame() {

  for (let y = 0; y < H; y++) {

    for (let x = 0; x < W; x++) {

      grid[y][x] = null;
    }
  }

  scoreEl.textContent = "0";

  updateBoard();

  gameOver = false;

  placeBtn.style.display = "none";

  makePiece();

  clearInterval(timer);

  timer = setInterval(() => {

    if (!placed || gameOver) return;

    if (
      valid(
        px,
        py - 1,
        rot
      )
    ) {

      py--;
      draw();

    } else {

      lock();
    }

  }, 650);
}


// --------------------------------------------------
// PLACE / RESTART
// --------------------------------------------------

placeBtn.addEventListener(
  "click",
  () => {

    if (gameOver) {

      startGame();
      return;
    }

    if (!placed) {

      // Place the board several meters
      // in front of the camera.
      tracker.setAnchorPoseFromCameraOffset(
        0,
        0,
        -3
      );

      placed = true;

      placeBtn.style.display = "none";

      status.textContent =
        "Tetris is on the wall — play!";

      startGame();
    }
  }
);


// --------------------------------------------------
// MOBILE CONTROLS
// --------------------------------------------------

function buttonPress(button, action) {

  button.addEventListener(
    "pointerdown",
    event => {

      event.preventDefault();

      action();
    }
  );

  button.addEventListener(
    "touchstart",
    event => {

      event.preventDefault();

      action();
    },
    { passive: false }
  );
}

buttonPress(
  document.getElementById("left"),
  () => move(-1)
);

buttonPress(
  document.getElementById("right"),
  () => move(1)
);

buttonPress(
  document.getElementById("rotate"),
  () => turn()
);

buttonPress(
  document.getElementById("drop"),
  () => hardDrop()
);


// --------------------------------------------------
// KEYBOARD CONTROLS
// --------------------------------------------------

addEventListener(
  "keydown",
  event => {

    if (event.key === "ArrowLeft") {
      move(-1);
    }

    if (event.key === "ArrowRight") {
      move(1);
    }

    if (event.key === "ArrowUp") {
      turn();
    }

    if (event.key === "ArrowDown") {
      hardDrop();
    }
  }
);


// --------------------------------------------------
// CAMERA
// --------------------------------------------------

ZapparThree
  .permissionRequestUI()
  .then(granted => {

    if (granted) {

      camera.start();

      status.textContent =
        "Point your phone at a wall, then tap PLACE";

    } else {

      ZapparThree.permissionDeniedUI();

      status.textContent =
        "Camera permission is required";
    }
  })
  .catch(error => {

    errorBox.hidden = false;

    errorBox.textContent =
      "Camera startup failed.\n" +
      error.message;
  });


// --------------------------------------------------
// RENDER
// --------------------------------------------------

function render() {

  camera.updateFrame(renderer);

  if (!placed) {

    tracker.setAnchorPoseFromCameraOffset(
      0,
      0,
      -3
    );
  }

  renderer.render(
    scene,
    camera
  );
}

renderer.setAnimationLoop(
  render
);


// --------------------------------------------------
// RESIZE
// --------------------------------------------------

addEventListener(
  "resize",
  () => {

    renderer.setSize(
      innerWidth,
      innerHeight
    );
  }
);
