// js/landmarks.js
// Funciones para procesar landmarks de MediaPipe y calcular puntos útiles

// Índices comunes en MediaPipe Face Mesh para ojos, cara y boca (usados para media y hull)
export const FACE_OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
export const LEFT_EYE = [33,7,163,144,145,153,154,155,133];
export const RIGHT_EYE = [362,382,381,380,374,373,390,249,263];
export const MOUTH = [78,95,88,178,87,14,317,402,318,324];

export function landmarksToPoints(landmarks){
  // landmarks: array of {x,y,z} normalized (0..1) — convert to pixel coordinates later
  return landmarks.map(p=>({x:p.x, y:p.y, z:p.z}));
}

export function landmarksToPixelCoords(landmarks, width, height){
  return landmarks.map(p=>({x:Math.round(p.x*width), y:Math.round(p.y*height), z:p.z}));
}

// obtiene centro promedio de un grupo de índices
export function centerOf(pts, indices){
  let x=0,y=0,c=0;
  indices.forEach(i=>{const p=pts[i]; if(p){x+=p.x;y+=p.y;c++}});
  return {x:x/c, y:y/c};
}
