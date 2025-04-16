document.addEventListener('DOMContentLoaded', () => {
    // const { THREE, GLTFLoader } = THREEBundle;

    // microscope
    const canvasMain = document.getElementById('canvas-container')

    function updateCanvasSize() {
        const ratio = 1440 / 770; // требуемое соотношение сторон (~1.87)
        const viewportHeight = window.innerHeight;
        let width = window.innerWidth; // начинаем с ширины окна
        let computedHeight = width / ratio; // высота, исходя из пропорций
        
        // Если вычисленная высота меньше, чем высота экрана, принудительно устанавливаем высоту 100vh
        if (computedHeight < viewportHeight) {
          computedHeight = viewportHeight;
          width = computedHeight * ratio;
        }
        
        // Устанавливаем размер рендера (это размер фактической canvas)
        // renderer.setSize(width, computedHeight);
        
        // Обновляем размеры контейнера (если он используется для CSS)
        const container = document.getElementById("canvas-container");
        container.style.width = width + "px";
        container.style.height = computedHeight + "px";
    }
    updateCanvasSize();


    function getFinalTransform() {
        let finalObjPos, finalObjEuler;
        const currentWidth = window.innerWidth;
    
        if (currentWidth >= 1024) {
            finalObjPos = new THREE.Vector3(13, -1.1, 0.55);
            finalObjEuler = new THREE.Euler(
                THREE.MathUtils.degToRad(21), 
                THREE.MathUtils.degToRad(38), 
                THREE.MathUtils.degToRad(-17),
                "XYZ"
            );
        } else if (currentWidth <= 1023 && currentWidth >= 744) {
            finalObjPos = new THREE.Vector3(13, -1.1, 0.55);
            finalObjEuler = new THREE.Euler(
                THREE.MathUtils.degToRad(21), 
                THREE.MathUtils.degToRad(38), 
                THREE.MathUtils.degToRad(-17),
                "XYZ"
            );
        } else {
            finalObjPos = new THREE.Vector3(13, -1.1, 0.55);
            finalObjEuler = new THREE.Euler(
                THREE.MathUtils.degToRad(21), 
                THREE.MathUtils.degToRad(38), 
                THREE.MathUtils.degToRad(-17),
                "XYZ"
            );
        }

        return {
            pos: finalObjPos,
            quat: new THREE.Quaternion().setFromEuler(finalObjEuler)
        };
    }

    if (canvasMain) {
        if (window.innerWidth >= 1024) {
            if (window.innerHeight > canvasMain.offsetHeight) {
                canvasMain.classList.add('is--bottom');
            } else {
                canvasMain.classList.remove('is--bottom');
            }
        }

        const scene = new THREE.Scene();

        const textureLoader = new THREE.TextureLoader();
        textureLoader.setPath('scope/');
        textureLoader.load('scope.png', (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;

            scene.environment = texture;
        });

        // create render
        const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
        
        renderer.setClearColor( 0x000000, 0 ); // 0 означает полностью прозрачный фон

        renderer.setSize(canvasMain.clientWidth, canvasMain.clientHeight);
        
        let desiredPixelRatio = Math.min(window.devicePixelRatio, 2);
        renderer.setPixelRatio(desiredPixelRatio);

        let lastTime = performance.now();
        let frames = 0;

        function monitorFPS() {
            const now = performance.now();
            frames++;
            if (now - lastTime >= 1000) {
                const fps = frames * 1000 / (now - lastTime);
                // Если FPS низкий, например, ниже 20, временно снизить pixelRatio до 1.
                if (fps < 20) {
                desiredPixelRatio = 1;
                } else {
                desiredPixelRatio = Math.min(window.devicePixelRatio, 2);
                }
                renderer.setPixelRatio(desiredPixelRatio);
                frames = 0;
                lastTime = now;
            }
            requestAnimationFrame(monitorFPS);
        }

        monitorFPS();

        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;

        renderer.shadowMap.enabled = false;

        canvasMain.appendChild(renderer.domElement);

        // settings GLTFLoader and DRACOLoader
        const loader = new THREE.GLTFLoader();
        loader.setPath('scope/');
        const dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath('https://unpkg.com/three@0.128.0/examples/js/libs/draco/gltf/');
        loader.setDRACOLoader(dracoLoader);

        // Если в вашей сцене уже есть, например, directionalLight:
        // const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // исходная интенсивность 1
        // directionalLight.position.set(5, 10, 7.5);
        // scene.add(directionalLight);

        // Добавляем дополнительное равномерное освещение:
        const extraAmbient = new THREE.AmbientLight(0xffffff, 0.6); // интенсивность 0.8 (подберите нужное значение)
        scene.add(extraAmbient);

        // Если хотите просто увеличить яркость всей сцены, можно изменить экспозицию рендера:
        renderer.toneMappingExposure = 1.5; // увеличьте значение для большей яркости
        
        // Создаём PointLight с белым цветом (0xffffff) и заданной интенсивностью
        const pointLight = new THREE.PointLight(0x0728FF, 10.41);

        // Устанавливаем координаты источника света:
        pointLight.position.set(3.015, 3.701, 1.585);

        // Добавляем источник света в сцену
        scene.add(pointLight);

//         const dirLight = new THREE.DirectionalLight(0xffffff, 2.2); // усиливает контраст и свет
// dirLight.position.set(5, 10, 5);
// // scene.add(dirLight);


//         const dirLight = new THREE.DirectionalLight(0x0728FF, 1.2); // усиливает контраст и свет
//     dirLight.position.set(50, 30, 15);
//     scene.add(dirLight);

        let microscope;
        let embeddedCamera;

        // let modelFile = window.innerWidth <= 1023 ? 'mobile.glb' : 'scope.glb';
        let modelFile = window.innerWidth <= 1023 ? 'scope.glb' : 'scope.glb';

        loader.load(modelFile, (gltf) => {

            microscope = gltf.scene;
            scene.add(microscope);

            if (window.innerWidth <= 743) {
                // Если мобильное устройство (например, ширина меньше 768px),
                // задаем уменьшенный масштаб
                microscope.scale.set(0.7, 0.7, 0.7);
            } else if (window.innerWidth <= 1023 && window.innerWidth >= 744) {
                microscope.scale.set(0.8, 0.8, 0.8);
            } else {
                // Для остальных устройств оставляем масштаб 1
                microscope.scale.set(1, 1, 1);
            }
            
            scene.traverse(child => {
                if (child.isMesh) {
                  if (child.material.normalMap) {
                    child.material.normalMap = null;
                    child.material.needsUpdate = true;
                  }
                }
              });

            if (gltf.cameras && gltf.cameras.length > 0) {
                embeddedCamera = gltf.cameras[0];
            }
            scene.add(embeddedCamera);

            // --- Анимация объекта (микроскопа) ---
            // Сохраняем начальную трансформацию объекта
            const initialObjPos = microscope.position.clone();
            const initialObjQuat = microscope.quaternion.clone();

            // Задаем конечное состояние объекта, взятое из Three.js Editor (мировые координаты)
            // Пример: позиция (13, -1.1, 0.55)
            // и поворот (Euler: 21°, 38°, -17°) в порядке "XYZ" (переводим в радианы)
            // const finalObjPos = new THREE.Vector3(13, -1.1, 0.55);
            // const finalObjEuler = new THREE.Euler(
            //     THREE.MathUtils.degToRad(21), 
            //     THREE.MathUtils.degToRad(38), 
            //     THREE.MathUtils.degToRad(-17),
            //     "XYZ"
            // );
            // const finalObjQuat = new THREE.Quaternion().setFromEuler(finalObjEuler);

            const { pos: finalObjPos, quat: finalObjQuat } = getFinalTransform();

            gsap.registerPlugin(ScrollTrigger);
            gsap.registerPlugin(ScrollToPlugin);

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
                    let progress = tl.progress();

                    let st = this.scrollTrigger;    // получаем экземпляр ScrollTrigger
                    // Пример использования: логируем направление скролла:
                    // console.log("Scroll direction:", st.direction);

                    if (st.direction < 0 && !autoScrolling) {
                        autoScrolling = true;
                        // tl.scrollTrigger.disable();
                        // console.log('to top')
                        // gsap.to(window, {
                        //     duration: 0.5,
                        //     scrollTo: { y: 0 },
                        //     ease: "power1.out",
                        //     onUpdate: () => {
                        //         // вручную обновляем прогресс timeline во время прокрутки
                        //         let scrollTop = window.scrollY || window.pageYOffset;
                        //         let totalScroll = document.documentElement.scrollHeight - window.innerHeight;
                        //         let newProgress = scrollTop / totalScroll;
                        //         tl.progress(newProgress); // синхронизируем вручную
                        //         // updateMicroscope(newProgress); // если у тебя есть логика для микроскопа
                        //     },
                        //     onComplete: () => {
                        //         // возвращаем ScrollTrigger и снова активируем контроль
                        //         tl.scrollTrigger.enable();
                        //         autoScrolling = false;
                        //     }
                        // });
                    }

                    console.log(progress)
                    if (progress <= 0.3) {
                        let subProgress = progress / 0.3;
                        microscope.position.lerpVectors(initialObjPos, finalObjPos, subProgress);
                        microscope.quaternion.slerpQuaternions(initialObjQuat, finalObjQuat, subProgress);
                        microscope.scale.set(1, 1, 1);
                    } else if (progress >= 0.8) {
                        let subProgress = (progress - 0.8) / 0.2;
                        microscope.scale.lerpVectors(new THREE.Vector3(1, 1, 1), new THREE.Vector3(1.5, 1.5, 1.5), subProgress);
                        const furtherPos = finalObjPos.clone().add(new THREE.Vector3(13, -0.9, 0.95));
                        microscope.position.lerpVectors(finalObjPos, furtherPos, subProgress);
                    }
                    // console.log("tl.duration():", tl.duration());
                },
                onComplete: () => {
                    console.log("Анимация завершена – запускаем видео");
                    // playVideoFromStart()
                },
                // onEnterBack: () => {
                //     // console.log('back')
                //     // Когда прокрутка идёт вверх и триггер покидается с начала,
                //     // автоматическая анимация сбрасывает timeline в начало (progress: 0)
                //     gsap.to(tl, {
                //         progress: 0,
                //         duration: 0.5,
                //         ease: "power1.out"
                //     });
                // }
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

            animate();
        }, undefined, (error) => {
            console.error("Ошибка загрузки модели:", error);
        });

        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, embeddedCamera);
        }

        window.addEventListener('resize', () => {
            const width = window.innerWidth;
            renderer.setSize(canvasMain.clientWidth, canvasMain.clientHeight);
        });
    }
})