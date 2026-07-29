import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { sound, mountMuteButton } from "./sound.js";

const params = new URLSearchParams(window.location.search);
const requestedId = params.get("id") || "a";
const isCompare = requestedId === "compare";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduceMotion) document.body.classList.add("reduce-motion");

mountMuteButton(document.body);

const host = document.getElementById("canvas-host");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingFill = document.getElementById("loading-fill");
const loadingLabel = document.getElementById("loading-label");
const loadingError = document.getElementById("loading-error");
const retryBtn = document.getElementById("retry-btn");
const panelLeft = document.getElementById("panel-left");
const panelRight = document.getElementById("panel-right");
const obsList = document.getElementById("obs-list");
const panelBottom = document.getElementById("panel-bottom");
const panelModes = document.getElementById("panel-modes");
const legendLeft = document.getElementById("legend-left");
const legendRight = document.getElementById("legend-right");
const crumbCurrent = document.getElementById("crumb-current");
const noticeEl = document.getElementById("notice");

// ---------------------------------------------------------------
// three.js 공통 씬 구성
// ---------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.localClippingEnabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030303);
scene.fog = new THREE.FogExp2(0x030303, 0.0009);

const camera = new THREE.PerspectiveCamera(38, 1, 1, 20000);
camera.position.set(300, 200, 500);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 50;
controls.maxDistance = 4000;
controls.target.set(0, 0, 0);

// 조명 — 차가운 회백색 중심광 + 포인터를 따라가는 조사광 + 은은한 림
const ambient = new THREE.AmbientLight(0xaab2c0, 1.4);
scene.add(ambient);

const key = new THREE.DirectionalLight(0xd7dde6, 1.4);
key.position.set(250, 500, 350);
scene.add(key);

const rim = new THREE.DirectionalLight(0x9fb0c8, 0.9);
rim.position.set(-400, 300, -300);
scene.add(rim);

const spot = new THREE.SpotLight(0xe4e8ef, 9, 3000, Math.PI / 5, 0.5, 1.2);
spot.position.set(300, 500, 300);
scene.add(spot);
scene.add(spot.target);

// 해부대 바닥
const floorGeo = new THREE.CircleGeometry(1400, 64);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.55, metalness: 0.35 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.5;
scene.add(floor);
const grid = new THREE.GridHelper(2800, 56, 0x2a2c31, 0x151619);
grid.position.y = -0.4;
scene.add(grid);

function resize() {
  const w = host.clientWidth;
  const h = host.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener("resize", resize);
resize();

// 포인터를 따라가는 조사 조명
let pointerLightEnabled = true;
function updateSpotFromPointer(nx, ny) {
  if (!pointerLightEnabled) return;
  const dir = new THREE.Vector3(nx, 0, ny).multiplyScalar(600);
  spot.position.set(dir.x, 600, dir.z + 400);
  spot.target.position.set(nx * 200, 0, ny * 200);
}
renderer.domElement.addEventListener("pointermove", (e) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
  updateSpotFromPointer(nx, ny);
});
updateSpotFromPointer(0.3, -0.2);

// ---------------------------------------------------------------
// 로딩 진행률 UI
// ---------------------------------------------------------------
function setLoading(active, text) {
  loadingOverlay.classList.toggle("hidden", !active);
  if (text) loadingLabel.textContent = text;
}
function setProgress(ratio) {
  loadingFill.style.width = `${Math.round(ratio * 100)}%`;
}
function showLoadError(msg, retryFn) {
  loadingLabel.textContent = "모델을 불러오지 못했습니다";
  loadingError.textContent = msg;
  loadingError.classList.remove("sr-only");
  retryBtn.style.display = "inline-flex";
  retryBtn.onclick = () => {
    loadingError.classList.add("sr-only");
    retryBtn.style.display = "none";
    setLoading(true, "SPECIMEN LOADING…");
    setProgress(0);
    retryFn();
  };
}

const loader = new GLTFLoader();

function loadSpecimen(spec) {
  return new Promise((resolve, reject) => {
    const attempt = () => {
      loader.load(
        spec.modelFile,
        (gltf) => resolve(gltf.scene),
        (evt) => {
          if (evt.lengthComputable) setProgress(evt.loaded / evt.total);
        },
        (err) => {
          showLoadError(`${spec.modelFile} 로딩 실패`, attempt);
          reject(err);
        }
      );
    };
    attempt();
  });
}

