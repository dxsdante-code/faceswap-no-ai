// app.js - versión mejorada con controles de escala/rotación y descarga
const sourceInput = document.getElementById("sourceInput");
const targetInput = document.getElementById("targetInput");
const swapBtn = document.getElementById("swapBtn");
const resetBtn = document.getElementById("resetBtn");
const downloadBtn = document.getElementById("downloadBtn");
const sourceCanvas = document.getElementById("sourceCanvas");
const targetCanvas = document.getElementById("targetCanvas");
const resultCanvas = document.getElementById("resultCanvas");
const statusEl = document.getElementById("status");
const scaleRange = document.getElementById("scaleRange");
const rotateRange = document.getElementById("rotateRange");

let sourceImg = null;
let targetImg = null;
let isOpenCvReady = false;
let faceCascade = null;

function setStatus(text) {
  statusEl.textContent = text;
}

function onOpenCvReady() {
  if (typeof cv === "undefined") {
    alert("OpenCV no se cargó correctamente.");
    return;
  }
  setStatus("Cargando cascada Haar... (puede tardar unos segundos)");

  // Cargar el archivo XML de cascada de forma robusta: traerlo y colocarlo en el sistema de archivos de OpenCV.js
  const classifierUrl =
    "https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml";

  fetch(classifierUrl)
    .then((res) => res.arrayBuffer())
    .then((buf) => {
      const data = new Uint8Array(buf);
      // Escribir el archivo dentro del FS virtual
      cv.FS_createDataFile("/", "haarcascade_frontalface_default.xml", data, true, false, false);
      faceCascade = new cv.CascadeClassifier();
      faceCascade.load("haarcascade_frontalface_default.xml");
      isOpenCvReady = true;
      setStatus("OpenCV listo.");
      console.log("OpenCV listo y cascada cargada.");
    })
    .catch((err) => {
      console.error(err);
      setStatus("Error cargando la cascada. Revisa la consola.");
    });
}

function readImageToCanvas(file, canvas) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve(img);
      };
      img.src = event.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

sourceInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  sourceImg = await readImageToCanvas(file, sourceCanvas);
  setStatus("Imagen fuente cargada. Ajusta escala/rotación si es necesario.");
});

targetInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  targetImg = await readImageToCanvas(file, targetCanvas);
  setStatus("Imagen destino cargada.");
});

function getLargestFaceRectFromMat(mat) {
  const gray = new cv.Mat();
  cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY, 0);
  const faces = new cv.RectVector();
  const msize = new cv.Size(0, 0);
  faceCascade.detectMultiScale(gray, faces, 1.1, 5, 0, new cv.Size(30, 30), new cv.Size(1000, 1000));

  let best = null;
  for (let i = 0; i < faces.size(); i++) {
    const r = faces.get(i);
    const area = r.width * r.height;
    if (!best || area > best.area) best = { rect: r, area };
  }

  gray.delete();
  faces.delete();

  return best ? best.rect : null;
}

function drawTransformedSourceToOffscreen(scale, rotateDeg) {
  // Dibuja la imagen fuente en un canvas offscreen aplicando escala y rotación
  const off = document.createElement("canvas");
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  off.width = Math.ceil(w * scale);
  off.height = Math.ceil(h * scale);
  const ctx = off.getContext("2d");
  ctx.clearRect(0, 0, off.width, off.height);
  ctx.save();
  ctx.translate(off.width / 2, off.height / 2);
  ctx.rotate((rotateDeg * Math.PI) / 180);
  ctx.drawImage(sourceCanvas, - (w * scale) / 2, - (h * scale) / 2, w * scale, h * scale);
  ctx.restore();
  return off;
}

