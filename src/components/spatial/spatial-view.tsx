import { useRef, useEffect, useCallback, useState } from 'preact/hooks';
import { useAppState } from '../../state/context';
import { buildThumbnailUrl } from '../../api/media';
import { ZoneModal } from './zone-modal';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Zone ↔ Stage mapping.
 * zone0 → stages[0], zone1 → stages[1], etc.
 */
const ZONE_COUNT = 6;

/** Placeholder zone layout — staggered to suggest a venue floor plan */
const ZONE_LAYOUT: Array<{ position: [number, number, number]; size: [number, number, number] }> = [
  { position: [-3, 0.4, -1],   size: [2.4, 0.8, 1.6] },   // Main
  { position: [0, 0.25, -1.5], size: [3.6, 0.5, 1.0] },    // All Strip
  { position: [3, 0.35, -0.5], size: [1.6, 0.7, 2.0] },    // Sides
  { position: [-1.5, 0.2, 2],  size: [1.4, 0.4, 1.4] },    // Center LED
  { position: [1.5, 0.15, 2],  size: [1.0, 0.3, 1.0] },    // Mini Fixtures
  { position: [3.5, 0.3, 2],   size: [1.2, 0.6, 1.2] },    // Main Fixtures
];

const BG_COLOR = 0x0a0a0a;
const BASE_COLOR = 0x1a1a1a;
const HOVER_BOOST = 0.2;

export function SpatialView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(useAppState());
  const state = useAppState();
  stateRef.current = state;

  const [selectedZone, setSelectedZone] = useState<number | null>(null);

  // Store Three.js objects in refs for imperative access
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    zones: THREE.Mesh[];
    raycaster: THREE.Raycaster;
    pointer: THREE.Vector2;
    hoveredIndex: number;
    animId: number;
  } | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(BG_COLOR);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 8, 8);
    camera.lookAt(0, 0, 0);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minDistance = 4;
    controls.maxDistance = 20;
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = Math.PI / 2.2;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.4);
    directional.position.set(5, 8, 5);
    scene.add(directional);

    // Ground plane (subtle grid)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    scene.add(ground);

    // Zone meshes
    const zones: THREE.Mesh[] = [];
    for (let i = 0; i < ZONE_COUNT; i++) {
      const layout = ZONE_LAYOUT[i];
      const geo = new THREE.BoxGeometry(...layout.size);
      // Round edges slightly
      geo.translate(0, layout.size[1] / 2, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: BASE_COLOR,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0,
        roughness: 0.7,
        metalness: 0.1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...layout.position);
      mesh.position.y = 0;
      mesh.userData.zoneIndex = i;
      scene.add(mesh);
      zones.push(mesh);
    }

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(-999, -999);

    // Texture loading
    const textureLoader = new THREE.TextureLoader();
    const loadedMediaIds: (string | number)[] = new Array(ZONE_COUNT).fill('');

    function loadThumbnailTexture(zoneIndex: number, mediaId: string | number, etag: string) {
      const url = buildThumbnailUrl(mediaId, etag);
      textureLoader.load(
        url,
        (texture) => {
          const mat = zones[zoneIndex].material as THREE.MeshStandardMaterial;
          if (mat.map) mat.map.dispose();
          texture.colorSpace = THREE.SRGBColorSpace;
          mat.map = texture;
          mat.needsUpdate = true;
        },
        undefined,
        () => { /* thumbnail load failed — no-op, zone stays emissive-only */ },
      );
    }

    const ctx = {
      renderer, scene, camera, controls, zones,
      raycaster, pointer, hoveredIndex: -1, animId: 0,
    };
    sceneRef.current = ctx;

    // Animation loop
    function animate() {
      ctx.animId = requestAnimationFrame(animate);
      controls.update();

      // Update zone materials from state
      const s = stateRef.current;
      for (let i = 0; i < zones.length; i++) {
        const stage = s.stages[i];
        const mat = zones[i].material as THREE.MeshStandardMaterial;
        if (stage) {
          const intensity = s.blackout ? 0 : (stage.intensity * s.masterLevel / 10000);
          mat.emissive.set(stage.color);
          mat.emissiveIntensity = intensity + (ctx.hoveredIndex === i ? HOVER_BOOST : 0);

          // Load thumbnail when media changes
          const mid = stage.mediaId;
          if (mid && mid !== loadedMediaIds[i]) {
            loadedMediaIds[i] = mid;
            const slot = s.mediaSlots.find(sl => String(sl.id) === String(mid));
            if (slot) loadThumbnailTexture(i, slot.id, slot.thumbnailETag);
          } else if (!mid && loadedMediaIds[i]) {
            // Media cleared — remove texture
            loadedMediaIds[i] = '';
            if (mat.map) { mat.map.dispose(); mat.map = null; mat.needsUpdate = true; }
          }
        }
      }

      // Raycast for hover
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(zones);
      const newHovered = hits.length > 0 ? (hits[0].object.userData.zoneIndex as number) : -1;
      if (newHovered !== ctx.hoveredIndex) {
        ctx.hoveredIndex = newHovered;
        renderer.domElement.style.cursor = newHovered >= 0 ? 'pointer' : 'default';
      }

      renderer.render(scene, camera);
    }
    animate();

    // Resize observer
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(container);

    // Pointer tracking
    function onPointerMove(e: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }
    function onPointerLeave() {
      pointer.set(-999, -999);
      ctx.hoveredIndex = -1;
      renderer.domElement.style.cursor = 'default';
    }
    function onClick() {
      if (ctx.hoveredIndex >= 0) {
        setSelectedZone(ctx.hoveredIndex);
      }
    }

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
    renderer.domElement.addEventListener('click', onClick);

    // Cleanup
    return () => {
      cancelAnimationFrame(ctx.animId);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('click', onClick);
      controls.dispose();
      zones.forEach(z => {
        z.geometry.dispose();
        const mat = z.material as THREE.MeshStandardMaterial;
        if (mat.map) mat.map.dispose();
        mat.dispose();
      });
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
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

      {/* Zone labels overlay */}
      <ZoneLabels />

      {/* Zone control modal */}
      {selectedZone !== null && (
        <ZoneModal stageIndex={selectedZone} onClose={closeModal} />
      )}
    </div>
  );
}

/** Floating labels showing zone names — positioned statically for now */
function ZoneLabels() {
  const { stages } = useAppState();
  if (stages.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', top: '12px', left: '12px',
      display: 'flex', flexDirection: 'column', gap: '4px',
      pointerEvents: 'none',
    }}>
      {stages.slice(0, ZONE_COUNT).map((stage) => {
        const intensity = stage.intensity;
        return (
          <div key={stage.id} style={{
            fontSize: '10px', fontFamily: 'var(--font-mono)',
            color: intensity > 0 ? 'var(--app-text)' : 'var(--app-muted)',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '2px',
              background: stage.color,
              opacity: intensity > 0 ? 1 : 0.3,
            }} />
            {stage.name}
          </div>
        );
      })}
    </div>
  );
}
