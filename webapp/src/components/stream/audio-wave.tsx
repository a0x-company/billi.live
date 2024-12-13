// react
import { useEffect, useRef } from "react";

// three.js
import * as THREE from "three";

interface AudioWaveProps {
  isPlaying: boolean;
  color?: string;
}

export const AudioWave = ({ isPlaying, color = "#ff3366" }: AudioWaveProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const barsRef = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 800 / 200, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    renderer.setSize(800, 200);
    containerRef.current.appendChild(renderer.domElement);

    const bars: THREE.Mesh[] = [];
    const barGeometry = new THREE.BoxGeometry(0.2, 1, 0.2);
    const barMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color(color),
      shininess: 100,
      specular: 0x444444,
    });

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 1, 2);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const numBars = 32;
    for (let i = 0; i < numBars; i++) {
      const bar = new THREE.Mesh(barGeometry, barMaterial);
      bar.position.x = (i - numBars / 2) * 0.3;
      bar.position.z = 0;
      bars.push(bar);
      scene.add(bar);
    }

    barsRef.current = bars;
    camera.position.z = 5;
    camera.position.y = 1;
    camera.lookAt(0, 0, 0);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    return () => {
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [color]);

  useEffect(() => {
    if (
      !barsRef.current.length ||
      !rendererRef.current ||
      !sceneRef.current ||
      !cameraRef.current
    )
      return;

    let animationFrameId: number;

    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current)
        return;

      if (isPlaying) {
        barsRef.current.forEach((bar, i) => {
          const time = Date.now() * 0.001;
          const height = Math.sin(time * 2 + i * 0.2) * 0.5 + 0.7;
          bar.scale.y = Math.max(0.1, height);
          bar.position.y = height / 2;
        });
      } else {
        barsRef.current.forEach((bar) => {
          bar.scale.y = 0.1;
          bar.position.y = 0.05;
        });
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying]);

  return (
    <div
      ref={containerRef}
      className="absolute left-1/2 transform -translate-x-1/2"
      style={{ top: "60%" }}
    />
  );
};
