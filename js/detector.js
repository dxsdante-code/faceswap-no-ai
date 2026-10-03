// js/detector.js
// YuNet detector wrapper for OpenCV.js
// Exposes: inicializarDetector, detectarCaras, obtenerCaraPrincipal, obtenerTodasLasCaras

export let yunet = null;
export let isReady = false;

// Helper to write model to OpenCV FS
async function _fetchAndWriteModel(modelPath){
  const parts = modelPath.split('/');
  const name = parts[parts.length-1];
  // if already exists in FS, skip
  try{
    cv.FS_stat(name);
    return name;
  }catch(e){
    // fetch and write
  }
  const res = await fetch(modelPath);
  if(!res.ok) throw new Error('No se pudo descargar el modelo YuNet desde: '+modelPath);
  const buf = await res.arrayBuffer();
  const data = new Uint8Array(buf);
  cv.FS_createDataFile('/', name, data, true, false, false);
  return name;
}

export async function inicializarDetector(options = {}){
  // options: {modelPath, inputSize:[320,320], scoreThreshold, nmsThreshold, topK}
  if(typeof cv === 'undefined') throw new Error('OpenCV.js no está cargado.');
  if(isReady) return yunet;

  const modelPath = options.modelPath || '/models/face_detection_yunet_2023mar.onnx';
  const inputSize = options.inputSize || [320,320];
  const scoreThreshold = options.scoreThreshold || 0.9;
  const nmsThreshold = options.nmsThreshold || 0.3;
  const topK = options.topK || 5000;

  try{
    // fetch model into virtual FS
    const modelName = await _fetchAndWriteModel(modelPath);

    // FaceDetectorYN API may differ between OpenCV.js builds. Try common constructors.
    try{
      // Preferred: cv.FaceDetectorYN (constructor-like)
      if(cv.FaceDetectorYN){
        yunet = new cv.FaceDetectorYN(modelName, '', new cv.Size(inputSize[0], inputSize[1]), scoreThreshold, nmsThreshold, topK);
      } else if(cv.FaceDetectorYN_create){
        yunet = cv.FaceDetectorYN_create(modelName, '', new cv.Size(inputSize[0], inputSize[1]), scoreThreshold, nmsThreshold, topK);
      } else {
        throw new Error('La API FaceDetectorYN no está disponible en esta compilación de OpenCV.js');
      }
    }catch(err){
      // Re-throw with more context
      throw new Error('Error creando FaceDetectorYN: '+err.message);
    }

    isReady = true;
    return yunet;
  }catch(e){
    console.error('inicializarDetector error', e);
    throw e;
  }
}

// detectarCaras: recibe un HTMLCanvasElement o ImageData
export function detectarCaras(srcCanvas){
  if(!isReady || !yunet) throw new Error('Detector no inicializado. Llama a inicializarDetector() primero.');
  if(!srcCanvas) throw new Error('Canvas fuente no proporcionado');

  const src = cv.imread(srcCanvas);
  const faces = new cv.Mat();
  const results = [];
  try{
    // detect
    // API: yunet.detect(srcMat, facesMat)
    yunet.detect(src, faces);

    // faces: Nx(5 + 10) floats? Format: [x,y,w,h,score, ...landmarks...] per row
    // landmarks are 5 points (x,y) => 10 values (eyes, nose, mouth corners) — depends on model build
    for(let i=0;i<faces.rows;i++){
      const x = faces.floatAt(i,0);
      const y = faces.floatAt(i,1);
      const w = faces.floatAt(i,2);
      const h = faces.floatAt(i,3);
      const score = faces.floatAt(i,4);
      const landmarks = [];
      // remaining columns: start at 5
      const cols = faces.cols;
      for(let j=5;j<cols;j+=2){
        const lx = faces.floatAt(i,j);
        const ly = faces.floatAt(i,j+1);
        if(typeof lx === 'number' && typeof ly === 'number' && !Number.isNaN(lx) && !Number.isNaN(ly)){
          landmarks.push({x:lx, y:ly});
        }
      }

      results.push({bbox:{x:Math.round(x), y:Math.round(y), width:Math.round(w), height:Math.round(h)}, score:score, landmarks});
    }

    // sort by score desc
    results.sort((a,b)=>b.score - a.score);
    return results;
  }finally{
    // liberar mats
    src.delete();
    faces.delete();
  }
}

export function obtenerCaraPrincipal(srcCanvas){
  const all = detectarCaras(srcCanvas);
  if(all.length===0) return null;
  return all[0];
}

export function obtenerTodasLasCaras(srcCanvas){
  return detectarCaras(srcCanvas);
}

// debug helper
export function debugInfo(caras){
  if(!caras) return '0';
  return caras.map((c,i)=>`#${i+1} score=${c.score.toFixed(3)} bbox=${c.bbox.x},${c.bbox.y},${c.bbox.width}x${c.bbox.height}`).join('\n');
}
