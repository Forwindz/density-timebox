import parse from "csv-parse/lib/sync";
import axios from "axios";
const exampleDataURL = [
  require("../data/stocks.filtered.csv").default,
  require("../data/airline.filtered.csv").default,
  require("../data/weather.filtered.csv").default,
  require("../data/reading.filtered.csv").default,
];

/**
 * Generate test time series with a random walk.
 * @param numSeries Number of series.
 * @param numDataPoints Number of data points per series.
 */
export async function generateData(idx): Promise<Array<string>> {
  let result = await axios.get(exampleDataURL[idx - 1]);
  let data = parse(result.data, {
    skip_empty_lines: true,
  });

  return data;
}

export async function readData(file: File): Promise<Array<string>> {
  return new Promise((res) => {
    let reader = new FileReader();
    reader.onload = () => {
      res(
        parse(reader.result as string, {
          skip_empty_lines: true,
        })
      );
    };
    reader.readAsText(file);
  });
}
