export function initMicroscope(THREE) {
	return new Promise((resolve, reject) => {
	  // --- Canvas & Renderer Initialization ---
	  const canvasMain = document.getElementById('canvas-container');
	  if (!canvasMain) {
		console.error('canvas-container не найден');
		return reject('canvas-container не найден');
	  }
  
	  const renderer = new THREE.WebGLRenderer({
		antialias: false,
		alpha: true,
		powerPreference: 'high-performance'
	  });
	  renderer.dither = true;
	  renderer.setClearColor(0x000000, 0);
	  renderer.setSize(canvasMain.clientWidth, canvasMain.clientHeight);
	  renderer.outputEncoding = THREE.sRGBEncoding;
	  renderer.toneMapping = THREE.ACESFilmicToneMapping;
	  renderer.toneMappingExposure = 1.5;
	  renderer.shadowMap.enabled = false;
	  canvasMain.appendChild(renderer.domElement);
  
	  // --- Scene Creation ---
	  const scene = new THREE.Scene();
  
	  // --- Resize Handler ---
	  function updateCanvasSize() {
		const ratio = 1440 / 770;
		const vh = window.innerHeight;
		let w = window.innerWidth;
		let h = w / ratio;
		if (h < vh) {
		  h = vh;
		  w = h * ratio;
		}
		canvasMain.style.width = w + 'px';
		canvasMain.style.height = h + 'px';
		renderer.setSize(w, h);
	  }
	  updateCanvasSize();
	  window.addEventListener('resize', updateCanvasSize);
  
	  // --- Environment & Ambient Light ---
	  const ambient = new THREE.AmbientLight(0xffffff, 8);
	  scene.add(ambient);
  
	  const texLoader = new THREE.TextureLoader().setPath('scope/');
	  texLoader.load('scope.png', tex => {
		tex.mapping = THREE.EquirectangularReflectionMapping;
		scene.environment = tex;
	  });
  
	  // --- Final Transform Helper ---
	  function getFinalTransform() {
		const pos = new THREE.Vector3(13, -1.1, 0.55);
		const euler = new THREE.Euler(
		  THREE.MathUtils.degToRad(21),
		  THREE.MathUtils.degToRad(38),
		  THREE.MathUtils.degToRad(-17),
		  'XYZ'
		);
		return { pos, quat: new THREE.Quaternion().setFromEuler(euler) };
	  }
  
	  // --- Camera Placeholder ---
	  let embeddedCamera;
  
	  // --- Load GLTF Model with DRACO ---
	  const loader = new THREE.GLTFLoader().setPath('scope/');
	  const draco = new THREE.DRACOLoader().setDecoderPath('js/three/examples/js/libs/draco/');
	  loader.setDRACOLoader(draco);
  
	  loader.load(
		'scope.glb',
		gltf => {
		  const microscope = gltf.scene;
		  scene.add(microscope);
  
		  // --- Debug Sphere (invisible) ---
		  const debugSphere = new THREE.Mesh(
			new THREE.SphereGeometry(0.05, 2, 2),
			new THREE.MeshBasicMaterial({ color: 0xffffff })
		  );
		  debugSphere.position.set(-0.45, -1.8, -2.2);
		  debugSphere.visible = false;
		  microscope.add(debugSphere);
  
		  //   new
		  const point1 = new THREE.PointLight(0x0728FF, 10, 10, 5);
		  point1.position.set(-0.499, -2.216, -2.242);
		  microscope.add(point1);

		  const point2 = new THREE.PointLight(0xffffff, 10, 10, 5);
		  point2.position.set(-0.499, -2.216, -2.242);
		  microscope.add(point2);

		  const point11 = new THREE.PointLight(0xffffff, 90, 0, 2);
		  point11.position.set(3.230, 3.696, 2.188);
		  microscope.add(point11);

		  const point111 = new THREE.PointLight(0xffffff, 20, 0, 2);
		  point111.position.set(-6.340, -0.446, -12.329);
		  microscope.add(point111);

		  const point1111 = new THREE.PointLight(0xffffff, 150, 0, 2);
		  point1111.position.set(9.475, -7.090, -0.154);
		  microscope.add(point1111);

		  const point01 = new THREE.PointLight(0xB9B2FF, 100, 0, 1);
		  point01.position.set(-5.978, 0.777, 0.220);
		  microscope.add(point01);

		  const point02 = new THREE.PointLight(0xB9B2FF, 100, 0, 1);
		  point02.position.set(-5.045, -1.543, -7.200);
		  microscope.add(point02);

		  const point03 = new THREE.PointLight(0xB9B2FF, 50, 0, 1);
		  point03.position.set(0.697, -7.654, -5.976);
		  microscope.add(point03);

		  const dirLight = new THREE.DirectionalLight(0x0728FF, 1);
		  dirLight.position.set(-15, -20, 10);
		  microscope.add(dirLight);
  
		  // Enable shadows for meshes
		  renderer.shadowMap.enabled = true;
		  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		  microscope.traverse(obj => {
			if (obj.isMesh) {
			  obj.castShadow = true;
			  obj.receiveShadow = true;
			  if (obj.material.normalMap) {
				obj.material.normalMap = null;
				obj.material.needsUpdate = true;
			  }
			}
		  });
  
		  // --- Responsive Scaling ---
		  const w = window.innerWidth;
		  const scale = w <= 743 ? 0.7 : w <= 1023 ? 0.8 : 1;
		  microscope.scale.set(scale, scale, scale);
  
		  // --- Camera Setup ---
		  if (gltf.cameras && gltf.cameras.length) {
			embeddedCamera = gltf.cameras[0];
		  } else {
			embeddedCamera = new THREE.PerspectiveCamera(
			  75,
			  canvasMain.clientWidth / canvasMain.clientHeight,
			  0.1,
			  1000
			);
			embeddedCamera.position.set(0, 0, 5);
		  }
		  scene.add(embeddedCamera);
  
		  // --- Post-Processing (FXAA) ---
		  const composer = new THREE.EffectComposer(renderer);
		  composer.addPass(new THREE.RenderPass(scene, embeddedCamera));
		  const fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
		  fxaaPass.material.transparent = true;
		  fxaaPass.uniforms['resolution'].value.set(
			1 / window.innerWidth,
			1 / window.innerHeight
		  );
		  composer.addPass(fxaaPass);
  
		  // --- Low-End Device Optimization ---
		  if (navigator.hardwareConcurrency <= 2) {
			renderer.shadowMap.enabled = false;
			microscope.traverse(mesh => {
			  if (mesh.isMesh && mesh.material) {
				mesh.material.metalness = 0;
				mesh.material.roughness = 1;
			  }
			});
		  }
  
		  // --- GSAP Scroll Animation ---
		  const initialPos = microscope.position.clone();
		  const initialQuat = microscope.quaternion.clone();
		  const { pos: finalPos, quat: finalQuat } = getFinalTransform();
		  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
		  const tl = gsap.timeline({
			scrollTrigger: {
			  trigger: '.scroll-container',
			  start: 'top top',
			  end: `+=${window.innerHeight}`,
			  scrub: true
			}
		  });
		  tl.to({}, { // custom onUpdate for transform
			duration: 1,
			onUpdate() {
			  const p = tl.progress();
			  if (p <= 0.3) {
				const t = p / 0.3;
				microscope.position.lerpVectors(initialPos, finalPos, t);
				microscope.quaternion.slerpQuaternions(initialQuat, finalQuat, t);
			  } else if (p >= 0.8) {
				const t = (p - 0.8) / 0.2;
				microscope.scale.lerpVectors(new THREE.Vector3(1,1,1), new THREE.Vector3(1.3,1.3,1.3), t);
				const extra = finalPos.clone().add(new THREE.Vector3(13, -0.9, 0.95));
				microscope.position.lerpVectors(finalPos, extra, t);
			  }
			}
		  });
		  tl.to('.main__wrap', { duration: 0.3, opacity: 0, filter: 'blur(5px)' }, 0)
			.addLabel('phase1End', 0.3)
			.to('.advantages__item', { duration: 0.067, opacity: 1, y: 0, stagger: 0.067 }, 'phase1End')
			.addLabel('endPhase2', 0.6)
			.to('.advantages', { duration: 0.1, opacity: 0, filter: 'blur(5px)' }, 'endPhase2')
			.addLabel('endPhase3', 0.85)
			.to('.main', { duration: 0.05, opacity: 0, filter: 'blur(5px)' }, 'endPhase3');
  
		  // --- Render Loop ---
		  function animate() {
			requestAnimationFrame(animate);
			composer.render();
		  }
		  animate();
  
		  // Final render and resolve
		  renderer.render(scene, embeddedCamera);
		  resolve();
		},
		undefined,
		err => {
		  console.error('Ошибка загрузки модели:', err);
		  resolve();
		}
	  );
	});
  }
  