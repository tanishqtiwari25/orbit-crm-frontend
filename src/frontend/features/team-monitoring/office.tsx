"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Component,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  CanvasTexture,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Shape,
  ExtrudeGeometry,
  SRGBColorSpace,
  OrthographicCamera,
  Object3D,
  Color,
  Vector3,
  type Mesh,
  type InstancedMesh,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { sharedTableSize, sharedSeat, seatPoint } from "./shared-table";
import { FloorMap } from "./floor-map";
import {
  workColors,
  assignmentState,
  type TeamEmployee,
} from "@/frontend/entities/workforce";

function subscribeTheme(notify: () => void) {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}
const readTheme = () => document.documentElement.dataset.theme === "dark";
function Controls({
  view,
  width,
  depth,
  zoom,
}: {
  view: number;
  width: number;
  depth: number;
  zoom: number;
}) {
  const { camera, gl, invalidate, size } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.target.set(0, 0.5, 0);
    c.enablePan = true;
    c.enableDamping = false;
    c.minPolarAngle = 0.35;
    c.maxPolarAngle = 0.72;
    c.enableZoom = false;
    const changed = () => invalidate();
    c.addEventListener("change", changed);
    controls.current = c;
    return () => {
      c.removeEventListener("change", changed);
      c.dispose();
    };
  }, [camera, gl, invalidate]);
  useEffect(() => {
    const angle = 0.55 + (view * Math.PI) / 4;
    camera.position.set(Math.sin(angle) * 25, 40, Math.cos(angle) * 25);
    camera.lookAt(0, 0.5, 0);
    controls.current?.target.set(0, 0.5, 0);
    if (camera instanceof OrthographicCamera) {
      const fitted = camera.clone();
      fitted.zoom = 1;
      fitted.updateProjectionMatrix();
      fitted.updateMatrixWorld();
      const point = new Vector3();
      let extentX = 0,
        extentY = 0;
      for (const x of [-width / 2, width / 2])
        for (const y of [-0.2, 2.1])
          for (const z of [-depth / 2, depth / 2]) {
            point.set(x, y, z).project(fitted);
            extentX = Math.max(extentX, Math.abs(point.x));
            extentY = Math.max(extentY, Math.abs(point.y));
          }
      fitted.zoom = Math.min(1 / (extentX * 1.07), 1 / (extentY * 1.07)) * zoom;
      fitted.updateProjectionMatrix();
      camera.copy(fitted);
    }
    controls.current?.update();
    invalidate();
  }, [camera, view, width, depth, zoom, size.width, size.height, invalidate]);
  return null;
}
type PartProps = {
  employees: TeamEmployee[];
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
  color: string | ((e: TeamEmployee, i: number) => string);
  shape?: "box" | "sphere" | "cylinder" | "rounded";
  basic?: boolean;
  focusingOnly?: boolean;
  typing?: number;
  screenFlow?: boolean;
  faceOffset?: [number, number, number];
  animate?: boolean;
  onSelect: (id: string) => void;
};
// One instanced draw call per repeated body/furniture part, regardless of team size.
function Part({
  employees,
  position,
  scale,
  rotation = [0, 0, 0],
  color,
  shape = "box",
  basic,
  focusingOnly,
  typing,
  screenFlow,
  faceOffset,
  animate,
  onSelect,
}: PartProps) {
  const ref = useRef<InstancedMesh>(null);
  const { invalidate, gl, camera } = useThree();
  const rounded = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 2, 0.12), []);
  useEffect(() => () => rounded.dispose(), [rounded]);
  const scratch = useMemo(
    () => ({
      object: new Object3D(),
      color: new Color(),
      offset: new Vector3(),
    }),
    [],
  );
  const update = (time: number) => {
    const mesh = ref.current;
    if (!mesh) return;
    employees.forEach((e, i) => {
      const [x, z] = seatPoint(i, employees.length, position[0], position[2]),
        working = e.status === "focusing" || assignmentState(e) === "active";
      const wave =
        typing && animate && working
          ? Math.sin(time * 4 + i * 1.7 + typing)
          : 0;
      scratch.object.position.set(x, position[1] + wave * 0.022, z);
      scratch.object.rotation.set(
        rotation[0] + wave * 0.025,
        rotation[1] + sharedSeat(i, employees.length).angle,
        rotation[2],
      );
      if (faceOffset) {
        const [hx, hz] = seatPoint(i, employees.length, 0, 0.4);
        scratch.offset.set(...faceOffset).applyQuaternion(camera.quaternion);
        scratch.object.position.set(hx, 1.82, hz).add(scratch.offset);
        scratch.object.quaternion.copy(camera.quaternion);
      }
      const shown = !focusingOnly || working;
      scratch.object.scale.set(
        scale[0] *
          (shown ? 1 : 0.001) *
          (screenFlow && animate && working
            ? 0.7 + 0.3 * Math.sin(time * 2 + i + position[1] * 12) ** 2
            : 1),
        scale[1] * (shown ? 1 : 0.001),
        scale[2] * (shown ? 1 : 0.001),
      );
      scratch.object.updateMatrix();
      mesh.setMatrixAt(i, scratch.object.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => {
    update(0);
    employees.forEach((e, i) =>
      ref.current?.setColorAt(
        i,
        scratch.color.set(typeof color === "function" ? color(e, i) : color),
      ),
    );
    if (ref.current?.instanceColor)
      ref.current.instanceColor.needsUpdate = true;
    ref.current?.computeBoundingSphere();
    invalidate();
  });
  useFrame(({ clock }) => {
    if ((typing && animate) || faceOffset) update(clock.elapsedTime);
  });
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, employees.length]}
      castShadow={!basic}
      receiveShadow={!basic}
      onClick={(e) => {
        e.stopPropagation();
        if (e.instanceId !== undefined)
          onSelect(employees[e.instanceId].userId);
      }}
      onPointerOver={() => {
        gl.domElement.style.setProperty("cursor", "pointer");
      }}
      onPointerOut={() => {
        gl.domElement.style.setProperty("cursor", "grab");
      }}
    >
      {shape === "rounded" ? (
        <primitive object={rounded} attach="geometry" />
      ) : shape === "sphere" ? (
        <sphereGeometry args={[1, 12, 10]} />
      ) : shape === "cylinder" ? (
        <cylinderGeometry args={[1, 1, 1, 10]} />
      ) : (
        <boxGeometry args={[1, 1, 1]} />
      )}
      {basic ? (
        <meshBasicMaterial color="white" />
      ) : (
        <meshStandardMaterial color="white" roughness={0.8} />
      )}
    </instancedMesh>
  );
}
function Nameplate({
  employee,
  index,
  count,
  dark,
  selected,
  onSelect,
}: {
  employee: TeamEmployee;
  index: number;
  count: number;
  dark: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const plate = useRef<Mesh>(null);
  const { camera, gl, size } = useThree();
  const [headX, headZ] = seatPoint(index, count, 0, 0.4);
  const layout = useMemo(
    () => ({
      heads: Array.from({ length: count }, () => new Vector3()),
      center: new Vector3(),
      start: new Vector3(),
      end: new Vector3(),
    }),
    [count],
  );
  const leader = useMemo(() => {
    const geometry = new BufferGeometry().setFromPoints([
      new Vector3(),
      new Vector3(),
    ]);
    const material = new LineBasicMaterial({
      color: dark ? "#536b5c" : "#bacbc0",
      transparent: true,
      opacity: 0.8,
      depthTest: false,
    });
    const line = new Line(geometry, material);
    line.renderOrder = 9;
    line.frustumCulled = false;
    return line;
  }, [dark]);
  const leaderRef = useRef(leader);
  useEffect(() => {
    leaderRef.current = leader;
  }, [leader]);
  useEffect(
    () => () => {
      leader.geometry.dispose();
      leader.material.dispose();
    },
    [leader],
  );
  useFrame(() => {
    if (!plate.current) return;
    const unit =
      camera instanceof OrthographicCamera
        ? (camera.right - camera.left) / (camera.zoom * size.width)
        : 0.025;
    const width = size.width < 480 ? 100 : 120;
    plate.current.scale.set(width * unit, 34 * unit, 1);
    layout.center.set(0, 0.9, 0).project(camera);
    layout.heads.forEach((point, i) => {
      const [x, z] = seatPoint(i, count, 0, 0.4);
      point.set(x, 1.82, z).project(camera);
    });
    const current = layout.heads[index];
    const left = current.x < layout.center.x;
    const column = layout.heads
      .map((point, i) => ({ point, i }))
      .filter(({ point }) => point.x < layout.center.x === left)
      .sort((a, b) => b.point.y - a.point.y || a.i - b.i);
    const rank = column.findIndex(({ i }) => i === index);
    const minY = Math.max(
      30,
      Math.min(...layout.heads.map((p) => ((1 - p.y) * size.height) / 2)),
    );
    const maxY = Math.min(
      size.height - 30,
      Math.max(...layout.heads.map((p) => ((1 - p.y) * size.height) / 2)),
    );
    const spacing = Math.max(
      46,
      (maxY - minY) / Math.max(1, column.length - 1),
    );
    const y = Math.min(size.height - 26, minY + rank * spacing);
    const x = left ? 22 + width / 2 : size.width - 22 - width / 2;
    plate.current.position
      .set((x / size.width) * 2 - 1, 1 - (y / size.height) * 2, current.z)
      .unproject(camera);
    plate.current.quaternion.copy(camera.quaternion);
    layout.start
      .set(
        ((x + (left ? width / 2 : -width / 2)) / size.width) * 2 - 1,
        1 - (y / size.height) * 2,
        current.z,
      )
      .unproject(camera);
    layout.end.copy(current);
    layout.end.setX(layout.end.x + (((left ? -1 : 1) * 18) / size.width) * 2);
    layout.end.unproject(camera);
    const positions = leaderRef.current.geometry.attributes.position;
    positions.setXYZ(0, layout.start.x, layout.start.y, layout.start.z);
    positions.setXYZ(1, layout.end.x, layout.end.y, layout.end.z);
    positions.needsUpdate = true;
  });
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 200;
    const c = canvas.getContext("2d")!;
    c.fillStyle = dark ? "#172c21" : "#ffffff";
    c.beginPath();
    c.roundRect(4, 4, 760, 192, 42);
    c.fill();
    c.strokeStyle = selected ? "#568966" : dark ? "#536b5c" : "#d9e3dc";
    c.lineWidth = selected ? 10 : 5;
    c.stroke();
    c.fillStyle =
      assignmentState(employee) === "active"
        ? "#299567"
        : workColors[employee.status];
    c.beginPath();
    c.arc(62, 100, 16, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = dark ? "#ffffff" : "#132a1c";
    c.font = "600 78px sans-serif";
    let name = employee.name;
    while (c.measureText(name).width > 620 && name.length > 1)
      name = name.slice(0, -1);
    if (name !== employee.name) name = name.slice(0, -1) + "…";
    c.fillText(name, 104, 128);
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = gl.capabilities.getMaxAnisotropy();
    return t;
  }, [employee, selected, dark, gl]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group>
      <primitive object={leader} />
      <mesh
        ref={plate}
        quaternion={camera.quaternion}
        position={[headX, 0.2, headZ]}
        renderOrder={10}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(employee.userId);
        }}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={texture}
          transparent
          toneMapped={false}
          depthTest={false}
        />
      </mesh>
    </group>
  );
}
function SharedTable({ count, dark }: { count: number; dark: boolean }) {
  const size = sharedTableSize(count);
  const geometry = useMemo(() => {
    const half = size / 2,
      r = 0.65,
      shape = new Shape();
    shape.moveTo(-half + r, -half);
    shape.lineTo(half - r, -half);
    shape.quadraticCurveTo(half, -half, half, -half + r);
    shape.lineTo(half, half - r);
    shape.quadraticCurveTo(half, half, half - r, half);
    shape.lineTo(-half + r, half);
    shape.quadraticCurveTo(-half, half, -half, half - r);
    shape.lineTo(-half, -half + r);
    shape.quadraticCurveTo(-half, -half, -half + r, -half);
    const g = new ExtrudeGeometry(shape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.035,
      bevelThickness: 0.025,
      curveSegments: 12,
    });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [size]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <group>
      <mesh
        geometry={geometry}
        position={[0, 0.84, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={dark ? "#8a8979" : "#eee0c8"}
          roughness={0.82}
        />
      </mesh>
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <mesh
            key={x + ":" + z}
            position={[x * (size / 2 - 0.55), 0.4, z * (size / 2 - 0.55)]}
            castShadow
          >
            <cylinderGeometry args={[0.1, 0.13, 0.8, 12]} />
            <meshStandardMaterial
              color={dark ? "#526251" : "#b8b59f"}
              roughness={0.8}
            />
          </mesh>
        )),
      )}
    </group>
  );
}