swapBtn.addEventListener("click", () => {
  if (!isOpenCvReady) {
    alert("OpenCV aún no está listo. Espera unos segundos.");
    return;
  }

  if (!sourceImg || !targetImg) {
    alert("Sube la imagen fuente y la destino antes de aplicar FaceSwap.");
    return;
  }

  setStatus("Procesando FaceSwap...");

  try {
    // Leer canvas destino
    const dstMat = cv.imread(targetCanvas);

    // Preparar fuente transformada en un canvas y luego en Mat
    const scale = parseFloat(scaleRange.value);
    const rotate = parseFloat(rotateRange.value);
    const off = drawTransformedSourceToOffscreen(scale, rotate);

    // Convertir a Mat
    const srcMat = cv.imread(off);

    // detectar caras
    const srcFaceRect = getLargestFaceRectFromMat(srcMat);
    const targetFaceRect = getLargestFaceRectFromMat(dstMat);

    if (!srcFaceRect || !targetFaceRect) {
      alert("No se detectaron caras en alguna de las imágenes. Intenta con otras fotos o ajusta la escala/rotación.");
      srcMat.delete();
      dstMat.delete();
      setStatus("No se detectaron caras.");
      return;
    }

    // Extraer cara fuente y redimensionar al tamaño de la cara destino
    const srcFace = srcMat.roi(srcFaceRect);
    const resizedFace = new cv.Mat();
    cv.resize(srcFace, resizedFace, new cv.Size(targetFaceRect.width, targetFaceRect.height), 0, 0, cv.INTER_LINEAR);

    // Crear máscara (rectangular simple) - se puede mejorar con detección de ojos/boca para máscara más precisa
    const mask = new cv.Mat.zeros(targetFaceRect.height, targetFaceRect.width, cv.CV_8UC1);
    const maskColor = new cv.Scalar(255);
    const centerPt = new cv.Point(Math.floor(targetFaceRect.width / 2), Math.floor(targetFaceRect.height / 2));
    // usar ellipse para máscara más natural
    cv.ellipse(mask, centerPt, new cv.Size(Math.floor(targetFaceRect.width / 2.2), Math.floor(targetFaceRect.height / 2.6)), 0, 0, 360, maskColor, -1);

    // clonación sin costuras
    const blended = new cv.Mat();
    const center = new cv.Point(targetFaceRect.x + Math.floor(targetFaceRect.width / 2), targetFaceRect.y + Math.floor(targetFaceRect.height / 2));

    cv.seamlessClone(resizedFace, dstMat, mask, center, blended, cv.NORMAL_CLONE);

    cv.imshow(resultCanvas, blended);
    setStatus("Hecho. Ajusta y descarga si lo deseas.");

    // Liberar memoria
    srcMat.delete();
    dstMat.delete();
    srcFace.delete();
    resizedFace.delete();
    mask.delete();
    blended.delete();
  } catch (err) {
    console.error(err);
    alert("Error procesando FaceSwap. Revisa la consola para más detalles.");
    setStatus("Error. Mira la consola.");
  }
});

resetBtn.addEventListener("click", () => {
  sourceInput.value = "";
  targetInput.value = "";
  sourceImg = null;
  targetImg = null;

  const ctxSource = sourceCanvas.getContext("2d");
  const ctxTarget = targetCanvas.getContext("2d");
  const ctxResult = resultCanvas.getContext("2d");

  ctxSource.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
  ctxTarget.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  ctxResult.clearRect(0, 0, resultCanvas.width, resultCanvas.height);

  sourceCanvas.width = 0;
  targetCanvas.width = 0;
  resultCanvas.width = 0;
  setStatus("Reset completado.");
});

downloadBtn.addEventListener("click", () => {
  if (!resultCanvas || resultCanvas.width === 0) {
    alert("No hay resultado para descargar.");
    return;
  }
  const link = document.createElement("a");
  link.download = "faceswap-result.png";
  link.href = resultCanvas.toDataURL("image/png");
  link.click();
});

// mostrar valores de controles en tiempo real (opcional: añadir preview dinamico)
scaleRange.addEventListener("input", () => {
  // podría implementarse un preview de transformada (dejar para versiones siguientes)
});
rotateRange.addEventListener("input", () => {});
