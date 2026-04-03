import { useRef, useEffect, useCallback, useState } from 'preact/hooks';
import { useAppState } from '../../state/context';
import { buildThumbnailUrl } from '../../api/media';
import { ZoneModal } from './zone-modal';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const BG_COLOR = 0x0a0a0a;
const HOVER_BOOST = 0.25;

/**
 * Collect every Mesh descendant of a given Object3D.
 */
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
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    zoneMeshes: THREE.Mesh[][];   // zoneMeshes[i] = all meshes for zone i
    zoneCount: number;
    raycaster: THREE.Raycaster;
    pointer: THREE.Vector2;
    hoveredZone: number;
    animId: number;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(BG_COLOR);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50, container.clientWidth / container.clientHeight, 0.1, 200,
    );
    camera.position.set(0, 12, 14);
    camera.lookAt(0, 0, 0);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minDistance = 4;
    controls.maxDistance = 40;
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = Math.PI / 2.2;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.15));
    const dir = new THREE.DirectionalLight(0xffffff, 0.4);
    dir.position.set(5, 10, 5);
    scene.add(dir);

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(-999, -999);

    const ctx: NonNullable<typeof sceneRef.current> = {
      renderer, scene, camera, controls,
      zoneMeshes: [],
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

        // Find zone groups by name: zone1, zone2, …, zone7
        const zoneGroups: THREE.Object3D[] = [];
        for (let i = 1; i <= 20; i++) {
          const group = model.getObjectByName(`zone${i}`);
          if (group) zoneGroups.push(group);
          else break;
        }

        ctx.zoneCount = zoneGroups.length;

        // For each zone, collect meshes and replace materials with emissive
        for (let z = 0; z < zoneGroups.length; z++) {
          const meshes = collectMeshes(zoneGroups[z]);
          for (const mesh of meshes) {
            const mat = new THREE.MeshStandardMaterial({
              color: 0x1a1a1a,
              emissive: new THREE.Color(0x000000),
              emissiveIntensity: 0,
              roughness: 0.7,
              metalness: 0.1,
            });
            mesh.material = mat;
            mesh.userData.zoneIndex = z;
          }
          ctx.zoneMeshes.push(meshes);
        }

        // Auto-frame the model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        controls.target.copy(center);
        camera.position.set(center.x, center.y + maxDim * 0.8, center.z + maxDim * 1.2);
        controls.update();

        setLoading(false);
      },
      undefined,
      (err) => {
        console.error('Failed to load venue.glb:', err);
        setError('Failed to load 3D venue model');
        setLoading(false);
      },
    );

    // ── Texture loading for media thumbnails ────────────────────────
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
    function animate() {
      ctx.animId = requestAnimationFrame(animate);
      controls.update();

      const s = stateRef.current;

      // Update zone materials from stage state
      for (let z = 0; z < ctx.zoneMeshes.length; z++) {
        const stage = s.stages[z];
        if (!stage) continue;

        const intensity = s.blackout ? 0 : (stage.intensity * s.masterLevel / 10000);
        const isHovered = ctx.hoveredZone === z;

        for (const mesh of ctx.zoneMeshes[z]) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.emissive.set(stage.color);
          mat.emissiveIntensity = intensity + (isHovered ? HOVER_BOOST : 0);
        }

        // Load/clear thumbnail texture when media changes
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

      // Raycast for hover — check all zone meshes
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

      renderer.render(scene, camera);
    }
    animate();

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
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
    };
  }, []);

  const closeModal = useCallback(() => setSelectedZone(null), []);

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 80px)', position: 'relative', background: 'var(--app-bg)' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Loading overlay */}
      {loading && !error && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--app-muted)', fontFamily: 'var(--font-mono)', fontSize: '13px',
        }}>
          Loading 3D venue...
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#ee4444', fontFamily: 'var(--font-mono)', fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      {/* Zone labels */}
      <ZoneLabels />

      {/* Zone control modal */}
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
