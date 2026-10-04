const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});

renderer.setPixelRatio(
  Math.min(devicePixelRatio, 2)
);

renderer.setSize(
  innerWidth,
  innerHeight
);

renderer.domElement.style.position = "fixed";
renderer.domElement.style.left = "0";
renderer.domElement.style.top = "0";
renderer.domElement.style.width = "100%";
renderer.domElement.style.height = "100%";
renderer.domElement.style.zIndex = "0";
renderer.domElement.style.touchAction = "none";

document.body.appendChild(renderer.domElement);

ZapparThree.glContextSet(
  renderer.getContext()
);


/* =========================
   CAMERA
========================= */

const camera =
  new ZapparThree.Camera();

const scene =
  new THREE.Scene();

scene.background =
  camera.backgroundTexture;


/* =========================
   AR WORLD TRACKER
========================= */

const tracker =
  new ZapparThree.InstantWorldTracker();

const anchor =
  new ZapparThree.InstantWorldAnchorGroup(
    camera,
    tracker
  );

scene.add(anchor);


/* =========================
   UI
========================= */

const status =
  document.getElementById("status");

const placeBtn =
  document.getElementById("place");

const errorBox =
  document.getElementById("error");

const scoreEl =
  document.getElementById("score");


/* =========================
   GAME STATE
========================= */

let placed = false;
let gameOver = false;
let timer = null;


/* =========================
   FLOATING TETRIS WORLD
========================= */

const world =
  new THREE.Group();

anchor.add(world);


/* =========================
   TETRIS BOARD
========================= */

const board =
  new THREE.Group();

world.add(board);


/* =========================
   TETRIS SETTINGS
========================= */

/*
   Smaller than the previous
   version so the complete
   game fits better in view.

   10 x 20 = 1.8m x 3.6m
*/

const W = 10;
const H = 20;
const CELL = 0.18;

const BOARD_WIDTH =
  W * CELL;

const BOARD_HEIGHT =
  H * CELL;


/* =========================
   BLOCK DEPTH
========================= */

const BLOCK_DEPTH = 0.22;


/* =========================
   COLORS
========================= */

const colors = [

  0x00e5ff,

  0x4c6fff,

  0xff9d00,

  0xffdf00,

  0x00e676,

  0xa855f7,

  0xff3d71

];


/* =========================
   TETRIS SHAPES
========================= */

const shapes = [

  [
    [1,1,1,1]
  ],

  [
    [1,0,0],
    [1,1,1]
  ],

  [
    [0,0,1],
    [1,1,1]
  ],

  [
    [1,1],
    [1,1]
  ],

  [
    [0,1,1],
    [1,1,0]
  ],

  [
    [0,1,0],
    [1,1,1]
  ],

  [
    [1,1,0],
    [0,1,1]
  ]

];


/* =========================
   GAME GRID
========================= */

const grid =
  Array.from(
    { length: H },
    () => Array(W).fill(null)
  );


/* =========================
   TRANSPARENT GAME BORDER
========================= */

/*
   IMPORTANT:

   There is NO background
   plane behind the game.

   Only the border exists.
*/

const borderMaterial =
  new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8
  });


/* =========================
   TOP BORDER
========================= */

const topBorder =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      BOARD_WIDTH + 0.10,
      0.055,
      0.055
    ),
    borderMaterial
  );

topBorder.position.set(
  0,
  BOARD_HEIGHT / 2 + 0.025,
  0
);

board.add(topBorder);


/* =========================
   BOTTOM BORDER
========================= */

const bottomBorder =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      BOARD_WIDTH + 0.10,
      0.055,
      0.055
    ),
    borderMaterial
  );

bottomBorder.position.set(
  0,
  -BOARD_HEIGHT / 2 - 0.025,
  0
);

board.add(bottomBorder);


/* =========================
   LEFT BORDER
========================= */

const leftBorder =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      0.055,
      BOARD_HEIGHT + 0.10,
      0.055
    ),
    borderMaterial
  );

leftBorder.position.set(
  -BOARD_WIDTH / 2 - 0.025,
  0,
  0
);

board.add(leftBorder);


/* =========================
   RIGHT BORDER
========================= */

const rightBorder =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      0.055,
      BOARD_HEIGHT + 0.10,
      0.055
    ),
    borderMaterial
  );

rightBorder.position.set(
  BOARD_WIDTH / 2 + 0.025,
  0,
  0
);

board.add(rightBorder);


/* =========================
   NO BACKGROUND
========================= */

/*
   IMPORTANT:

   We intentionally do NOT
   create a PlaneGeometry here.

   There is absolutely
   nothing behind the blocks.

   The real world remains
   visible through the entire
   Tetris game.
*/


/* =========================
   ACTIVE PIECE
========================= */

let active = [];

let px = 3;
let py = 0;
let rot = 0;
let type = 0;


/* =========================
   CREATE 3D BLOCK
========================= */

