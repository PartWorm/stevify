import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('canvas');

const scene = new THREE.Scene();
scene.background = new THREE.Color('skyblue');

let cam = () => {
  let ww = window.innerWidth;
  let wh = window.innerHeight;
  return [
    -ww / 2 * 0.05,
    ww / 2 * 0.05,
    wh / 2 * 0.05,
    -wh / 2 * 0.05,
  ];
};

let camera = new THREE.PerspectiveCamera(
  45,
  1,
  0.1,
  1000
);
camera = new THREE.OrthographicCamera(
  ...cam(),
  1,
  1000,
);
camera.position.set(-40, 60, 50);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const orbit = new OrbitControls(camera, renderer.domElement);
// orbit.enableDamping = true;
orbit.target.set(0, 16, 0);

/*
const light = new THREE.DirectionalLight(0xffffff, 1.2);
light.position.set(20, 30, 20);
light.castShadow = true;
scene.add(light);
*/

scene.add(new THREE.AmbientLight(0xffffff, 0.6));

/*
const grid = new THREE.GridHelper(100, 100);
scene.add(grid);
*/

const loader = new THREE.TextureLoader();

let playerRoot;
let currentTransform;

const selectableParts = [];

function nearestFilter(texture) {
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
}

function createCube(w, h, d, uv, texture, inflate = 0) {
  const geometry = new THREE.BoxGeometry(
    w + inflate * 2,
    h + inflate * 2,
    d + inflate * 2,
  );

  const faceUvs = [];

  const imgWidth = 64;
  const imgHeight = 64;

  function rect(x, y, width, height) {
    return [
      new THREE.Vector2(x / imgWidth, 1 - y / imgHeight),
      new THREE.Vector2((x + width) / imgWidth, 1 - y / imgHeight),
      new THREE.Vector2((x + width) / imgWidth, 1 - (y + height) / imgHeight),
      new THREE.Vector2(x / imgWidth, 1 - (y + height) / imgHeight)
    ];
  }

  const order = [
    uv.left,
    uv.right,
    uv.top,
    uv.bottom,
    uv.front,
    uv.back,
  ];

  for (let i = 0; i < order.length; i++) {
    const part = order[i];
    faceUvs.push(rect(part.x, part.y, part.w, part.h));
  }

  const uvAttr = geometry.attributes.uv;

  for (let face = 0; face < 6; face++) {
    const uvs = faceUvs[face];

    const idx = face * 4;

    uvAttr.setXY(idx + 0, uvs[0].x, uvs[0].y);
    uvAttr.setXY(idx + 1, uvs[1].x, uvs[1].y);
    uvAttr.setXY(idx + 2, uvs[3].x, uvs[3].y);
    uvAttr.setXY(idx + 3, uvs[2].x, uvs[2].y);
  }

  uvAttr.needsUpdate = true;

  const mesh = new THREE.Mesh(geometry, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

function createPart(name, innerMesh, outerMesh, position) {
  const group = new THREE.Group();
  group.name = name;

  group.add(innerMesh);

  if (outerMesh) {
    group.add(outerMesh);
  }

  group.position.copy(position);

  return group;
}

function createPivotForPart(part, pivotPosition, y, z) {
  if (typeof pivotPosition === 'number') {
    pivotPosition = new THREE.Vector3(pivotPosition, y, z);
  };

  const pivot = new THREE.Group();

  pivot.position.copy(pivotPosition);

  scene.add(pivot);
  pivot.add(part);

  // Move mesh so it keeps the same world position
  part.position.sub(pivotPosition);

  selectableParts.push(pivot);

  return pivot;
}

let mat;

let head_pv;

function buildPlayer(texture) {
  if (playerRoot) {
    scene.remove(playerRoot);
  }

  selectableParts.length = 0;

  playerRoot = new THREE.Group();

  const bodyMaterial = texture;

  const headInner = createCube(
    8,
    8,
    8,
    {
      right: { x: 0, y: 8, w: 8, h: 8 },
      front: { x: 8, y: 8, w: 8, h: 8 },
      left: { x: 16, y: 8, w: 8, h: 8 },
      back: { x: 24, y: 8, w: 8, h: 8 },
      top: { x: 8, y: 0, w: 8, h: 8 },
      bottom: { x: 16 + 8, y: 0 + 8, w: -8, h: -8 },
    },
    bodyMaterial
  );

  const headOuter = createCube(
    8,
    8,
    8,
    {
      right: { x: 32, y: 8, w: 8, h: 8 },
      front: { x: 40, y: 8, w: 8, h: 8 },
      left: { x: 48, y: 8, w: 8, h: 8 },
      back: { x: 56, y: 8, w: 8, h: 8 },
      top: { x: 40, y: 0, w: 8, h: 8 },
      bottom: { x: 48 + 8, y: 0 + 8, w: -8, h: -8 },
    },
    bodyMaterial,
    0.5
  );

  const head = createPart(
    'head',
    headInner,
    headOuter,
    new THREE.Vector3(0, 28, 0)
  );
  head_pv = createPivotForPart(head, new THREE.Vector3(0, 24, 0));
  playerRoot.add();

  const bodyInner = createCube(
    8,
    12,
    4,
    {
      right: { x: 16, y: 20, w: 4, h: 12 },
      front: { x: 20, y: 20, w: 8, h: 12 },
      left: { x: 28, y: 20, w: 4, h: 12 },
      back: { x: 32, y: 20, w: 8, h: 12 },
      top: { x: 20, y: 16, w: 8, h: 4 },
      bottom: { x: 28 + 8, y: 16 + 4, w: -8, h: -4 },
    },
    bodyMaterial
  );

  const bodyOuter = createCube(
    8,
    12,
    4,
    {
      right: { x: 16, y: 36, w: 4, h: 12 },
      front: { x: 20, y: 36, w: 8, h: 12 },
      left: { x: 28, y: 36, w: 4, h: 12 },
      back: { x: 32, y: 36, w: 8, h: 12 },
      top: { x: 20 + 8, y: 32 + 4, w: -8, h: -4 },
      bottom: { x: 28 + 8, y: 32 + 4, w: -8, h: -4 },
    },
    bodyMaterial,
    0.5
  );

  const body = createPart(
    'body',
    bodyInner,
    bodyOuter,
    new THREE.Vector3(0, 18, 0),
  );

  playerRoot.add(body);

  function armUV(baseX, baseY) {
    return {
      right: { x: baseX, y: baseY + 4, w: 4, h: 12 },
      front: { x: baseX + 4, y: baseY + 4, w: 4, h: 12 },
      left: { x: baseX + 8, y: baseY + 4, w: 4, h: 12 },
      back: { x: baseX + 12, y: baseY + 4, w: 4, h: 12 },
      top: { x: baseX + 4, y: baseY, w: 4, h: 4 },
      bottom: { x: baseX + 8, y: baseY + 4, w: 4, h: -4 },
    };
  }

  function legUV(baseX, baseY) {
    return {
      right: { x: baseX, y: baseY + 4, w: 4, h: 12 },
      front: { x: baseX + 4, y: baseY + 4, w: 4, h: 12 },
      left: { x: baseX + 8, y: baseY + 4, w: 4, h: 12 },
      back: { x: baseX + 12, y: baseY + 4, w: 4, h: 12 },
      top: { x: baseX + 4, y: baseY, w: 4, h: 4 },
      bottom: { x: baseX + 8 + 4, y: baseY + 4, w: -4, h: -4 },
    };
  }

  const leftArm = createPart(
    'leftArm',
    createCube(4, 12, 4, armUV(32, 48), bodyMaterial),
    createCube(4, 12, 4, armUV(48, 48), bodyMaterial, 0.5),
    new THREE.Vector3(6, 18, 0)
  );
  playerRoot.add(createPivotForPart(leftArm, 6, 22, 0));

  const rightArm = createPart(
    'rightArm',
    createCube(4, 12, 4, armUV(40, 16), bodyMaterial),
    createCube(4, 12, 4, armUV(40, 32), bodyMaterial, 0.5),
    new THREE.Vector3(-6, 18, 0)
  );
  playerRoot.add(createPivotForPart(rightArm, -6, 22, 0));

  const leftLeg = createPart(
    'leftLeg',
    createCube(4, 12, 4, legUV(16, 48), bodyMaterial),
    createCube(4, 12, 4, legUV(0, 48), bodyMaterial, 0.5),
    new THREE.Vector3(2, 6, 0)
  );
  playerRoot.add(createPivotForPart(leftLeg, 2, 12, 0));

  const rightLeg = createPart(
    'rightLeg',
    createCube(4, 12, 4, legUV(0, 16), bodyMaterial),
    createCube(4, 12, 4, legUV(0, 32), bodyMaterial, 0.5),
    new THREE.Vector3(-2, 6, 0)
  );
  playerRoot.add(createPivotForPart(rightLeg, -2, 12, 0));

  scene.add(playerRoot);
}

function loadSkin() {
  loader.load(
    './skins/skin.png?' + Date.now(),
    texture => {
      texture.needsUpdate = true;
      nearestFilter(texture);
      if (!mat) {
        mat = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          alphaTest: 0.1,
          side: THREE.DoubleSide,
        });
        buildPlayer();
      }
      else {
        mat.map.dispose();
        mat.map = texture;
        mat.needsUpdate = true;
      }
    },
  );
}

