"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import type { Prop as PropId } from "@anonymo/agentes";

// Objetos pequeños y mates, como producto de estudio (referencia: Hot Lunch, CW&T).
const TINTA = "#17171b";
const BLANCO = "#f4f2ec";
const PLATA = "#c9c9cf";

function Mat({ color, opacity = 1, emissive }: { color: string; opacity?: number; emissive?: string }) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={0.55}
      metalness={0.05}
      transparent={opacity < 1}
      opacity={opacity}
      emissive={emissive ?? "#000000"}
      emissiveIntensity={emissive ? 0.6 : 0}
    />
  );
}

function Estrella() {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.11 : 0.26;
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    return new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 });
  }, []);
  return (
    <group position={[0, 1.42, 0]}>
      <mesh position={[0, -0.22, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.34, 8]} />
        <Mat color={TINTA} />
      </mesh>
      <mesh geometry={geo} position={[0, 0.04, -0.04]}>
        <Mat color="#ffe27a" />
      </mesh>
    </group>
  );
}

function Escuadra() {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(0.62, 0); s.lineTo(0, 0.62); s.lineTo(0, 0);
    const h = new THREE.Path();
    h.moveTo(0.1, 0.1); h.lineTo(0.36, 0.1); h.lineTo(0.1, 0.36); h.lineTo(0.1, 0.1);
    s.holes.push(h);
    return new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false });
  }, []);
  return (
    <mesh geometry={geo} position={[0.42, 0.4, 0.66]} rotation={[0.1, -0.5, -0.25]} scale={1.2}>
      <Mat color={TINTA} />
    </mesh>
  );
}

function Pulso() {
  const geo = useMemo(() => {
    const pts = [[-0.22, 0], [-0.1, 0], [-0.06, 0.09], [0, -0.1], [0.05, 0.05], [0.08, 0], [0.22, 0]].map(
      ([x, y]) => new THREE.Vector3(x, y, 0)
    );
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.1), 40, 0.012, 6, false);
  }, []);
  return (
    <group position={[0, -0.62, 0.9]} rotation={[-0.25, 0, 0]}>
      <RoundedBox args={[0.6, 0.32, 0.08]} radius={0.05}>
        <Mat color={TINTA} />
      </RoundedBox>
      <mesh geometry={geo} position={[0, 0, 0.05]}>
        <meshBasicMaterial color="#7cffd6" />
      </mesh>
    </group>
  );
}


// Montura rectangular con esquinas redondeadas para los lentes 3D.
function Marco() {
  const geo = useMemo(() => {
    const rr = (w: number, h: number, r: number) => {
      const p = new THREE.Shape();
      p.moveTo(-w / 2 + r, -h / 2);
      p.lineTo(w / 2 - r, -h / 2); p.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      p.lineTo(w / 2, h / 2 - r); p.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
      p.lineTo(-w / 2 + r, h / 2); p.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
      p.lineTo(-w / 2, -h / 2 + r); p.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
      return p;
    };
    const s = rr(0.42, 0.3, 0.06);
    s.holes.push(rr(0.34, 0.22, 0.04) as unknown as THREE.Path);
    return new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false });
  }, []);
  return (
    <mesh geometry={geo} position={[0, 0, -0.01]}>
      <Mat color={TINTA} />
    </mesh>
  );
}

function Microfono() {
  const geo = useMemo(() => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.1, -0.08, 0.04),
      new THREE.Vector3(-1.02, -0.42, 0.42),
      new THREE.Vector3(-0.72, -0.58, 0.78),
      new THREE.Vector3(-0.42, -0.5, 0.95),
    ]);
    return new THREE.TubeGeometry(c, 32, 0.025, 8, false);
  }, []);
  return (
    <group>
      <mesh geometry={geo}>
        <Mat color={TINTA} />
      </mesh>
      <mesh position={[-0.38, -0.49, 0.97]} rotation={[0, 0, Math.PI / 2 - 0.3]}>
        <capsuleGeometry args={[0.055, 0.1, 6, 12]} />
        <Mat color={TINTA} />
      </mesh>
    </group>
  );
}

