document.addEventListener("DOMContentLoaded", () => {
    const video = document.getElementById("camera-video");
    const drawingCanvas = document.getElementById("drawing-canvas");
    const landmarksCanvas = document.getElementById("landmarks-canvas");
    const stage = document.getElementById("paint-stage");
    const cursor = document.getElementById("cursor-dot");
    const startButton = document.getElementById("start-camera");
    const stopButton = document.getElementById("stop-camera");
    const clearButton = document.getElementById("clear-canvas");
    const saveButton = document.getElementById("save-drawing");
    const eraserButton = document.getElementById("eraser");
    const cameraMessage = document.getElementById("camera-message");
    const cameraStatus = document.getElementById("camera-status-text");
    const handStatus = document.getElementById("hand-status-text");
    const handIndicator = document.getElementById("hand-indicator");
    const colorButtons = document.querySelectorAll(".color-tool");

    const drawingContext = drawingCanvas.getContext("2d");
    const landmarksContext = landmarksCanvas.getContext("2d");

    let handLandmarker = null;
    let stream = null;
    let animationFrame = null;
    let running = false;
    let currentColor = "#ff304f";
    let eraserEnabled = false;
    let previousPoint = null;
    let smoothPoint = null;
    let lastVideoTime = -1;

    const resizeCanvas = () => {
        const rect = stage.getBoundingClientRect();
        const scale = Math.min(window.devicePixelRatio || 1, 2);
        [drawingCanvas, landmarksCanvas].forEach((canvas) => {
            canvas.width = Math.round(rect.width * scale);
            canvas.height = Math.round(rect.height * scale);
        });
        drawingContext.setTransform(scale, 0, 0, scale, 0, 0);
        landmarksContext.setTransform(scale, 0, 0, scale, 0, 0);
        drawingContext.lineCap = "round";
        drawingContext.lineJoin = "round";
    };

    const clearCanvas = () => {
        const rect = stage.getBoundingClientRect();
        drawingContext.clearRect(0, 0, rect.width, rect.height);
        previousPoint = null;
        smoothPoint = null;
        handStatus.textContent = "Tela limpa";
    };

    const setTool = (color, button) => {
        eraserEnabled = false;
        eraserButton.setAttribute("aria-pressed", "false");
        eraserButton.classList.remove("active");
        currentColor = color;
        colorButtons.forEach((item) => {
            item.classList.remove("active");
            item.setAttribute("aria-pressed", "false");
        });
        button.classList.add("active");
        button.setAttribute("aria-pressed", "true");
    };

    colorButtons.forEach((button) => {
        button.addEventListener("click", () => setTool(button.dataset.color, button));
    });

    eraserButton.addEventListener("click", () => {
        eraserEnabled = !eraserEnabled;
        eraserButton.setAttribute("aria-pressed", String(eraserEnabled));
        eraserButton.classList.toggle("active", eraserEnabled);
        colorButtons.forEach((button) => {
            button.classList.remove("active");
            button.setAttribute("aria-pressed", "false");
        });
        handStatus.textContent = eraserEnabled ? "Borracha selecionada" : "Ferramenta selecionada";
    });

    clearButton.addEventListener("click", clearCanvas);

    saveButton.addEventListener("click", () => {
        if (!drawingCanvas.width || !drawingCanvas.height) return;

        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = drawingCanvas.width;
        exportCanvas.height = drawingCanvas.height;
        const exportContext = exportCanvas.getContext("2d");

        if (stream && video.readyState >= 2) {
            exportContext.save();
            exportContext.translate(exportCanvas.width, 0);
            exportContext.scale(-1, 1);
            exportContext.drawImage(video, 0, 0, exportCanvas.width, exportCanvas.height);
            exportContext.restore();
        }

        exportContext.drawImage(drawingCanvas, 0, 0);

        exportCanvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `ar-paint-${Date.now()}.png`;
            link.click();
            URL.revokeObjectURL(url);
            handStatus.textContent = "Desenho salvo em PNG";
        }, "image/png");
    });

    const loadHandLandmarker = async () => {
        if (!window.vision) throw new Error("A biblioteca MediaPipe não foi carregada. Verifique sua conexão.");

        const filesetResolver = await window.vision.FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm"
        );

        const criarLandmarker = (delegate) => window.vision.HandLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                delegate
            },
            runningMode: "VIDEO",
            numHands: 1,
            minHandDetectionConfidence: 0.6,
            minTrackingConfidence: 0.5
        });

        try {
            return await criarLandmarker("GPU");
        } catch (gpuError) {
            return criarLandmarker("CPU");
        }
    };

    const stopExperience = () => {
        running = false;
        if (animationFrame) cancelAnimationFrame(animationFrame);
        animationFrame = null;
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            stream = null;
        }
        video.srcObject = null;
        previousPoint = null;
        smoothPoint = null;
        cursor.classList.remove("visible", "drawing", "navigate");
        handIndicator.className = "hand-dot";
        handStatus.textContent = "Experiência encerrada";
        cameraStatus.textContent = "Encerrada";
        startButton.disabled = false;
        stopButton.disabled = true;
        cameraMessage.classList.remove("hidden");
        cameraMessage.querySelector("strong").textContent = "Experiência encerrada";
        cameraMessage.querySelector("p").textContent = "Inicie novamente quando estiver pronto.";
    };

    const fingerRaised = (landmarks, tipIndex, pipIndex) =>
        landmarks[tipIndex].y < landmarks[pipIndex].y;

    const processResults = (results) => {
        const rect = stage.getBoundingClientRect();
        landmarksContext.clearRect(0, 0, rect.width, rect.height);

        if (!results.handLandmarks || results.handLandmarks.length === 0) {
            previousPoint = null;
            smoothPoint = null;
            handIndicator.className = "hand-dot";
            handStatus.textContent = "Nenhuma mão detectada";
            cursor.classList.remove("visible", "drawing", "navigate");
            return;
        }

        const landmarks = results.handLandmarks[0];
        const indexRaised = fingerRaised(landmarks, 8, 6);
        const middleRaised = fingerRaised(landmarks, 12, 10);

        const rawX = (1 - landmarks[8].x) * rect.width;
        const rawY = landmarks[8].y * rect.height;

        let validPoint = true;
        if (smoothPoint) {
            const distance = Math.hypot(rawX - smoothPoint.x, rawY - smoothPoint.y);
            if (distance > 100) validPoint = false;
        }

        if (validPoint) {
            smoothPoint = smoothPoint
                ? { x: 0.4 * rawX + 0.6 * smoothPoint.x, y: 0.4 * rawY + 0.6 * smoothPoint.y }
                : { x: rawX, y: rawY };
        }

        if (!smoothPoint) return;

        cursor.style.left = `${smoothPoint.x}px`;
        cursor.style.top = `${smoothPoint.y}px`;
        cursor.classList.add("visible");

        landmarksContext.fillStyle = "rgba(54, 231, 255, 0.95)";
        landmarks.forEach((point) => {
            landmarksContext.beginPath();
            landmarksContext.arc((1 - point.x) * rect.width, point.y * rect.height, 2.5, 0, Math.PI * 2);
            landmarksContext.fill();
        });

        if (indexRaised && !middleRaised) {
            handIndicator.className = "hand-dot drawing";
            handStatus.textContent = eraserEnabled ? "Apagando" : "Desenhando";
            cursor.className = "cursor-dot visible drawing";

            if (previousPoint) {
                drawingContext.beginPath();
                drawingContext.moveTo(previousPoint.x, previousPoint.y);
                drawingContext.lineTo(smoothPoint.x, smoothPoint.y);
                if (eraserEnabled) {
                    drawingContext.globalCompositeOperation = "destination-out";
                    drawingContext.strokeStyle = "rgba(0,0,0,1)";
                    drawingContext.lineWidth = 34;
                } else {
                    drawingContext.globalCompositeOperation = "source-over";
                    drawingContext.strokeStyle = currentColor;
                    drawingContext.lineWidth = 8;
                }
                drawingContext.stroke();
            }
            previousPoint = { ...smoothPoint };
        } else if (indexRaised && middleRaised) {
            previousPoint = null;
            handIndicator.className = "hand-dot detected";
            handStatus.textContent = "Navegando — sem desenhar";
            cursor.className = "cursor-dot visible navigate";
        } else {
            previousPoint = null;
            handIndicator.className = "hand-dot detected";
            handStatus.textContent = "Mão fechada — pausada";
            cursor.className = "cursor-dot visible";
        }
    };

    const detectFrame = () => {
        if (!running) return;

        if (video.readyState >= 2 && handLandmarker && video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            const results = handLandmarker.detectForVideo(video, performance.now());
            processResults(results);
        }

        animationFrame = requestAnimationFrame(detectFrame);
    };

    startButton.addEventListener("click", async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            cameraStatus.textContent = "Câmera indisponível";
            cameraMessage.querySelector("strong").textContent = "Câmera não disponível";
            cameraMessage.querySelector("p").textContent = window.isSecureContext
                ? "Este navegador não oferece acesso à câmera. Use uma versão moderna do Chrome, Edge ou Firefox."
                : "Abra o site por HTTPS ou pelo localhost. O navegador bloqueia câmera em conexões inseguras.";
            return;
        }

        startButton.disabled = true;
        cameraStatus.textContent = "Solicitando acesso...";
        cameraMessage.querySelector("strong").textContent = "Aguardando autorização";
        cameraMessage.querySelector("p").textContent = "Permita o uso da câmera no aviso do navegador.";

        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });
            video.srcObject = stream;
            await video.play();

            cameraStatus.textContent = "Carregando reconhecimento...";
            handStatus.textContent = "Inicializando MediaPipe";

            handLandmarker = await loadHandLandmarker();
            resizeCanvas();
            running = true;
            cameraStatus.textContent = "Câmera ativa";
            cameraMessage.classList.add("hidden");
            stopButton.disabled = false;
            detectFrame();
        } catch (error) {
            let titulo = "Não foi possível iniciar";
            let mensagem = "Verifique a câmera e a permissão do navegador, depois tente novamente.";

            if (error && error.name === "NotAllowedError") {
                titulo = "Permissão da câmera bloqueada";
                mensagem = "Clique no ícone da câmera na barra do navegador e permita o acesso.";
            } else if (error && error.name === "NotFoundError") {
                titulo = "Nenhuma câmera encontrada";
                mensagem = "Conecte uma câmera ou escolha outro dispositivo nas configurações do navegador.";
            } else if (error && error.name === "NotReadableError") {
                titulo = "A câmera está em uso";
                mensagem = "Feche aplicativos ou abas que estejam usando a câmera e tente novamente.";
            } else if (error && error.message) {
                mensagem = error.message;
            }

            cameraStatus.textContent = titulo;
            cameraMessage.querySelector("strong").textContent = titulo;
            cameraMessage.querySelector("p").textContent = mensagem;
            startButton.disabled = false;
            stopButton.disabled = true;
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
                stream = null;
            }
        }
    });

    stopButton.addEventListener("click", stopExperience);

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
});