function Office({
  employees,
  selected,
  onSelect,
  animate,
  dark,
}: {
  employees: TeamEmployee[];
  selected: string;
  onSelect: (id: string) => void;
  animate: boolean;
  dark: boolean;
}) {
  const common = { employees, onSelect, animate };
  const shirt = (e: TeamEmployee, i: number) =>
    e.status === "offline"
      ? "#7e8985"
      : ["#739563", "#819d70", "#698b64", "#8b9e75"][i % 4];
  const skin = (_e: TeamEmployee, i: number) =>
    ["#c99b7b", "#e1bfa3", "#aa7655", "#cba887"][i % 4];
  return (
    <>
      <SharedTable count={employees.length} dark={dark} />
      <Part
        {...common}
        position={[0, 0.035, 0.5]}
        scale={[0.85, 0.025, 0.85]}
        shape="cylinder"
        color={(e) =>
          e.userId === selected
            ? dark
              ? "#456653"
              : "#b7d7bf"
            : dark
              ? "#24342a"
              : "#e7eee8"
        }
      />
      <Part
        {...common}
        rotation={[-Math.PI / 3, 0, 0]}
        position={[0, 1.32, -0.77]}
        scale={[1.03, 0.64, 0.09]}
        shape="rounded"
        color="#25392e"
      />
      <Part
        {...common}
        rotation={[-Math.PI / 3, 0, 0]}
        position={[0, 1.367, -0.743]}
        scale={[0.91, 0.51, 0.012]}
        color={(e) =>
          e.status === "focusing" || assignmentState(e) === "active"
            ? "#76cba7"
            : "#182c24"
        }
        basic
      />
      {[0, 1, 2].map((row) => (
        <Part
          key={`screen${row}`}
          {...common}
          screenFlow
          typing={row + 1}
          rotation={[-Math.PI / 3, 0, 0]}
          position={[
            -0.09,
            1.377 + (0.14 - row * 0.12) * 0.5,
            -0.737 - (0.14 - row * 0.12) * 0.866,
          ]}
          scale={[0.59 - row * 0.07, 0.035, 0.008]}
          color="#e5fff2"
          focusingOnly
          basic
        />
      ))}
      <Part
        {...common}
        position={[0, 1.11, -0.77]}
        scale={[0.05, 0.3, 0.06]}
        color="#4c6254"
      />
      <Part
        {...common}
        position={[0, 0.99, -0.25]}
        scale={[0.72, 0.035, 0.25]}
        color="#56665b"
      />
      {Array.from({ length: 18 }, (_, key) => (
        <Part
          key={`keycap${key}`}
          {...common}
          position={[
            -0.3 + (key % 9) * 0.075,
            1.018,
            -0.31 + Math.floor(key / 9) * 0.12,
          ]}
          scale={[0.055, 0.018, 0.075]}
          color="#d5e5da"
          typing={key + 1}
        />
      ))}
      <Part
        {...common}
        position={[0.56, 0.99, -0.21]}
        scale={[0.1, 0.04, 0.16]}
        color="#56665b"
        shape="sphere"
      />
      <Part
        {...common}
        position={[0, 0.65, 0.52]}
        scale={[0.82, 0.13, 0.77]}
        shape="rounded"
        color="#78936b"
      />
      <Part
        {...common}
        position={[0, 0.98, 0.84]}
        scale={[0.82, 0.68, 0.13]}
        shape="rounded"
        color="#455a4c"
      />
      <Part
        {...common}
        position={[0, 0.35, 0.52]}
        scale={[0.045, 0.48, 0.045]}
        color="#596b5f"
        shape="cylinder"
      />
      <Part
        {...common}
        position={[0, 0.1, 0.52]}
        scale={[0.34, 0.05, 0.34]}
        color="#596b5f"
        shape="cylinder"
      />
      <Part
        {...common}
        position={[0, 1.13, 0.48]}
        scale={[0.32, 0.56, 0.25]}
        color={shirt}
        shape="cylinder"
      />
      <Part
        {...common}
        position={[0, 1.82, 0.4]}
        scale={[0.28, 0.3, 0.25]}
        color={skin}
        shape="sphere"
      />
      <Part
        {...common}
        position={[0, 2.01, 0.48]}
        scale={[0.265, 0.15, 0.22]}
        color="#3d3932"
        shape="sphere"
      />
      {[-1, 1].map((side) => (
        <Part
          key={"eye" + side}
          {...common}
          position={[side * 0.09, 1.845, 0.151]}
          scale={[0.032, 0.038, 0.025]}
          color="#29342c"
          shape="sphere"
        />
      ))}
      <Part
        {...common}
        position={[0, 1.5, 0.4]}
        scale={[0.09, 0.3, 0.09]}
        color={skin}
        shape="cylinder"
      />
      <Part
        {...common}
        position={[0, 1.725, 0.159]}
        scale={[0.055, 0.015, 0.018]}
        color="#805a49"
        shape="sphere"
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Part
            {...common}
            position={[side * 0.15, 0.74, 0.25]}
            scale={[0.12, 0.13, 0.4]}
            color="#374640"
          />
          <Part
            {...common}
            position={[side * 0.15, 0.45, 0.06]}
            scale={[0.1, 0.47, 0.1]}
            color="#374640"
          />
          <Part
            {...common}
            position={[side * 0.15, 0.18, -0.02]}
            scale={[0.13, 0.1, 0.28]}
            color="#293b31"
          />
          <Part
            {...common}
            position={[side * 0.28, 1.16, 0.24]}
            scale={[0.075, 0.34, 0.075]}
            rotation={[-0.65, 0, side * 0.25]}
            color={shirt}
            shape="cylinder"
          />
          <Part
            {...common}
            position={[side * 0.26, 1.02, -0.02]}
            scale={[0.065, 0.35, 0.065]}
            rotation={[-1.35, 0, -side * 0.1]}
            color={skin}
            shape="cylinder"
            typing={side}
          />
          <Part
            {...common}
            position={[side * 0.22, 1.015, -0.2]}
            scale={[0.075, 0.035, 0.1]}
            color={skin}
            shape="sphere"
            typing={side}
          />
        </group>
      ))}
      {employees.map((employee, index) => (
        <Nameplate
          key={employee.userId}
          employee={employee}
          index={index}
          count={employees.length}
          selected={employee.userId === selected}
          onSelect={onSelect}
          dark={dark}
        />
      ))}
    </>
  );
}
function WebGLOffice({
  employees,
  selected,
  onSelect,
  animate,
  view,
  zoom,
  onLost,
}: {
  employees: TeamEmployee[];
  selected: string;
  onSelect: (id: string) => void;
  animate: boolean;
  view: number;
  zoom: number;
  timezone: string;
  onLost: () => void;
}) {
  const dark = useSyncExternalStore(subscribeTheme, readTheme, () => false);
  const width = sharedTableSize(employees.length) + 5,
    depth = width;
  const moving =
    animate &&
    employees.some(
      (e) => e.status === "focusing" || assignmentState(e) === "active",
    );
  return (
    <Canvas
      orthographic
      shadows
      camera={{ position: [10, 30, 25], zoom: 30, near: 0.1, far: 250 }}
      dpr={[1, 1.5]}
      frameloop={moving ? "always" : "demand"}
      fallback={
        <FloorMap
          employees={employees}
          selected={selected}
          onSelect={onSelect}
          animate={animate}
        />
      }
      onCreated={({ gl }) =>
        gl.domElement.addEventListener("webglcontextlost", onLost, {
          once: true,
        })
      }
    >
      <color attach="background" args={[dark ? "#19241e" : "#fafbfa"]} />
      <ambientLight intensity={1.1} />
      <directionalLight
        position={[-7, 18, 9]}
        intensity={1.25}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-width / 2}
        shadow-camera-right={width / 2}
        shadow-camera-top={depth / 2}
        shadow-camera-bottom={-depth / 2}
        shadow-camera-far={200}
        shadow-normalBias={0.04}
      />
      <hemisphereLight args={["#ffffff", "#9cafa1", 0.6]} />
      <mesh
        position={[0, -0.06, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[width * 3, depth * 3]} />
        <shadowMaterial transparent opacity={dark ? 0.18 : 0.09} />
      </mesh>
      <Office
        employees={employees}
        selected={selected}
        onSelect={onSelect}
        animate={moving}
        dark={dark}
      />
      <Controls view={view} width={width} depth={depth} zoom={zoom} />
    </Canvas>
  );
}
class OfficeRenderBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export default function TeamScene(props: Parameters<typeof WebGLOffice>[0]) {
  return (
    <OfficeRenderBoundary
      fallback={
        <FloorMap
          employees={props.employees}
          selected={props.selected}
          onSelect={props.onSelect}
          animate={props.animate}
        />
      }
    >
      <WebGLOffice {...props} />
    </OfficeRenderBoundary>
  );
}