// Corona de laurel: dos ramas que rodean la cabeza y se juntan adelante, con una baya dorada.
function Laurel() {
  const hojas = useMemo(() => {
    const out: { p: [number, number, number]; r: [number, number, number] }[] = [];
    const n = 11;
    for (const lado of [-1, 1]) {
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const a = Math.PI / 2 + lado * (0.25 + t * 2.55); // de adelante hacia atrás
        const x = Math.cos(a) * 0.8;
        const z = Math.sin(a) * 0.8;
        const y = 0.62 + Math.sin(t * Math.PI) * 0.05;
        const fuera = i % 2 ? 1 : -1;
        out.push({ p: [x, y + fuera * 0.045, z], r: [fuera * 0.55, -a + Math.PI / 2, lado * 0.25] });
      }
    }
    return out;
  }, []);
  return (
    <group>
      <mesh position={[0, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.018, 6, 64]} />
        <Mat color="#4d8f45" />
      </mesh>
      {hojas.map((h, i) => (
        <mesh key={i} position={h.p} rotation={h.r} scale={[0.17, 0.065, 0.05]}>
          <sphereGeometry args={[1, 14, 8]} />
          <Mat color={i % 3 ? "#73c464" : "#5aa94f"} />
        </mesh>
      ))}
      <mesh position={[0, 0.66, 0.8]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color="#ffc93c" metalness={0.6} roughness={0.25} />
      </mesh>
    </group>
  );
}