function createBlock(
  color
) {

  /*
     A real 3D cube.

     Width  = CELL
     Height = CELL
     Depth  = BLOCK_DEPTH
  */

  const geometry =
    new THREE.BoxGeometry(
      CELL * 0.88,
      CELL * 0.88,
      BLOCK_DEPTH
    );


  const material =
    new THREE.MeshBasicMaterial({
      color: color
    });


  const block =
    new THREE.Mesh(
      geometry,
      material
    );


  return block;
}


/* =========================
   ROTATION
========================= */

function rotated(
  shape,
  rotations
) {

  let result =
    shape.map(
      row => row.slice()
    );

  for (
    let r = 0;
    r < rotations;
    r++
  ) {

    const h =
      result.length;

    const w =
      result[0].length;

    const next =
      Array.from(
        { length: w },
        () => Array(h).fill(0)
      );

    for (
      let y = 0;
      y < h;
      y++
    ) {

      for (
        let x = 0;
        x < w;
        x++
      ) {

        next[x][h - 1 - y] =
          result[y][x];

      }
    }

    result = next;
  }

  return result;
}


/* =========================
   VALID MOVE
========================= */

function valid(
  nx,
  ny,
  nr
) {

  const shape =
    rotated(
      shapes[type],
      nr
    );

  for (
    let y = 0;
    y < shape.length;
    y++
  ) {

    for (
      let x = 0;
      x < shape[0].length;
      x++
    ) {

      if (!shape[y][x])
        continue;

      const gx =
        nx + x;

      const gy =
        ny + y;

      if (
        gx < 0 ||
        gx >= W ||
        gy < 0 ||
        gy >= H
      ) {

        return false;
      }

      if (
        grid[gy][gx]
      ) {

        return false;
      }
    }
  }

  return true;
}


/* =========================
   DRAW ACTIVE PIECE
========================= */

function draw() {

  active.forEach(
    object => {
      board.remove(object);

      if (object.geometry) {
        object.geometry.dispose();
      }

      if (object.material) {
        object.material.dispose();
      }
    }
  );

  active = [];


  const shape =
    rotated(
      shapes[type],
      rot
    );


  for (
    let y = 0;
    y < shape.length;
    y++
  ) {

    for (
      let x = 0;
      x < shape[0].length;
      x++
    ) {

      if (!shape[y][x])
        continue;


      const object =
        createBlock(
          colors[type]
        );


      object.position.set(

        (px + x) * CELL -
        BOARD_WIDTH / 2 +
        CELL / 2,

        (py + y) * CELL -
        BOARD_HEIGHT / 2 +
        CELL / 2,

        0

      );


      board.add(object);

      active.push(object);
    }
  }
}


/* =========================
   DRAW LOCKED BLOCKS
========================= */

function drawLockedBlocks() {

  /*
     Remove all existing
     locked block meshes.

     Active pieces are kept.
  */

  const lockedObjects =
    board.children.filter(
      object =>
        object.userData &&
        object.userData.locked
    );


  lockedObjects.forEach(
    object => {

      board.remove(object);

      if (object.geometry) {
        object.geometry.dispose();
      }

      if (object.material) {
        object.material.dispose();
      }

    }
  );


  for (
    let y = 0;
    y < H;
    y++
  ) {

    for (
      let x = 0;
      x < W;
      x++
    ) {

      if (!grid[y][x])
        continue;


      const object =
        createBlock(
          grid[y][x]
        );


      object.userData.locked =
        true;


      object.position.set(

        x * CELL -
        BOARD_WIDTH / 2 +
        CELL / 2,

        y * CELL -
        BOARD_HEIGHT / 2 +
        CELL / 2,

        0

      );


      board.add(object);
    }
  }
}


/* =========================
   NEW PIECE
========================= */

function makePiece() {

  type =
    Math.floor(
      Math.random() *
      shapes.length
    );

  rot = 0;

  const shape =
    shapes[type];


  px =
    Math.floor(
      (W - shape[0].length) / 2
    );


  py =
    H - shape.length;


  if (
    !valid(
      px,
      py,
      rot
    )
  ) {

    gameOver = true;

    status.textContent =
      "GAME OVER — TAP TO RESTART";

    return;
  }


  draw();
}


/* =========================
   LOCK PIECE
========================= */

