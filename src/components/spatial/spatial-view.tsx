import { useRef, useEffect, useCallback, useState } from 'preact/hooks';
import { useAppState } from '../../state/context';
import { buildThumbnailUrl } from '../../api/media';
import { ZoneSidebar } from './zone-sidebar';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const BG_COLOR = 0x1a1a22;
const HOVER_BOOST = 0.3;
const FLOOR_COLOR = 0xe8e4df; // eggshell


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

  // @ts-ignore
  const sceneRef = useRef<any>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Renderer ────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(1);
    renderer.setClearColor(BG_COLOR);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);

    // ── Scene ───────────────────────────────────────────────────────
    const scene = new THREE.Scene();

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
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3;


    // ── Lighting ────────────────────────────────────────────────────
    // Global illumination: hemisphere light for soft fill
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.1);
    scene.add(hemi);
    scene.add(new THREE.AmbientLight(0xffffff, 0.05));

    const dir = new THREE.DirectionalLight(0xffffff, 0.01);
    dir.position.set(0, 35, 0);
    scene.add(dir);

    // ── Floor (matte) ───────────────────────────────────────────────
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({
      color: FLOOR_COLOR,
      roughness: 0.85,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.05;
    scene.add(floor);

    // ── Raycaster ───────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(-999, -999);

    const ctx: any = {
      renderer, scene, camera, controls,
      zoneMeshes: [] as THREE.Mesh[][],
      zoneHitBoxes: [] as THREE.Mesh[],
      zoneLights: [] as THREE.PointLight[][],
      zoneCount: 0,
      raycaster, pointer,
      hoveredZone: -1,
      animId: 0,
      disposed: false,
    };
    sceneRef.current = ctx;

    // ── Load venue GLB ──────────────────────────────────────────────
    const loader = new GLTFLoader();
    loader.load(
      '/venue.glb',
      (gltf) => {
        const model = gltf.scene;
        scene.add(model);

        const zoneGroups: THREE.Object3D[] = [];
        for (let i = 1; i <= 20; i++) {
          const group = model.getObjectByName(`zone${i}`);
          if (group) zoneGroups.push(group);
          else break;
        }
        ctx.zoneCount = zoneGroups.length;

        for (let z = 0; z < zoneGroups.length; z++) {
          const meshes = collectMeshes(zoneGroups[z]);

          const zoneBox = new THREE.Box3();
          for (const mesh of meshes) {
            mesh.updateWorldMatrix(true, false);
            zoneBox.expandByObject(mesh);
          }
          const zoneCenter = zoneBox.getCenter(new THREE.Vector3());
          const zoneSize = zoneBox.getSize(new THREE.Vector3());

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
          }
          ctx.zoneMeshes.push(meshes);

          // Distribute point lights along the zone shape
          const maxSpan = Math.max(zoneSize.x, zoneSize.z);
          const isLong = maxSpan > Math.min(zoneSize.x, zoneSize.z) * 2;
          const lightCount = isLong ? Math.min(2, Math.ceil(maxSpan / 3)) : 1;
          const lightY = zoneCenter.y + zoneSize.y + 1.5;
          const lightRange = maxSpan * 2.5 / lightCount;
          const zoneLightGroup: THREE.PointLight[] = [];

          // Determine the long axis
          const alongX = zoneSize.x >= zoneSize.z;
          const span = alongX ? zoneSize.x : zoneSize.z;

          for (let li = 0; li < lightCount; li++) {
            const t = lightCount === 1 ? 0 : (li / (lightCount - 1)) - 0.5; // -0.5 to 0.5
            const light = new THREE.PointLight(0x000000, 0, lightRange);
            light.position.set(
              zoneCenter.x + (alongX ? t * span : 0),
              lightY,
              zoneCenter.z + (alongX ? 0 : t * span),
            );
            scene.add(light);
            zoneLightGroup.push(light);
          }
          ctx.zoneLights.push(zoneLightGroup);


          // Invisible hit box — padded bounding box for easier clicking
          const padding = 0.5;
          const hitGeo = new THREE.BoxGeometry(
            zoneSize.x + padding * 2,
            zoneSize.y + padding * 2,
            zoneSize.z + padding * 2,
          );
          const hitMat = new THREE.MeshBasicMaterial({ visible: false });
          const hitBox = new THREE.Mesh(hitGeo, hitMat);
          hitBox.position.copy(zoneCenter);
          hitBox.userData.zoneIndex = z;
          scene.add(hitBox);
          ctx.zoneHitBoxes.push(hitBox);
        }

        // Auto-frame
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        controls.target.copy(center);
        camera.position.set(center.x, center.y + maxDim * 0.8, center.z + maxDim * 1.2);
        controls.update();

        floor.position.y = box.min.y - 0.05;

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

    let lastFrame = 0;
    function animate(time: number) {
      if (ctx.disposed) return;
      ctx.animId = requestAnimationFrame(animate);
      // Throttle to ~30fps
      if (time - lastFrame < 33) return;
      lastFrame = time;
      controls.update();

      const s = stateRef.current;
      for (let z = 0; z < ctx.zoneMeshes.length; z++) {
        const stage = s.stages[z];
        if (!stage) continue;

        const intensity = s.blackout ? 0 : (stage.intensity * s.masterLevel / 10000);
        const isHovered = ctx.hoveredZone === z;

        for (const mesh of ctx.zoneMeshes[z]) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.emissive.set(stage.color);
          mat.emissiveIntensity = intensity * 2 + (isHovered ? HOVER_BOOST : 0);
        }

        const lights = ctx.zoneLights[z];
        if (lights) {
          _color.set(stage.color);
          const perLight = (intensity * 50) / lights.length;
          for (const light of lights) {
            light.color.copy(_color);
            light.intensity = perLight;
          }
        }


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

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(ctx.zoneHitBoxes);
      const newHovered = hits.length > 0
        ? (hits[0].object.userData.zoneIndex as number)
        : -1;
      if (newHovered !== ctx.hoveredZone) {
        ctx.hoveredZone = newHovered;
        renderer.domElement.style.cursor = newHovered >= 0 ? 'pointer' : 'default';
      }

      renderer.render(scene, camera);
    }
    animate(0);

    // ── Resize ──────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
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

    // Track pointer down position to distinguish tap from drag
    let pointerDownPos = { x: 0, y: 0 };
    function onPointerDown(e: PointerEvent) {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    }
    function onPointerUp(e: PointerEvent) {
      // Ignore drags (orbit gestures)
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (dx * dx + dy * dy > 25) return;

      // Raycast at tap/click position
      const rect = renderer.domElement.getBoundingClientRect();
      const tapPointer = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(tapPointer, camera);
      const hits = raycaster.intersectObjects(ctx.zoneHitBoxes);
      if (hits.length > 0) {
        setSelectedZone(hits[0].object.userData.zoneIndex as number);
      } else {
        setSelectedZone(null);
      }
    }

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // ── Cleanup ─────────────────────────────────────────────────────
    return () => {
      ctx.disposed = true;
      cancelAnimationFrame(ctx.animId);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      ctx.zoneMeshes.flat().forEach((mesh: THREE.Mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      ctx.zoneHitBoxes.forEach((hb: THREE.Mesh) => {
        hb.geometry.dispose();
        (hb.material as THREE.Material).dispose();
      });
      ctx.zoneLights.forEach((group: THREE.PointLight[]) => group.forEach(l => l.dispose()));
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
    };
  }, []);

  const closeModal = useCallback(() => setSelectedZone(null), []);

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 80px)', position: 'relative', background: '#1a1a22' }}>
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

      <ZoneSidebar stageIndex={selectedZone} onClose={closeModal} />
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
