'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Utensils,
  ChevronRight,
  UserCheck,
  QrCode,
  RotateCcw,
  Compass,
} from 'lucide-react';
import { RestaurantTable, TableStatus } from '@/lib/types';

interface IsometricRestaurant3DProps {
  tables?: RestaurantTable[];
  onSelectTable?: (tableNumber: string) => void;
  onStaffClick?: () => void;
  onCustomerClick?: () => void;
  className?: string;
}

interface Table3DData {
  slotIndex: number;
  defaultNumber: string;
  number: string;
  status: TableStatus;
  capacity: number;
  group: THREE.Group;
  hitbox: THREE.Mesh;
  indicator: THREE.Mesh;
  indicatorMat: THREE.MeshStandardMaterial;
  hoverLight: THREE.PointLight;
  baseY: number;
  highlighted: boolean;
}

interface HoveredTableInfo {
  number: string;
  status: TableStatus;
  capacity: number;
}

const STATUS_STYLE: Record<
  TableStatus,
  {
    color: number;
    emissive: number;
    label: string;
    badgeClass: string;
  }
> = {
  available: {
    color: 0x10b981,
    emissive: 0x10b981,
    label: 'Bàn trống',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  },
  occupied: {
    color: 0xff9500,
    emissive: 0xff9500,
    label: 'Có khách',
    badgeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  },
  pending_payment: {
    color: 0xec4899,
    emissive: 0xec4899,
    label: 'Chờ thanh toán',
    badgeClass: 'bg-pink-500/20 text-pink-300 border border-pink-500/30',
  },
  reserved: {
    color: 0x318bff,
    emissive: 0x318bff,
    label: 'Đã đặt',
    badgeClass: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  },
};

const TABLE_SLOTS: ReadonlyArray<{
  defaultNumber: string;
  x: number;
  z: number;
  defaultStatus: TableStatus;
}> = [
  { defaultNumber: 'T-01', x: -5.0, z: 4.8, defaultStatus: 'available' },
  { defaultNumber: 'T-02', x: 0.8, z: 4.8, defaultStatus: 'occupied' },
  { defaultNumber: 'T-03', x: 6.6, z: 4.8, defaultStatus: 'available' },
  { defaultNumber: 'T-04', x: -5.0, z: -0.2, defaultStatus: 'reserved' },
  { defaultNumber: 'T-05', x: 0.8, z: -0.2, defaultStatus: 'occupied' },
  { defaultNumber: 'T-06', x: 6.6, z: -0.2, defaultStatus: 'available' },
];

function lerpAngle(current: number, target: number, factor: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * factor;
}

function resolveSlotTable(
  tables: RestaurantTable[],
  slotIndex: number,
  defaultNumber: string
): RestaurantTable | undefined {
  return tables.find((t) => t.number === defaultNumber) ?? tables[slotIndex];
}

