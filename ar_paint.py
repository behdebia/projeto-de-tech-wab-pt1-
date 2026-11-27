"""
AR Paint - Desenhe no ar usando a câmera e o dedo indicador..

Modo de uso: ;)
- Dedo indicador esticado (só ele) = MODO DESENHO -> desenha na tela
- Indicador + médio esticados = MODO NAVEGAÇÃO -> move sem desenhar (levanta a "caneta")
- Mão fechada (punho) = nada acontece, útil pra pausar
- Teclas: 1/2/3/4 trocam de cor | E = borracha | C = limpar tela | S = salvar desenho | ESC = sair

Instalação:
    pip install opencv-python mediapipe numpy!!!!

Na primeira execução, o script baixa automaticamente um pequeno arquivo de
modelo (hand_landmarker.task, ~8MB) da Google, precisa de internet nessa hora.
"""

import os
import time
import urllib.request

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision


CORES = {
    "1": (0, 0, 255),      # vermelho (BGR)
    "2": (0, 255, 0),      # verde
    "3": (255, 0, 0),      # azul
    "4": (0, 255, 255),    # amarelo
}
ESPESSURA_DESENHO = 8
ESPESSURA_BORRACHA = 40

# Suavização (EMA) - alpha baixo = mais suave (com leve atraso), alpha alto = mais responsivo
ALPHA_EMA = 0.4

# Filtro de salto abrupto - se o ponto "pular" mais que isso em um único frame,
# tratamos como perda momentânea de rastreamento e ignoramos o frame
SALTO_MAXIMO_PX = 100

MODEL_PATH = "hand_landmarker.task"
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
    "hand_landmarker/float16/1/hand_landmarker.task"
)

# ---------- BAIXA O MODELO SE NECESSÁRIO ----------
if not os.path.exists(MODEL_PATH):
    print("Baixando modelo de detecção de mãos (só acontece na primeira vez)...")
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print("Modelo baixado com sucesso.")

# ---------- SETUP MEDIAPIPE (Tasks API) ----------
BaseOptions = mp_python.BaseOptions
HandLandmarker = mp_vision.HandLandmarker
HandLandmarkerOptions = mp_vision.HandLandmarkerOptions
VisionRunningMode = mp_vision.RunningMode

options = HandLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=MODEL_PATH),
    running_mode=VisionRunningMode.VIDEO,
    num_hands=1,
    min_hand_detection_confidence=0.6,
    min_tracking_confidence=0.5,
)
landmarker = HandLandmarker.create_from_options(options)

# ---------- SETUP CÂMERA ----------
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

ret, frame = cap.read()
if not ret:
    raise RuntimeError("Não consegui acessar a câmera. Verifique se ela está livre/conectada.")

h, w, _ = frame.shape
canvas = np.zeros((h, w, 3), dtype=np.uint8)  # camada onde o desenho fica salvo

cor_atual = CORES["1"]
modo_borracha = False
ultimo_ponto = None  # (x, y) do frame anterior, pra desenhar linha contínua
ponto_suave = None   # (x, y) suavizado pelo EMA

# Índices dos landmarks (ponta e articulação) dos dedos
IDX_TIP = {"indicador": 8, "medio": 12}
IDX_PIP = {"indicador": 6, "medio": 10}


def dedo_esticado(landmarks, tip_id, pip_id):
    """Retorna True se a ponta do dedo está mais alta (y menor) que a articulação -> dedo esticado."""
    return landmarks[tip_id].y < landmarks[pip_id].y


print("Controles: 1-4 cores | E = borracha | C = limpar | S = salvar | ESC = sair")

