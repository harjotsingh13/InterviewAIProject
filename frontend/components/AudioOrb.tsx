'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbState } from '@/types'

const STATE_COLORS: Record<OrbState, number> = {
  idle: 0x4b5563,
  listening: 0x6366f1,
  thinking: 0xa855f7,
  speaking: 0xf59e0b,
  done: 0x10b981,
}

interface Props {
  orbState: OrbState
  analyser?: React.MutableRefObject<AnalyserNode | null>
}

export default function AudioOrb({ orbState, analyser }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer
    mesh: THREE.Mesh
    positions: Float32Array
    clock: THREE.Clock
  } | null>(null)

  useEffect(() => {
    if (!mountRef.current) return
    const W = mountRef.current.clientWidth
    const H = mountRef.current.clientHeight

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(window.devicePixelRatio)
    if (mountRef.current) mountRef.current.innerHTML = ''
    mountRef.current.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100)
    camera.position.z = 3

    const geo = new THREE.SphereGeometry(1, 64, 64)
    const positions = geo.attributes.position.array.slice() as Float32Array

    const mat = new THREE.MeshStandardMaterial({
      color: STATE_COLORS.idle,
      roughness: 0.3,
      metalness: 0.6,
      wireframe: false,
    })

    const mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)

    const ambLight = new THREE.AmbientLight(0xffffff, 0.6)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
    dirLight.position.set(5, 5, 5)
    scene.add(ambLight, dirLight)

    const clock = new THREE.Clock()
    sceneRef.current = { renderer, mesh, positions, clock }

    const freqData = new Uint8Array(128)

    const animate = () => {
      requestAnimationFrame(animate)
      const t = clock.getElapsedTime()

      let amp = 0
      if (analyser?.current) {
        analyser.current.getByteFrequencyData(freqData)
        amp = freqData.reduce((a, b) => a + b, 0) / freqData.length / 128
      }

      const pos = geo.attributes.position
      const orig = positions
      for (let i = 0; i < pos.count; i++) {
        const ix = i * 3
        const ox = orig[ix], oy = orig[ix + 1], oz = orig[ix + 2]
        const noise = Math.sin(t * 2 + ox * 3) * Math.cos(t + oy * 2) * (0.05 + amp * 0.3)
        pos.setXYZ(i, ox + ox * noise, oy + oy * noise, oz + oz * noise)
      }
      pos.needsUpdate = true

      mesh.rotation.y = t * 0.2
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      renderer.dispose()
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement)
      }
    }
  }, [analyser])

  useEffect(() => {
    if (!sceneRef.current) return
    const mat = sceneRef.current.mesh.material as THREE.MeshStandardMaterial
    mat.color.setHex(STATE_COLORS[orbState])
    mat.opacity = orbState === 'thinking' ? 0.4 : 1
    mat.transparent = orbState === 'thinking'
  }, [orbState])

  return <div ref={mountRef} style={{ width: '220px', height: '220px' }} />
}
