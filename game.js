/* =========================================================
   AR TETRIS PORTAL
   ========================================================= */


/* =========================================================
   RENDERER
   ========================================================= */

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, 2)
);

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.domElement.style.position = "fixed";
renderer.domElement.style.left = "0";
renderer.domElement.style.top = "0";
renderer.domElement.style.width = "100%";
renderer.domElement.style.height = "100%";
renderer.domElement.style.zIndex = "0";
renderer.domElement.style.touchAction = "none";

document.body.appendChild(
  renderer.domElement
);


/* =========================================================
   ZAPPAR WEBGL CONTEXT
   ========================================================= */

ZapparThree.glContextSet(
  renderer.getContext()
);


/* =========================================================
   CAMERA
   ========================================================= */

const camera =
  new ZapparThree.Camera();


/* =========================================================
   SCENE
   ========================================================= */

const scene =
  new THREE.Scene();

scene.background =
  camera.backgroundTexture;


/* =========================================================
   INSTANT WORLD TRACKER
   ========================================================= */

const tracker =
  new ZapparThree.InstantWorldTracker();


/*
   Explicitly enable the tracker.

   This makes sure the world tracker continues
   processing after the camera starts.
*/

tracker.enabled = true;


/* =========================================================
   WORLD ANCHOR GROUP
   ========================================================= */

const anchor =
  new ZapparThree.InstantWorldAnchorGroup(
    camera,
    tracker
  );

scene.add(anchor);


/* =========================================================
   UI
   ========================================================= */

const status =
  document.getElementById("status");

const placeBtn =
  document.getElementById("place");

const errorBox =
  document.getElementById("error");

const scoreEl =
  document.getElementById("score");


/* =========================================================
   GAME STATE
   ========================================================= */

let placed = false;

let gameOver = false;

let timer = null;


/* =========================================================
   TETRIS WORLD
   ========================================================= */

/*
   Everything is attached to the AR anchor.

   IMPORTANT:

   We do NOT attach the game to the camera.

   The anchor belongs to the real-world tracking
   coordinate system.
*/

const world =
  new THREE.Group();

anchor.add(world);


/* =========================================================
   BOARD
   ========================================================= */

const board =
  new THREE.Group();

world.add(board);


/* =========================================================
   TETRIS SETTINGS
   ========================================================= */

const W = 10;
const H = 20;


/*
   Slightly smaller than before.

   This keeps the game more comfortable
   on a phone while still giving the blocks
   visible 3D depth.
*/

const CELL = 0.14;

const BOARD_WIDTH =
  W * CELL;

const BOARD_HEIGHT =
  H * CELL;


/* =========================================================
   3D BLOCK DEPTH
   ========================================================= */

const BLOCK_DEPTH = 0.18;


/* =========================================================
   COLORS
   ========================================================= */

const colors = [

  0x00e5ff,

  0x4c6fff,

  0xff9d00,

  0xffdf00,

  0x00e676,

  0xa855f7,

  0xff3d71

];


/* =========================================================
   TETRIS SHAPES
   ========================================================= */

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


/* =========================================================
   GAME GRID
   ========================================================= */

const grid =
  Array.from(
    { length: H },
    () => Array(W).fill(null)
  );


/* =========================================================
   TRANSPARENT BORDER
   ========================================================= */

const borderMaterial =
  new THREE.MeshBasicMaterial({

    color: 0xffffff,

    transparent: true,

    opacity: 0.8,

    depthWrite: false

  });


/* =========================================================
   TOP BORDER
   ========================================================= */

const topBorder =
  new THREE.Mesh(

    new THREE.BoxGeometry(
      BOARD_WIDTH + 0.08,
      0.045,
      0.045
    ),

    borderMaterial

  );

topBorder.position.set(

  0,

  BOARD_HEIGHT / 2 + 0.02,

  0

);

board.add(
  topBorder
);


/* =========================================================
   BOTTOM BORDER
   ========================================================= */

const bottomBorder =
  new THREE.Mesh(

    new THREE.BoxGeometry(
      BOARD_WIDTH + 0.08,
      0.045,
      0.045
    ),

    borderMaterial

  );

bottomBorder.position.set(

  0,

  -BOARD_HEIGHT / 2 - 0.02,

  0

);

board.add(
  bottomBorder
);


/* =========================================================
   LEFT BORDER
   ========================================================= */

const leftBorder =
  new THREE.Mesh(

    new THREE.BoxGeometry(
      0.045,
      BOARD_HEIGHT + 0.08,
      0.045
    ),

    borderMaterial

  );

leftBorder.position.set(

  -BOARD_WIDTH / 2 - 0.02,

  0,

  0

);

board.add(
  leftBorder
);


/* =========================================================
   RIGHT BORDER
   ========================================================= */

const rightBorder =
  new THREE.Mesh(

    new THREE.BoxGeometry(
      0.045,
      BOARD_HEIGHT + 0.08,
      0.045
    ),

    borderMaterial

  );

rightBorder.position.set(

  BOARD_WIDTH / 2 + 0.02,

  0,

  0

);

board.add(
  rightBorder
);


/* =========================================================
   NO BACKGROUND PLANE
   ========================================================= */

/*
   There is intentionally NO background plane.

   The real world remains visible between
   all of the Tetris blocks.
*/


/* =========================================================
   ACTIVE PIECE
   ========================================================= */

let active = [];

let px = 3;

let py = 0;

let rot = 0;

let type = 0;


/* =========================================================
   CREATE 3D BLOCK
   ========================================================= */

