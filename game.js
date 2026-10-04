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
   PORTAL WORLD
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

const W = 10;

const H = 20;


/*
   BIG BLOCKS

   The arena is intentionally
   much larger than before.
*/

const CELL = 0.32;


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
   PORTAL FRAME
========================= */

const boardWidth =
  W * CELL;

const boardHeight =
  H * CELL;


/*
   Main outer frame
*/

const frameDepth = 0.16;

const frameMaterial =
  new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85
  });


/*
   Top frame
*/

const topFrame =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      boardWidth + 0.20,
      0.16,
      frameDepth
    ),
    frameMaterial
  );

topFrame.position.set(
  0,
  boardHeight / 2 + 0.08,
  0
);

board.add(topFrame);


/*
   Bottom frame
*/

const bottomFrame =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      boardWidth + 0.20,
      0.16,
      frameDepth
    ),
    frameMaterial
  );

bottomFrame.position.set(
  0,
  -boardHeight / 2 - 0.08,
  0
);

board.add(bottomFrame);


/*
   Left frame
*/

const leftFrame =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      0.16,
      boardHeight + 0.20,
      frameDepth
    ),
    frameMaterial
  );

leftFrame.position.set(
  -boardWidth / 2 - 0.08,
  0,
  0
);

board.add(leftFrame);


/*
   Right frame
*/

const rightFrame =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      0.16,
      boardHeight + 0.20,
      frameDepth
    ),
    frameMaterial
  );

rightFrame.position.set(
  boardWidth / 2 + 0.08,
  0,
  0
);

board.add(rightFrame);


/* =========================
   INNER PORTAL FRAME
========================= */

const innerFrameGeometry =
  new THREE.EdgesGeometry(
    new THREE.PlaneGeometry(
      boardWidth,
      boardHeight
    )
  );

const innerFrameMaterial =
  new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.65
  });

const innerFrame =
  new THREE.LineSegments(
    innerFrameGeometry,
    innerFrameMaterial
  );

innerFrame.position.z =
  -0.09;

board.add(innerFrame);


/* =========================
   BOARD CELLS
========================= */

const cells = [];

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

    const geometry =
      new THREE.BoxGeometry(
        CELL * 0.90,
        CELL * 0.90,
        0.08
      );

    const material =
      new THREE.MeshBasicMaterial({
        color: 0x111722,
        transparent: true,
        opacity: 0.30
      });

    const cell =
      new THREE.Mesh(
        geometry,
        material
      );

    cell.position.set(

      x * CELL -
      boardWidth / 2 +
      CELL / 2,

      y * CELL -
      boardHeight / 2 +
      CELL / 2,

      0

    );

    board.add(cell);

    cells.push(cell);
  }
}


/* =========================
   PORTAL BACK PLANE
========================= */

const portalPlane =
  new THREE.Mesh(
    new THREE.PlaneGeometry(
      boardWidth,
      boardHeight
    ),
    new THREE.MeshBasicMaterial({
      color: 0x050812,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide
    })
  );

portalPlane.position.z =
  -0.12;

board.add(portalPlane);


/* =========================
   ACTIVE PIECE
========================= */

let active = [];

let px = 3;

let py = 0;

let rot = 0;

let type = 0;


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
    object =>
      board.remove(object)
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

      const material =
        new THREE.MeshBasicMaterial({
          color: colors[type]
        });

      const object =
        new THREE.Mesh(
          new THREE.BoxGeometry(
            CELL * 0.90,
            CELL * 0.90,
            0.16
          ),
          material
        );

      object.position.set(

        (px + x) * CELL -
        boardWidth / 2 +
        CELL / 2,

        (py + y) * CELL -
        boardHeight / 2 +
        CELL / 2,

        0.08

      );

      board.add(object);

      active.push(object);
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

  updateBoard();
}


/* =========================
   UPDATE GRID
========================= */

function updateBoard() {

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

      const cell =
        cells[
          y * W + x
        ];

      if (
        grid[y][x]
      ) {

        cell.material.color.set(
          grid[y][x]
        );

        cell.material.opacity =
          0.95;

      } else {

        cell.material.color.set(
          0x111722
        );

        cell.material.opacity =
          0.30;
      }
    }
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

  updateBoard();

  gameOver = false;

  makePiece();

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
   PLACE FLOATING WORLD
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
         Place the Tetris world
         about 5 metres in front
         of the phone.

         This creates a large
         floating AR arena.
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
        "TAP = ROTATE • SWIPE = MOVE • WALK AROUND THE TETRIS";

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
       Before placement:

       A tap places the
       floating Tetris world.
    */

    if (
      !placed &&
      !gameOver &&
      distance < SWIPE_DISTANCE &&
      duration < TAP_TIME
    ) {

      tracker.setAnchorPoseFromCameraOffset(
        0,
        0,
        -5
      );

      placed = true;

      placeBtn.style.display =
        "none";

      status.textContent =
        "TAP = ROTATE • SWIPE = MOVE • WALK AROUND THE TETRIS";

      startGame();

      return;
    }


    if (
      !placed ||
      gameOver
    ) return;


    /*
       Tap
       = rotate
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
       Swipe left
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
       Swipe right
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
       Swipe down
       = hard drop
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
          "Move your phone around • TAP ENTER TETRIS";

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
     Before placement the
     floating world follows
     the camera.

     After placement it stays
     locked in the environment.
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
