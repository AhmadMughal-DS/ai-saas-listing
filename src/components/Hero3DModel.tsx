import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Hero3DModelProps {
  className?: string;
}

export const Hero3DModel: React.FC<Hero3DModelProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth || 640;
    let height = container.clientHeight || 500;

    // Scene & Camera with comfortable FOV and distance to ensure 100% complete visibility
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 1000);
    camera.position.z = 5.2;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Group for combined rotation & mouse tilt
    const group = new THREE.Group();
    scene.add(group);

    // Primary Torus Knot Wireframe - scaled gracefully so full structure is visible
    const knotGeometry = new THREE.TorusKnotGeometry(1.22, 0.32, 128, 28);
    const knotMaterial = new THREE.MeshBasicMaterial({
      color: 0x6366f1, // Indigo 500
      wireframe: true,
      transparent: true,
      opacity: 0.24,
    });
    const knotMesh = new THREE.Mesh(knotGeometry, knotMaterial);
    group.add(knotMesh);

    // Accent Orbital Ring
    const ringGeometry = new THREE.TorusGeometry(1.72, 0.02, 16, 100);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x818cf8, // Indigo 400
      transparent: true,
      opacity: 0.2,
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.rotation.x = Math.PI / 3;
    group.add(ringMesh);

    // Subtle Cyan Vertex Particle Points for AI feel
    const pointGeometry = new THREE.TorusKnotGeometry(1.22, 0.32, 64, 14);
    const pointMaterial = new THREE.PointsMaterial({
      color: 0x38bdf8, // Sky Cyan
      size: 0.038,
      transparent: true,
      opacity: 0.38,
    });
    const pointsMesh = new THREE.Points(pointGeometry, pointMaterial);
    group.add(pointsMesh);

    // Mouse tracking for subtle organic parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      mouseX = (e.clientX / innerWidth - 0.5) * 0.8;
      mouseY = (e.clientY / innerHeight - 0.5) * 0.8;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Animation loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse interpolation
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      // Organic rotation
      knotMesh.rotation.x = elapsedTime * 0.16;
      knotMesh.rotation.y = elapsedTime * 0.22;
      pointsMesh.rotation.x = elapsedTime * 0.16;
      pointsMesh.rotation.y = elapsedTime * 0.22;
      ringMesh.rotation.z = elapsedTime * 0.08;

      group.rotation.y = targetX * 0.5;
      group.rotation.x = -targetY * 0.5;

      renderer.render(scene, camera);
    };

    animate();

    // ResizeObserver for robust layout adaptation
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newWidth, height: newHeight } = entry.contentRect;
        if (newWidth > 0 && newHeight > 0) {
          camera.aspect = newWidth / newHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(newWidth, newHeight);
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.dispose();
      knotGeometry.dispose();
      knotMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      pointGeometry.dispose();
      pointMaterial.dispose();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`absolute top-[58%] sm:top-[62%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] sm:w-[580px] md:w-[720px] lg:w-[860px] h-[400px] sm:h-[490px] md:h-[540px] pointer-events-none select-none -z-0 flex items-center justify-center overflow-visible ${className}`}
    >
      {/* Soft Radial Backlight behind the 3D model */}
      <div className="absolute inset-0 bg-radial from-indigo-500/12 via-indigo-500/4 to-transparent blur-3xl rounded-full -z-10 pointer-events-none" />

      {/* Three.js Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-visible"
      />
    </div>
  );
};
