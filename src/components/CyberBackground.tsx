import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

interface CyberBackgroundProps {
  showHeroSculpture?: boolean;
}

export const CyberBackground: React.FC<CyberBackgroundProps> = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { isDark } = useTheme();
  const isDarkRef = useRef(isDark);

  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  // Soft Ambient Wave Canvas with Theme Reactivity
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    let animationFrameId: number;

    const vertexShaderSource = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_position * 0.5 + 0.5;
      }
    `;

    const fragmentShaderSource = `
      precision highp float;
      varying vec2 v_texCoord;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_dark;

      void main() {
        vec2 uv = v_texCoord;
        float time = u_time * 0.08;
        
        // Light mode colors
        vec3 bgLight = vec3(0.972, 0.98, 0.988); // #F8FAFC
        vec3 tintLight = vec3(0.933, 0.949, 1.0); // Soft indigo tint #EEF2FF
        
        // Dark mode colors
        vec3 bgDark = vec3(0.035, 0.051, 0.086); // #090D16
        vec3 tintDark = vec3(0.075, 0.09, 0.16); // Deep midnight indigo
        
        vec3 bg = mix(bgLight, bgDark, u_dark);
        vec3 tint = mix(tintLight, tintDark, u_dark);
        
        float wave = sin(uv.x * 3.0 + time) * cos(uv.y * 3.0 - time * 0.5) * 0.5 + 0.5;
        vec3 color = mix(bg, tint, wave * (0.35 + 0.25 * u_dark));
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    function createShader(glCtx: WebGLRenderingContext, type: number, source: string) {
      const shader = glCtx.createShader(type);
      if (!shader) return null;
      glCtx.shaderSource(shader, source);
      glCtx.compileShader(shader);
      if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
        glCtx.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    gl.useProgram(program);

    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    const timeUniformLocation = gl.getUniformLocation(program, 'u_time');
    const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
    const darkUniformLocation = gl.getUniformLocation(program, 'u_dark');

    const resize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    window.addEventListener('resize', resize);
    resize();

    let currentDark = isDarkRef.current ? 1.0 : 0.0;

    const render = (time: number) => {
      const targetDark = isDarkRef.current ? 1.0 : 0.0;
      currentDark += (targetDark - currentDark) * 0.1;

      gl.uniform1f(timeUniformLocation, time * 0.001);
      gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
      if (darkUniformLocation) {
        gl.uniform1f(darkUniformLocation, currentDark);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full -z-20 pointer-events-none"
      />
      <div className="fixed inset-0 pointer-events-none -z-10 bg-grid-pattern opacity-40 dark:opacity-25 transition-opacity" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />
    </>
  );
};