function centerAndMeasure(object3d) {
  const box = new THREE.Box3().setFromObject(object3d);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  object3d.position.sub(center);
  const radius = size.length() / 2;
  return { size, radius, halfExtents: size.clone().multiplyScalar(0.5) };
}

function fitCameraToRadius(radius) {
  const dist = Math.max(radius * 2.1, controls.minDistance + 20);
  camera.position.set(dist * 0.55, dist * 0.42, dist * 0.72);
  controls.target.set(0, 0, 0);
  controls.minDistance = radius * 0.6;
  controls.maxDistance = radius * 6;
  controls.update();
}

function setWireframe(root, on) {
  root.traverse((obj) => {
    if (obj.isMesh) obj.material.wireframe = on;
  });
}

// ---------------------------------------------------------------
// 데이터 로드 후 모드별 분기
// ---------------------------------------------------------------
fetch("data/specimens.json")
  .then((r) => r.json())
  .then((data) => {
    noticeEl.innerHTML = `<b>실제 유물 안내</b> — ${data.notice.kr}`;
    if (isCompare) {
      const a = data.specimens.find((s) => s.id === "a");
      const b = data.specimens.find((s) => s.id === "b");
      initCompareMode(a, b);
    } else {
      const spec = data.specimens.find((s) => s.id === requestedId) || data.specimens[0];
      initObserveMode(spec);
    }
  })
  .catch((err) => {
    setLoading(true);
    showLoadError(`표본 데이터를 불러오지 못했습니다 (${err.message})`, () => window.location.reload());
  });

function renderModeTabs(active) {
  panelModes.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === active);
    if (!btn.disabled) {
      btn.onclick = () => {
        if (btn.dataset.mode === "observe") window.location.href = `detail.html?id=${requestedId === "compare" ? "a" : requestedId}`;
        if (btn.dataset.mode === "compare") window.location.href = "detail.html?id=compare";
      };
    }
  });
}

function infoPanelHTML(spec) {
  return `
    <span class="code">${spec.code}</span>
    <div class="direction">/ ${spec.directionEn} · ${spec.directionKr}</div>
    <div class="name">${spec.nameKr}</div>
    <dl>
      <dt>제작·게시</dt><dd>${spec.author}</dd>
      <dt>모델명</dt><dd>${spec.sketchfabTitle}</dd>
      <dt>라이선스</dt><dd>${spec.license}</dd>
      <dt>폴리곤</dt><dd>${spec.triangles.toLocaleString()} triangles</dd>
    </dl>
  `;
}

