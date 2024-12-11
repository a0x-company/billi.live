"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function IA() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"idle" | "talking" | "excited">("idle");
  const timeoutRef = useRef<NodeJS.Timeout>();
  const animationRef = useRef<{
    sphere: THREE.LineSegments | null;
    particles: THREE.Points | null;
    currentColor: THREE.Color;
  }>({
    sphere: null,
    particles: null,
    currentColor: new THREE.Color("#8b5cf6"),
  });

  const handleModeChange = (newMode: "talking" | "excited") => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setMode(newMode);
    timeoutRef.current = setTimeout(() => {
      setMode("idle");
    }, 3000);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const aspect =
      containerRef.current.clientWidth / containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    containerRef.current.appendChild(renderer.domElement);

    const createSphere = (radius: number, segments: number) => {
      const geometry = new THREE.SphereGeometry(radius, segments, segments);
      const wireframe = new THREE.WireframeGeometry(geometry);
      const material = new THREE.LineBasicMaterial({
        color: animationRef.current.currentColor,
        transparent: true,
        opacity: 0.3,
      });
      return new THREE.LineSegments(wireframe, material);
    };

    const createParticles = (radius: number) => {
      const geometry = new THREE.BufferGeometry();
      const particlesCount = 2000;
      const positions = new Float32Array(particlesCount * 3);

      for (let i = 0; i < particlesCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const r = radius * (0.8 + Math.random() * 0.2);

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
      }

      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );

      const material = new THREE.PointsMaterial({
        color: animationRef.current.currentColor,
        size: 0.02,
        transparent: true,
        opacity: 0.8,
      });

      return new THREE.Points(geometry, material);
    };

    const sphere = createSphere(0.8, 20);
    const particles = createParticles(0.9);

    animationRef.current.sphere = sphere;
    animationRef.current.particles = particles;

    scene.add(sphere);
    scene.add(particles);

    camera.position.z = 2;

    const animate = () => {
      requestAnimationFrame(animate);

      // Calcular color objetivo
      const targetColor = new THREE.Color(
        mode === "talking"
          ? "#4ade80"
          : mode === "excited"
          ? "#ef4444"
          : "#8b5cf6"
      );

      // Interpolar color suavemente
      animationRef.current.currentColor.lerp(targetColor, 0.05);

      // Aplicar color actual a los materiales
      if (sphere.material instanceof THREE.LineBasicMaterial) {
        sphere.material.color = animationRef.current.currentColor;
      }
      if (particles.material instanceof THREE.PointsMaterial) {
        particles.material.color = animationRef.current.currentColor;
      }

      // Calcular velocidad actual
      const baseSpeed = mode === "talking" ? 2 : mode === "excited" ? 3 : 1;

      // Mantener la rotación continua
      sphere.rotation.x -= 0.002 * baseSpeed;
      sphere.rotation.y -= 0.001 * baseSpeed;
      particles.rotation.x += 0.0005 * baseSpeed;
      particles.rotation.y += 0.0005 * baseSpeed;

      // Efecto de "respiración" suave
      const time = Date.now() * 0.001;
      const pulseIntensity =
        mode === "excited" ? 0.08 : mode === "talking" ? 0.06 : 0.04;

      const scale = 1 + Math.sin(time) * pulseIntensity;
      sphere.scale.set(scale, scale, scale);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const newAspect =
        containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.aspect = newAspect;
      camera.updateProjectionMatrix();
      renderer.setSize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight
      );
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [mode]);

  return (
    <div className="w-full min-h-screen bg-black p-8">
      <div className="max-w-4xl mx-auto">
        {/* Contenedor del "stream" */}
        <div className="relative">
          {/* Indicador de LIVE */}
          <div className="absolute top-3 left-3 bg-red-600 text-white text-xs px-2 py-1 rounded z-10">
            <p className="font-black">LIVE</p>
          </div>

          {/* Contenedor de la animación */}
          <div
            ref={containerRef}
            className="w-full aspect-video bg-black rounded-lg overflow-hidden border border-white"
          />
        </div>

        <div className="mt-4 flex gap-4 justify-center">
          <button
            onClick={() => handleModeChange("talking")}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              mode === "talking"
                ? "bg-green-500 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Hablar
          </button>

          <button
            onClick={() => handleModeChange("excited")}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              mode === "excited"
                ? "bg-red-500 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Excitarse
          </button>
        </div>
      </div>
    </div>
  );
}
