// js/detector.js
// Inicializa MediaPipe FaceMesh y exporta una función detect(imgBitmap)

let faceMesh = null;
let ready = false;

export async function initDetector(onResults){
  if(faceMesh) return faceMesh;
  faceMesh = new window.FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
  });

  faceMesh.setOptions({
    maxNumFaces: 4,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  faceMesh.onResults((results) => {
    if(onResults) onResults(results);
  });

  ready = true;
  return faceMesh;
}

export function isDetectorReady(){return ready;}

// detect from an HTMLCanvas or ImageBitmap
export async function detectFromCanvas(canvas){
  if(!faceMesh) throw new Error('Detector no inicializado');
  await faceMesh.send({image: canvas});
  // results will be available through the onResults callback passed to initDetector
}
