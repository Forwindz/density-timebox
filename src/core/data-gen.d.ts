/**
 * Generate test time series with a random walk.
 * @param numSeries Number of series.
 * @param numDataPoints Number of data points per series.
 */
export declare function generateData(idx: any): Promise<Array<string>>;
export declare function readData(file: File): Promise<Array<string>>;