// ---------------------------------------------------------------
// 관찰 모드 (단일 표본)
// ---------------------------------------------------------------
function initObserveMode(spec) {
  crumbCurrent.textContent = `${spec.code} / ${spec.directionEn}`;
  panelLeft.innerHTML = infoPanelHTML(spec);
  renderModeTabs("observe");

  let wireOn = false;
  panelBottom.innerHTML = `
    <button class="btn btn-icon" id="btn-reset" title="시점 초기화">⟳ 초기화</button>
    <button class="btn btn-icon" id="btn-zoom-in" title="확대">+ 확대</button>
    <button class="btn btn-icon" id="btn-zoom-out" title="축소">− 축소</button>
    <button class="btn btn-icon" id="btn-light" title="조사광 고정/이동">💡 조명 이동</button>
    <button class="btn btn-icon" id="btn-wire" title="표면/와이어프레임">▦ 와이어프레임</button>
    <a class="btn btn-ghost" href="list.html">표본 목록</a>
  `;

  setLoading(true, "SPECIMEN LOADING…");
  setProgress(0);
  loadSpecimen(spec).then((root) => {
    scene.add(root);
    const { radius, halfExtents } = centerAndMeasure(root);
    fitCameraToRadius(radius);
    setLoading(false);

    panelRight.style.display = "block";
    obsList.innerHTML = "";
    spec.observationPoints.forEach((p) => {
      const btn = document.createElement("button");
      btn.className = "obs-btn";
      btn.textContent = p.labelKr;
      btn.onclick = () => {
        obsList.querySelectorAll(".obs-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        flyToRegion(p.id, halfExtents, radius);
      };
      obsList.appendChild(btn);
    });

    document.getElementById("btn-reset").onclick = () => {
      fitCameraToRadius(radius);
      obsList.querySelectorAll(".obs-btn").forEach((b) => b.classList.remove("active"));
    };
    document.getElementById("btn-zoom-in").onclick = () => dolly(0.82);
    document.getElementById("btn-zoom-out").onclick = () => dolly(1.22);
    document.getElementById("btn-light").onclick = (e) => {
      pointerLightEnabled = !pointerLightEnabled;
      e.target.classList.toggle("active", pointerLightEnabled);
    };
    document.getElementById("btn-wire").onclick = (e) => {
      wireOn = !wireOn;
      setWireframe(root, wireOn);
      e.target.textContent = wireOn ? "▦ 표면 보기" : "▦ 와이어프레임";
    };
  });
}

// 두 GLB 모두 몸통의 긴 축이 로컬 X축, 좌우 폭이 Z축, 높이가 Y축이다.
// 정면 관찰 시 얼굴은 -X 방향에 위치한다 (실측 스크린샷으로 확인됨).
const REGION_FRAC = {
  face: { x: -1, y: 0.55, z: 0 },
  horn: { x: -0.7, y: 1, z: 0 },
  mouth: { x: -1, y: 0.38, z: 0 },
  mane: { x: -0.5, y: 0.85, z: 0 },
  frontpaw: { x: -0.6, y: -0.85, z: 0.5 },
  backpaw: { x: 0.6, y: -0.85, z: 0.5 },
  body: { x: 0, y: 0.05, z: 0.95 },
  tail: { x: 1, y: 0.3, z: 0 },
  surface: { x: 0.3, y: 0.2, z: 0.9 },
};

function flyToRegion(regionId, halfExtents, radius) {
  const frac = REGION_FRAC[regionId] || { x: 0.8, y: 0.2, z: 0.8 };
  const dir = new THREE.Vector3(frac.x, frac.y, frac.z);
  if (dir.lengthSq() === 0) dir.set(0, 0, 1);
  const target = new THREE.Vector3(frac.x * halfExtents.x * 0.8, frac.y * halfExtents.y * 0.8, frac.z * halfExtents.z * 0.8);
  const camPos = target.clone().add(dir.clone().normalize().multiplyScalar(radius * 1.5));
  animateCamera(camPos, target);
}

let camAnim = null;
function animateCamera(toPos, toTarget) {
  const fromPos = camera.position.clone();
  const fromTarget = controls.target.clone();
  if (reduceMotion) {
    camera.position.copy(toPos);
    controls.target.copy(toTarget);
    controls.update();
    return;
  }
  const duration = 700;
  const start = performance.now();
  if (camAnim) cancelAnimationFrame(camAnim);
  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    camera.position.lerpVectors(fromPos, toPos, ease);
    controls.target.lerpVectors(fromTarget, toTarget, ease);
    controls.update();
    if (t < 1) camAnim = requestAnimationFrame(step);
  }
  camAnim = requestAnimationFrame(step);
}

function dolly(factor) {
  const dir = camera.position.clone().sub(controls.target);
  dir.multiplyScalar(factor);
  camera.position.copy(controls.target).add(dir);
  controls.update();
}