function detectWebGLSupport(): boolean {
  if (typeof document === 'undefined') return true;
  try {
    const testCanvas = document.createElement('canvas');
    return Boolean(
      testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}

export function IsometricRestaurant3D({
  tables = [],
  onSelectTable,
  onStaffClick,
  onCustomerClick,
  className = '',
}: IsometricRestaurant3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  const [hoveredTableSlot, setHoveredTableSlot] = useState<number | null>(null);
  const [hoveredCharacter, setHoveredCharacter] = useState<'staff' | 'customer' | null>(null);
  const [isWebGLSupported] = useState<boolean>(detectWebGLSupport);

  const tablesRef = useRef<RestaurantTable[]>(tables);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseNormRef = useRef(new THREE.Vector2(-999, -999));
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastHoverKeyRef = useRef<string | null>(null);

  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const tables3DRef = useRef<Table3DData[]>([]);
  const hitboxesRef = useRef<THREE.Mesh[]>([]);
  const staffHighlightLightRef = useRef<THREE.PointLight | null>(null);
  const customerHighlightLightRef = useRef<THREE.PointLight | null>(null);

  const handleResetCamera = useCallback(() => {
    controlsRef.current?.reset();
  }, []);

  const updateNormalizedPointer = useCallback((clientX: number, clientY: number) => {
    const container = mountRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((clientY - rect.top) / rect.height) * 2 + 1;
    mouseNormRef.current.set(nx, ny);
    return mouseNormRef.current;
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'touch') return;
      updateNormalizedPointer(e.clientX, e.clientY);
    },
    [updateNormalizedPointer]
  );

  const handlePointerLeave = useCallback(() => {
    mouseNormRef.current.set(-999, -999);
    lastHoverKeyRef.current = null;
    setHoveredTableSlot(null);
    setHoveredCharacter(null);
    if (staffHighlightLightRef.current) staffHighlightLightRef.current.intensity = 0;
    if (customerHighlightLightRef.current) customerHighlightLightRef.current.intensity = 0;
    tables3DRef.current.forEach((tData) => {
      tData.highlighted = false;
      tData.hoverLight.intensity = 0;
    });
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const start = pointerDownPosRef.current;
      pointerDownPosRef.current = null;
      if (!start) return;

      // Ignore drag gestures used to orbit/zoom the 3D camera
      const dragDist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (dragDist >= 6) return;

      const camera = cameraRef.current;
      const pointer = updateNormalizedPointer(e.clientX, e.clientY);
      if (!camera || !pointer || hitboxesRef.current.length === 0) return;

      raycasterRef.current.setFromCamera(pointer, camera);
      const hits = raycasterRef.current.intersectObjects(hitboxesRef.current, false);
      if (hits.length === 0) return;

      const hitData = hits[0].object.userData as {
        kind?: 'staff' | 'customer' | 'table';
        slotIndex?: number;
      };

      if (hitData.kind === 'staff') {
        onStaffClick?.();
      } else if (hitData.kind === 'customer') {
        onCustomerClick?.();
      } else if (hitData.kind === 'table' && typeof hitData.slotIndex === 'number') {
        const tData = tables3DRef.current[hitData.slotIndex];
        if (tData) onSelectTable?.(tData.number);
      }
    },
    [onStaffClick, onCustomerClick, onSelectTable, updateNormalizedPointer]
  );

  // 1. Sync realtime table status/capacity/number IN-PLACE without rebuilding WebGL scene
  useEffect(() => {
    tablesRef.current = tables;
    const list = tables3DRef.current;
    if (list.length === 0) return;

    list.forEach((tData) => {
      const liveTable = resolveSlotTable(tables, tData.slotIndex, tData.defaultNumber);
      const slot = TABLE_SLOTS[tData.slotIndex];
      const nextStatus: TableStatus = liveTable ? liveTable.status : slot.defaultStatus;
      const nextNumber = liveTable ? liveTable.number : tData.defaultNumber;
      const nextCapacity = liveTable?.capacity || 4;

      tData.number = nextNumber;
      tData.status = nextStatus;
      tData.capacity = nextCapacity;

      const style = STATUS_STYLE[nextStatus] ?? STATUS_STYLE.available;
      tData.indicatorMat.color.setHex(style.color);
      tData.indicatorMat.emissive.setHex(style.emissive);
      tData.indicatorMat.emissiveIntensity = 0.85;
    });
  }, [tables]);

  // 2. Build Three.js Scene ONCE on mount
  useEffect(() => {
    const container = mountRef.current;
    if (!container || !isWebGLSupported) return;

    const scene = new THREE.Scene();
    scene.background = null;

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.5, 500);
    camera.position.set(30, 26, 32);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.2, 0);
    controls.minDistance = 20;
    controls.maxDistance = 58;
    controls.minPolarAngle = Math.PI / 6;
    controls.maxPolarAngle = Math.PI / 2.35;
    controls.enablePan = false;
    controls.saveState();
    controlsRef.current = controls;

    const diorama = new THREE.Group();
    scene.add(diorama);

    // ==========================================
    // PROCEDURAL TEXTURES
    // ==========================================
    const createFloorCanvas = () => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 512, 512);
        const tileSize = 64;
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        for (let x = 0; x <= 512; x += tileSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 512);
          ctx.stroke();
        }
        for (let y = 0; y <= 512; y += tileSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(512, y);
          ctx.stroke();
        }
        for (let i = 0; i < 1800; i++) {
          const nx = Math.random() * 512;
          const ny = Math.random() * 512;
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.05)';
          ctx.fillRect(nx, ny, 2, 2);
        }
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(5, 4);
      return tex;
    };

    const createKitchenWallCanvas = () => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        const s = 32;
        for (let x = 0; x <= 256; x += s) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 256);
          ctx.stroke();
        }
        for (let y = 0; y <= 256; y += s) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(256, y);
          ctx.stroke();
        }
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(6, 2);
      return tex;
    };

    const floorTex = createFloorCanvas();
    const kitchenWallTex = createKitchenWallCanvas();

    // ==========================================
    // SHARED MATERIALS (Lightweight & GPU-friendly)
    // ==========================================
    const mats = {
      baseSlab: new THREE.MeshStandardMaterial({ color: 0x070c18, roughness: 0.6, metalness: 0.25 }),
      floor: new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.4, metalness: 0.1 }),
      floorBorder: new THREE.MeshStandardMaterial({
        color: 0x318bff,
        emissive: 0x1d4ed8,
        emissiveIntensity: 0.45,
        roughness: 0.2,
      }),
      walls: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7, metalness: 0.1 }),
      kitchenWall: new THREE.MeshStandardMaterial({ map: kitchenWallTex, roughness: 0.35, metalness: 0.1 }),
      woodSlat: new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.45, metalness: 0.05 }),
      stainlessSteel: new THREE.MeshStandardMaterial({ color: 0xcfd8dc, roughness: 0.2, metalness: 0.9 }),
      warmWood: new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.4, metalness: 0.05 }),
      darkMarble: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2, metalness: 0.3 }),
      brassGold: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.85 }),
      porcelainWhite: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15, metalness: 0.05 }),
      // Lightweight transparent glass (avoids double-pass MeshPhysicalMaterial transmission)
      glass: new THREE.MeshStandardMaterial({
        color: 0xbae6fd,
        transparent: true,
        opacity: 0.35,
        roughness: 0.15,
        metalness: 0.1,
      }),
      plantPot: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 }),
      plantLeaf: new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4 }),
      coveLight: new THREE.MeshBasicMaterial({ color: 0xffedd5 }),
      hob: new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.1 }),
      steam: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }),
      kitchenSign: new THREE.MeshStandardMaterial({
        color: 0xff9500,
        emissive: 0xff7700,
        emissiveIntensity: 0.85,
        roughness: 0.2,
      }),
      podiumPad: new THREE.MeshStandardMaterial({
        color: 0x318bff,
        emissive: 0x2563eb,
        emissiveIntensity: 0.9,
      }),
      hitbox: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      // Characters
      staffUniform: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 }),
      staffShirt: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 }),
      staffBowtie: new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.4 }),
      staffApron: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 }),
      customerJacket: new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 }),
      customerPants: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 }),
      skinMat: new THREE.MeshStandardMaterial({ color: 0xffd1b3, roughness: 0.5 }),
      hairDark: new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.8 }),
      hairBrown: new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 }),
      phoneScreen: new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.2,
      }),
    };

    // ==========================================
    // SHARED GEOMETRIES (Reused across repeated meshes)
    // ==========================================
    const sharedGeo = {
      slat: new THREE.BoxGeometry(0.16, 3.8, 0.35),
      heatLamp: new THREE.CylinderGeometry(0.25, 0.35, 0.4, 8),
      hob: new THREE.BoxGeometry(1.8, 0.05, 1.4),
      pot: new THREE.CylinderGeometry(0.55, 0.5, 0.35, 12),
      bowl: new THREE.CylinderGeometry(0.42, 0.28, 0.24, 12),
      glassStem: new THREE.CylinderGeometry(0.04, 0.04, 0.45, 6),
      glassCup: new THREE.ConeGeometry(0.22, 0.3, 8),
      stoolSeat: new THREE.CylinderGeometry(0.45, 0.45, 0.16, 16),
      stoolLeg: new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8),
      stoolBase: new THREE.CylinderGeometry(0.4, 0.4, 0.05, 12),
      tableTop: new THREE.CylinderGeometry(1.5, 1.5, 0.14, 24),
      tableLeg: new THREE.CylinderGeometry(0.13, 0.13, 1.0, 12),
      tableBaseDisc: new THREE.CylinderGeometry(0.75, 0.75, 0.06, 16),
      plate: new THREE.CylinderGeometry(0.32, 0.26, 0.04, 16),
      tableGlass: new THREE.CylinderGeometry(0.1, 0.08, 0.24, 10),
      miniPot: new THREE.CylinderGeometry(0.15, 0.11, 0.18, 10),
      miniPlant: new THREE.SphereGeometry(0.13, 8, 8),
      chairSeat: new THREE.BoxGeometry(0.75, 0.1, 0.7),
      chairBack: new THREE.BoxGeometry(0.75, 0.55, 0.08),
      chairLeg: new THREE.CylinderGeometry(0.03, 0.02, 0.5, 6),
      indicator: new THREE.TorusGeometry(0.38, 0.07, 12, 24).rotateX(Math.PI / 2),
      tableHitbox: new THREE.CylinderGeometry(1.9, 1.9, 2.5, 10),
      charHitbox: new THREE.CylinderGeometry(0.85, 0.85, 2.4, 8),
      plantPot: new THREE.CylinderGeometry(0.6, 0.45, 1.3, 16),
      plantLeaf: new THREE.ConeGeometry(0.5, 1.0, 5),
    };

    // ==========================================
    // 1. DIORAMA ARCHITECTURAL BASE & FLOOR
    // ==========================================
    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(25, 1.4, 20), mats.baseSlab);
    baseMesh.position.y = -0.7;
    baseMesh.receiveShadow = true;
    diorama.add(baseMesh);

    const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(24.4, 0.1, 19.4), mats.floor);
    floorMesh.position.y = 0.05;
    floorMesh.receiveShadow = true;
    diorama.add(floorMesh);

    const rimFront = new THREE.Mesh(new THREE.BoxGeometry(24.6, 0.06, 0.12), mats.floorBorder);
    rimFront.position.set(0, 0.1, 9.7);
    diorama.add(rimFront);

    const rimRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 19.4), mats.floorBorder);
    rimRight.position.set(12.3, 0.1, 0);
    diorama.add(rimRight);

    // ==========================================
    // 2. WALLS & CUTAWAY ARCHITECTURE
    // ==========================================
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(24.4, 4.2, 0.6), mats.kitchenWall);
    backWall.position.set(0, 2.1, -9.7);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    diorama.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.2, 19.4), mats.walls);
    leftWall.position.set(-12.2, 2.1, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    diorama.add(leftWall);

    for (let z = -8.0; z <= 8.0; z += 0.8) {
      const slat = new THREE.Mesh(sharedGeo.slat, mats.woodSlat);
      slat.position.set(-11.82, 2.1, z);
      slat.castShadow = true;
      diorama.add(slat);
    }

    const coveLight = new THREE.Mesh(new THREE.BoxGeometry(24.0, 0.1, 0.25), mats.coveLight);
    coveLight.position.set(0, 4.15, -9.35);
    diorama.add(coveLight);

    // ==========================================
    // 3. KITCHEN STATION (BẾP KDS) - BACK AREA
    // ==========================================
    const kitchenGroup = new THREE.Group();
    kitchenGroup.position.set(3.5, 0, -7.5);

    const counter = new THREE.Mesh(new THREE.BoxGeometry(10.0, 1.3, 2.2), mats.stainlessSteel);
    counter.position.y = 0.65;
    counter.castShadow = true;
    counter.receiveShadow = true;
    kitchenGroup.add(counter);

    const rack = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.12, 1.4), mats.stainlessSteel);
    rack.position.set(0, 2.7, 0);
    rack.castShadow = true;
    kitchenGroup.add(rack);

    [-3.2, -1.1, 1.1, 3.2].forEach((lx) => {
      const lamp = new THREE.Mesh(sharedGeo.heatLamp, mats.brassGold);
      lamp.position.set(lx, 2.45, 0);
      kitchenGroup.add(lamp);
    });

    const steamPuffMeshes: THREE.Mesh[] = [];
    const steamGeos = [0, 1, 2, 3].map((s) => new THREE.SphereGeometry(0.12 + s * 0.04, 6, 6));

    [-3.0, -0.8].forEach((cx) => {
      const hob = new THREE.Mesh(sharedGeo.hob, mats.hob);
      hob.position.set(cx, 1.32, 0);
      kitchenGroup.add(hob);

      const pot = new THREE.Mesh(sharedGeo.pot, mats.stainlessSteel);
      pot.position.set(cx, 1.5, 0);
      pot.castShadow = true;
      kitchenGroup.add(pot);

      for (let s = 0; s < 4; s++) {
        const steam = new THREE.Mesh(steamGeos[s], mats.steam);
        steam.position.set(
          cx + (Math.random() - 0.5) * 0.2,
          1.8 + s * 0.28,
          (Math.random() - 0.5) * 0.2
        );
        steam.userData = { initialY: 1.8 + s * 0.28, speed: 0.48 + Math.random() * 0.3 };
        kitchenGroup.add(steam);
        steamPuffMeshes.push(steam);
      }
    });

    [1.8, 3.2].forEach((bx) => {
      for (let i = 0; i < 3; i++) {
        const bowl = new THREE.Mesh(sharedGeo.bowl, mats.porcelainWhite);
        bowl.position.set(bx, 1.42 + i * 0.19, 0.2);
        bowl.castShadow = true;
        kitchenGroup.add(bowl);
      }
    });

    const signBox = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.65, 0.2), mats.kitchenSign);
    signBox.position.set(0, 3.3, -1.8);
    kitchenGroup.add(signBox);

    diorama.add(kitchenGroup);

    // ==========================================
    // 4. BAR & BEVERAGE STATION - LEFT AREA
    // ==========================================
    const barGroup = new THREE.Group();
    barGroup.position.set(-9.5, 0, -3.0);

    const barBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, 8.5), mats.warmWood);
    barBase.position.y = 0.65;
    barBase.castShadow = true;
    barBase.receiveShadow = true;
    barGroup.add(barBase);

    const barTop = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 8.7), mats.darkMarble);
    barTop.position.y = 1.36;
    barTop.castShadow = true;
    barGroup.add(barTop);

    const brassRack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 6.8), mats.brassGold);
    brassRack.position.set(0, 2.8, 0);
    barGroup.add(brassRack);

    [-2.4, -1.2, 0, 1.2, 2.4].forEach((gz) => {
      const stem = new THREE.Mesh(sharedGeo.glassStem, mats.glass);
      stem.position.set(0, 2.5, gz);
      barGroup.add(stem);

      const cup = new THREE.Mesh(sharedGeo.glassCup, mats.glass);
      cup.rotation.x = Math.PI;
      cup.position.set(0, 2.32, gz);
      barGroup.add(cup);
    });

    const coffeeMachine = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 1.6), mats.stainlessSteel);
    coffeeMachine.position.set(0, 1.9, -2.6);
    coffeeMachine.castShadow = true;
    barGroup.add(coffeeMachine);

    [-2.6, 0, 2.6].forEach((sz) => {
      const stoolGroup = new THREE.Group();
      stoolGroup.position.set(1.9, 0, sz);

      const seat = new THREE.Mesh(sharedGeo.stoolSeat, mats.darkMarble);
      seat.position.y = 0.96;
      seat.castShadow = true;
      stoolGroup.add(seat);

      const leg = new THREE.Mesh(sharedGeo.stoolLeg, mats.brassGold);
      leg.position.y = 0.45;
      stoolGroup.add(leg);

      const baseRing = new THREE.Mesh(sharedGeo.stoolBase, mats.brassGold);
      baseRing.position.y = 0.05;
      stoolGroup.add(baseRing);

      barGroup.add(stoolGroup);
    });

    diorama.add(barGroup);

    // ==========================================
    // 5. DINING ROOM: 6 TABLES (Realtime Synced)
    // ==========================================
    const tables3DList: Table3DData[] = [];
    const hitboxes: THREE.Mesh[] = [];
    const initialTables = tablesRef.current;

    TABLE_SLOTS.forEach((slot, slotIndex) => {
      const liveTable = resolveSlotTable(initialTables, slotIndex, slot.defaultNumber);
      const status: TableStatus = liveTable ? liveTable.status : slot.defaultStatus;
      const tableNumber = liveTable ? liveTable.number : slot.defaultNumber;
      const capacity = liveTable?.capacity || 4;
      const style = STATUS_STYLE[status] ?? STATUS_STYLE.available;

      const tableGroup = new THREE.Group();
      tableGroup.position.set(slot.x, 0, slot.z);

      const top = new THREE.Mesh(sharedGeo.tableTop, mats.warmWood);
      top.position.y = 1.05;
      top.castShadow = true;
      top.receiveShadow = true;
      tableGroup.add(top);

      const leg = new THREE.Mesh(sharedGeo.tableLeg, mats.baseSlab);
      leg.position.y = 0.5;
      leg.castShadow = true;
      tableGroup.add(leg);

      const baseDisc = new THREE.Mesh(sharedGeo.tableBaseDisc, mats.baseSlab);
      baseDisc.position.y = 0.03;
      tableGroup.add(baseDisc);

      [-0.65, 0.65].forEach((px) => {
        const plate = new THREE.Mesh(sharedGeo.plate, mats.porcelainWhite);
        plate.position.set(px, 1.14, 0);
        plate.castShadow = true;
        tableGroup.add(plate);

        const glass = new THREE.Mesh(sharedGeo.tableGlass, mats.glass);
        glass.position.set(px + 0.3, 1.24, 0.26);
        tableGroup.add(glass);
      });

      const miniPot = new THREE.Mesh(sharedGeo.miniPot, mats.plantPot);
      miniPot.position.set(0, 1.21, 0);
      tableGroup.add(miniPot);

      const miniPlant = new THREE.Mesh(sharedGeo.miniPlant, mats.plantLeaf);
      miniPlant.position.set(0, 1.34, 0);
      tableGroup.add(miniPlant);

      const chairAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
      chairAngles.forEach((ang) => {
        const chair = new THREE.Group();
        const dist = 1.8;
        chair.position.set(Math.cos(ang) * dist, 0, Math.sin(ang) * dist);
        chair.rotation.y = -ang + Math.PI / 2;

        const seat = new THREE.Mesh(sharedGeo.chairSeat, mats.darkMarble);
        seat.position.y = 0.55;
        seat.castShadow = true;
        chair.add(seat);

        const back = new THREE.Mesh(sharedGeo.chairBack, mats.warmWood);
        back.position.set(0, 0.88, -0.31);
        back.castShadow = true;
        chair.add(back);

        [-0.3, 0.3].forEach((lx) => {
          [-0.27, 0.27].forEach((lz) => {
            const chairLeg = new THREE.Mesh(sharedGeo.chairLeg, mats.brassGold);
            chairLeg.position.set(lx, 0.25, lz);
            chair.add(chairLeg);
          });
        });

        tableGroup.add(chair);
      });

      const indicatorMat = new THREE.MeshStandardMaterial({
        color: style.color,
        emissive: style.emissive,
        emissiveIntensity: 0.85,
        roughness: 0.2,
      });
      const indicator = new THREE.Mesh(sharedGeo.indicator, indicatorMat);
      indicator.position.set(0, 2.2, 0);
      tableGroup.add(indicator);

      const tableHitbox = new THREE.Mesh(sharedGeo.tableHitbox, mats.hitbox);
      tableHitbox.position.y = 1.25;
      tableHitbox.userData = { kind: 'table', slotIndex };
      tableGroup.add(tableHitbox);
      hitboxes.push(tableHitbox);

      const hoverLight = new THREE.PointLight(0xffedd5, 0, 4);
      hoverLight.position.set(0, 2.4, 0);
      tableGroup.add(hoverLight);

      diorama.add(tableGroup);

      tables3DList.push({
        slotIndex,
        defaultNumber: slot.defaultNumber,
        number: tableNumber,
        status,
        capacity,
        group: tableGroup,
        hitbox: tableHitbox,
        indicator,
        indicatorMat,
        hoverLight,
        baseY: 0,
        highlighted: false,
      });
    });

    tables3DRef.current = tables3DList;

    // ==========================================
    // 6. ENTRANCE & RECEPTION AREA - FRONT RIGHT
    // ==========================================
    const entranceGroup = new THREE.Group();
    entranceGroup.position.set(10.5, 0, 6.6);

    const podium = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.4, 0.85), mats.warmWood);
    podium.position.y = 0.7;
    podium.castShadow = true;
    entranceGroup.add(podium);

    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.38), mats.podiumPad);
    pad.position.set(0, 1.45, 0);
    pad.rotation.x = -0.3;
    entranceGroup.add(pad);

    diorama.add(entranceGroup);

    const glassDoor1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.6, 2.4), mats.glass);
    glassDoor1.position.set(12.0, 1.8, 6.2);
    diorama.add(glassDoor1);

    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.8, 0.15), mats.brassGold);
    doorFrame.position.set(12.0, 1.9, 5.0);
    diorama.add(doorFrame);

    const plantLocations = [
      { x: -11.0, z: 8.0 },
      { x: 11.0, z: -8.0 },
      { x: -11.0, z: -8.0 },
      { x: 11.0, z: 2.5 },
    ];

    plantLocations.forEach((p) => {
      const plantGroup = new THREE.Group();
      plantGroup.position.set(p.x, 0, p.z);

      const pot = new THREE.Mesh(sharedGeo.plantPot, mats.plantPot);
      pot.position.y = 0.65;
      pot.castShadow = true;
      plantGroup.add(pot);

      for (let i = 0; i < 7; i++) {
        const leaf = new THREE.Mesh(sharedGeo.plantLeaf, mats.plantLeaf);
        leaf.rotation.z = 0.45;
        leaf.rotation.y = (i * Math.PI * 2) / 7;
        leaf.position.set(0, 1.3 + (i % 2) * 0.22, 0);
        leaf.castShadow = true;
        plantGroup.add(leaf);
      }

      diorama.add(plantGroup);
    });

    // =========================================================================
    // 7. CHARACTER A: RESTAURANT STAFF (NHÂN VIÊN PHỤC VỤ)
    // =========================================================================
    const staffGroup = new THREE.Group();
    staffGroup.position.set(3.7, 0, -4.2);

    const staffHips = new THREE.Group();
    staffHips.position.y = 1.05;
    staffGroup.add(staffHips);

    const staffTorso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.35), mats.staffUniform);
    staffTorso.position.y = 0.35;
    staffTorso.castShadow = true;
    staffHips.add(staffTorso);

    const staffShirtBib = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.4, 0.05), mats.staffShirt);
    staffShirtBib.position.set(0, 0.45, 0.16);
    staffHips.add(staffShirtBib);

    const staffBowtie = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.06), mats.staffBowtie);
    staffBowtie.position.set(0, 0.62, 0.18);
    staffHips.add(staffBowtie);

    const staffApron = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.5, 0.38), mats.staffApron);
    staffApron.position.set(0, 0.05, 0);
    staffHips.add(staffApron);

    const staffHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), mats.skinMat);
    staffHead.position.set(0, 0.95, 0);
    staffHead.castShadow = true;
    staffHips.add(staffHead);

    const staffHair = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), mats.hairDark);
    staffHair.position.set(0, 1.02, -0.04);
    staffHips.add(staffHair);

    const legThighGeo = new THREE.BoxGeometry(0.18, 0.55, 0.18);
    const legShinGeo = new THREE.BoxGeometry(0.16, 0.5, 0.16);
    const shoeGeo = new THREE.BoxGeometry(0.18, 0.1, 0.28);

    const staffLeftLeg = new THREE.Group();
    staffLeftLeg.position.set(-0.16, 0, 0);
    const sLeftThigh = new THREE.Mesh(legThighGeo, mats.staffUniform);
    sLeftThigh.position.y = -0.27;
    sLeftThigh.castShadow = true;
    staffLeftLeg.add(sLeftThigh);
    const sLeftShin = new THREE.Mesh(legShinGeo, mats.staffUniform);
    sLeftShin.position.y = -0.75;
    sLeftShin.castShadow = true;
    staffLeftLeg.add(sLeftShin);
    const sLeftShoe = new THREE.Mesh(shoeGeo, mats.baseSlab);
    sLeftShoe.position.set(0, -1.0, 0.05);
    staffLeftLeg.add(sLeftShoe);
    staffHips.add(staffLeftLeg);

    const staffRightLeg = new THREE.Group();
    staffRightLeg.position.set(0.16, 0, 0);
    const sRightThigh = new THREE.Mesh(legThighGeo, mats.staffUniform);
    sRightThigh.position.y = -0.27;
    sRightThigh.castShadow = true;
    staffRightLeg.add(sRightThigh);
    const sRightShin = new THREE.Mesh(legShinGeo, mats.staffUniform);
    sRightShin.position.y = -0.75;
    sRightShin.castShadow = true;
    staffRightLeg.add(sRightShin);
    const sRightShoe = new THREE.Mesh(shoeGeo, mats.baseSlab);
    sRightShoe.position.set(0, -1.0, 0.05);
    staffRightLeg.add(sRightShoe);
    staffHips.add(staffRightLeg);

    const staffLeftArm = new THREE.Group();
    staffLeftArm.position.set(-0.35, 0.6, 0);
    const sLeftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.14), mats.staffShirt);
    sLeftArmMesh.position.y = -0.25;
    staffLeftArm.add(sLeftArmMesh);
    staffHips.add(staffLeftArm);

    const staffRightArm = new THREE.Group();
    staffRightArm.position.set(0.35, 0.6, 0);
    const armSegmentGeo = new THREE.BoxGeometry(0.14, 0.35, 0.14);
    const sRightUpperArm = new THREE.Mesh(armSegmentGeo, mats.staffShirt);
    sRightUpperArm.position.y = -0.15;
    staffRightArm.add(sRightUpperArm);

    const sRightForearm = new THREE.Mesh(armSegmentGeo, mats.staffShirt);
    sRightForearm.position.set(0, -0.3, 0.16);
    sRightForearm.rotation.x = -Math.PI / 2.3;
    staffRightArm.add(sRightForearm);

    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 16), mats.stainlessSteel);
    tray.position.set(0.05, -0.3, 0.38);
    staffRightArm.add(tray);

    const trayBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.14, 10), mats.porcelainWhite);
    trayBowl.position.set(0.05, -0.2, 0.38);
    staffRightArm.add(trayBowl);

    const trayDrink = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.16, 8), mats.glass);
    trayDrink.position.set(0.2, -0.18, 0.44);
    staffRightArm.add(trayDrink);

    staffHips.add(staffRightArm);

    const staffHitbox = new THREE.Mesh(sharedGeo.charHitbox, mats.hitbox);
    staffHitbox.position.y = 1.2;
    staffHitbox.userData = { kind: 'staff' };
    staffGroup.add(staffHitbox);
    // Prioritize character hitboxes over table hitboxes
    hitboxes.unshift(staffHitbox);

    const staffPointLight = new THREE.PointLight(0xff9500, 0, 5);
    staffPointLight.position.set(0, 2.6, 0);
    staffGroup.add(staffPointLight);
    staffHighlightLightRef.current = staffPointLight;

    diorama.add(staffGroup);

    // =========================================================================
    // 8. CHARACTER B: RESTAURANT CUSTOMER (KHÁCH HÀNG GỌI MÓN)
    // =========================================================================
    const customerGroup = new THREE.Group();
    customerGroup.position.set(9.2, 0, 4.8);

    const customerHips = new THREE.Group();
    customerHips.position.y = 1.05;
    customerGroup.add(customerHips);

    const customerTorso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.35), mats.customerJacket);
    customerTorso.position.y = 0.35;
    customerTorso.castShadow = true;
    customerHips.add(customerTorso);

    const customerTee = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.5, 0.04), mats.staffShirt);
    customerTee.position.set(0, 0.35, 0.16);
    customerHips.add(customerTee);

    const customerHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), mats.skinMat);
    customerHead.position.set(0, 0.95, 0);
    customerHead.castShadow = true;
    customerHips.add(customerHead);

    const customerHair = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 10), mats.hairBrown);
    customerHair.position.set(0, 1.03, -0.02);
    customerHips.add(customerHair);

    const cLeftLeg = new THREE.Group();
    cLeftLeg.position.set(-0.16, 0, 0);
    const cLeftThigh = new THREE.Mesh(legThighGeo, mats.customerPants);
    cLeftThigh.position.y = -0.27;
    cLeftThigh.castShadow = true;
    cLeftLeg.add(cLeftThigh);
    const cLeftShin = new THREE.Mesh(legShinGeo, mats.customerPants);
    cLeftShin.position.y = -0.75;
    cLeftShin.castShadow = true;
    cLeftLeg.add(cLeftShin);
    const cLeftSneaker = new THREE.Mesh(shoeGeo, mats.staffShirt);
    cLeftSneaker.position.set(0, -1.0, 0.05);
    cLeftLeg.add(cLeftSneaker);
    customerHips.add(cLeftLeg);

    const cRightLeg = new THREE.Group();
    cRightLeg.position.set(0.16, 0, 0);
    const cRightThigh = new THREE.Mesh(legThighGeo, mats.customerPants);
    cRightThigh.position.y = -0.27;
    cRightThigh.castShadow = true;
    cRightLeg.add(cRightThigh);
    const cRightShin = new THREE.Mesh(legShinGeo, mats.customerPants);
    cRightShin.position.y = -0.75;
    cRightShin.castShadow = true;
    cRightLeg.add(cRightShin);
    const cRightSneaker = new THREE.Mesh(shoeGeo, mats.staffShirt);
    cRightSneaker.position.set(0, -1.0, 0.05);
    cRightLeg.add(cRightSneaker);
    customerHips.add(cRightLeg);

    const cLeftArm = new THREE.Group();
    cLeftArm.position.set(-0.35, 0.6, 0);
    const cLeftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.14), mats.customerJacket);
    cLeftArmMesh.position.y = -0.25;
    cLeftArm.add(cLeftArmMesh);
    customerHips.add(cLeftArm);

    const cRightArm = new THREE.Group();
    cRightArm.position.set(0.35, 0.6, 0);
    const cRightUpper = new THREE.Mesh(armSegmentGeo, mats.customerJacket);
    cRightUpper.position.y = -0.15;
    cRightArm.add(cRightUpper);

    const cRightForearm = new THREE.Mesh(armSegmentGeo, mats.customerJacket);
    cRightForearm.position.set(0, -0.3, 0.16);
    cRightForearm.rotation.x = -Math.PI / 2.2;
    cRightArm.add(cRightForearm);

    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.03), mats.baseSlab);
    phone.position.set(0, -0.28, 0.35);
    phone.rotation.x = -0.2;
    cRightArm.add(phone);

    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.21, 0.01), mats.phoneScreen);
    screen.position.set(0, -0.28, 0.37);
    screen.rotation.x = -0.2;
    cRightArm.add(screen);

    customerHips.add(cRightArm);

    const customerHitbox = new THREE.Mesh(sharedGeo.charHitbox, mats.hitbox);
    customerHitbox.position.y = 1.2;
    customerHitbox.userData = { kind: 'customer' };
    customerGroup.add(customerHitbox);
    hitboxes.unshift(customerHitbox);

    const customerPointLight = new THREE.PointLight(0x318bff, 0, 5);
    customerPointLight.position.set(0, 2.6, 0);
    customerGroup.add(customerPointLight);
    customerHighlightLightRef.current = customerPointLight;

    diorama.add(customerGroup);

    hitboxesRef.current = hitboxes;

    // ==========================================
    // 9. LIGHTING DESIGN
    // ==========================================
    scene.add(new THREE.AmbientLight(0x0f172a, 1.6));

    const sunLight = new THREE.DirectionalLight(0xfff1e6, 2.5);
    sunLight.position.set(32, 45, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 120;
    sunLight.shadow.camera.left = -22;
    sunLight.shadow.camera.right = 22;
    sunLight.shadow.camera.top = 22;
    sunLight.shadow.camera.bottom = -22;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.0);
    rimLight.position.set(-30, 25, -30);
    scene.add(rimLight);

    const kitchenLight = new THREE.PointLight(0xff9900, 2.2, 14);
    kitchenLight.position.set(3.5, 3.2, -7.0);
    diorama.add(kitchenLight);

    const barLight = new THREE.PointLight(0xffaa33, 1.8, 12);
    barLight.position.set(-9.5, 3.0, -3.0);
    diorama.add(barLight);

    const diningCenterLight = new THREE.PointLight(0xffedd5, 1.2, 18);
    diningCenterLight.position.set(0, 6.5, 1.5);
    diorama.add(diningCenterLight);

    // ==========================================
    // 10. ANIMATION & COLLISION-FREE WAYPOINTS
    // ==========================================
    let animationFrameId = 0;
    const clock = new THREE.Clock();

    // Staff corridor: Kitchen pass (z=-4.2) -> right-middle aisle (x=3.7) -> horizontal aisle (z=2.3)
    const staffWaypoints = [
      { x: 3.7, z: -4.2, wait: 1.5 },
      { x: 3.7, z: 2.3, wait: 0.2 },
      { x: 1.5, z: 2.3, wait: 2.2 },
      { x: 3.7, z: 2.3, wait: 0.2 },
      { x: 3.7, z: -4.2, wait: 1.5 },
    ];
    let staffWaypointIdx = 0;
    let staffWaitTimer = 0;

    // Customer corridor: Entrance (x=9.2) -> main horizontal aisle (z=2.3) -> near bar -> back
    const customerWaypoints = [
      { x: 9.2, z: 4.8, wait: 1.0 },
      { x: 9.2, z: 2.3, wait: 0.2 },
      { x: -2.1, z: 2.3, wait: 1.6 },
      { x: -6.2, z: 2.3, wait: 2.0 },
      { x: -2.1, z: 2.3, wait: 0.2 },
      { x: 9.2, z: 2.3, wait: 0.2 },
    ];
    let customerWaypointIdx = 0;
    let customerWaitTimer = 0;

    let walkCycleStaff = 0;
    let walkCycleCustomer = 0;

    const render = () => {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsedTime = clock.getElapsedTime();

      controls.update();

      // A. Kitchen steam particles (frame-rate independent)
      steamPuffMeshes.forEach((steam) => {
        steam.position.y += (steam.userData.speed as number) * delta;
        if (steam.position.y > (steam.userData.initialY as number) + 0.8) {
          steam.position.y = steam.userData.initialY as number;
        }
      });

      // B. Rotate all table status beacons smoothly & pulse pending_payment
      tables3DRef.current.forEach((tData) => {
        tData.indicator.rotation.z += delta * 1.2;
        if (tData.status === 'pending_payment') {
          tData.indicatorMat.emissiveIntensity = 0.7 + Math.sin(elapsedTime * 5) * 0.45;
        }
        const targetY = tData.highlighted ? 0.22 : tData.baseY;
        tData.group.position.y += (targetY - tData.group.position.y) * Math.min(1, delta * 9);
      });

      // C. Staff walking & smooth rotation
      const staffTarget = staffWaypoints[staffWaypointIdx];
      const dxStaff = staffTarget.x - staffGroup.position.x;
      const dzStaff = staffTarget.z - staffGroup.position.z;
      const distStaff = Math.hypot(dxStaff, dzStaff);

      if (distStaff > 0.12) {
        const step = Math.min(1.6 * delta, distStaff);
        staffGroup.position.x += (dxStaff / distStaff) * step;
        staffGroup.position.z += (dzStaff / distStaff) * step;

        const targetAngle = Math.atan2(dxStaff, dzStaff);
        staffGroup.rotation.y = lerpAngle(staffGroup.rotation.y, targetAngle, Math.min(1, delta * 8));

        walkCycleStaff += delta * 7.5;
        staffLeftLeg.rotation.x = Math.sin(walkCycleStaff) * 0.65;
        staffRightLeg.rotation.x = -Math.sin(walkCycleStaff) * 0.65;
        staffLeftArm.rotation.x = -Math.sin(walkCycleStaff) * 0.35;
        staffHips.position.y = 1.05 + Math.abs(Math.sin(walkCycleStaff * 2)) * 0.05;
      } else {
        staffWaitTimer += delta;
        staffHips.position.y = 1.05 + Math.sin(elapsedTime * 2) * 0.02;
        staffLeftLeg.rotation.x *= 0.85;
        staffRightLeg.rotation.x *= 0.85;
        staffLeftArm.rotation.x *= 0.85;

        if (staffWaitTimer >= staffTarget.wait) {
          staffWaitTimer = 0;
          staffWaypointIdx = (staffWaypointIdx + 1) % staffWaypoints.length;
        }
      }

      // D. Customer walking & smooth rotation
      const customerTarget = customerWaypoints[customerWaypointIdx];
      const dxCust = customerTarget.x - customerGroup.position.x;
      const dzCust = customerTarget.z - customerGroup.position.z;
      const distCust = Math.hypot(dxCust, dzCust);

      if (distCust > 0.12) {
        const step = Math.min(1.35 * delta, distCust);
        customerGroup.position.x += (dxCust / distCust) * step;
        customerGroup.position.z += (dzCust / distCust) * step;

        const targetAngle = Math.atan2(dxCust, dzCust);
        customerGroup.rotation.y = lerpAngle(customerGroup.rotation.y, targetAngle, Math.min(1, delta * 8));

        walkCycleCustomer += delta * 6.5;
        cLeftLeg.rotation.x = Math.sin(walkCycleCustomer) * 0.6;
        cRightLeg.rotation.x = -Math.sin(walkCycleCustomer) * 0.6;
        cLeftArm.rotation.x = -Math.sin(walkCycleCustomer) * 0.3;
        customerHips.position.y = 1.05 + Math.abs(Math.sin(walkCycleCustomer * 2)) * 0.04;
      } else {
        customerWaitTimer += delta;
        customerHips.position.y = 1.05 + Math.sin(elapsedTime * 1.8) * 0.02;
        cLeftLeg.rotation.x *= 0.85;
        cRightLeg.rotation.x *= 0.85;
        cLeftArm.rotation.x *= 0.85;
        customerHead.rotation.x = Math.sin(elapsedTime * 1.5) * 0.15 + 0.15;

        if (customerWaitTimer >= customerTarget.wait) {
          customerWaitTimer = 0;
          customerWaypointIdx = (customerWaypointIdx + 1) % customerWaypoints.length;
        }
      }

      // E. Lightweight Hitbox Raycasting (only 8 hitboxes, setState only on actual change)
      if (mouseNormRef.current.x > -900) {
        raycasterRef.current.setFromCamera(mouseNormRef.current, camera);
        const hits = raycasterRef.current.intersectObjects(hitboxesRef.current, false);

        let nextKey: string | null = null;
        let hitKind: 'staff' | 'customer' | 'table' | null = null;
        let hitSlotIdx = -1;

        if (hits.length > 0) {
          const data = hits[0].object.userData as {
            kind?: 'staff' | 'customer' | 'table';
            slotIndex?: number;
          };
          if (data.kind === 'staff') {
            hitKind = 'staff';
            nextKey = 'staff';
          } else if (data.kind === 'customer') {
            hitKind = 'customer';
            nextKey = 'customer';
          } else if (data.kind === 'table' && typeof data.slotIndex === 'number') {
            hitKind = 'table';
            hitSlotIdx = data.slotIndex;
            nextKey = `table:${hitSlotIdx}`;
          }
        }

        if (nextKey !== lastHoverKeyRef.current) {
          lastHoverKeyRef.current = nextKey;

          if (staffHighlightLightRef.current) {
            staffHighlightLightRef.current.intensity = hitKind === 'staff' ? 2.2 : 0;
          }
          if (customerHighlightLightRef.current) {
            customerHighlightLightRef.current.intensity = hitKind === 'customer' ? 2.2 : 0;
          }

          tables3DRef.current.forEach((tData, idx) => {
            const isHit = hitKind === 'table' && idx === hitSlotIdx;
            tData.highlighted = isHit;
            tData.hoverLight.intensity = isHit ? 1.6 : 0;
          });

          if (hitKind === 'staff') {
            setHoveredCharacter('staff');
            setHoveredTableSlot(null);
          } else if (hitKind === 'customer') {
            setHoveredCharacter('customer');
            setHoveredTableSlot(null);
          } else if (hitKind === 'table' && hitSlotIdx >= 0) {
            setHoveredCharacter(null);
            setHoveredTableSlot(hitSlotIdx);
          } else {
            setHoveredCharacter(null);
            setHoveredTableSlot(null);
          }
        }
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(container.clientWidth, 1);
      const h = Math.max(container.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // COMPLETE GPU CLEANUP
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      controls.dispose();

      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry) geometries.add(obj.geometry);
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => materials.add(m));
          } else if (obj.material) {
            materials.add(obj.material);
          }
        }
      });

      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      floorTex.dispose();
      kitchenWallTex.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      cameraRef.current = null;
      controlsRef.current = null;
      tables3DRef.current = [];
      hitboxesRef.current = [];
      staffHighlightLightRef.current = null;
      customerHighlightLightRef.current = null;
      lastHoverKeyRef.current = null;
    };
  }, [isWebGLSupported]);

  const hoveredTable: HoveredTableInfo | null =
    hoveredTableSlot !== null
      ? (() => {
          const slot = TABLE_SLOTS[hoveredTableSlot];
          if (!slot) return null;
          const liveTable = resolveSlotTable(tables, hoveredTableSlot, slot.defaultNumber);
          return {
            number: liveTable ? liveTable.number : slot.defaultNumber,
            status: liveTable ? liveTable.status : slot.defaultStatus,
            capacity: liveTable?.capacity || 4,
          };
        })()
      : null;

  const activeTableStyle = hoveredTable
    ? STATUS_STYLE[hoveredTable.status] ?? STATUS_STYLE.available
    : null;

  return (
    <div
      className={`relative w-full h-full select-none overflow-hidden ${className}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        title="Kéo chuột để xoay 360° • Cuộn để phóng to/thu nhỏ • Bấm vào nhân viên, khách hoặc bàn ăn để tương tác"
      />

      {/* WEBGL FALLBACK */}
      {!isWebGLSupported && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-8 text-center backdrop-blur-md">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
            <Utensils className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Mô hình nhà hàng 3D</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Trình duyệt của bạn đang tắt tăng tốc phần cứng WebGL. Bạn vẫn có thể truy cập đầy đủ
            các chức năng gọi món và đăng nhập bên dưới.
          </p>
        </div>
      )}

      {/* HUD POPUP: STAFF */}
      {hoveredCharacter === 'staff' && (
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto fade-in"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onStaffClick?.();
            }}
            className="flex items-center gap-3 rounded-2xl border-2 border-[#FF9500] bg-slate-950/95 px-5 py-3 shadow-2xl shadow-[#FF9500]/30 backdrop-blur-xl cursor-pointer hover:scale-105 active:scale-95 transition-all group"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#FF9500] to-amber-400 font-black text-slate-950 text-base shadow-lg shadow-[#FF9500]/30">
              <UserCheck className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-[#FF9500]">
                  STAFF LOGIN
                </span>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                  Phân quyền RBAC
                </span>
              </div>
              <p className="text-sm font-bold text-white mt-0.5">Đăng nhập nhân viên</p>
              <p className="text-[10px] text-slate-400 flex items-center gap-1 group-hover:text-amber-300 transition-colors mt-0.5">
                <span>Thu Ngân • Bếp KDS • Quản Lý Kho</span>
                <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </p>
            </div>
          </div>
        </div>
      )}

      {/* HUD POPUP: CUSTOMER */}
      {hoveredCharacter === 'customer' && (
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto fade-in"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onCustomerClick?.();
            }}
            className="flex items-center gap-3 rounded-2xl border-2 border-[#318BFF] bg-slate-950/95 px-5 py-3 shadow-2xl shadow-[#318BFF]/30 backdrop-blur-xl cursor-pointer hover:scale-105 active:scale-95 transition-all group"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#318BFF] to-sky-400 font-black text-white text-base shadow-lg shadow-[#318BFF]/30">
              <QrCode className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-[#318BFF]">
                  ORDER FOOD
                </span>
                <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-[9px] font-bold text-blue-300">
                  QR Bàn
                </span>
              </div>
              <p className="text-sm font-bold text-white mt-0.5">Khám phá thực đơn và gọi món</p>
              <p className="text-[10px] text-slate-400 flex items-center gap-1 group-hover:text-sky-300 transition-colors mt-0.5">
                <span>Chọn bàn & gửi món trực tiếp vào bếp</span>
                <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </p>
            </div>
          </div>
        </div>
      )}

      {/* HUD POPUP: TABLE */}
      {hoveredTable && !hoveredCharacter && activeTableStyle && (
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto fade-in"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelectTable?.(hoveredTable.number);
            }}
            className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-slate-950/95 px-5 py-3 shadow-2xl shadow-amber-500/10 backdrop-blur-xl cursor-pointer hover:scale-105 active:scale-95 transition-all group"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#FF9500] to-amber-500 font-black text-slate-950 text-base shadow-lg shadow-amber-500/25">
              {hoveredTable.number}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white">Bàn {hoveredTable.number}</span>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${activeTableStyle.badgeClass}`}>
                  {activeTableStyle.label}
                </span>
              </div>
              <p className="text-[10px] text-amber-300 font-medium flex items-center gap-1 mt-0.5 group-hover:text-amber-200">
                <span>Nhấn để gọi món bàn {hoveredTable.number} ({hoveredTable.capacity} chỗ)</span>
                <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CAMERA RESET BUTTON (Positioned cleanly below top header) */}
      <div
        className="absolute top-20 right-4 lg:right-8 z-30 flex items-center gap-2"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleResetCamera}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/85 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          title="Đặt lại góc nhìn mặc định"
        >
          <RotateCcw className="h-3.5 w-3.5 text-[#FF9500]" />
          <span className="hidden sm:inline">Góc nhìn chuẩn</span>
        </button>
      </div>

      {/* BOTTOM FLOATING INSTRUCTION PILL */}
      <div className="hidden sm:block absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-auto max-w-[95%]">
        <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-slate-950/80 px-4 py-1.5 shadow-2xl backdrop-blur-xl text-[11px] text-slate-300 font-medium text-center">
          <Compass
            className="h-3.5 w-3.5 text-[#FF9500] shrink-0 animate-spin"
            style={{ animationDuration: '8s' }}
          />
          <span>
            <strong className="text-white">KÉO CHUỘT:</strong> Xoay 360° •{' '}
            <strong className="text-white">CUỘN:</strong> Phóng to/thu nhỏ •{' '}
            <strong className="text-[#FF9500]">BẤM VÀO NHÂN VIÊN / KHÁCH / BÀN:</strong> Trải nghiệm ngay
          </span>
        </div>
      </div>
    </div>
  );
}
