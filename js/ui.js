// js/ui.js
import {toImageBitmapFromFile, drawImageToCanvas} from './utils.js';
import {initDetector} from './detector.js';

export function wireUI(handlers){
  // handlers: callbacks for events from main
  const sourceInput = document.getElementById('sourceInput');
  const targetInput = document.getElementById('targetInput');
  const dropSource = document.getElementById('dropSource');
  const dropTarget = document.getElementById('dropTarget');
  const sourcePreview = document.getElementById('sourcePreview');
  const targetPreview = document.getElementById('targetPreview');
  const swapBtn = document.getElementById('swapBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  const statusBar = document.getElementById('statusBar');

  // files
  sourceInput.addEventListener('change', async e=>{
    const f=e.target.files[0]; if(!f) return; const bmp=await toImageBitmapFromFile(f); drawImageToCanvas(bmp, sourcePreview); handlers.onSourceLoaded && handlers.onSourceLoaded(sourcePreview);
  });
  targetInput.addEventListener('change', async e=>{
    const f=e.target.files[0]; if(!f) return; const bmp=await toImageBitmapFromFile(f); drawImageToCanvas(bmp, targetPreview); handlers.onTargetLoaded && handlers.onTargetLoaded(targetPreview);
  });

  // drag & drop
  function wireDrop(el, cb){
    el.addEventListener('dragover', e=>{ e.preventDefault(); el.classList.add('drag'); });
    el.addEventListener('dragleave', e=>{ el.classList.remove('drag'); });
    el.addEventListener('drop', async (e)=>{ e.preventDefault(); el.classList.remove('drag'); const f=e.dataTransfer.files[0]; if(f){ const bmp=await toImageBitmapFromFile(f); cb(bmp); }});
  }
  wireDrop(dropSource, bmp=>{ drawImageToCanvas(bmp, sourcePreview); handlers.onSourceLoaded && handlers.onSourceLoaded(sourcePreview); });
  wireDrop(dropTarget, bmp=>{ drawImageToCanvas(bmp, targetPreview); handlers.onTargetLoaded && handlers.onTargetLoaded(targetPreview); });

  // paste
  window.addEventListener('paste', async (e)=>{
    const items = e.clipboardData.items;
    for(const it of items){ if(it.type.indexOf('image')!==-1){ const f=it.getAsFile(); const bmp=await toImageBitmapFromFile(f); // decide target based on focus
        // simple heuristic: if source empty put to source else to target
        const ctx = document.getElementById('sourcePreview').getContext('2d'); if(ctx.canvas.width===0) { drawImageToCanvas(bmp, sourcePreview); handlers.onSourceLoaded && handlers.onSourceLoaded(sourcePreview);} else { drawImageToCanvas(bmp, targetPreview); handlers.onTargetLoaded && handlers.onTargetLoaded(targetPreview);} }
    }
  });

  // actions
  swapBtn.addEventListener('click', ()=> handlers.onSwap && handlers.onSwap());
  downloadBtn.addEventListener('click', ()=> handlers.onDownload && handlers.onDownload());
  undoBtn.addEventListener('click', ()=> handlers.onUndo && handlers.onUndo());
  redoBtn.addEventListener('click', ()=> handlers.onRedo && handlers.onRedo());

  // status helper
  return {setStatus: (t)=>{statusBar.textContent=t;}};
}