loadSkin();

window.electronAPI.onSkinUpdated(() => {
  loadSkin();
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let selectedPart = null;
let isDraggingPart = false;
let previousMouse = new THREE.Vector2();

function getPartFromIntersection(object) {
  let target = object;

  while (target && !selectableParts.includes(target)) {
    target = target.parent;
  }

  return target;
}

window.addEventListener('pointerdown', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const meshes = [];

  selectableParts.forEach((part) => {
    part.traverse((obj) => {
      if (obj.isMesh) meshes.push(obj);
    });
  });

  const intersects = raycaster.intersectObjects(meshes);

  if (intersects.length > 0) {
    selectedPart = getPartFromIntersection(intersects[0].object);

    if (selectedPart) {
      isDraggingPart = true;
      orbit.enabled = false;

      previousMouse.set(event.clientX, event.clientY);
    }
  }
});

window.addEventListener('pointermove', (event) => {
  if (!isDraggingPart || !selectedPart) return;

  const deltaX = event.clientX - previousMouse.x;
  const deltaY = event.clientY - previousMouse.y;

  const yaw = orbit.getAzimuthalAngle();
  console.log(yaw);

  if (selectedPart == head_pv) {
    selectedPart.rotation.order = 'YXZ';
    selectedPart.rotation.y += deltaX * 0.01;
    selectedPart.rotation.x += deltaY * 0.01;
  }
  else {
    selectedPart.rotation.z +=
      deltaX * 0.01 * Math.cos(yaw) -
      deltaY * 0.01 * Math.sin(yaw);
    selectedPart.rotation.x +=
      deltaX * 0.01 * Math.sin(yaw) +
      deltaY * 0.01 * Math.cos(yaw);
  }

  previousMouse.set(event.clientX, event.clientY);
});

window.addEventListener('pointerup', () => {
  isDraggingPart = false;
  orbit.enabled = true;
});

window.addEventListener('keydown', (e) => {
  if (!currentTransform) return;

  if (e.key === 'r') {
    currentTransform.setMode('rotate');
  }

  if (e.key === 't') {
    currentTransform.setMode('translate');
  }
});

window.addEventListener('resize', () => {
  [camera.left, camera.right, camera.top, camera.bottom] = cam();
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);

  orbit.update();

  renderer.render(scene, camera);
}

animate();