export function Prop({ tipo }: { tipo: PropId }) {
  switch (tipo) {
    case "auricular":
      return (
        <group>
          <mesh>
            <torusGeometry args={[1.08, 0.035, 10, 48, Math.PI]} />
            <Mat color={TINTA} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 1.08, -0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.17, 0.17, 0.14, 24]} />
              <Mat color={TINTA} />
            </mesh>
          ))}
          <Microfono />
        </group>
      );
    case "visera":
      return (
        <group position={[0, 0.5, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.86, 0.035, 8, 48]} />
            <Mat color="#2fa86f" />
          </mesh>
          <mesh position={[0, 0.0, 0.8]} rotation={[Math.PI / 2 + 0.45, 0, 0]} scale={[1, 0.8, 1]}>
            <circleGeometry args={[0.62, 40, 0, Math.PI]} />
            <meshStandardMaterial color="#35c47f" transparent opacity={0.72} side={THREE.DoubleSide} roughness={0.35} />
          </mesh>
        </group>
      );
    case "estrella":
      return <Estrella />;
    case "lupa":
      return (
        <group position={[0.95, -0.55, 0.45]} rotation={[0, -0.4, -0.5]}>
          <mesh>
            <torusGeometry args={[0.26, 0.045, 12, 40]} />
            <Mat color={TINTA} />
          </mesh>
          <mesh>
            <circleGeometry args={[0.24, 32]} />
            <meshStandardMaterial color="#dff3ff" transparent opacity={0.35} roughness={0.1} />
          </mesh>
          <mesh position={[0, -0.48, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.42, 12]} />
            <Mat color={TINTA} />
          </mesh>
        </group>
      );
    case "globo":
      return (
        <group position={[0.95, 1.0, 0.1]} rotation={[0, -0.3, 0.08]}>
          <RoundedBox args={[0.8, 0.48, 0.14]} radius={0.12} smoothness={4}>
            <Mat color={BLANCO} />
          </RoundedBox>
          <mesh position={[-0.24, -0.3, 0]} rotation={[0, 0, 0.6]}>
            <coneGeometry args={[0.08, 0.2, 3]} />
            <Mat color={BLANCO} />
          </mesh>
          {[-0.18, 0, 0.18].map((x) => (
            <mesh key={x} position={[x, 0, 0.08]}>
              <sphereGeometry args={[0.045, 12, 12]} />
              <Mat color={TINTA} />
            </mesh>
          ))}
        </group>
      );
    case "boina":
      return (
        <group position={[-0.15, 0.98, 0]} rotation={[0.1, 0, 0.28]}>
          <mesh scale={[1.0, 0.28, 0.95]}>
            <sphereGeometry args={[0.72, 32, 16]} />
            <Mat color={TINTA} />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.12, 8]} />
            <Mat color={TINTA} />
          </mesh>
        </group>
      );
    case "lapiz":
      return (
        <group position={[0.95, 0.75, -0.1]} rotation={[0, 0, -0.75]}>
          <mesh>
            <cylinderGeometry args={[0.07, 0.07, 0.9, 6]} />
            <Mat color="#ffd24a" />
          </mesh>
          <mesh position={[0, -0.53, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.07, 0.16, 6]} />
            <Mat color="#f0d2a6" />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.072, 0.072, 0.12, 12]} />
            <Mat color="#ff8fab" />
          </mesh>
        </group>
      );
    case "escuadra":
      return <Escuadra />;
    case "lentes3d":
      return (
        <group position={[0, 0.2, 0.98]}>
          {[
            [-0.24, "#ff3b3b"],
            [0.24, "#22d3ee"],
          ].map(([x, c]) => (
            <group key={x as number} position={[x as number, 0, 0]}>
              <mesh>
                <boxGeometry args={[0.36, 0.24, 0.03]} />
                <meshStandardMaterial color={c as string} transparent opacity={0.5} roughness={0.2} />
              </mesh>
              <Marco />
            </group>
          ))}
          <mesh position={[0, 0.04, 0.01]}>
            <boxGeometry args={[0.08, 0.03, 0.03]} />
            <Mat color={TINTA} />
          </mesh>
        </group>
      );
    case "laptop":
      return (
        <group position={[0.92, -0.62, 0.45]} rotation={[0.15, -0.6, 0]}>
          <RoundedBox args={[0.7, 0.04, 0.48]} radius={0.015}>
            <Mat color={PLATA} />
          </RoundedBox>
          <group position={[0, 0.02, -0.24]} rotation={[-0.25, 0, 0]}>
            <RoundedBox args={[0.7, 0.46, 0.03]} radius={0.015} position={[0, 0.23, 0]}>
              <Mat color={PLATA} />
            </RoundedBox>
            <mesh position={[0, 0.23, 0.017]}>
              <planeGeometry args={[0.62, 0.38]} />
              <meshBasicMaterial color="#0d1b3d" />
            </mesh>
            {[0.06, -0.02, -0.1].map((y, i) => (
              <mesh key={y} position={[-0.12 + i * 0.03, 0.23 + y, 0.02]}>
                <planeGeometry args={[0.3 - i * 0.06, 0.025]} />
                <meshBasicMaterial color="#7cffd6" />
              </mesh>
            ))}
          </group>
        </group>
      );
    case "estela":
      return (
        <group position={[-1.12, 0, 0.1]}>
          {[0.36, 0.05, -0.26].map((y, i) => (
            <mesh key={y} position={[-i * 0.1, y, 0]} rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.05, 0.5 - i * 0.1, 4, 8]} />
              <Mat color={TINTA} />
            </mesh>
          ))}
        </group>
      );
    case "audifonos":
      return (
        <group>
          <mesh>
            <torusGeometry args={[1.1, 0.075, 12, 48, Math.PI]} />
            <Mat color="#ff8fc7" />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 1.1, -0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.3, 0.3, 0.22, 32]} />
              <Mat color="#ff8fc7" />
            </mesh>
          ))}
        </group>
      );
    case "portapapeles":
      return (
        <group position={[0.95, -0.5, 0.5]} rotation={[0, -0.45, 0.12]}>
          <RoundedBox args={[0.5, 0.66, 0.04]} radius={0.03}>
            <Mat color="#d9b98a" />
          </RoundedBox>
          <mesh position={[0, 0, 0.025]}>
            <planeGeometry args={[0.42, 0.54]} />
            <Mat color={BLANCO} />
          </mesh>
          <RoundedBox args={[0.2, 0.08, 0.06]} radius={0.02} position={[0, 0.33, 0.02]}>
            <Mat color={PLATA} />
          </RoundedBox>
          <group position={[-0.03, -0.02, 0.04]} rotation={[0, 0, -0.75]}>
            <mesh position={[0.06, 0, 0]}>
              <boxGeometry args={[0.26, 0.05, 0.02]} />
              <meshBasicMaterial color="#1f9d63" />
            </mesh>
            <mesh position={[-0.06, 0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
              <boxGeometry args={[0.14, 0.05, 0.02]} />
              <meshBasicMaterial color="#1f9d63" />
            </mesh>
          </group>
        </group>
      );
    case "cronometro":
      return (
        <group position={[0, 1.14, 0.12]}>
          <mesh position={[0, -0.2, -0.06]}>
            <cylinderGeometry args={[0.035, 0.035, 0.22, 8]} />
            <Mat color={TINTA} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.08, 32]} />
            <Mat color={BLANCO} />
          </mesh>
          <mesh position={[0, 0, 0.042]}>
            <torusGeometry args={[0.24, 0.025, 8, 32]} />
            <Mat color={TINTA} />
          </mesh>
          <mesh position={[0.04, 0.06, 0.05]} rotation={[0, 0, -0.6]}>
            <boxGeometry args={[0.02, 0.15, 0.01]} />
            <Mat color={TINTA} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.08, 12]} />
            <Mat color={TINTA} />
          </mesh>
        </group>
      );
    case "faro":
      return (
        <group position={[0.92, 0.1, 0.55]} scale={1.05}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, -0.3 + i * 0.2, 0]}>
              <cylinderGeometry args={[0.13 - i * 0.012, 0.145 - i * 0.012, 0.2, 20]} />
              <Mat color={i % 2 ? BLANCO : "#e8364a"} />
            </mesh>
          ))}
          <mesh position={[0, 0.17, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.14, 16]} />
            <Mat color="#fff3a6" emissive="#ffd84a" />
          </mesh>
          <mesh position={[0, 0.32, 0]}>
            <coneGeometry args={[0.14, 0.16, 16]} />
            <Mat color={TINTA} />
          </mesh>
        </group>
      );
    case "telefono":
      return (
        <group position={[-0.98, -0.5, 0.45]} rotation={[0, 0.5, 0.18]}>
          <RoundedBox args={[0.34, 0.66, 0.05]} radius={0.05}>
            <Mat color={TINTA} />
          </RoundedBox>
          <mesh position={[0, 0, 0.027]}>
            <planeGeometry args={[0.28, 0.56]} />
            <meshBasicMaterial color="#ffd0e6" />
          </mesh>
          <mesh position={[0, 0.02, 0.03]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.1, 0.1, 0.01]} />
            <meshBasicMaterial color="#ff3d7f" />
          </mesh>
          {[-0.035, 0.035].map((x) => (
            <mesh key={x} position={[x, 0.055, 0.03]}>
              <circleGeometry args={[0.05, 16]} />
              <meshBasicMaterial color="#ff3d7f" />
            </mesh>
          ))}
        </group>
      );
    case "camara":
      return (
        <group position={[0, -0.62, 0.9]} rotation={[-0.2, 0, 0]}>
          <RoundedBox args={[0.56, 0.36, 0.22]} radius={0.04}>
            <Mat color={TINTA} />
          </RoundedBox>
          <mesh position={[0.04, -0.01, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.13, 0.12, 24]} />
            <Mat color="#2a2a32" />
          </mesh>
          <mesh position={[0.04, -0.01, 0.215]}>
            <circleGeometry args={[0.08, 24]} />
            <meshStandardMaterial color="#9fd3ff" roughness={0.05} metalness={0.3} />
          </mesh>
          <mesh position={[-0.18, 0.21, 0]}>
            <boxGeometry args={[0.1, 0.06, 0.1]} />
            <Mat color={TINTA} />
          </mesh>
        </group>
      );
    case "claqueta":
      return (
        <group position={[0.95, 0.72, 0.05]} rotation={[0, -0.35, 0.2]}>
          <RoundedBox args={[0.62, 0.42, 0.05]} radius={0.02}>
            <Mat color={TINTA} />
          </RoundedBox>
          <group position={[-0.31, 0.27, 0]} rotation={[0, 0, 0.32]}>
            <mesh position={[0.31, 0, 0]}>
              <boxGeometry args={[0.62, 0.1, 0.05]} />
              <Mat color={BLANCO} />
            </mesh>
            {[0.08, 0.24, 0.4, 0.56].map((x) => (
              <mesh key={x} position={[x, 0, 0.03]} rotation={[0, 0, 0.6]}>
                <boxGeometry args={[0.05, 0.12, 0.01]} />
                <Mat color={TINTA} />
              </mesh>
            ))}
          </group>
          {[0.05, -0.08].map((y) => (
            <mesh key={y} position={[-0.05, y, 0.03]}>
              <planeGeometry args={[0.4, 0.025]} />
              <meshBasicMaterial color={BLANCO} />
            </mesh>
          ))}
        </group>
      );
    case "gorro":
      return (
        <group position={[0.18, 1.3, 0]} rotation={[0, 0, -0.22]}>
          <mesh>
            <coneGeometry args={[0.3, 0.68, 32]} />
            <Mat color="#ffd34d" />
          </mesh>
          <mesh position={[0, -0.12, 0]}>
            <cylinderGeometry args={[0.215, 0.232, 0.06, 32]} />
            <Mat color="#ff3d8f" />
          </mesh>
          <mesh position={[0, 0.38, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <Mat color="#ff3d8f" />
          </mesh>
        </group>
      );
    case "iman":
      return (
        <group position={[1.0, -0.42, 0.35]} rotation={[0, -0.3, Math.PI + 0.4]}>
          <mesh>
            <torusGeometry args={[0.2, 0.08, 12, 32, Math.PI]} />
            <Mat color="#e8364a" />
          </mesh>
          {[-0.2, 0.2].map((x) => (
            <group key={x}>
              <mesh position={[x, -0.12, 0]}>
                <cylinderGeometry args={[0.08, 0.08, 0.24, 16]} />
                <Mat color="#e8364a" />
              </mesh>
              <mesh position={[x, -0.29, 0]}>
                <cylinderGeometry args={[0.08, 0.08, 0.1, 16]} />
                <Mat color={PLATA} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case "laurel":
      return <Laurel />;
    case "pulso":
      return <Pulso />;
  }
}
