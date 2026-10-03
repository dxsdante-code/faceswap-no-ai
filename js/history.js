// js/history.js
const stack = [];
let idx = -1;

export function pushState(dataURL){
  // truncate redo
  stack.splice(idx+1);
  stack.push(dataURL);
  idx = stack.length-1;
}

export function canUndo(){return idx>0}
export function canRedo(){return idx<stack.length-1}
export function undo(){ if(canUndo()) idx--; return stack[idx]; }
export function redo(){ if(canRedo()) idx++; return stack[idx]; }
export function current(){ return stack[idx]; }
