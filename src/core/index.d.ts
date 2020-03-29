export interface LineData {
    /**
     * array of x-values
     */
    xValues: Float32Array;
    /**
     * array of y-values
     */
    yValues: Float32Array;
}
export interface BinConfig {
    /**
     * The start of the range.
     */
    start: number;
    /**
     * The end of the range.
     */
    stop: number;
    /**
     * The size of bin steps.
     */
    step: number;
}
export interface Result {
    /**
     * Start of the time bin.
     */
    x: number;
    /**
     * Start fo teh value bin.
     */
    y: number;
    /**
     * Computed density.
     */
    value: number;
}
export interface scaleOption {
    /**
     * the ratio of original width to current width
     */
    xRatio: number;
    /**
     * the ratio of original height to current height
     */
    yRatio: number;
    /**
     * the x-offset of the present window
     */
    xOffset: number;
    /**
     * the y-offset of the present window
     */
    yOffset: number;
}
/**
 * Compute a density heatmap.
 * @param data The time series data as an ndarray.
 * @param attribute The attribute of data : [minX, maxX, minY, maxY]
 * @param binX Configuration for the binning along the time dimension.
 * @param binY Configuration for the binning along the value dimension.
 * @param canvas The canvas for the webgl context and for debug output.
 * @param gaussianKernel
 * @param lineWidth
 * @param tangentExtent
 * @param normalExtent
 * @param doNormalize
 * @param scaleOption
 */
export default function (data: Array<LineData>, attribute: number[], binX: BinConfig, binY: BinConfig, canvas?: HTMLCanvasElement, gaussianKernel?: number[][], lineWidth?: number, tangentExtent?: number, normalExtent?: number, doNormalize?: number, scaleOption?: scaleOption): Promise<{
    filterAngle: (startTime: any, endTime: any, startAngle: any, endAngle: any) => Float32Array;
    filterRange: (startTime: any, endTime: any, startValue: any, endValue: any) => Float32Array;
    findKTop: (isHighest: any) => any[];
    rerender: (indexes: any) => void;
    destroy: () => void;
    maxX: number;
    maxY: number;
    maxDensity: number;
}>;
