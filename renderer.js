import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

const canvas = document.getElementById('canvas');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2a2a);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

camera.position.set(0, 18, 35);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const orbit = new OrbitControls(camera, renderer.domElement);
// orbit.enableDamping = true;

const light = new THREE.DirectionalLight(0xffffff, 1.2);
light.position.set(20, 30, 20);
light.castShadow = true;
scene.add(light);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const grid = new THREE.GridHelper(100, 100);
scene.add(grid);

const loader = new THREE.TextureLoader();

let skinTexture;
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
    uv.right,
    uv.left,
    uv.top,
    uv.bottom,
    uv.front,
    uv.back
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

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
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

  selectableParts.push(group);

  return group;
}

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
      left: { x: 16, y: 8, w: 8, h: 8 },
      top: { x: 8, y: 0, w: 8, h: 8 },
      bottom: { x: 16, y: 0, w: 8, h: 8 },
      front: { x: 8, y: 8, w: 8, h: 8 },
      back: { x: 24, y: 8, w: 8, h: 8 }
    },
    bodyMaterial
  );

  const headOuter = createCube(
    8,
    8,
    8,
    {
      right: { x: 32, y: 8, w: 8, h: 8 },
      left: { x: 48, y: 8, w: 8, h: 8 },
      top: { x: 40, y: 0, w: 8, h: 8 },
      bottom: { x: 48, y: 0, w: 8, h: 8 },
      front: { x: 40, y: 8, w: 8, h: 8 },
      back: { x: 56, y: 8, w: 8, h: 8 }
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

  playerRoot.add(head);

  const bodyInner = createCube(
    8,
    12,
    4,
    {
      right: { x: 16, y: 20, w: 4, h: 12 },
      left: { x: 28, y: 20, w: 4, h: 12 },
      top: { x: 20, y: 16, w: 8, h: 4 },
      bottom: { x: 28, y: 16, w: 8, h: 4 },
      front: { x: 20, y: 20, w: 8, h: 12 },
      back: { x: 32, y: 20, w: 8, h: 12 }
    },
    bodyMaterial
  );

  const bodyOuter = createCube(
    8,
    12,
    4,
    {
      right: { x: 16, y: 36, w: 4, h: 12 },
      left: { x: 28, y: 36, w: 4, h: 12 },
      top: { x: 20, y: 32, w: 8, h: 4 },
      bottom: { x: 28, y: 32, w: 8, h: 4 },
      front: { x: 20, y: 36, w: 8, h: 12 },
      back: { x: 32, y: 36, w: 8, h: 12 }
    },
    bodyMaterial,
    0.5
  );

  const body = createPart(
    'body',
    bodyInner,
    bodyOuter,
    new THREE.Vector3(0, 18, 0)
  );

  playerRoot.add(body);

  function armUV(baseX, baseY) {
    return {
      right: { x: baseX, y: baseY + 4, w: 4, h: 12 },
      left: { x: baseX + 8, y: baseY + 4, w: 4, h: 12 },
      top: { x: baseX + 4, y: baseY, w: 4, h: 4 },
      bottom: { x: baseX + 8, y: baseY, w: 4, h: 4 },
      front: { x: baseX + 4, y: baseY + 4, w: 4, h: 12 },
      back: { x: baseX + 12, y: baseY + 4, w: 4, h: 12 }
    };
  }

  function legUV(baseX, baseY) {
    return {
      right: { x: baseX, y: baseY + 4, w: 4, h: 12 },
      left: { x: baseX + 8, y: baseY + 4, w: 4, h: 12 },
      top: { x: baseX + 4, y: baseY, w: 4, h: 4 },
      bottom: { x: baseX + 8, y: baseY, w: 4, h: 4 },
      front: { x: baseX + 4, y: baseY + 4, w: 4, h: 12 },
      back: { x: baseX + 12, y: baseY + 4, w: 4, h: 12 }
    };
  }

  const leftArm = createPart(
    'leftArm',
    createCube(4, 12, 4, armUV(32, 48), bodyMaterial),
    createCube(4, 12, 4, armUV(48, 48), bodyMaterial, 0.5),
    new THREE.Vector3(6, 18, 0)
  );

  const rightArm = createPart(
    'rightArm',
    createCube(4, 12, 4, armUV(40, 16), bodyMaterial),
    createCube(4, 12, 4, armUV(40, 32), bodyMaterial, 0.5),
    new THREE.Vector3(-6, 18, 0)
  );

  const leftLeg = createPart(
    'leftLeg',
    createCube(4, 12, 4, legUV(16, 48), bodyMaterial),
    createCube(4, 12, 4, legUV(0, 48), bodyMaterial, 0.5),
    new THREE.Vector3(2, 6, 0)
  );

  const rightLeg = createPart(
    'rightLeg',
    createCube(4, 12, 4, legUV(0, 16), bodyMaterial),
    createCube(4, 12, 4, legUV(0, 32), bodyMaterial, 0.5),
    new THREE.Vector3(-2, 6, 0)
  );

  playerRoot.add(leftArm);
  playerRoot.add(rightArm);
  playerRoot.add(leftLeg);
  playerRoot.add(rightLeg);

  scene.add(playerRoot);
}

function loadSkin() {
  loader.load(
    './skins/skin.png?' + Date.now(),
    (texture) => {
      console.log('skin load');
      nearestFilter(texture);
      skinTexture = texture;
      buildPlayer(texture);
    }
  );
}

loadSkin();

window.electronAPI.onSkinUpdated(() => {
  loadSkin();
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

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
    let target = intersects[0].object;

    while (target && !selectableParts.includes(target)) {
      target = target.parent;
    }

    if (target) {
      if (currentTransform) {
        scene.remove(currentTransform);
      }

      currentTransform = new TransformControls(camera, renderer.domElement);
      currentTransform.attach(target);
      currentTransform.setMode('rotate');
      currentTransform.size = 0.75;

      currentTransform.addEventListener('dragging-changed', (e) => {
        orbit.enabled = !e.value;
      });

      scene.add(currentTransform.getHelper());
    }
  }
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
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);

  orbit.update();

  renderer.render(scene, camera);
}

animate();