function createBlock(color) {

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


/* =========================================================
   ROTATE SHAPE
   ========================================================= */

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


/* =========================================================
   VALID MOVE
   ========================================================= */

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

      if (
        !shape[y][x]
      ) continue;


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


/* =========================================================
   DRAW ACTIVE PIECE
   ========================================================= */

function draw() {

  active.forEach(
    object => {

      board.remove(
        object
      );


      if (
        object.geometry
      ) {

        object.geometry.dispose();

      }


      if (
        object.material
      ) {

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

      if (
        !shape[y][x]
      ) continue;


      const object =
        createBlock(
          colors[type]
        );


      object.position.set(

        (px + x) * CELL
        - BOARD_WIDTH / 2
        + CELL / 2,

        (py + y) * CELL
        - BOARD_HEIGHT / 2
        + CELL / 2,

        0

      );


      board.add(
        object
      );


      active.push(
        object
      );

    }

  }

}


/* =========================================================
   DRAW LOCKED BLOCKS
   ========================================================= */

function drawLockedBlocks() {

  const lockedObjects =
    board.children.filter(
      object =>
        object.userData &&
        object.userData.locked
    );


  lockedObjects.forEach(
    object => {

      board.remove(
        object
      );


      if (
        object.geometry
      ) {

        object.geometry.dispose();

      }


      if (
        object.material
      ) {

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

      if (
        !grid[y][x]
      ) continue;


      const object =
        createBlock(
          grid[y][x]
        );


      object.userData.locked =
        true;


      object.position.set(

        x * CELL
        - BOARD_WIDTH / 2
        + CELL / 2,

        y * CELL
        - BOARD_HEIGHT / 2
        + CELL / 2,

        0

      );


      board.add(
        object
      );

    }

  }

}


/* =========================================================
   NEW PIECE
   ========================================================= */

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


/* =========================================================
   LOCK PIECE
   ========================================================= */

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

      if (
        !shape[y][x]
      ) continue;


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


/* =========================================================
   CLEAR LINES
   ========================================================= */

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


  if (
    lines > 0
  ) {

    const score =
      Number(
        scoreEl.textContent
      ) || 0;


    scoreEl.textContent =
      score +
      lines * 100;

  }

}


/* =========================================================
   MOVE LEFT / RIGHT
   ========================================================= */

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


/* =========================================================
   ROTATE
   ========================================================= */

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


/* =========================================================
   HARD DROP
   ========================================================= */

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


/* =========================================================
   START GAME
   ========================================================= */

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


  clearInterval(
    timer
  );


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


/* =========================================================
   PLACE TETRIS IN REAL WORLD
   ========================================================= */

placeBtn.addEventListener(

  "click",

  () => {

    /*
       Restart after game over.
    */

    if (
      gameOver
    ) {

      startGame();

      return;

    }


    /*
       Do nothing if already placed.
    */

    if (
      placed
    ) return;


    /*
       IMPORTANT:

       We are deliberately NOT putting the
       Tetris on the camera.

       The tracker establishes a point
       in the real environment.

       Once placed = true, this call STOPS.

       From then on, Zappar tracks the
       anchor as the phone moves.
    */

    tracker.setAnchorPoseFromCameraOffset(

      0,

      0,

      -3

    );


    /*
       Tell the animation loop that the
       Tetris is now locked into the world.
    */

    placed = true;


    /*
       Hide placement button.
    */

    placeBtn.style.display =
      "none";


    status.textContent =
      "TAP = ROTATE • SWIPE = MOVE • WALK AROUND THE GAME";


    /*
       Start Tetris.
    */

    startGame();

  }

);


/* =========================================================
   TOUCH CONTROLS
   ========================================================= */

let touchStartX = 0;

let touchStartY = 0;

let touchStartTime = 0;


const SWIPE_DISTANCE = 40;

const TAP_TIME = 300;


/* =========================================================
   TOUCH START
   ========================================================= */

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


/* =========================================================
   TOUCH END
   ========================================================= */

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
       TAP = ROTATE
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
       SWIPE DOWN = HARD DROP
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


/* =========================================================
   CAMERA PERMISSION
   ========================================================= */

ZapparThree
  .permissionRequestUI()

  .then(

    granted => {

      if (
        granted
      ) {

        camera.start();


        /*
           Make absolutely sure the
           world tracker is active.
        */

        tracker.enabled =
          true;


        status.textContent =
          "Move your phone around, then tap ENTER TETRIS";

      }

      else {

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


/* =========================================================
   AR RENDER LOOP
   ========================================================= */

function render() {

  /*
     Update the Zappar camera first.

     This is important because the tracker
     uses the latest camera frame.
  */

  camera.updateFrame(
    renderer
  );


  /*
     BEFORE PLACEMENT:

     Keep the placement point in front
     of the user so the tracker can
     continually update the preview.

     AFTER PLACEMENT:

     THIS CODE STOPS.

     Therefore the Tetris is no longer
     repositioned relative to the camera.
  */

  if (
    !placed
  ) {

    tracker.setAnchorPoseFromCameraOffset(

      0,

      0,

      -3

    );

  }


  /*
     Render the world-anchored Tetris.
  */

  renderer.render(
    scene,
    camera
  );

}


/* =========================================================
   START RENDER LOOP
   ========================================================= */

renderer.setAnimationLoop(
  render
);


/* =========================================================
   RESIZE
   ========================================================= */

window.addEventListener(

  "resize",

  () => {

    renderer.setSize(

      window.innerWidth,

      window.innerHeight

    );

  }

);
