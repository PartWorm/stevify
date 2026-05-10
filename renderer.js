import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SSAARenderPass } from 'three/examples/jsm/postprocessing/SSAARenderPass.js';

function $(q) {
    return document.querySelector(q);
}

let canvas = $('#canvas');

let scene = new THREE.Scene();
scene.background = new THREE.Color('skyblue');

function ortho_cam() {
    let ww = 800;
    let wh = 800;
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
orbit.enablePan = false;
orbit.target.set(0, 16, 0);

let light = new THREE.DirectionalLight(0xffffff, 1.2);
light.position.set(-40, 80, 40);
light.castShadow = true;
let range = 30;
light.shadow.camera.left = -range;
light.shadow.camera.right = range;
light.shadow.camera.top = range;
light.shadow.camera.bottom = -range;
light.shadow.camera.near = 1;
light.shadow.camera.far = 200;
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;
scene.add(light);

let floor_geom = new THREE.PlaneGeometry(120, 120);
let floor_mat =
    new THREE.ShadowMaterial({
        opacity: 0.7,
    });
floor_mat.depthWrite = false;
let floor = new THREE.Mesh(floor_geom, floor_mat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

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

function migrate_skin(tex) {
    let image = tex.image;
    if (!image || image.width !== 64 || image.height !== 32) {
        return tex;
    }

    let canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;

    let ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(image, 0, 0);

    function copy(sx, sy, sw, sh, dx, dy, flipX = false) {
        ctx.save();

        if (flipX) {
            ctx.scale(-1, 1);
            dx = -dx - sw;
        }

        ctx.drawImage(
            image,
            sx, sy, sw, sh,
            dx, dy, sw, sh
        );

        ctx.restore();
    }

    // ----- LEFT LEG -----
    copy(4, 16, 4, 4, 20, 48, true);
    copy(8, 16, 4, 4, 24, 48, true);
    copy(0, 20, 4, 12, 16, 52, true);
    copy(4, 20, 4, 12, 20, 52, true);
    copy(8, 20, 4, 12, 24, 52, true);
    copy(12, 20, 4, 12, 28, 52, true);

    // ----- LEFT ARM -----
    copy(44, 16, 4, 4, 36, 48, true);
    copy(48, 16, 4, 4, 40, 48, true);
    copy(40, 20, 4, 12, 32, 52, true);
    copy(44, 20, 4, 12, 36, 52, true);
    copy(48, 20, 4, 12, 40, 52, true);
    copy(52, 20, 4, 12, 44, 52, true);

    let new_tex = new THREE.CanvasTexture(canvas);
    new_tex.magFilter = THREE.NearestFilter;
    new_tex.minFilter = THREE.NearestFilter;
    new_tex.wrapS = THREE.ClampToEdgeWrapping;
    new_tex.wrapT = THREE.ClampToEdgeWrapping;
    new_tex.needsUpdate = true;

    return new_tex;
}

function load_skin(name, path) {
    document.title = name;
    loader.load(
        path.startsWith('data:') ? path : `${path}?${Date.now()}`,
        skin => {
            skin = migrate_skin(skin);
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

function template(str) {
    let dom = document.createElement('template');
    dom.innerHTML = str.trim();
    return dom.content.firstChild;
}

let view = (() => {
    let base = (() => {
        let base =
            template(`
                <div style="
                    position: absolute;
                    left: 50%;
                    top: 8px;

                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    padding: 6px 8px;

                    transform: translateX(-50%) translateY(0);

                    background: #fff6;
                    backdrop-filter: blur(8px);
                    filter: drop-shadow(0 2px 8px #0004);
                    border-radius: 32px;
                    corner-shape: superellipse(1.5);
                "></div>
            `);

        document.documentElement.addEventListener('mouseenter', () => {
            base.style.transition = 'transform 500ms cubic-bezier(0.17, 1.43, 0.64, 1)';
            base.style.transform = 'translateX(-50%) translateY(0)';
        });

        document.documentElement.addEventListener('mouseleave', () => {
            base.style.transition = 'transform 500ms cubic-bezier(0.36, 0, 0.76, -0.41)';
            base.style.transform = 'translateX(-50%) translateY(-80px)';
        });

        return base;
    })();

    document.body.appendChild(base);

    function group() {
        return (
            template(`
                <div style="
                    display: flex;
                    flex-direction: row;
                    gap: -2px;
                ">
                </div>
            `)
        );
    }

    function divider() {
        return (
            template(`
                <div style="
                    display: flex;
                    margin: 0 6px;
                    width: 1px;
                    height: 16px;
                    background: #0003;
                ">
                </div>
            `)
        );
    }

    function btn(src) {
        let btn =
            template(`
                <div style="
                    display: flex;
                    width: 36px;
                    height: 36px;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: transform 0.1s ease, opacity 0.3s ease;
                    user-select: none;
                ">
                </div>
            `);

        let icon =
            template(`
                <span class="material-symbols-outlined"
                    style="transform: scale(calc(26 / 24));">${src}</span>
            `);

        btn.appendChild(icon);

        let base_scale = src == 'download' ? 1.1 : src == 'light_mode' ? 0.88 : 1;

        let st = {
            hover: false,
            down: false,
            down_override: false,
        };
        let raising;
        function set_st(new_st) {
            if (new_st.down || new_st.down_override) {
                btn.style.transition = 'transform 0.08s ease';
            }
            else {
                btn.style.transition = 'transform 0.15s ease';
            }

            Object.assign(st, new_st);

            if (st.down || st.down_override) {
                btn.style.transform = `scale(${0.93 * base_scale})`;
            }
            else if (st.hover) {
                btn.style.transform = `scale(${1.06 * base_scale})`;
            }
            else {
                btn.style.transform = `scale(${1 * base_scale})`;
            }
        }
        set_st({});

        btn.addEventListener('mousedown', () => {
            raising && clearTimeout(raising);
            set_st({ down: true });
        });

        window.addEventListener('mouseup', () => {
            raising = setTimeout(() => {
                set_st({ down: false });
            }, 80);
        });

        btn.addEventListener('mouseenter', () => {
            set_st({ hover: true });
        });

        btn.addEventListener('mouseleave', () => {
            set_st({ hover: false });
        });

        return {
            el: btn,
            icon,
            keep_down() {
                raising && clearTimeout(raising);
                set_st({ down_override: true });
            },
            unkeep_down() {
                raising = setTimeout(() => {
                    set_st({ down_override: false });
                }, 80);
            },
        };
    }

    let g1 = group();
    base.appendChild(g1);

    base.appendChild(divider());

    let g2 = group();
    base.appendChild(g2);

    base.appendChild(divider());

    let g3 = group();
    base.appendChild(g3);

    let select_skin = btn('checkroom');
    let copy = btn('content_copy');
    let download = btn('download');
    let toggle_light = btn('light_mode');

    g1.appendChild(select_skin.el);
    g2.appendChild(toggle_light.el);
    g3.appendChild(copy.el);
    g3.appendChild(download.el);

    let copy2 = (() => {
        let timeout;
        return {
            el: copy.el,
            ok() {
                if (timeout) {
                    return;
                }

                let chk_color = '#004e80';

                let chk =
                    template(`
                        <svg viewBox="0 0 24 24" style="
                            position: absolute;
                            left: calc(50% - 14px);
                            top: calc(50% - 14px);
                            width: 28px;
                            height: 28px;
                            fill: none;
                            stroke: ${chk_color};
                            stroke-width: 1;
                            stroke-linecap: round;
                            stroke-linejoin: round;
                            transform: scale(1.3);
                        ">
                            <path
                                d="M7 12.5l3 3 7-7"
                                class="check"
                                pathLength="100"
                                style="
                                    stroke-dasharray: 100;
                                    stroke-dashoffset: 100;
                                "
                            />
                        </svg>
                    `);

                copy.el.appendChild(chk);

                let path = chk.querySelector('path');

                path.style.transition = 'none';
                path.style.strokeDashoffset = '100';
                path.style.opacity = '1';

                path.getBoundingClientRect();

                path.style.transition = `
                    stroke-dashoffset 300ms cubic-bezier(.36,0,.16,1),
                    opacity 300ms ease-out
                `;
                path.style.strokeDashoffset = '0';

                copy.icon.style.transition = `
                    color 300ms ease,
                    opacity 300ms ease
                `;
                copy.icon.style.color = chk_color;
                copy.icon.style.opacity = '0.5';
                copy.keep_down();

                timeout = setTimeout(() => {
                    timeout = undefined;
                    path.style.opacity = '0';
                    copy.icon.style.color = '';
                    copy.icon.style.opacity = '';
                    copy.unkeep_down();
                    setTimeout(() => {
                        chk.remove();
                    }, 300);
                }, 1500);
            },
        };
    })();

    return {
        select_skin,
        copy: copy2,
        download,
        toggle_light,
    };
})();

let api = window.electronAPI;

api.on_skin_updated((_, { name, path }) => {
    load_skin(name, path);
});

view.select_skin.el.addEventListener('click', async () => {
    await api.set_always_on_top(false);
    await api.select_skin();
    await api.set_always_on_top(true);
});

view.download.el.addEventListener('click', () => {
    composer.render();
    api.download(renderer.domElement.toDataURL("image/png"));
});

view.copy.el.addEventListener('click', () => {
    composer.render();
    renderer.domElement.toBlob(async blob => {
        try {
            await navigator.clipboard.write([
                new ClipboardItem({
                    'image/png': blob,
                }),
            ]);
            view.copy.ok();
        }
        catch (err) {
            console.error('Failed to copy image:', err);
        }
    }, 'image/png');
});

view.toggle_light.el.addEventListener('click', () => {
    light.castShadow = !light.castShadow;
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

load_skin('Untitled', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAYAAACinX6EAAABhWlDQ1BJQ0MgcHJvZmlsZQAAKJF9kb9Lw0AcxV9ba6VUFOwgIpihOtlFRRxrFYpQIdQKrTqYXPpDaNKQpLg4Cq4FB38sVh1cnHV1cBUEwR8g/gHipOgiJX4vKbSI8eC4D+/uPe7eAf5GhalmVwJQNcvIpJJCLr8ihF4RRDfC6MeIxEx9VhTT8Bxf9/Dx9S7Os7zP/Tl6lYLJAJ9AnGC6YRGvE09vWjrnfeIoK0sK8TnxuEEXJH7kuuzyG+eSw36eGTWymTniKLFQ6mC5g1nZUImniGOKqlG+P+eywnmLs1qpsdY9+QsjBW15ies0h5HCAhYhQoCMGjZQgYU4rRopJjK0n/TwDzl+kVwyuTbAyDGPKlRIjh/8D353axYnJ9ykSBIIvtj2xygQ2gWaddv+Prbt5gkQeAautLa/2gBmPkmvt7XYEdC3DVxctzV5D7jcAQafdMmQHClA018sAu9n9E15YOAWCK+6vbX2cfoAZKmr9A1wcAiMlSh7zePdPZ29/Xum1d8PTIFylxB8JroAAAAGYktHRADNAEAA/7Ve9VgAAAAJcEhZcwAALiMAAC4jAXilP3YAAAAHdElNRQfqBQoIGyKuEyaWAAAAGXRFWHRDb21tZW50AENyZWF0ZWQgd2l0aCBHSU1QV4EOFwAAAJNJREFUaN7t2MENgCAMheHWuAln9mOEjsMunJlFz3JoQ4jRhP9da4j5gspTJUgp5ZKFmJnKj3PI5gEAAAAAAGDnnLVW9zufc3YXaK258967u35KSdkBAAAAAAAAAPBJdLb/R/3+7f8Hq/fHDgAAgOc7YOwC49l/POvPzqPusHp9NI+6Bo8AAAAAAAAAAAAAAACb5gYswy1PiwN9MQAAAABJRU5ErkJggg==');
