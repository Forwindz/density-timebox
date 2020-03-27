import ndarray from "ndarray";
import tile from "ndarray-tile";
import unpack from "ndarray-unpack";
import pack from "ndarray-pack";

export function range(n: number) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = i;
  }
  return out;
}

export function rangeDup(n: number, multi: number = 4) {
  const out = new Float32Array(n * multi);
  for (let i = 0; i < n * multi; i++) {
    out[i] = Math.floor(i / multi);
  }
  return out;
}

export function duplicate(arr: ndarray, multi: number = 4) {
  let out = tile(arr, [1, multi]) as ndarray;
  out = ndarray(out.data);
  return out;
}

export function makePair(arr: ndarray, multi: number = 2) {
  if (arr.size <= 1) return [];
  const offset = Math.floor(multi / 2);
  let out = arr;
  out = tile(out, [1, multi]) as ndarray;
  out = out.transpose(1, 0);
  const tmpOut = unpack(out) as number[][];
  for (let i = 0; i < offset; i++) {
    tmpOut[0].pop();
    tmpOut[1].shift();
  }
  out = pack(tmpOut);
  out = out.transpose(1, 0);
  out = tile(out, [1, 1, 2]) as ndarray;
  out = out.transpose(0, 2, 1);
  out = unpack(out).reduce((p, v) => [...p, ...v], []);
  return out;
}

/**
 * Convert integer to float for shaders.
 */
export function float(i: number) {
  if (i - Math.floor(i) > 0) {
    return i;
  }
  return `${Math.floor(i)}.0`;
}