function lock() {

  const shape =
    rotated(
      shapes[type],
      rot
    );


  for (
    let y = 0;
    y < shape.length;
    y++
  ) {

    for (
      let x = 0;
      x < shape[0].length;
      x++
    ) {

      if (!shape[y][x])
        continue;


      const gx =
        px + x;

      const gy =
        py + y;


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


  clearLines();

  makePiece();

  drawLockedBlocks();

  draw();
}


/* =========================
   CLEAR LINES
========================= */

function clearLines() {

  let lines = 0;


  for (
    let y = 0;
    y < H;
    y++
  ) {

    if (
      grid[y].every(Boolean)
    ) {

      grid.splice(
        y,
        1
      );

      grid.push(
        Array(W).fill(null)
      );

      lines++;

      y--;
    }
  }


  if (lines > 0) {

    const score =
      Number(
        scoreEl.textContent
      ) || 0;


    scoreEl.textContent =
      score +
      lines * 100;
  }
}


/* =========================
   MOVE
========================= */

function move(dx) {

  if (
    !placed ||
    gameOver
  ) return;


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


/* =========================
   ROTATE
========================= */

function turn() {

  if (
    !placed ||
    gameOver
  ) return;


  const nextRotation =
    (rot + 1) % 4;


  if (
    valid(
      px,
      py,
      nextRotation
    )
  ) {

    rot =
      nextRotation;

    draw();
  }
}


/* =========================
   HARD DROP
========================= */

function hardDrop() {

  if (
    !placed ||
    gameOver
  ) return;


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


/* =========================
   START GAME
========================= */

function startGame() {

  for (
    let y = 0;
    y < H;
    y++
  ) {

    for (
      let x = 0;
      x < W;
      x++
    ) {

      grid[y][x] =
        null;
    }
  }


  scoreEl.textContent =
    "0";


  gameOver = false;


  makePiece();

  drawLockedBlocks();

  draw();


  clearInterval(timer);


  timer =
    setInterval(
      () => {

        if (
          !placed ||
          gameOver
        ) return;


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

      },
      650
    );
}


/* =========================
   PLACE FLOATING TETRIS
========================= */

placeBtn.addEventListener(
  "click",
  () => {

    if (gameOver) {

      startGame();

      return;
    }


    if (!placed) {

      /*
         The Tetris game is
         placed several metres
         in front of the camera.

         It is NOT attached
         to a wall.
      */

      tracker.setAnchorPoseFromCameraOffset(
        0,
        0,
        -5
      );


      placed = true;


      placeBtn.style.display =
        "none";


      status.textContent =
        "TAP = ROTATE • SWIPE = MOVE • WALK AROUND THE GAME";


      startGame();
    }
  }
);


/* =========================
   TOUCH CONTROLS
========================= */

let touchStartX = 0;

let touchStartY = 0;

let touchStartTime = 0;


const SWIPE_DISTANCE = 40;

const TAP_TIME = 300;


renderer.domElement.addEventListener(
  "touchstart",
  event => {

    const touch =
      event.changedTouches[0];


    touchStartX =
      touch.clientX;

    touchStartY =
      touch.clientY;

    touchStartTime =
      Date.now();

  },
  {
    passive: true
  }
);


renderer.domElement.addEventListener(
  "touchend",
  event => {

    if (
      !placed ||
      gameOver
    ) return;


    const touch =
      event.changedTouches[0];


    const dx =
      touch.clientX -
      touchStartX;

    const dy =
      touch.clientY -
      touchStartY;


    const duration =
      Date.now() -
      touchStartTime;


    const distance =
      Math.sqrt(
        dx * dx +
        dy * dy
      );


    /*
       TAP
       Rotate
    */

    if (
      distance <
      SWIPE_DISTANCE &&
      duration <
      TAP_TIME
    ) {

      turn();

      return;
    }


    /*
       SWIPE LEFT
    */

    if (
      Math.abs(dx) >
      Math.abs(dy) &&
      dx <
      -SWIPE_DISTANCE
    ) {

      move(-1);

      return;
    }


    /*
       SWIPE RIGHT
    */

    if (
      Math.abs(dx) >
      Math.abs(dy) &&
      dx >
      SWIPE_DISTANCE
    ) {

      move(1);

      return;
    }


    /*
       SWIPE DOWN
    */

    if (
      Math.abs(dy) >
      Math.abs(dx) &&
      dy >
      SWIPE_DISTANCE
    ) {

      hardDrop();

      return;
    }

  },
  {
    passive: true
  }
);


/* =========================
   CAMERA PERMISSION
========================= */

ZapparThree
  .permissionRequestUI()
  .then(
    granted => {

      if (granted) {

        camera.start();


        status.textContent =
          "Move your phone around, then tap ENTER TETRIS";

      } else {

        ZapparThree
          .permissionDeniedUI();


        status.textContent =
          "Camera permission is required";
      }

    }
  )
  .catch(
    error => {

      errorBox.hidden =
        false;


      errorBox.textContent =
        "Camera startup failed.\n" +
        error.message;
    }
  );


/* =========================
   RENDER LOOP
========================= */

function render() {

  camera.updateFrame(
    renderer
  );


  /*
     Before placement,
     keep the preview at
     a fixed point in front
     of the camera.
  */

  if (!placed) {

    tracker.setAnchorPoseFromCameraOffset(
      0,
      0,
      -5
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


/* =========================
   RESIZE
========================= */

addEventListener(
  "resize",
  () => {

    renderer.setSize(
      innerWidth,
      innerHeight
    );
  }
);
