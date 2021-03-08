// import "../styles/index.scss";
import polyLine from "simplify-polyline";
import { VolKDTree, VolRTree, distToSegment } from "./util.js";

// if (process.env.NODE_ENV === "development") {
//   require("../index.html");
// }

class KDLine {
  /**
   * @type {{x: number, y: number}[][]}
   */
  #data = null;
  #precision = 1;
  #tree = null;

  /**
   *
   * @param {{x: number, y: number}[][]} data
   */
  constructor(data) {
    if (
      !(data instanceof Array) ||
      data.findIndex(
        (d) =>
          !(d instanceof Array) ||
          d.findIndex(
            (d) => typeof d.x !== "number" || typeof d.y !== "number"
          ) >= 0
      ) >= 0
    )
      throw new Error(
        "Constructor paramerter should be (data: {x: number, y: number}[][])"
      );
    this.#data = data;
  }

  set precision(precision) {
    if (
      typeof precision !== "number" ||
      isNaN(precision) ||
      !isFinite(precision) ||
      precision <= 0
    )
      return;
    this.#precision = precision;
  }

  get precision() {
    return this.#precision;
  }

  get tree() {
    return this.#tree;
  }

  buildKDTree() {
    console.time("resegment line");
    // const endPoints = this.#data.map((x) =>
    //   polyLine.simplify(x, this.#precision)
    // );
    const simplifiedLines = this.#data.flatMap(
      (data, i) =>
        data.reduce((p, v, ci) => {
          if (ci === 0) {
            return {
              list: [],
              previous: v,
            };
          }
          const xMin = p.previous.x;
          const yMin = p.previous.y;
          const xMax = v.x;
          const yMax = v.y;
          const slope = (yMax - yMin) / (xMax - xMin);
          p.list.push([xMin, xMax, yMin, yMax, slope, i]);
          p.previous = v;
          return p;
        }, null).list
    );
    console.timeEnd("resegment line");
    console.time("build KD-Tree");
    this.#tree = new VolRTree(simplifiedLines);
    console.timeEnd("build KD-Tree");
  }

  /**
   *
   * @param {HTMLCanvasElement} canvas canvas element on DOM
   * @param {[[number, number],[number, number]]} domain [[xStart, xEnd], [yStart, yEnd]]
   * @param {[[number, number],[number, number]]} range [[xStart, xEnd], [yStart, yEnd]]
   * @param {number[][]} kernel Gaussian or something
   */
  render(canvas, domain, range, kernel) {
    //#region Type check
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("`canvas` should be HTMLCanvasElement");
    }
    if (
      !(domain instanceof Array) ||
      domain.length !== 2 ||
      domain.findIndex(
        (x) =>
          !(x instanceof Array) ||
          x.length !== 2 ||
          x.findIndex((x) => typeof x !== "number" || isNaN(x)) >= 0
      ) >= 0 ||
      !(range instanceof Array) ||
      range.length !== 2 ||
      range.findIndex(
        (x) =>
          !(x instanceof Array) ||
          x.length !== 2 ||
          x.findIndex((x) => typeof x !== "number" || isNaN(x)) >= 0
      ) >= 0
    ) {
      throw new Error("`domain` and `range` should be 2x2 array.");
    }
    if (
      !(kernel instanceof Array) ||
      kernel.length <= 0 ||
      kernel.findIndex(
        (x) =>
          !(x instanceof Array) ||
          x.length !== kernel.length ||
          x.findIndex((x) => typeof x !== "number" || isNaN(x)) >= 0
      ) >= 0
    ) {
      throw new Error("`kernel` should be nxn matrix");
    }
    //#endregion
    const ctx = canvas.getContext("2d");
    const x = (i) =>
      ((i - domain[0][0]) / (domain[0][1] - domain[0][0])) *
        (range[0][1] - range[0][0]) +
      range[0][0];
    const y = (i) =>
      ((i - domain[1][0]) / (domain[1][1] - domain[1][0])) *
        (range[1][1] - range[1][0]) +
      range[1][0];
    const rgb = (i) => {
      const colormap = [
        [252, 253, 191],
        [254, 206, 145],
        [254, 159, 109],
        [247, 111, 92],
        [222, 73, 104],
        [182, 55, 122],
        [140, 41, 129],
        [101, 26, 128],
        [59, 15, 112],
        [21, 14, 55],
        [0, 0, 4],
      ];
      const base = Math.floor(i * 10);
      if (i <= 0) return colormap[0];
      if (i >= 1) return colormap[10];
      return colormap[base].map(
        (v, ci) => v + (colormap[base + 1][ci] - v) * (i * 10 - base)
      );
    };
    window.mmm = 0;
    for (let i = 0; i < range[0][1]; i++) {
      for (let j = 0; j < range[1][1]; j++) {
        let weight = 0;
        this.rnn([i, j], kernel.length).forEach(({ raw }) => {
          const dist = distToSegment(
            [i, j],
            [raw[0], raw[2]],
            [raw[1], raw[3]]
          );
          if (dist <= 1) weight += 1;
          // if (dist <= 1) weight += Math.min(Math.abs(1 / raw[4]), 1);
        });
        const ratio = weight / 237;
        // const ratio = weight / 226.02969217531444;
        window.mmm = Math.max(mmm, weight);
        ctx.fillStyle = `rgba(${rgb(ratio).join(",")}, ${ratio <= 0 ? 0 : 1})`;
        ctx.fillRect(i, j, 1, 1);
      }
    }
  }

  knn(point, k) {
    return this.#tree.knn(point[0], point[1], k);
  }

  rnn(point, r) {
    return this.#tree.rnn(point[0], point[1], r);
  }

  brush(lo, hi) {
    return this.#tree.brush(lo[0], lo[1], hi[0], hi[1]);
  }

  angular(lo, hi) {
    return this.#tree.angular(lo[0], lo[1], hi[0], hi[1]);
  }

  rep(sampleNumber = 3) {
    return this.#tree.rep(this.#data, sampleNumber);
  }
}

export default KDLine;
