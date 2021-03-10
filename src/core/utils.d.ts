import ndarray from "ndarray";
export declare function range(n: number): Float32Array;
export declare function rangeDup(n: number, multi?: number): Float32Array;
export declare function duplicate(arr: ndarray, multi?: number): any;
export declare function makePair(arr: ndarray, multi?: number): any;
/**
 * Convert integer to float for shaders.
 */
export declare function float(i: number): string | number;
export declare function exportCanvas(canvas: HTMLCanvasElement[], upsideDown: boolean, opacityConfig: null | []): void;
export declare function slope(array: any, min: any, max: any): any;
