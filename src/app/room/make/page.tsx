'use client'

import * as THREE from 'three'
import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, extend, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Clone, Html, TransformControls, useGLTF } from '@react-three/drei'
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js'
import { Vector2 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/Addons.js'

extend({ CameraControls: FirstPersonControls });
 
interface ModelProps {
  url: string,
  name: string,
  refMap: Map<any, any>,
  onDoubleClick: (ev: any) => void
}

interface FloorProps {
  onDoubleClick: (ev: any) => void,
  refMap: Map<any, any>
}

const Model = forwardRef(({
  url,
  name,
  refMap,
  onDoubleClick
}: ModelProps, ref) => {
  const { scene } = useGLTF(url)
  const obj = useMemo(() => scene.clone(), [scene])

  useEffect(() => {
    const setNameAndRef = (object: THREE.Group<THREE.Object3DEventMap> | THREE.Object3D) => {
      object.name = name
      refMap.set(object, ref)

      if (object.children) {
        object.children.forEach((child) => setNameAndRef(child))
      }
    }

    setNameAndRef(obj)
  }, [obj, name, ref, refMap])

  return (
    <primitive
      object={obj}
      name={name}
      ref={ref as React.MutableRefObject<THREE.Group>}
      position={[0, 0, 0]}
      scale={[0.01, 0.01, 0.01]}
      onDoubleClick={(ev: any) => {onDoubleClick(ev)}}
    />
  )
})

const Floor = forwardRef(({
  onDoubleClick,
  refMap
}: FloorProps, ref) => {
  const floorRef = useRef<any>(null)

  useEffect(() => {
    if (floorRef.current) {
      floorRef.current.name = 'floor'
      refMap.set(floorRef.current, ref)
    }
  }, [ref, refMap])

  return (
    <mesh
      name="floor"
      ref={floorRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      onDoubleClick={(ev) => {onDoubleClick(ev)}}
    >
      <planeGeometry args={[5, 5]} />
      <meshStandardMaterial color="gray" />
    </mesh>
  )
})

const Scene = () => {
  const [selected, setSelected] = useState<THREE.Object3D | null>(null)
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate')
  const [models, setModels] = useState<(ModelProps & {ref: any})[]>([])
  const floorRef = useRef<THREE.Mesh>(null)
  const modelRefs = useRef<Map<string, React.RefObject<THREE.Group>>>(new Map())
  const keys = useRef<{ [key: string]: boolean }>({})
  const refMap = useRef<Map<any, any>>(new Map())
  const { raycaster, scene, camera, gl } = useThree()

  const addModel = (model: ModelProps) => {
    const key = `${model.name}-${models.length}`
    const modelRef = React.createRef<THREE.Group>()

    modelRefs.current.set(key, modelRef)
    refMap.current.set(key, modelRef)

    setModels(prevModels => {
      const newModels = [...prevModels, { ...model, ref: modelRef, key }]
      refMap.current.set(key, modelRef)

      return newModels
    })

    console.log(refMap.current)
  }

  // const addModel = (model: ModelProps) => {
  //   const key = `${model.name}-${Date.now()}`
  //   const modelRef = React.createRef<THREE.Group>()
  
  //   setModels(prevModels => [
  //     ...prevModels,
  //     { ...model, ref: modelRef, key }
  //   ])
  // }

  const handleDoubleClick = (ev: any) => {
    if (selected) setSelected(null)

    const mouse = new Vector2()

    mouse.x = (ev.clientX / gl.domElement.clientWidth) * 2 - 1
    mouse.y = -(ev.clientY / gl.domElement.clientHeight) * 2 + 1

    raycaster.setFromCamera(mouse, camera)

    const intersects = raycaster.intersectObjects(scene.children, true)

    if (intersects.length > 0) {
      let closestObject = intersects[0].object

      while (closestObject.parent && closestObject.parent.type !== 'Scene') {
        closestObject = closestObject.parent
      }
      const ref = refMap.current.get(closestObject)

      if (ref) {
        setSelected(closestObject)
      }
    }
  }

  useEffect(() => {
    if (selected) {
      if (selected.name === 'floor') {
        setTransformMode('scale')
      }

      selected.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh

          mesh.geometry.computeBoundingBox()
          mesh.geometry.computeBoundingSphere()

          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((material) => {
              material.needsUpdate = true
            })
          } else {
            mesh.material.needsUpdate = true
          }
        }
      })
    }
  }, [selected])

  useEffect(() => {
    console.log(refMap.current)
  }, [refMap.current])

  useEffect(() => {
    const handleKeyPress = (ev: KeyboardEvent) => {
      if (selected?.name === 'floor') return

      if (selected) {
        switch (ev.key) {
          case 'm':
            setTransformMode('translate')
            break
          case 'r':
            setTransformMode('rotate')
            break
          case 's':
            setTransformMode('scale')
            break
        }
      }
    }

    window.addEventListener('keypress', handleKeyPress)

    return () => {
      window.removeEventListener('keypress', handleKeyPress)
    }
  }, [selected])

  const handleKeyDown = (event) => {
    keys.current[event.code] = true
  }

  const handleKeyUp = (event) => {
    keys.current[event.code] = false
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    camera.rotation.order = 'YXZ'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useFrame(() => {
    const direction = new THREE.Vector3()
    const right = new THREE.Vector3()
    const up = new THREE.Vector3(0, 1, 0)

    camera.getWorldDirection(direction)
    direction.y = 0
    direction.normalize()

    right.crossVectors(up, direction)

    // Move
    if (keys.current['KeyW']) {
      camera.position.addScaledVector(direction, 0.1)
    }
    if (keys.current['KeyS']) {
      camera.position.addScaledVector(direction, -0.1)
    }

    if (keys.current['KeyA']) {
      camera.position.addScaledVector(right, 0.1)
    }

    if (keys.current['KeyD']) {
      camera.position.addScaledVector(right, -0.1)
    }

    // Zoom
    if (keys.current['KeyZ'] && camera.position.y > 3) {
      camera.position.y -= 0.2
    }

    if (keys.current['KeyX'] && camera.position.y < 20) {
      camera.position.y += 0.2
    }

    // Look
    if (keys.current['ArrowRight']) {
      camera.rotation.y -= 0.03
    }

    if (keys.current['ArrowLeft']) {
      camera.rotation.y += 0.03
    }

    if (keys.current['ArrowUp'] && camera.rotation.x < 0.25) {
      camera.rotation.x += 0.03
    }

    if (keys.current['ArrowDown'] && camera.rotation.x > -1) {
      camera.rotation.x -= 0.03
    }
  })

  return (
    <>
      <ambientLight intensity={Math.PI / 2} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
      <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
      {/* <CameraControls lookSpeed={0.1} moveSpeed={10} /> */}
      {selected && (
        <TransformControls
          object={selected}
          mode={transformMode}
          showX={transformMode !== 'rotate'}
          showY={transformMode === 'rotate' || selected.name === 'floor'}
          showZ={transformMode !== 'rotate'}
          space={transformMode === 'rotate' ? 'local' : undefined} />
      )}
      <Floor onDoubleClick={handleDoubleClick} ref={floorRef} refMap={refMap.current} />
      {models.map((model, index) => (
        <Model
          key={index}
          url={model.url}
          name={model.name}
          ref={model.ref}
          refMap={refMap.current}
          onDoubleClick={handleDoubleClick}
        />
      ))}
      <Html>
        <button onClick={() => addModel({
          url: '/models/office_chair/scene.gltf',
          name: 'chair',
          refMap: refMap.current,
          onDoubleClick: handleDoubleClick
        })}>
          Add Chair
        </button> 
        <button onClick={() => addModel({
          url: '/models/white_table/scene.gltf',
          name: 'table',
          refMap: refMap.current,
          onDoubleClick: handleDoubleClick
        })}>
          Add Desk
        </button>       
      </Html>
    </>
  )
}

const Page = () => {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [0, 5, 5], fov: 75 }}>
        <Scene />
      </Canvas>
    </div>
  )
}

export default Page
