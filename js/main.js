// js/main.js
import {initDetector} from './detector.js';
import {wireUI} from './ui.js';
import {detectFromCanvas} from './detector.js';
import {createFaceMaskFromLandmarks, applySwap} from './swapper.js';
import * as history from './history.js';

// expose onOpenCvReady for script tag
window.onOpenCvReady = function(){
  console.log('OpenCV.js cargado');
  window._opencvReady = true;
};

(async function(){
  // initialize detector
  const status = document.getElementById('statusBar');
  const faceMesh = await initDetector((results)=>{ window._lastDetection = results; });
  console.log('Detector listo');

  const ui = wireUI({
    onSourceLoaded: (canvas)=>{ status.textContent='Fuente cargada'; },
    onTargetLoaded: (canvas)=>{ status.textContent='Destino cargado'; },
    onSwap: async ()=>{
      try{
        status.textContent='Detectando rostros...';
        const srcCanvas = document.getElementById('sourcePreview');
        const dstCanvas = document.getElementById('targetPreview');
        // run faceMesh on both canvases
        await faceMesh.send({image: srcCanvas});
        const srcRes = window._lastDetection && window._lastDetection.multiFaceLandmarks && window._lastDetection.multiFaceLandmarks[0];
        await faceMesh.send({image: dstCanvas});
        const dstRes = window._lastDetection && window._lastDetection.multiFaceLandmarks && window._lastDetection.multiFaceLandmarks[0];
        if(!srcRes || !dstRes){ alert('No se detectaron rostros en una de las imágenes'); status.textContent='Detección fallida'; return; }
        status.textContent='Alineando y procesando...';
        // apply swap for first face
        const options = {feather: parseInt(document.getElementById('featherRange').value,10), blend: parseFloat(document.getElementById('blendRange').value), autoAlign: document.getElementById('autoAlign').checked};

        // run swap
        const outMat = applySwap(srcCanvas, dstCanvas, srcRes, dstRes, options);
        if(outMat){ cv.imshow('resultCanvas', outMat); // push history
          const dataUrl = document.getElementById('resultCanvas').toDataURL('image/png');
          history.pushState(dataUrl);
          outMat.delete(); status.textContent='Listo'; }
      }catch(e){ console.error(e); alert('Error durante el FaceSwap: '+e.message); status.textContent='Error'; }
    },
    onDownload: ()=>{
      const fmt = document.getElementById('exportFormat').value; const quality = 0.92;
      const canvas = document.getElementById('resultCanvas'); if(!canvas || canvas.width===0){ alert('No hay resultado para descargar'); return; }
      const mime = fmt==='png'?'image/png':(fmt==='jpeg'?'image/jpeg':'image/webp');
      const link = document.createElement('a'); link.href = canvas.toDataURL(mime, quality); link.download = 'faceswap.'+(fmt==='jpeg'?'jpg':fmt);
      link.click();
    },
    onUndo: ()=>{ if(history.canUndo()){ const url = history.undo(); const img = new Image(); img.onload=()=>{ const c=document.getElementById('resultCanvas'); c.width=img.width; c.height=img.height; c.getContext('2d').drawImage(img,0,0); }; img.src=url; } },
    onRedo: ()=>{ if(history.canRedo()){ const url = history.redo(); const img = new Image(); img.onload=()=>{ const c=document.getElementById('resultCanvas'); c.width=img.width; c.height=img.height; c.getContext('2d').drawImage(img,0,0); }; img.src=url; } }
  });

})();
