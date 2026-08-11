import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

// Shader 1: Water Ripple Ping-Pong Simulation Shader
const simVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

const simFragmentShader = `
  uniform sampler2D uCurrentState;
  uniform vec2 uMouse;
  uniform float uRadius;
  uniform float uIntensity;
  uniform float uViscosity;
  uniform vec2 uResolution;
  varying vec2 vUv;

  void main() {
    vec2 dx = vec2(1.0 / uResolution.x, 0.0);
    vec2 dy = vec2(0.0, 1.0 / uResolution.y);

    vec4 currentState = texture2D(uCurrentState, vUv);
    float p = currentState.r;
    float v = currentState.g;

    float pRight = texture2D(uCurrentState, vUv + dx).r;
    float pLeft  = texture2D(uCurrentState, vUv - dx).r;
    float pUp    = texture2D(uCurrentState, vUv + dy).r;
    float pDown  = texture2D(uCurrentState, vUv - dy).r;

    float laplacian = (pRight + pLeft + pUp + pDown) - 4.0 * p;
    v += laplacian * 0.25;
    v *= uViscosity;
    p += v;

    // Disturbance from pointer/touch
    float dist = distance(vUv, uMouse);
    if (dist < uRadius) {
      float factor = cos((dist / uRadius) * 1.57079632679);
      p += factor * uIntensity;
    }

    gl_FragColor = vec4(p, v, 0.0, 1.0);
  }
`

// Shader 2: Render Pass Shader (distorts background with water normal & indigo/purple highlights)
const renderVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

const renderFragmentShader = `
  uniform sampler2D uWaterSim;
  uniform vec3 uBaseColor;
  uniform vec3 uHighlightColor;
  uniform vec2 uResolution;
  varying vec2 vUv;

  void main() {
    vec2 dx = vec2(1.0 / uResolution.x, 0.0);
    vec2 dy = vec2(0.0, 1.0 / uResolution.y);

    float pRight = texture2D(uWaterSim, vUv + dx).r;
    float pLeft  = texture2D(uWaterSim, vUv - dx).r;
    float pUp    = texture2D(uWaterSim, vUv + dy).r;
    float pDown  = texture2D(uWaterSim, vUv - dy).r;

    vec3 normal = normalize(vec3(pLeft - pRight, pDown - pUp, 0.05));
    vec3 lightDir = normalize(vec3(-0.4, 0.6, 1.0));
    float spec = pow(max(dot(normal, lightDir), 0.0), 16.0);

    vec3 finalColor = mix(uBaseColor, uHighlightColor, spec * 0.6 + normal.x * 0.2);

    // Subtle wave opacity gradient
    float waveIntensity = clamp(abs(texture2D(uWaterSim, vUv).r) * 1.5, 0.0, 0.35);
    gl_FragColor = vec4(finalColor, waveIntensity);
  }
`

export default function WaterRippleHero() {
  const containerRef = useRef(null)
  const [isSupported, setIsSupported] = useState(true)

  useEffect(() => {
    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setIsSupported(false)
      return
    }

    // Check WebGL availability
    const canvasTest = document.createElement('canvas')
    const gl = canvasTest.getContext('webgl') || canvasTest.getContext('experimental-webgl')
    if (!gl) {
      setIsSupported(false)
      return
    }

    const container = containerRef.current
    if (!container) return

    let width = container.clientWidth || window.innerWidth
    let height = container.clientHeight || 500

    // Setup Three.js Scene, Camera, Renderer
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    const dpr = Math.min(window.devicePixelRatio, 2)
    renderer.setPixelRatio(dpr)
    renderer.setSize(width, height)
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.top = '0'
    renderer.domElement.style.left = '0'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.pointerEvents = 'none'
    container.appendChild(renderer.domElement)

    // Render Targets for Simulation Ping-Ponging
    const gridRes = width < 768 ? 128 : 256
    const renderTargetParams = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType
    }

    let rtA = new THREE.WebGLRenderTarget(gridRes, gridRes, renderTargetParams)
    let rtB = new THREE.WebGLRenderTarget(gridRes, gridRes, renderTargetParams)

    // Simulation Shader Material
    const simMaterial = new THREE.ShaderMaterial({
      vertexShader: simVertexShader,
      fragmentShader: simFragmentShader,
      uniforms: {
        uCurrentState: { value: null },
        uMouse: { value: new THREE.Vector2(-10, -10) },
        uRadius: { value: 0.03 },
        uIntensity: { value: 0.8 },
        uViscosity: { value: 0.98 },
        uResolution: { value: new THREE.Vector2(gridRes, gridRes) }
      }
    })

    // Render Shader Material (Indigo #6366f1 to Purple #a855f7 highlights over #0f0f17 base)
    const renderMaterial = new THREE.ShaderMaterial({
      vertexShader: renderVertexShader,
      fragmentShader: renderFragmentShader,
      transparent: true,
      uniforms: {
        uWaterSim: { value: null },
        uBaseColor: { value: new THREE.Color('#6366f1') },      // Indigo-500
        uHighlightColor: { value: new THREE.Color('#a855f7') }, // Purple-500
        uResolution: { value: new THREE.Vector2(width, height) }
      }
    })

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMaterial)
    scene.add(quad)

    // Mouse & Touch Pointer Handling
    const updatePointer = (clientX, clientY) => {
      const rect = container.getBoundingClientRect()
      const x = (clientX - rect.left) / rect.width
      const y = 1.0 - (clientY - rect.top) / rect.height
      simMaterial.uniforms.uMouse.value.set(x, y)
    }

    const handleMouseMove = (e) => updatePointer(e.clientX, e.clientY)

    const handleTouch = (e) => {
      if (e.touches && e.touches.length > 0) {
        updatePointer(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('touchstart', handleTouch, { passive: true })
    container.addEventListener('touchmove', handleTouch, { passive: true })

    // Responsive ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width
        const newHeight = entry.contentRect.height
        if (newWidth > 0 && newHeight > 0) {
          renderer.setSize(newWidth, newHeight)
          renderMaterial.uniforms.uResolution.value.set(newWidth, newHeight)
        }
      }
    })
    resizeObserver.observe(container)

    // Simulation Loop
    let animId
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Step 1: Run Simulation (rtA -> rtB)
      quad.material = simMaterial
      simMaterial.uniforms.uCurrentState.value = rtA.texture
      renderer.setRenderTarget(rtB)
      renderer.render(scene, camera)

      // Step 2: Render to Canvas Screen using rtB
      quad.material = renderMaterial
      renderMaterial.uniforms.uWaterSim.value = rtB.texture
      renderer.setRenderTarget(null)
      renderer.render(scene, camera)

      // Ping-pong swap
      const temp = rtA
      rtA = rtB
      rtB = temp
    }

    animate()

    // Disposal & Cleanup on Unmount
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('touchstart', handleTouch)
      container.removeEventListener('touchmove', handleTouch)
      resizeObserver.disconnect()

      quad.geometry.dispose()
      simMaterial.dispose()
      renderMaterial.dispose()
      rtA.dispose()
      rtB.dispose()
      renderer.dispose()
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  if (!isSupported) {
    return (
      <div 
        className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(99,102,241,0.15), rgba(168,85,247,0.1) 60%, transparent 100%)'
        }}
      />
    )
  }

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
    />
  )
}
