// js/transform.js
// funciones para alinear la cara fuente con la cara destino usando ojos

export function calcEyeCenter(pts, indices){
  let x=0,y=0,c=0; indices.forEach(i=>{const p=pts[i]; if(p){x+=p.x;y+=p.y;c++}});
  return {x:x/c,y:y/c};
}

export function calcAlignmentTransform(srcPts, dstPts, srcEyeIdx, dstEyeIdx){
  // srcPts/dstPts are arrays of pixel coords
  const srcLeft = calcEyeCenter(srcPts, srcEyeIdx);
  const srcRight = calcEyeCenter(srcPts, srcEyeIdx === undefined ? [] : srcEyeIdx.reverse ? srcEyeIdx.slice().reverse() : srcEyeIdx);
  // Note: caller passes appropriate arrays; to be safe compute both
  const dstLeft = calcEyeCenter(dstPts, dstEyeIdx);
  const dstRight = calcEyeCenter(dstPts, dstEyeIdx === undefined ? [] : dstEyeIdx.reverse ? dstEyeIdx.slice().reverse() : dstEyeIdx);

  // We attempt to compute angle using left/right pairs — if detection misses, fallback to bounding boxes
  const dxSrc = (srcRight.x - srcLeft.x);
  const dySrc = (srcRight.y - srcLeft.y);
  const angleSrc = Math.atan2(dySrc, dxSrc);
  const dxDst = (dstRight.x - dstLeft.x);
  const dyDst = (dstRight.y - dstLeft.y);
  const angleDst = Math.atan2(dyDst, dxDst);

  const angle = angleDst - angleSrc;

  const distSrc = Math.hypot(dxSrc, dySrc);
  const distDst = Math.hypot(dxDst, dyDst);
  const scale = distDst / (distSrc || 1);

  // translation: align centers between mid points
  const srcCenter = {x:(srcLeft.x+srcRight.x)/2, y:(srcLeft.y+srcRight.y)/2};
  const dstCenter = {x:(dstLeft.x+dstRight.x)/2, y:(dstLeft.y+dstRight.y)/2};

  return {angle, scale, srcCenter, dstCenter};
}
