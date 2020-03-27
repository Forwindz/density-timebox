import parse from "csv-parse/lib/sync";
import axios from "axios";
const exampleDataURL = require("../data/stocks_after_2006.filtered.csv").default;

/**
 * Generate test time series with a random walk.
 * @param numSeries Number of series.
 * @param numDataPoints Number of data points per series.
 */
export async function generateData(): Promise<Array<string>> {
  let result = await axios.get(exampleDataURL);
  let data = parse(result.data, {
    skip_empty_lines: true
  });

  return data;
}

export async function readData(file: File): Promise<Array<string>> {
  return new Promise(res => {
    let reader = new FileReader();
    reader.onload = () => {
      res(
        parse(reader.result as string, {
          skip_empty_lines: true
        })
      );
    };
    reader.readAsText(file);
  });
}
