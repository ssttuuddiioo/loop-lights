import { useRef, useEffect, useCallback, useState } from 'preact/hooks';
import { useAppState } from '../../state/context';
import { buildThumbnailUrl } from '../../api/media';
import { ZoneModal } from './zone-modal';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const BG_COLOR = 0x080808;
const HOVER_BOOST = 0.3;

/** Floor / environment colors */
const FLOOR_COLOR = 0x0c0c0c;

function collectMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
  });
  return meshes;
}

export function SpatialView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(useAppState());
  const state = useAppState();
  stateRef.current = state;

  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    composer: EffectComposer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    zoneMeshes: THREE.Mesh[][];
    zoneLights: THREE.PointLight[];
    zoneCount: number;
    raycaster: THREE.Raycaster;
    pointer: THREE.Vector2;
    hoveredZone: number;
    animId: number;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Renderer ────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(BG_COLOR);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // ── Scene ───────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(BG_COLOR, 0.018);

    // ── Camera ──────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(
      50, container.clientWidth / container.clientHeight, 0.1, 200,
    );
    camera.position.set(0, 12, 14);
    camera.lookAt(0, 0, 0);

    // ── Controls ────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minDistance = 4;
    controls.maxDistance = 80;
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = Math.PI / 2.2;

    // ── Post-processing (bloom) ─────────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.8,   // strength
      0.4,   // radius
      0.3,   // threshold — low so emissive zones glow
    );
    composer.addPass(bloom);

    // ── Lighting ────────────────────────────────────────────────────
    // Dim ambient so the zone lights dominate
    scene.add(new THREE.AmbientLight(0xffffff, 0.08));

    // Soft overhead fill
    const dir = new THREE.DirectionalLight(0xffffff, 0.2);
    dir.position.set(0, 15, 0);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 50;
    dir.shadow.camera.left = -20;
    dir.shadow.camera.right = 20;
    dir.shadow.camera.top = 20;
    dir.shadow.camera.bottom = -20;
    scene.add(dir);

    // ── Floor ───────────────────────────────────────────────────────
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({
      color: FLOOR_COLOR,
      roughness: 0.25,
      metalness: 0.6,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.05;
    floor.receiveShadow = true;
    scene.add(floor);


    // ── Raycaster ───────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(-999, -999);

    const ctx: NonNullable<typeof sceneRef.current> = {
      renderer, composer, scene, camera, controls,
      zoneMeshes: [],
      zoneLights: [],
      zoneCount: 0,
      raycaster, pointer,
      hoveredZone: -1,
      animId: 0,
    };
    sceneRef.current = ctx;

    // ── Load venue GLB ──────────────────────────────────────────────
    const loader = new GLTFLoader();
    loader.load(
      '/venue.glb',
      (gltf) => {
        const model = gltf.scene;
        scene.add(model);

        // Find zone groups
        const zoneGroups: THREE.Object3D[] = [];
        for (let i = 1; i <= 20; i++) {
          const group = model.getObjectByName(`zone${i}`);
          if (group) zoneGroups.push(group);
          else break;
        }
        ctx.zoneCount = zoneGroups.length;

        for (let z = 0; z < zoneGroups.length; z++) {
          const meshes = collectMeshes(zoneGroups[z]);

          // Compute zone center for placing the point light
          const zoneBox = new THREE.Box3();
          for (const mesh of meshes) {
            mesh.updateWorldMatrix(true, false);
            zoneBox.expandByObject(mesh);
          }
          const zoneCenter = zoneBox.getCenter(new THREE.Vector3());
          const zoneSize = zoneBox.getSize(new THREE.Vector3());

          // Replace materials
          for (const mesh of meshes) {
            const mat = new THREE.MeshStandardMaterial({
              color: 0x1a1a1a,
              emissive: new THREE.Color(0x000000),
              emissiveIntensity: 0,
              roughness: 0.5,
              metalness: 0.15,
            });
            mesh.material = mat;
            mesh.userData.zoneIndex = z;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
          ctx.zoneMeshes.push(meshes);

          // Point light per zone — positioned above zone center
          const light = new THREE.PointLight(0x000000, 0, Math.max(zoneSize.x, zoneSize.z) * 3);
          light.position.set(zoneCenter.x, zoneCenter.y + zoneSize.y + 1.5, zoneCenter.z);
          light.castShadow = false; // keep perf reasonable
          scene.add(light);
          ctx.zoneLights.push(light);
        }

        // Auto-frame
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        controls.target.copy(center);
        camera.position.set(center.x, center.y + maxDim * 0.8, center.z + maxDim * 1.2);
        controls.update();

        // Position floor at model base
        const modelBottom = box.min.y;
        floor.position.y = modelBottom - 0.05;

        setLoading(false);
      },
      undefined,
      (err) => {
        console.error('Failed to load venue.glb:', err);
        setError('Failed to load 3D venue model');
        setLoading(false);
      },
    );

    // ── Texture loading ─────────────────────────────────────────────
    const textureLoader = new THREE.TextureLoader();
    const loadedMediaIds: (string | number)[] = [];

    function loadThumbnailTexture(zoneIndex: number, mediaId: string | number, etag: string) {
      const url = buildThumbnailUrl(mediaId, etag);
      textureLoader.load(url, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        const meshes = ctx.zoneMeshes[zoneIndex];
        if (!meshes) return;
        for (const mesh of meshes) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat.map) mat.map.dispose();
          mat.map = texture;
          mat.needsUpdate = true;
        }
      });
    }

    function clearTexture(zoneIndex: number) {
      const meshes = ctx.zoneMeshes[zoneIndex];
      if (!meshes) return;
      for (const mesh of meshes) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.map) { mat.map.dispose(); mat.map = null; mat.needsUpdate = true; }
      }
    }

    // ── Animation loop ──────────────────────────────────────────────
    const _color = new THREE.Color();

    function animate() {
      ctx.animId = requestAnimationFrame(animate);
      controls.update();

      const s = stateRef.current;

      for (let z = 0; z < ctx.zoneMeshes.length; z++) {
        const stage = s.stages[z];
        if (!stage) continue;

        const intensity = s.blackout ? 0 : (stage.intensity * s.masterLevel / 10000);
        const isHovered = ctx.hoveredZone === z;

        // Update mesh emissive
        for (const mesh of ctx.zoneMeshes[z]) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.emissive.set(stage.color);
          mat.emissiveIntensity = intensity + (isHovered ? HOVER_BOOST : 0);
        }

        // Update point light to cast colored light onto floor/walls
        const light = ctx.zoneLights[z];
        if (light) {
          _color.set(stage.color);
          light.color.copy(_color);
          // Scale light intensity with stage intensity — bright enough to splash on floor
          light.intensity = intensity * 4;
        }

        // Thumbnail textures
        const mid = stage.mediaId;
        if (mid && mid !== loadedMediaIds[z]) {
          loadedMediaIds[z] = mid;
          const slot = s.mediaSlots.find(sl => String(sl.id) === String(mid));
          if (slot) loadThumbnailTexture(z, slot.id, slot.thumbnailETag);
        } else if (!mid && loadedMediaIds[z]) {
          loadedMediaIds[z] = '';
          clearTexture(z);
        }
      }

      // Raycast
      raycaster.setFromCamera(pointer, camera);
      const allMeshes = ctx.zoneMeshes.flat();
      const hits = raycaster.intersectObjects(allMeshes);
      const newHovered = hits.length > 0
        ? (hits[0].object.userData.zoneIndex as number)
        : -1;
      if (newHovered !== ctx.hoveredZone) {
        ctx.hoveredZone = newHovered;
        renderer.domElement.style.cursor = newHovered >= 0 ? 'pointer' : 'default';
      }

      // Render through bloom composer
      composer.render();
    }
    animate();

    // ── Resize ──────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(container);

    // ── Pointer events ──────────────────────────────────────────────
    function onPointerMove(e: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }
    function onPointerLeave() {
      pointer.set(-999, -999);
      ctx.hoveredZone = -1;
      renderer.domElement.style.cursor = 'default';
    }
    function onClick() {
      if (ctx.hoveredZone >= 0) {
        setSelectedZone(ctx.hoveredZone);
      }
    }

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
    renderer.domElement.addEventListener('click', onClick);

    // ── Cleanup ─────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(ctx.animId);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('click', onClick);
      controls.dispose();
      ctx.zoneMeshes.flat().forEach(mesh => {
        mesh.geometry.dispose();
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.map) mat.map.dispose();
        mat.dispose();
      });
      ctx.zoneLights.forEach(l => l.dispose());
      composer.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
    };
  }, []);

  const closeModal = useCallback(() => setSelectedZone(null), []);

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 80px)', position: 'relative', background: '#080808' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {loading && !error && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--app-muted)', fontFamily: 'var(--font-mono)', fontSize: '13px',
        }}>
          Loading 3D venue...
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#ee4444', fontFamily: 'var(--font-mono)', fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      <ZoneLabels />

      {selectedZone !== null && (
        <ZoneModal stageIndex={selectedZone} onClose={closeModal} />
      )}
    </div>
  );
}

function ZoneLabels() {
  const { stages } = useAppState();
  if (stages.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', top: '12px', left: '12px',
      display: 'flex', flexDirection: 'column', gap: '4px',
      pointerEvents: 'none',
    }}>
      {stages.map((stage) => (
        <div key={stage.id} style={{
          fontSize: '10px', fontFamily: 'var(--font-mono)',
          color: stage.intensity > 0 ? 'var(--app-text)' : 'var(--app-muted)',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '2px',
            background: stage.color,
            opacity: stage.intensity > 0 ? 1 : 0.3,
          }} />
          {stage.name}
        </div>
      ))}
    </div>
  );
}