start_time = time.time()

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)  # espelha pra ficar mais natural
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

    timestamp_ms = int((time.time() - start_time) * 1000)
    resultado = landmarker.detect_for_video(mp_image, timestamp_ms)

    status_texto = "Sem mao detectada"

    if resultado.hand_landmarks:
        lm = resultado.hand_landmarks[0]  # primeira mão detectada

        indicador_up = dedo_esticado(lm, IDX_TIP["indicador"], IDX_PIP["indicador"])
        medio_up = dedo_esticado(lm, IDX_TIP["medio"], IDX_PIP["medio"])

        x_bruto = int(lm[IDX_TIP["indicador"]].x * w)
        y_bruto = int(lm[IDX_TIP["indicador"]].y * h)

        # ---------- FILTRO DE SALTO ABRUPTO ----------
        # se o ponto novo estiver muito longe do último ponto suavizado,
        # provavelmente é ruído de perda de rastreamento -> ignora esse frame
        ponto_valido = True
        if ponto_suave is not None:
            dist = ((x_bruto - ponto_suave[0]) ** 2 + (y_bruto - ponto_suave[1]) ** 2) ** 0.5
            if dist > SALTO_MAXIMO_PX:
                ponto_valido = False

        if ponto_valido:
            # ---------- SUAVIZAÇÃO EMA ----------
            if ponto_suave is None:
                ponto_suave = (x_bruto, y_bruto)
            else:
                x_suave = ALPHA_EMA * x_bruto + (1 - ALPHA_EMA) * ponto_suave[0]
                y_suave = ALPHA_EMA * y_bruto + (1 - ALPHA_EMA) * ponto_suave[1]
                ponto_suave = (x_suave, y_suave)

        x, y = int(ponto_suave[0]), int(ponto_suave[1])

        if indicador_up and not medio_up:
            # MODO DESENHO
            status_texto = "Desenhando"
            cor_desenho = (0, 0, 0) if modo_borracha else cor_atual
            espessura = ESPESSURA_BORRACHA if modo_borracha else ESPESSURA_DESENHO

            if ultimo_ponto is not None:
                cv2.line(canvas, ultimo_ponto, (x, y), cor_desenho, espessura)
            ultimo_ponto = (x, y)
            cv2.circle(frame, (x, y), espessura // 2, cor_desenho if not modo_borracha else (200, 200, 200), -1)

        elif indicador_up and medio_up:
            # MODO NAVEGAÇÃO (levanta a caneta)
            status_texto = "Navegando (sem desenhar)"
            ultimo_ponto = None
            cv2.circle(frame, (x, y), 10, (255, 255, 255), 2)

        else:
            ultimo_ponto = None

        # desenha os pontos da mão pra dar feedback visual
        for ponto in lm:
            px, py = int(ponto.x * w), int(ponto.y * h)
            cv2.circle(frame, (px, py), 3, (0, 200, 255), -1)
    else:
        ultimo_ponto = None
        ponto_suave = None

    # combina o desenho (canvas) com o frame da câmera
    mascara = canvas.astype(bool).any(axis=2)
    frame[mascara] = canvas[mascara]

    # ---------- INTERFACE ----------
    cv2.rectangle(frame, (0, 0), (w, 50), (30, 30, 30), -1)
    cv2.putText(frame, f"Status: {status_texto}", (10, 33),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

    cor_label = "BORRACHA" if modo_borracha else "COR"
    cv2.circle(frame, (w - 40, 25), 15, (255, 255, 255) if modo_borracha else cor_atual, -1)
    cv2.putText(frame, cor_label, (w - 160, 33), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

    cv2.imshow("AR Paint - pressione ESC para sair", frame)

    tecla = cv2.waitKey(1) & 0xFF
    if tecla == 27:  # ESC
        break
    elif chr(tecla) in CORES:
        cor_atual = CORES[chr(tecla)]
        modo_borracha = False
    elif tecla in (ord("e"), ord("E")):
        modo_borracha = not modo_borracha
    elif tecla in (ord("c"), ord("C")):
        canvas = np.zeros((h, w, 3), dtype=np.uint8)
    elif tecla in (ord("s"), ord("S")):
        nome_arquivo = f"ar_paint_{int(time.time())}.png"
        cv2.imwrite(nome_arquivo, canvas)
        print(f"Desenho salvo como {nome_arquivo}")

cap.release()
cv2.destroyAllWindows()
