import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SSAARenderPass } from 'three/examples/jsm/postprocessing/SSAARenderPass.js';

let canvas = document.getElementById('canvas');

let scene = new THREE.Scene();
scene.background = new THREE.Color('skyblue');

function ortho_cam() {
    let ww = window.innerWidth;
    let wh = window.innerHeight;
    return [
        -ww / 2 * 0.05,
        ww / 2 * 0.05,
        wh / 2 * 0.05,
        -wh / 2 * 0.05,
    ];
}

let camera =
    new THREE.PerspectiveCamera(
        45,
        1,
        0.1,
        1000
    );
camera =
    new THREE.OrthographicCamera(
        ...ortho_cam(),
        1,
        1000,
    );
camera.position.set(-40, 60, 50);

let renderer =
    new THREE.WebGLRenderer({
        canvas,
        antialias: false,
    });

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

let composer = new EffectComposer(renderer);

let ssaa_pass = new SSAARenderPass(scene, camera);
ssaa_pass.sampleLevel = 4;
composer.addPass(ssaa_pass);

composer.addPass(new OutputPass());

let orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.set(0, 16, 0);

/*
let light = new THREE.DirectionalLight(0xffffff, 1.2);
light.position.set(20, 30, 20);
light.castShadow = true;
scene.add(light);
*/

// scene.add(new THREE.AmbientLight(0xffffff, 0.6));

let loader = new THREE.TextureLoader();

let player_root;

let selectable_parts = [];

function nearest_filter(tex) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
}

