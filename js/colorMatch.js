// js/colorMatch.js
// Simple color correction using LAB mean/std matching to better blend skin tones

export function matchColorlab(srcMat, dstMat){
  // srcMat and dstMat are cv.Mat in CV_8UC4 (RGBA)
  try{
    const srcLab = new cv.Mat();
    const dstLab = new cv.Mat();
    cv.cvtColor(srcMat, srcLab, cv.COLOR_RGBA2Lab);
    cv.cvtColor(dstMat, dstLab, cv.COLOR_RGBA2Lab);

    const srcChannels = new cv.MatVector();
    const dstChannels = new cv.MatVector();
    cv.split(srcLab, srcChannels);
    cv.split(dstLab, dstChannels);

    // compute mean and std
    const srcStats = [];
    const dstStats = [];
    for(let i=0;i<3;i++){
      const meanStdSrc = cv.meanStdDev(srcChannels.get(i));
      const meanStdDst = cv.meanStdDev(dstChannels.get(i));
      srcStats.push({mean:meanStdSrc[0].doubleAt(0,0), std:meanStdSrc[1].doubleAt(0,0)});
      dstStats.push({mean:meanStdDst[0].doubleAt(0,0), std:meanStdDst[1].doubleAt(0,0)});
    }

    // apply channel-wise: (src - mean_src) * (std_dst/std_src) + mean_dst
    const resChannels = new cv.MatVector();
    for(let i=0;i<3;i++){
      const ch = srcChannels.get(i);
      if(srcStats[i].std < 1) srcStats[i].std = 1;
      const alpha = dstStats[i].std / srcStats[i].std;
      const beta = dstStats[i].mean - alpha*srcStats[i].mean;
      const out = new cv.Mat();
      ch.convertTo(out, ch.type(), alpha, beta);
      resChannels.push_back(out);
    }

    const outLab = new cv.Mat();
    cv.merge(resChannels, outLab);
    const outRGBA = new cv.Mat();
    cv.cvtColor(outLab, outRGBA, cv.COLOR_Lab2RGBA);

    // cleanup
    srcLab.delete(); dstLab.delete(); srcChannels.delete(); dstChannels.delete(); resChannels.delete(); outLab.delete();

    return outRGBA;
  }catch(e){ console.error('color match error',e); return srcMat.clone(); }
}