// ---------------------------------------------------------------
// 비교 절개 모드
// ---------------------------------------------------------------
function initCompareMode(specA, specB) {
  crumbCurrent.textContent = "COMPARE / A + B";
  panelLeft.style.display = "none";
  legendLeft.style.display = "block";
  legendRight.style.display = "block";
  renderModeTabs("compare");

  let cutValue = 50; // 0~100
  let flipped = false;
  let wireOn = false;

  panelBottom.innerHTML = `
    <button class="btn btn-icon" id="btn-reset" title="시점 초기화">⟳ 초기화</button>
    <input type="range" id="cut-slider" min="0" max="100" value="50" style="width:160px" aria-label="절개 위치" />
    <button class="btn btn-icon" id="btn-flip" title="A/B 방향 뒤집기">⇄ 뒤집기</button>
    <button class="btn btn-icon" id="btn-front" title="정면">정면</button>
    <button class="btn btn-icon" id="btn-side" title="측면">측면</button>
    <button class="btn btn-icon" id="btn-back" title="후면">후면</button>
    <button class="btn btn-icon" id="btn-wire" title="표면/와이어프레임">▦ 와이어프레임</button>
    <a class="btn btn-ghost" href="list.html">표본 목록</a>
  `;

  function updateLegend() {
    const leftSpec = flipped ? specB : specA;
    const rightSpec = flipped ? specA : specB;
    legendLeft.innerHTML = `<span class="code">${leftSpec.code}</span><span class="direction">${leftSpec.directionEn}</span>`;
    legendRight.innerHTML = `<span class="code">${rightSpec.code}</span><span class="direction">${rightSpec.directionEn}</span>`;
  }
  updateLegend();

  setLoading(true, "SPECIMEN A / B LOADING…");
  setProgress(0);
  let loadedCount = 0;
  const totalToLoad = 2;
  function bumpProgress() {
    loadedCount += 1;
    setProgress(loadedCount / totalToLoad);
  }

  Promise.all([
    loadSpecimen(specA).then((r) => (bumpProgress(), r)),
    loadSpecimen(specB).then((r) => (bumpProgress(), r)),
  ])
    .then(([rootA, rootB]) => {
      scene.add(rootA);
      scene.add(rootB);
      const measA = centerAndMeasure(rootA);
      const measB = centerAndMeasure(rootB);
      const radius = Math.max(measA.radius, measB.radius);
      fitCameraToRadius(radius);
      setLoading(false);
      sound.thud();

      // 절개 경계 표시용 발광 평면
      const cutPlaneGeo = new THREE.PlaneGeometry(8, radius * 2.4);
      const cutPlaneMat = new THREE.MeshBasicMaterial({
        color: 0x9c3232,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const cutPlaneMesh = new THREE.Mesh(cutPlaneGeo, cutPlaneMat);
      scene.add(cutPlaneMesh);

      const clipPlaneLeft = new THREE.Plane();
      const clipPlaneRight = new THREE.Plane();

      function applyClipping(root, plane) {
        root.traverse((obj) => {
          if (obj.isMesh) obj.material.clippingPlanes = [plane];
        });
      }

      function refreshSides() {
        const leftRoot = flipped ? rootB : rootA;
        const rightRoot = flipped ? rootA : rootB;
        applyClipping(leftRoot, clipPlaneLeft);
        applyClipping(rightRoot, clipPlaneRight);
      }
      refreshSides();

      function updateClip() {
        const camRight = new THREE.Vector3();
        camera.getWorldDirection(camRight);
        camRight.cross(camera.up).normalize().negate();
        // camRight now points to screen-right in world space
        const offsetWorld = (cutValue / 100 - 0.5) * 2 * radius * 1.05;
        const cutPoint = camRight.clone().multiplyScalar(offsetWorld);

        clipPlaneLeft.setFromNormalAndCoplanarPoint(camRight.clone().negate(), cutPoint);
        clipPlaneRight.setFromNormalAndCoplanarPoint(camRight.clone(), cutPoint);

        cutPlaneMesh.position.copy(cutPoint);
        cutPlaneMesh.lookAt(cutPoint.clone().add(camRight));
      }
      compareUpdaters.push(updateClip);
      updateClip();

      const slider = document.getElementById("cut-slider");
      slider.addEventListener("input", () => {
        cutValue = Number(slider.value);
        updateClip();
      });

      let dragging = false;
      renderer.domElement.addEventListener("pointerdown", (e) => {
        if (e.target !== renderer.domElement) return;
        dragging = true;
      });
      window.addEventListener("pointerup", () => {
        if (dragging) sound.dust(0.3);
        dragging = false;
      });
      renderer.domElement.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const rect = renderer.domElement.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        cutValue = ratio * 100;
        slider.value = String(cutValue);
        updateClip();
      });

      document.getElementById("btn-flip").onclick = () => {
        flipped = !flipped;
        refreshSides();
        updateLegend();
        sound.scrape(0.4);
      };
      document.getElementById("btn-wire").onclick = (e) => {
        wireOn = !wireOn;
        setWireframe(rootA, wireOn);
        setWireframe(rootB, wireOn);
        e.target.textContent = wireOn ? "▦ 표면 보기" : "▦ 와이어프레임";
      };
      document.getElementById("btn-reset").onclick = () => fitCameraToRadius(radius);
      document.getElementById("btn-front").onclick = () => presetView(radius, 0);
      document.getElementById("btn-side").onclick = () => presetView(radius, Math.PI / 2);
      document.getElementById("btn-back").onclick = () => presetView(radius, Math.PI);
    })
    .catch(() => {});
}

function presetView(radius, azimuth) {
  const dist = radius * 2.1;
  const x = Math.sin(azimuth) * dist;
  const z = Math.cos(azimuth) * dist;
  animateCamera(new THREE.Vector3(x, dist * 0.32, z), new THREE.Vector3(0, 0, 0));
}

// ---------------------------------------------------------------
// 렌더 루프
// ---------------------------------------------------------------
const compareUpdaters = [];
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  for (const fn of compareUpdaters) fn();
  renderer.render(scene, camera);
}
animate();
