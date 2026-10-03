// js/swapper.js
// Principal flujo: crear máscara desde landmarks, alinear, color-match y seamlessClone
import {FACE_OVAL, landmarksToPixelCoords} from './landmarks.js';
import {calcAlignmentTransform} from './transform.js';
import {matchColorlab} from './colorMatch.js';

// crea máscara usando convexHull sobre puntos seleccionados
export function createFaceMaskFromLandmarks(landmarks, width, height, feather){
  // landmarks: array normalized
  const pts = landmarksToPixelCoords(landmarks, width, height);
  // seleccionar puntos para máscara (usar FACE_OVAL y algunos frontales)
  const facePts = [];
  FACE_OVAL.forEach(i=>{ if(pts[i]) facePts.push({x:pts[i].x,y:pts[i].y}); });

  // if too few points, fallback to full convex hull of all points
  if(facePts.length < 8){
    pts.forEach(p=>facePts.push({x:p.x,y:p.y}));
  }

  // convertir a Mat de puntos para convexHull
  const mat = cv.matFromArray(facePts.length,1,cv.CV_32SC2, facePts.flatMap(p=>[p.x,p.y]));
  const hull = new cv.Mat();
  cv.convexHull(mat, hull, false, true);

  const mask = new cv.Mat.zeros(height, width, cv.CV_8UC1);
  // hull es Nx1x2
  const hullPts = [];
  for(let i=0;i<hull.rows;i++){
    hullPts.push(new cv.Point(hull.intAt(i,0), hull.intAt(i,1)));
  }
  const contours = new cv.MatVector();
  const cnt = cv.matFromArray(hullPts.length,1,cv.CV_32SC2, hullPts.flatMap(p=>[p.x,p.y]));
  contours.push_back(cnt);
  cv.fillPoly(mask, contours, new cv.Scalar(255));

  // feather: gaussian blur the mask
  if(feather>0){
    const k = Math.max(1, Math.floor(feather/2)*2+1);
    cv.GaussianBlur(mask, mask, new cv.Size(k,k), 0);
  }

  // cleanup
  mat.delete(); hull.delete(); contours.delete(); cnt.delete();

  return mask;
}

export function applySwap(srcCanvas, dstCanvas, srcLandmarks, dstLandmarks, options){
  // options: {feather, blend, autoAlign}
  const width = dstCanvas.width;
  const height = dstCanvas.height;

  const srcMat = cv.imread(srcCanvas);
  const dstMat = cv.imread(dstCanvas);
  try{
    // landmark pixel coords
    const srcPts = srcLandmarks.map(p=>({x:Math.round(p.x*srcCanvas.width), y:Math.round(p.y*srcCanvas.height)}));
    const dstPts = dstLandmarks.map(p=>({x:Math.round(p.x*dstCanvas.width), y:Math.round(p.y*dstCanvas.height)}));

    // alignment (compute angle/scale and apply to source onto a temp canvas)
    let transformed = srcMat;
    if(options.autoAlign){
      // compute transform using eye indices hard-coded from landmarks.js sets
      const {angle, scale, srcCenter, dstCenter} = calcAlignmentTransform(srcPts, dstPts, [33,133,160,159,158,157,153], [362,263,387,386,385,384,398]);
      // create rotation+scale matrix and warp
      const M = cv.getRotationMatrix2D(new cv.Point(srcCenter.x, srcCenter.y), angle*180/Math.PI, scale);
      const warped = new cv.Mat();
      const dsize = new cv.Size(dstMat.cols, dstMat.rows);
      cv.warpAffine(srcMat, warped, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
      transformed = warped;
      M.delete();
    }

    // create mask from dst landmarks (to place source onto dst)
    const mask = createFaceMaskFromLandmarks(dstLandmarks, dstCanvas.width, dstCanvas.height, options.feather||12);

    // color match: cut source region corresponding to mask bounding box
    const bbox = cv.boundingRect(mask);
    const srcRoi = transformed.roi(new cv.Rect(bbox.x, bbox.y, bbox.width, bbox.height));
    const dstRoi = dstMat.roi(new cv.Rect(bbox.x, bbox.y, bbox.width, bbox.height));
    const colorMatched = matchColorlab(srcRoi, dstRoi);

    // put colorMatched back into transformed
    colorMatched.copyTo(transformed.roi(new cv.Rect(bbox.x,bbox.y,bbox.width,bbox.height)));

    // seamlessClone
    const center = new cv.Point(bbox.x + Math.floor(bbox.width/2), bbox.y + Math.floor(bbox.height/2));
    const output = new cv.Mat();
    cv.seamlessClone(transformed, dstMat, mask, center, output, cv.NORMAL_CLONE);

    // blend strength
    if(options.blend !== undefined && options.blend < 1){
      const blended = new cv.Mat();
      cv.addWeighted(output, options.blend, dstMat, 1-options.blend, 0, blended);
      output.delete();
      transformed.delete();
      mask.delete();
      srcMat.delete();
      dstMat.delete();
      return blended;
    }

    transformed.delete(); mask.delete(); srcMat.delete(); dstMat.delete();
    return output;
  }finally{
    // note: caller must delete returned Mat
  }
}
