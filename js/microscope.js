// js/microscope.js

export function initMicroscope(THREE) {
    return new Promise((resolve, reject) => {
      const canvasMain = document.getElementById('canvas-container');
      if (!canvasMain) {
        console.error('canvas-container не найден');
        return reject('canvas-container не найден');
      }
  
      // --- Resize ---
      function updateCanvasSize() {
        const ratio = 1440 / 770;
        const viewportHeight = window.innerHeight;
        let width = window.innerWidth;
        let computedHeight = width / ratio;
        if (computedHeight < viewportHeight) {
          computedHeight = viewportHeight;
          width = computedHeight * ratio;
        }
        canvasMain.style.width = width + 'px';
        canvasMain.style.height = computedHeight + 'px';
      }
      updateCanvasSize();
      window.addEventListener('resize', updateCanvasSize);
  
      // --- Final transform helper ---
      function getFinalTransform() {
        const finalObjPos = new THREE.Vector3(13, -1.1, 0.55);
        const finalObjEuler = new THREE.Euler(
          THREE.MathUtils.degToRad(21),
          THREE.MathUtils.degToRad(38),
          THREE.MathUtils.degToRad(-17),
          'XYZ'
        );
        return {
          pos: finalObjPos,
          quat: new THREE.Quaternion().setFromEuler(finalObjEuler)
        };
      }
  
      // --- Scene & renderer ---
      const scene = new THREE.Scene();
      const renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setSize(canvasMain.clientWidth, canvasMain.clientHeight);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.5;
      renderer.shadowMap.enabled = false;
      canvasMain.appendChild(renderer.domElement);
  
      // --- Lights ---
      const ambient = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambient);
      const point = new THREE.PointLight(0x0728FF, 10.41);
      point.position.set(3.015, 3.701, 1.585);
      scene.add(point);
  
      // --- Environment map ---
      const texLoader = new THREE.TextureLoader();
      texLoader.setPath('scope/');
      texLoader.load('scope.png', tex => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = tex;
      });
  
      // --- Camera placeholder ---
      let embeddedCamera;
  
      // --- Load GLTF with DRACO ---
      const loader = new THREE.GLTFLoader();
      loader.setPath('scope/');
      const draco = new THREE.DRACOLoader();
      draco.setDecoderPath('js/three/examples/js/libs/draco/');
      loader.setDRACOLoader(draco);
  
      const modelFile = 'scope.glb';
  
      loader.load(
        modelFile,
        gltf => {
          // Add model
          const microscope = gltf.scene;
          scene.add(microscope);
  
          // Scale by viewport
          if (window.innerWidth <= 743) {
            microscope.scale.set(0.7, 0.7, 0.7);
          } else if (window.innerWidth <= 1023) {
            microscope.scale.set(0.8, 0.8, 0.8);
          } else {
            microscope.scale.set(1, 1, 1);
          }
  
          // Remove normal maps
          scene.traverse(c => {
            if (c.isMesh && c.material.normalMap) {
              c.material.normalMap = null;
              c.material.needsUpdate = true;
            }
          });
  
          // Camera
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
  
          // --- GSAP ScrollTimeline as before ---
          const initialObjPos = microscope.position.clone();
          const initialObjQuat = microscope.quaternion.clone();
          const { pos: finalObjPos, quat: finalObjQuat } = getFinalTransform();
  
          gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
          let autoScrolling = false;
  
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: ".scroll-container",
              start: "top top",
              end: () => "+=" + window.innerHeight,
              scrub: true,
              // markers: true,
            },
            onUpdate: function() {
              const progress = tl.progress();
              const st = this.scrollTrigger;
  
              if (st.direction < 0 && !autoScrolling) {
                autoScrolling = true;
                // (Ваши отключенные автоскролл-блоки можно вернуть сюда)
              }
  
              if (progress <= 0.3) {
                const sub = progress / 0.3;
                microscope.position.lerpVectors(initialObjPos, finalObjPos, sub);
                microscope.quaternion.slerpQuaternions(initialObjQuat, finalObjQuat, sub);
                microscope.scale.set(1, 1, 1);
              } else if (progress >= 0.8) {
                const sub = (progress - 0.8) / 0.2;
                microscope.scale.lerpVectors(
                  new THREE.Vector3(1, 1, 1),
                  new THREE.Vector3(1.5, 1.5, 1.5),
                  sub
                );
                const furtherPos = finalObjPos.clone().add(new THREE.Vector3(13, -0.9, 0.95));
                microscope.position.lerpVectors(finalObjPos, furtherPos, sub);
              }
            },
            onComplete: () => {
              console.log("Анимация завершена – запускаем видео");
              // playVideoFromStart();
            }
          });
  
          tl.to(".main__wrap", {
            duration: 0.3,
            opacity: 0,
            filter: "blur(5px)",
            ease: "none"
          }, 0);
  
          tl.addLabel("endPhase1", 0.3);
  
          tl.to(".advantages__item", {
            duration: 0.06666666666,
            opacity: 1,
            y: 0,
            ease: "none",
            stagger: 0.06666666666,
          }, "phase1End");
  
          tl.addLabel("endPhase2", 0.6);
  
          tl.to(".advantages", {
            duration: 0.1,
            opacity: 0,
            filter: 'blur(5px)',
            ease: "none",
          }, "endPhase2");
  
          tl.addLabel("endPhase3", 0.85);
  
          tl.to(".main", {
            duration: 0.05,
            opacity: 0,
            filter: "blur(5px)",
            ease: "none"
          }, "endPhase3");
  
          tl.to({}, {duration: 0.1});
  
          // --- Render loop ---
          function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, embeddedCamera);
          }
          animate();
  
          window.addEventListener('resize', () => {
            renderer.setSize(canvasMain.clientWidth, canvasMain.clientHeight);
            if (embeddedCamera.isPerspectiveCamera) {
              embeddedCamera.aspect = canvasMain.clientWidth / canvasMain.clientHeight;
              embeddedCamera.updateProjectionMatrix();
            }
          });
  
          // First render then resolve
          renderer.render(scene, embeddedCamera);
          resolve();
        },
        undefined,
        err => {
          console.error("Ошибка загрузки модели:", err);
          // всё равно резолвим, чтобы лоадер убрался
          resolve();
        }
      );
    });
  }
  