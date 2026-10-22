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
    <mesh geometry={geo} position={[0.72, 0.62, 0.15]} rotation={[0.2, -0.35, -0.3]}>
      <Mat color="#ffffff" opacity={0.75} />
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
          <mesh position={[-0.82, -0.36, 0.55]} rotation={[0.9, 0.6, 0.9]}>
            <cylinderGeometry args={[0.022, 0.022, 0.62, 8]} />
            <Mat color={TINTA} />
          </mesh>
          <mesh position={[-0.55, -0.55, 0.82]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <Mat color={TINTA} />
          </mesh>
        </group>
      );
    case "visera":
      return (
        <group position={[0, 0.5, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.86, 0.035, 8, 48]} />
            <Mat color="#2fa86f" />
          </mesh>
          <mesh position={[0, 0.02, 0.86]} rotation={[-1.25, 0, 0]}>
            <circleGeometry args={[0.55, 32, 0, Math.PI]} />
            <meshStandardMaterial color="#3fcf8a" transparent opacity={0.7} side={THREE.DoubleSide} roughness={0.4} />
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
              <mesh>
                <torusGeometry args={[0.19, 0.022, 6, 4, Math.PI * 2]} />
                <Mat color={TINTA} />
              </mesh>
            </group>
          ))}
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
        <group position={[-1.25, 0, 0]}>
          {[0.32, 0, -0.32].map((y, i) => (
            <mesh key={y} position={[-i * 0.08, y, 0]} rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.035, 0.38 - i * 0.06, 4, 8]} />
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
        <group position={[0, 1.32, 0]}>
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
        <group position={[0.98, 0.35, -0.05]} scale={0.9}>
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
      return (
        <group position={[0, 0.72, 0]}>
          {Array.from({ length: 14 }, (_, i) => {
            const a = (i / 13) * Math.PI * 1.6 + Math.PI * 0.2;
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * 0.74, Math.sin(a) * 0.18 + 0.05, Math.sin(a) * 0.62]}
                rotation={[0.3, -a, 0.6 * (i % 2 ? 1 : -1)]}
                scale={[0.16, 0.06, 0.08]}
              >
                <sphereGeometry args={[1, 12, 8]} />
                <Mat color="#6fbf5f" />
              </mesh>
            );
          })}
        </group>
      );
    case "pulso":
      return <Pulso />;
  }
}