function create_cube(w, h, d, uv, texture, inflate = 0) {
    let geometry =
        new THREE.BoxGeometry(
            w + inflate * 2,
            h + inflate * 2,
            d + inflate * 2,
        );

    let face_uvs = [];

    let img_width = 64;
    let img_height = 64;

    function rect(x, y, width, height) {
        return [
            new THREE.Vector2(x / img_width, 1 - y / img_height),
            new THREE.Vector2((x + width) / img_width, 1 - y / img_height),
            new THREE.Vector2((x + width) / img_width, 1 - (y + height) / img_height),
            new THREE.Vector2(x / img_width, 1 - (y + height) / img_height)
        ];
    }

    let order = [
        uv.left,
        uv.right,
        uv.top,
        uv.bottom,
        uv.front,
        uv.back,
    ];

    for (let i = 0; i < order.length; i++) {
        let part = order[i];
        face_uvs.push(rect(part.x, part.y, part.w, part.h));
    }

    let uv_attr = geometry.attributes.uv;

    for (let face = 0; face < 6; face++) {
        let uvs = face_uvs[face];

        let idx = face * 4;

        uv_attr.setXY(idx + 0, uvs[0].x, uvs[0].y);
        uv_attr.setXY(idx + 1, uvs[1].x, uvs[1].y);
        uv_attr.setXY(idx + 2, uvs[3].x, uvs[3].y);
        uv_attr.setXY(idx + 3, uvs[2].x, uvs[2].y);
    }

    uv_attr.needsUpdate = true;

    let mesh = new THREE.Mesh(geometry, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}

function create_part(name, inner_mesh, outer_mesh, position) {
    let group = new THREE.Group();
    group.name = name;
    group.add(inner_mesh);
    if (outer_mesh) {
        group.add(outer_mesh);
    }
    group.position.copy(position);
    return group;
}

function create_pivot(part, pivot_pos, y, z) {
    if (typeof pivot_pos === 'number') {
        pivot_pos = new THREE.Vector3(pivot_pos, y, z);
    };

    let pivot = new THREE.Group();
    pivot.position.copy(pivot_pos);
    pivot.add(part);

    scene.add(pivot);

    part.position.sub(pivot_pos);

    selectable_parts.push(pivot);

    return pivot;
}

let mat;

let head_pv;

function build_player(texture) {
    if (player_root) {
        scene.remove(player_root);
    }

    selectable_parts.length = 0;

    player_root = new THREE.Group();

    let head_inner =
        create_cube(
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
            texture
        );
    let head_outer =
        create_cube(
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
            texture,
            0.5
        );
    let head =
        create_part(
            'head',
            head_inner,
            head_outer,
            new THREE.Vector3(0, 28, 0)
        );
    head_pv = create_pivot(head, new THREE.Vector3(0, 24, 0));
    player_root.add();

    let body_inner =
        create_cube(
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
            texture
        );
    let body_outer =
        create_cube(
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
            texture,
            0.5
        );
    let body =
        create_part(
            'body',
            body_inner,
            body_outer,
            new THREE.Vector3(0, 18, 0),
        );
    player_root.add(body);

    function arm_uv(base_x, base_y) {
        return {
            right: { x: base_x, y: base_y + 4, w: 4, h: 12 },
            front: { x: base_x + 4, y: base_y + 4, w: 4, h: 12 },
            left: { x: base_x + 8, y: base_y + 4, w: 4, h: 12 },
            back: { x: base_x + 12, y: base_y + 4, w: 4, h: 12 },
            top: { x: base_x + 4, y: base_y, w: 4, h: 4 },
            bottom: { x: base_x + 8, y: base_y + 4, w: 4, h: -4 },
        };
    }

    function leg_uv(base_x, base_y) {
        return {
            right: { x: base_x, y: base_y + 4, w: 4, h: 12 },
            front: { x: base_x + 4, y: base_y + 4, w: 4, h: 12 },
            left: { x: base_x + 8, y: base_y + 4, w: 4, h: 12 },
            back: { x: base_x + 12, y: base_y + 4, w: 4, h: 12 },
            top: { x: base_x + 4, y: base_y, w: 4, h: 4 },
            bottom: { x: base_x + 8 + 4, y: base_y + 4, w: -4, h: -4 },
        };
    }

    let left_arm =
        create_part(
            'leftArm',
            create_cube(4, 12, 4, arm_uv(32, 48), texture),
            create_cube(4, 12, 4, arm_uv(48, 48), texture, 0.5),
            new THREE.Vector3(6, 18, 0)
        );
    player_root.add(create_pivot(left_arm, 6, 22, 0));

    let right_arm =
        create_part(
            'rightArm',
            create_cube(4, 12, 4, arm_uv(40, 16), texture),
            create_cube(4, 12, 4, arm_uv(40, 32), texture, 0.5),
            new THREE.Vector3(-6, 18, 0)
        );
    player_root.add(create_pivot(right_arm, -6, 22, 0));

    let left_leg =
        create_part(
            'leftLeg',
            create_cube(4, 12, 4, leg_uv(16, 48), texture),
            create_cube(4, 12, 4, leg_uv(0, 48), texture, 0.5),
            new THREE.Vector3(2, 6, 0)
        );
    player_root.add(create_pivot(left_leg, 2, 12, 0));

    let right_leg =
        create_part(
            'rightLeg',
            create_cube(4, 12, 4, leg_uv(0, 16), texture),
            create_cube(4, 12, 4, leg_uv(0, 32), texture, 0.5),
            new THREE.Vector3(-2, 6, 0)
        );
    player_root.add(create_pivot(right_leg, -2, 12, 0));

    scene.add(player_root);
}

function load_skin() {
    loader.load(
        './skins/skin.png?' + Date.now(),
        skin => {
            skin.needsUpdate = true;
            nearest_filter(skin);
            if (!mat) {
                mat =
                    new THREE.MeshBasicMaterial({
                        map: skin,
                        transparent: true,
                        alphaTest: 0.1,
                        side: THREE.DoubleSide,
                    });
                build_player();
            }
            else {
                mat.map.dispose();
                mat.map = skin;
                mat.needsUpdate = true;
            }
        },
    );
}

load_skin();

window.electronAPI.onSkinUpdated(() => {
    load_skin();
});

let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

let selected_part = null;
let is_dragging_part = false;
let previous_mouse = new THREE.Vector2();

function get_part_from_intersection(obj) {
    let target = obj;
    while (target && !selectable_parts.includes(target)) {
        target = target.parent;
    }
    return target;
}

window.addEventListener('pointerdown', event => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    let meshes = [];

    selectable_parts.forEach(part => {
        part.traverse(obj => {
            if (obj.isMesh) {
                meshes.push(obj);
            }
        });
    });

    let intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
        selected_part = get_part_from_intersection(intersects[0].object);

        if (selected_part) {
            is_dragging_part = true;
            orbit.enabled = false;

            previous_mouse.set(event.clientX, event.clientY);
        }
    }
});

window.addEventListener('pointermove', event => {
    if (!is_dragging_part || !selected_part) return;

    let dx = event.clientX - previous_mouse.x;
    let dy = event.clientY - previous_mouse.y;

    let yaw = orbit.getAzimuthalAngle();

    if (selected_part == head_pv) {
        selected_part.rotation.order = 'YXZ';
        selected_part.rotation.y += dx * 0.01;
        selected_part.rotation.x += dy * 0.01 * Math.cos(yaw);
    }
    else {
        selected_part.rotation.z +=
            dx * 0.01 * Math.cos(yaw) -
            dy * 0.01 * Math.sin(yaw);
        selected_part.rotation.x +=
            dx * 0.01 * Math.sin(yaw) +
            dy * 0.01 * Math.cos(yaw);
    }

    previous_mouse.set(event.clientX, event.clientY);
});

window.addEventListener('pointerup', () => {
    is_dragging_part = false;
    orbit.enabled = true;
});

window.addEventListener('resize', () => {
    [camera.left, camera.right, camera.top, camera.bottom] = ortho_cam();
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);

    orbit.update();

    composer.render();
}

animate();
