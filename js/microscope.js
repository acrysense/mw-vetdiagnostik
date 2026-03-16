export function initMicroscope(THREE) {
	return new Promise((resolve, reject) => {
		const canvasMain = document.getElementById('canvas-container')
		if (!canvasMain) {
			console.error('canvas-container не найден')
			return reject('canvas-container не найден')
		}

		const DEBUG_NORMAL = false
		const ADAPTIVE_DPR = false
		const FORCE_NO_SHADOWS = true

		const isMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
		const isSmallScreen = window.matchMedia('(max-width: 743px)').matches
		const isMobile = isMobileUA || isSmallScreen
		const isWeakCPU = (navigator.hardwareConcurrency || 4) <= 4
		const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
		const USE_POST = true

		let stableVH = window.innerHeight
		function getStableVH() {
			return stableVH
		}

		const renderer = new THREE.WebGLRenderer({
			antialias: false,
			alpha: false,
			powerPreference: 'high-performance'
		})

		renderer.dither = true
		renderer.setClearColor(0x000000, 0)

		const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
		let dprCap = dpr

		let composer = null
		let fxaaPass = null
		let embeddedCamera = null
		let resizeTimer = null

		function updateCanvasSize() {
			const ratio = 1440 / 770
			const vh = getStableVH()
			let w = window.innerWidth
			let h = w / ratio

			if (h < vh) {
				h = vh
				w = h * ratio
			}

			canvasMain.style.width = w + 'px'
			canvasMain.style.height = h + 'px'

			renderer.setSize(w, h)

			if (composer && fxaaPass) {
				composer.setSize(w, h)
				const px = renderer.getPixelRatio()
				fxaaPass.uniforms.resolution.value.set(1 / (w * px), 1 / (h * px))
			}
		}

		function setOrthoZoom() {
			if (!embeddedCamera) return
			const w = window.innerWidth
			const base = w <= 743 ? 0.75 : w <= 1023 ? 0.85 : 0.9
			embeddedCamera.zoom = base
			if (typeof embeddedCamera.userData.zoomMul === 'number') {
				embeddedCamera.zoom = base * embeddedCamera.userData.zoomMul
			}
			embeddedCamera.updateProjectionMatrix()
		}

		function onResize() {
			clearTimeout(resizeTimer)
			resizeTimer = setTimeout(() => {
				stableVH = window.innerHeight
				updateCanvasSize()
				setOrthoZoom()
				if (window.ScrollTrigger) {
					ScrollTrigger.refresh()
				}
			}, 120)
		}

		if (ADAPTIVE_DPR) {
			let frames = 0
			let t0 = performance.now()
			let downOnce = false

			;(function probe() {
				frames++
				const t = performance.now()

				if (t - t0 > 800) {
					const fps = (frames * 1000) / (t - t0)
					frames = 0
					t0 = t

					if (!downOnce && fps < 55 && dprCap > 1.25) {
						dprCap = 1.25
						renderer.setPixelRatio(dprCap)
						updateCanvasSize()
						downOnce = true
					} else if (fps < 48 && dprCap > 1) {
						dprCap = 1
						renderer.setPixelRatio(dprCap)
						updateCanvasSize()
					}
				}

				requestAnimationFrame(probe)
			})()
		}

		renderer.setPixelRatio(dpr)
		renderer.setSize(canvasMain.clientWidth, canvasMain.clientHeight)

		renderer.outputEncoding = THREE.sRGBEncoding
		renderer.toneMapping = THREE.ACESFilmicToneMapping
		renderer.toneMappingExposure = 1.2

		renderer.shadowMap.enabled = !FORCE_NO_SHADOWS
		renderer.shadowMap.type = navigator.userAgent.includes('Windows')
			? THREE.PCFShadowMap
			: THREE.PCFSoftShadowMap

		canvasMain.appendChild(renderer.domElement)

		const scene = new THREE.Scene()

		updateCanvasSize()
		window.addEventListener('resize', onResize)

		const ambient = new THREE.AmbientLight(0xffffff, 8)
		scene.add(ambient)

		function getFinalTransform() {
			const pos = new THREE.Vector3(-7, -4.4, -1.2)
			const euler = new THREE.Euler(
				THREE.MathUtils.degToRad(29),
				THREE.MathUtils.degToRad(90),
				THREE.MathUtils.degToRad(0),
				'YXZ'
			)
			return { pos, quat: new THREE.Quaternion().setFromEuler(euler) }
		}

		const V_ONE = new THREE.Vector3(1, 1, 1)
		const V_SCALE = new THREE.Vector3(1.3, 1.3, 1.3)

		let zoomMul = 1

		const modelFile = isMobile ? 'scope-mobile.glb' : 'scope.glb'

		const loader = new THREE.GLTFLoader().setPath('scope/')
		const draco = new THREE.DRACOLoader()
		draco.setDecoderPath('/draco/') 
		// draco.setDecoderPath('/html/build/draco/')
		loader.setDRACOLoader(draco)

		loader.load(
			modelFile,
			(gltf) => {
				const microscope = gltf.scene
				scene.add(microscope)

				if (DEBUG_NORMAL) {
					microscope.traverse((o) => {
						if (!o.isMesh) return
						o.material = new THREE.MeshNormalMaterial()
						o.castShadow = false
						o.receiveShadow = false
					})
					renderer.shadowMap.enabled = false
				}

				microscope.position.set(-1.5, -5, -4)
				microscope.rotation.set(
					THREE.MathUtils.degToRad(20),
					THREE.MathUtils.degToRad(42),
					THREE.MathUtils.degToRad(-22)
				)

				const debugSphere = new THREE.Mesh(
					new THREE.SphereGeometry(0.05, 2, 2),
					new THREE.MeshBasicMaterial({ color: 0xffffff })
				)
				debugSphere.position.set(-0.45, -1.8, -2.2)
				debugSphere.visible = false
				microscope.add(debugSphere)

                const point1 = new THREE.PointLight(0x0728ff, 18, 10, 5)
                point1.name = 'point1_ocular_blue'
                point1.position.set(-0.25, -1.9, -2.0)

                const point2 = new THREE.PointLight(0xffffff, 16, 10, 5)
                point2.name = 'point2_ocular_white'
                point2.position.set(-0.15, -1.85, -1.9)

                const point11 = new THREE.PointLight(0xffffff, 120, 0, 2)
                point11.name = 'point11_top_white'
                point11.position.set(3.0, 4.1, 2.6)

                const point111 = new THREE.PointLight(0xffffff, 20, 0, 2)
                point111.name = 'point111_back_white'
                point111.position.set(-6.34, -0.446, -12.329)

                const point1111 = new THREE.PointLight(0xffffff, 180, 0, 2)
                point1111.name = 'point1111_stage_white_side'
                point1111.position.set(8.8, -6.8, 0.2)

                const pointStage = new THREE.PointLight(0xffffff, 160, 2, 2)
                pointStage.name = 'pointStage_table_white'
                pointStage.position.set(-1.3, 3.6, 3.9)

                const pointGlass = new THREE.PointLight(0x8ea2ff, 55, 0, 1.5)
                pointGlass.name = 'pointGlass_table_blue'
                pointGlass.position.set(0.0, -6.0, -0.3)

                const point01 = new THREE.PointLight(0xb9b2ff, 130, 0, 1)
                point01.name = 'point01_body_blue_1'
                point01.position.set(-5.978, 1.9, 0.4)

                const point02 = new THREE.PointLight(0xb9b2ff, 40, 0, 1)
                point02.name = 'point02_body_blue_2'
                point02.position.set(-8.2, 4.6, -8.9)

                const point03 = new THREE.PointLight(0xb9b2ff, 70, 0, 1)
                point03.name = 'point03_body_blue_3'
                point03.position.set(0.9, 4.9, -5.6)

                microscope.add(
                    point1,
                    point2,
                    point11,
                    point111,
                    point1111,
                    pointStage,
                    pointGlass,
                    point01,
                    point02,
                    point03
                )

				const pointDebug = new THREE.PointLight(0xffffff, 100, 1, 3)
				pointDebug.position.set(0.15, 2.9, 1.6)

				microscope.add(pointDebug)

				const dirLight = new THREE.DirectionalLight(0x0728ff, 1)
				dirLight.position.set(-15, -20, 10)
				dirLight.castShadow = !FORCE_NO_SHADOWS
				dirLight.shadow.mapSize.set(2048, 2048)
				dirLight.shadow.bias = -0.0002
				dirLight.shadow.normalBias = 0.02
				microscope.add(dirLight)

				microscope.traverse((obj) => {
					if (!obj.isMesh) return

					obj.castShadow = !FORCE_NO_SHADOWS
					obj.receiveShadow = !FORCE_NO_SHADOWS

					const mats = Array.isArray(obj.material) ? obj.material : [obj.material]

					for (const m of mats) {
						if (!m) continue

						const isGlass =
							(m.name && m.name.toLowerCase().includes('glass')) ||
							(obj.name && obj.name.toLowerCase().includes('glass'))

						if (isGlass) {
							m.transparent = true
							m.opacity = 1
							m.depthWrite = false
							m.side = THREE.DoubleSide
							m.envMapIntensity = 1
							m.alphaTest = 0.001

							if (m.map) {
								m.map.encoding = THREE.sRGBEncoding
								m.map.anisotropy = Math.min(isMobile ? 2 : 4, renderer.capabilities.getMaxAnisotropy())
								m.map.needsUpdate = true
							}

							if (m.normalMap) {
								m.normalScale.set(1, 1)
								m.normalMap.needsUpdate = true
							}

							m.needsUpdate = true
							obj.renderOrder = 10
							continue
						}

						if (m.normalMap) {
							m.normalMap = null
						}

						m.polygonOffset = true
						m.polygonOffsetFactor = 1
						m.polygonOffsetUnits = 1
						m.envMapIntensity = 0
						m.fog = false
						m.dithering = false

						if (m.map) {
							m.map.encoding = THREE.sRGBEncoding
							m.map.anisotropy = Math.min(isMobile ? 2 : 4, renderer.capabilities.getMaxAnisotropy())
							m.map.needsUpdate = true
						}

						if (m.emissiveMap) {
							m.emissiveMap.encoding = THREE.sRGBEncoding
							m.emissiveMap.needsUpdate = true
						}

						m.needsUpdate = true
					}
				})

				const baseScale = microscope.scale.clone()
				const k = 1
				microscope.scale.copy(baseScale).multiplyScalar(k)

				if (gltf.cameras && gltf.cameras.length) {
					embeddedCamera = gltf.cameras[0]
				} else {
					const aspect = canvasMain.clientWidth / canvasMain.clientHeight
					const frustumHeight = 9
					const frustumWidth = frustumHeight * aspect

					embeddedCamera = new THREE.OrthographicCamera(
						-frustumWidth / 2,
						frustumWidth / 2,
						frustumHeight / 2,
						-frustumHeight / 2,
						0.1,
						1000
					)

					embeddedCamera.position.set(0, 0, 20)
					embeddedCamera.lookAt(0, 0, 0)
				}

				scene.add(embeddedCamera)

				embeddedCamera.near = 1
				embeddedCamera.far = 2000
				embeddedCamera.userData.zoomMul = zoomMul
				embeddedCamera.updateProjectionMatrix()

				setOrthoZoom()

				if (USE_POST) {
					composer = new THREE.EffectComposer(renderer)
					composer.multisampling = 0
					composer.addPass(new THREE.RenderPass(scene, embeddedCamera))

					fxaaPass = new THREE.ShaderPass(THREE.FXAAShader)
					fxaaPass.material.transparent = true

					const px = renderer.getPixelRatio()
					fxaaPass.uniforms.resolution.value.set(
						1 / (canvasMain.clientWidth * px),
						1 / (canvasMain.clientHeight * px)
					)

					fxaaPass.material.needsUpdate = true
					composer.addPass(fxaaPass)
				}

				if (navigator.hardwareConcurrency <= 2) {
					renderer.shadowMap.enabled = false

					microscope.traverse((mesh) => {
						if (!mesh.isMesh || !mesh.material) return

						const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
						for (const m of mats) {
							if (!m) continue
							m.metalness = 0
							m.roughness = 1
							m.needsUpdate = true
						}
					})
				}

				const initialPos = microscope.position.clone()
				const initialQuat = microscope.quaternion.clone()
				const { pos: finalPos, quat: finalQuat } = getFinalTransform()

				const MID_POS = finalPos.clone().add(new THREE.Vector3(0, -0.45, 0.0))
				const END_POS = finalPos.clone().add(new THREE.Vector3(0, -1.45, 0.35))

				const SCRUB = isIOS ? 0.4 : (navigator.userAgent.includes('Windows') ? 1.0 : true)
				gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

				const tl = gsap.timeline({
					scrollTrigger: {
						trigger: '.scroll-container',
						start: 'top top',
						end: () => `+=${getStableVH()}`,
						scrub: SCRUB
					}
				})

				tl.to({}, {
					duration: 1,
					onUpdate() {
						const p = tl.progress()

						const Z_ROTATE_END = isMobile ? 2.2 : 4
						const Z_FINAL_END = isMobile ? 8 : 26

						let z = 1

						if (p <= 0.3) {
							const t = p / 0.3
							const tZoom = Math.pow(t, 2.6)
							z = 1 + (Z_ROTATE_END - 1) * tZoom
						} else if (p <= 0.8) {
							z = Z_ROTATE_END
						} else {
							let t = (p - 0.8) / 0.2
							t = t * t * (3 - 2 * t)
							z = Z_ROTATE_END + (Z_FINAL_END - Z_ROTATE_END) * t
						}

						zoomMul = z
						embeddedCamera.userData.zoomMul = zoomMul
						setOrthoZoom()

						if (p <= 0.3) {
							const t = p / 0.3
							microscope.position.lerpVectors(initialPos, MID_POS, t)
							microscope.quaternion.slerpQuaternions(initialQuat, finalQuat, t)
						} else if (p <= 0.8) {
							microscope.position.copy(MID_POS)
							microscope.quaternion.copy(finalQuat)
						} else {
							const t = (p - 0.8) / 0.2
							microscope.position.lerpVectors(MID_POS, END_POS, t)
							microscope.quaternion.copy(finalQuat)
						}

						if (p >= 0.8) {
							const t = (p - 0.8) / 0.2
							microscope.scale.copy(V_ONE).lerp(V_SCALE, t)
						} else {
							microscope.scale.copy(V_ONE)
						}
					}
				})

				tl.to('.main__wrap', { duration: 0.3, opacity: 0, filter: 'blur(5px)' }, 0)
					.addLabel('phase1End', 0.3)
					.to('.advantages__item', { duration: 0.067, opacity: 1, y: 0, stagger: 0.067 }, 'phase1End')
					.addLabel('endPhase2', 0.6)
					.to('.advantages', { duration: 0.1, opacity: 0, filter: 'blur(5px)' }, 'endPhase2')
					.addLabel('endPhase3', 0.85)
					.to('.main', { duration: 0.05, opacity: 0, filter: 'blur(5px)', overwrite: true }, 'endPhase3')
					.to('#canvas-container', { duration: 0.15, opacity: 0, overwrite: true }, 'endPhase3')

				const mainCanvas = document.querySelector('.scroll-container')
				let animationPlayed = false

				if (mainCanvas) {
					mainCanvas.addEventListener('click', () => {
						if (animationPlayed) return
						animationPlayed = true

						const scrollTrigger = tl.scrollTrigger
						const targetScroll = scrollTrigger.end

						document.documentElement.style.scrollBehavior = 'auto'
						document.body.style.scrollBehavior = 'auto'

						gsap.to(window, {
							scrollTo: { y: targetScroll },
							duration: 2,
							ease: 'power2.inOut',
							onComplete() {
								document.documentElement.style.scrollBehavior = ''
								document.body.style.scrollBehavior = ''
							}
						})
					})
				}

				setTimeout(() => {
					stableVH = window.innerHeight
					updateCanvasSize()
					setOrthoZoom()
					ScrollTrigger.refresh()
				}, 300)

				function animate() {
					requestAnimationFrame(animate)
					if (USE_POST && composer) composer.render()
					else renderer.render(scene, embeddedCamera)
				}

				animate()
				renderer.render(scene, embeddedCamera)
				resolve()
			},
			undefined,
			(err) => {
				console.error('Ошибка загрузки модели:', err)
				resolve()
			}
		)
	})
}