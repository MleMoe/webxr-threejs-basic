import './style.css'

import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  HemisphereLight,
  Mesh,
  XRSessionMode,
  XRSession,
  XRFrame,
  XRHitTestSource,
  MeshBasicMaterial,
  RingGeometry,
  XRReferenceSpace,
  WebXRController,
  Group,
  CylinderGeometry,
  MeshPhongMaterial,
  AxesHelper,
} from 'three'

import { ARButton } from 'three/examples/jsm/webxr/ARButton'

import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader'

export interface XRSystem extends EventTarget {
  isSessionSupported: (sessionMode: XRSessionMode) => Promise<boolean>
  requestSession: (
    sessionMode: XRSessionMode,
    sessionInit?: any
  ) => Promise<XRSession>
}

/**
 * Three.js 基础元素
 */

// 场景
const scene = new Scene()
// 相机
const camera = new PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.01,
  20
)
camera.position.set(0, 0, 10)
camera.lookAt(0, 0, 0)

// 渲染器
const renderer = new WebGLRenderer({ antialias: true, alpha: true })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// 设置光源
const light = new HemisphereLight(0xffffff, 0xbbbbff, 1)
light.position.set(0.5, 1, 0.25)
scene.add(light)

// 设置 WebXR 为启动状态
renderer.xr.enabled = true

// const axesHelper = new AxesHelper(5)
// scene.add(axesHelper)

let model = new Group()
const gltfLoader = new GLTFLoader()
const loadModel = () => {
  gltfLoader.load(
    // resource URL
    'models/tulip/scene.gltf',
    // called when the resource is loaded
    (gltf) => {
      gltf.scene.scale.set(0.02, 0.02, 0.02)
      gltf.scene.position.set(0, 0.5, 0)
      model.add(gltf.scene)
      // scene.add(gltf.scene)
    },
    // called while loading is progressing
    (xhr) => {
      console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
    },
    // called when loading has errors
    (error) => {
      console.log('An error happened', error)
    }
  )
}

// 加载模型
loadModel()

const render = () => {
  renderer.render(scene, camera)
}

/**
 * WebXR 基础元素
 */

// 命中测试源对象
let hitTestSource: XRHitTestSource

// 启动和退出按钮
document.body.appendChild(
  ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] })
)

let controller: Group
controller = renderer.xr.getController(0)
const onSelect = () => {
  if (reticle.visible) {
    // const material = new MeshPhongMaterial({ color: 0xffffff * Math.random() })
    // const mesh = new Mesh(geometry, material)
    const mesh = model.clone()
    reticle.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale)
    scene.add(mesh)
  }
}
controller.addEventListener('select', onSelect)
scene.add(controller)

const reticle = new Mesh(
  new RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
  new MeshBasicMaterial()
)
reticle.matrixAutoUpdate = false
reticle.visible = false
scene.add(reticle)

// const geometry = new CylinderGeometry(0.1, 0.1, 0.2, 32).translate(0, 0.1, 0)

const setAnimation = () => {
  renderer.setAnimationLoop((time?: number, frame?: XRFrame) => {
    // model?.scene.rotation.set(0, (time ?? 0) / 2000, 0)
    // 更新轨道控制器
    // orbitControls.update()
    // 渲染三维场景
    render()

    if (!frame) {
      return
    }
    const xrSession = frame.session
    if (!hitTestSource) {
      // 初始化命中测试源对象
      xrSession.requestReferenceSpace('viewer').then((referenceSpace) => {
        xrSession
          .requestHitTestSource({ space: referenceSpace })
          .then((source) => {
            hitTestSource = source
          })
      })
    }

    // 获取 local 参考空间坐标系
    const referenceSpace = renderer.xr.getReferenceSpace()
    if (referenceSpace && hitTestSource) {
      // 获取命中测试结果
      const hitTestResults = frame.getHitTestResults(hitTestSource)
      if (hitTestResults.length) {
        const hit = hitTestResults[0]
        reticle.visible = true
        if (referenceSpace) {
          const pose = hit.getPose(referenceSpace)
          if (pose) {
            reticle.matrix.fromArray(pose.transform.matrix)
          }
        }
      } else {
        reticle.visible = false
      }
    }
  })
}

// 开启动画循环
setAnimation()
