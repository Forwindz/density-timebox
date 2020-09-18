import regl_ from "regl";
import { MAX_REPEATS_X, MAX_REPEATS_Y } from "./constants";
import { float as f, range, slope } from "./utils";

const MeanShift = require("./meanshift");
const meanShift = new MeanShift();

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
export default async function(
  data: Array<LineData>,
  attribute: number[],
  binX: BinConfig,
  binY: BinConfig,
  canvas?: HTMLCanvasElement,
  gaussianKernel?: number[][],
  lineWidth: number = 1,
  tangentExtent: number = 0,
  normalExtent: number = 0,
  doNormalize: number = 1,
  scaleOption?: scaleOption
) {
  const [numSeries, maxDataPoints] = [data.length, attribute[1]];

  const debugCanvas = !!canvas;

  const heatmapWidth = Math.floor((binX.stop - binX.start) / binX.step);
  const heatmapHeight = Math.floor((binY.stop - binY.start) / binY.step);

  if (gaussianKernel === undefined) {
    gaussianKernel = [
      [1, 2, 1],
      [2, 8, 2],
      [1, 2, 1],
    ];
  }
  if (scaleOption === undefined) {
    scaleOption = {
      xRatio: 1,
      yRatio: 1,
      xOffset: 0,
      yOffset: 0,
    };
  }

  if (
    gaussianKernel.find(
      (gaussianRow) => gaussianRow.length != gaussianKernel.length
    )
  ) {
    throw new Error("The input Gaussian kernal should be square matrix.");
  }
  if (gaussianKernel.length % 2 == 0) {
    throw new Error("The input Gaussian kernal size should be odd.");
  }
  const gaussianIndexOffset = Math.round((gaussianKernel.length - 1) / 2);

  console.info(`Heatmap size: ${heatmapWidth}x${heatmapHeight}`);
  console.info(
    `GaussianKernelSize: ${gaussianKernel.length}x${gaussianKernel.length}`
  );

  const regl = regl_({
    canvas: canvas || document.createElement("canvas"),
    extensions: [
      "OES_texture_float",
      "ANGLE_instanced_arrays",
      "WEBGL_color_buffer_float", // for FireFox needs to explicit enable float
    ],
    attributes: { preserveDrawingBuffer: true },
  });

  regl.on("lost", () => {
    alert("Out of GPU memory, charts will be destroyed!");
  });

  const maxRenderbufferSize = Math.min(regl.limits.maxRenderbufferSize, 4096);
  const maxKDBufferSize = Math.min(regl.limits.maxRenderbufferSize, 16000) - 1;

  const maxRepeatsX = Math.floor(maxRenderbufferSize / heatmapWidth);
  const maxRepeatsY = Math.floor(maxRenderbufferSize / heatmapHeight);

  const repeatsX = Math.min(
    maxRepeatsX,
    Math.ceil(numSeries / 4 - 1e-6),
    Infinity
  );
  const repeatsY = Math.min(
    maxRepeatsY,
    Math.ceil(numSeries / (repeatsX * 4)),
    Infinity
  );

  const kdRepeatsX = Math.floor(maxKDBufferSize / heatmapWidth);
  const kdBufferWidth = Math.round(kdRepeatsX * heatmapWidth);
  const kdBufferHeight = Math.ceil(numSeries / 4 / kdRepeatsX);
  if (kdBufferHeight > maxKDBufferSize) {
    console.error(
      "Your GPU memory is not big enough to store the data, please try another smaller dataset."
    );
    return;
  }

  console.info(
    `Can repeat ${maxRepeatsX}x${maxRepeatsY} times. Repeating ${repeatsX}x${repeatsY} times.`
  );

  const reshapedWidth = heatmapWidth * repeatsX;
  const reshapedHeight = heatmapHeight * repeatsY;

  console.time("build data buffer");
  const dataLength = data.reduce((p, v) => p + v.xValues.length, 0);
  const timeArray = new Float32Array(dataLength);
  const valueArray = new Float32Array(dataLength);
  const segmentInstanceGeometry = regl.buffer([
    [0, -lineWidth / 2],
    [1, -lineWidth / 2],
    [1, lineWidth / 2],
    [0, -lineWidth / 2],
    [1, lineWidth / 2],
    [0, lineWidth / 2],
  ]);
  const indexGeometry = regl.buffer(
    new Array(repeatsX * repeatsY * heatmapWidth).fill(0).map((_, i) => i)
  );
  let linePointer = 0;
  const lineCache = data.map((x, i) => {
    const offset = linePointer;
    timeArray.set(x.xValues, linePointer);
    valueArray.set(x.yValues, linePointer);
    linePointer += x.xValues.length;
    return {
      offsetA: offset * Float32Array.BYTES_PER_ELEMENT,
      offsetB: (offset + 1) * Float32Array.BYTES_PER_ELEMENT,
      count: Math.max(x.xValues.length - 1, 0),
      lineIdx: i,
    };
  });
  const timeBuffer = regl.buffer(timeArray);
  const valueBuffer = regl.buffer(valueArray);
  console.timeEnd("build data buffer");

  console.info(
    `Canvas size ${reshapedWidth}x${reshapedHeight}. Tangent Gaussian size ${tangentExtent}. Normal Gaussian size ${f(
      normalExtent
    )}. Line width ${lineWidth}. MaxX ${binX.stop}. MaxY ${binY.stop}`
  );

  const drawLine = regl({
    vert: `
    precision mediump float;
      
    attribute float timeA;
    attribute float valueA;
    attribute float timeB;
    attribute float valueB;
    attribute vec2 position;
  
    uniform float column;
    uniform float row;

    vec2 parsePoint(float time, float value) {
      float repeatsX = ${f(repeatsX)};
      float repeatsY = ${f(repeatsY)};
      float maxX = ${f(maxDataPoints)};
      float maxY = ${f(binY.stop)};
  
      // time and value start at 0 so we can simplify the scaling
      float x = column / repeatsX + time / (maxX * repeatsX);
      
      // move up by 0.3 pixels so that the line is guaranteed to be drawn
      float yOffset = row / repeatsY + 0.3 / ${f(reshapedHeight)};
      // squeeze by 0.6 pixels
      float squeeze = 1.0 - 0.6 / ${f(heatmapHeight)};
      float yValue = value / (maxY * repeatsY) * squeeze;
      float y = yOffset + yValue;

      return vec2(x, y);
    }
  
    void main() {
      vec2 pointA = parsePoint(timeA, valueA);
      vec2 pointB = parsePoint(timeB, valueB);

      vec2 xBasis = pointB - pointA;
      vec2 yBasis = normalize(vec2(-xBasis.y, xBasis.x)) / length(vec2(${f(
        reshapedWidth
      )}, ${f(reshapedHeight)})) * 2.0;

      vec2 pos = pointA + xBasis * position.x + yBasis * position.y;
  
      // scale to [-1, 1]
      gl_Position = vec4(
        pos.x * 2.0 - 1.0,
        pos.y * 2.0 - 1.0,
        0,
        1
      );
    }`,

    frag: `
    precision mediump float;
    varying vec4 uv;
  
    void main() {
      // we will control the color with the color mask
      gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }`,

    uniforms: {
      column: regl.prop<any, "column">("column"),
      row: regl.prop<any, "row">("row"),
    },

    attributes: {
      position: {
        buffer: segmentInstanceGeometry,
        divisor: 0,
      },
      timeA: {
        buffer: timeBuffer,
        divisor: 1,
        offset: regl.prop<any, "offsetA">("offsetA"),
        stride: Float32Array.BYTES_PER_ELEMENT,
      },
      timeB: {
        buffer: timeBuffer,
        divisor: 1,
        offset: regl.prop<any, "offsetB">("offsetB"),
        stride: Float32Array.BYTES_PER_ELEMENT,
      },
      valueA: {
        buffer: valueBuffer,
        divisor: 1,
        offset: regl.prop<any, "offsetA">("offsetA"),
        stride: Float32Array.BYTES_PER_ELEMENT,
      },
      valueB: {
        buffer: valueBuffer,
        divisor: 1,
        offset: regl.prop<any, "offsetB">("offsetB"),
        stride: Float32Array.BYTES_PER_ELEMENT,
      },
    },

    colorMask: regl.prop<any, "colorMask">("colorMask"),

    depth: { enable: false, mask: false },

    instances: regl.prop<any, "count">("count"),

    count: 6,

    primitive: "triangles",
    // lineWidth: () => 1,

    framebuffer: regl.prop<any, "out">("out"),
  });

  const computeBase = {
    vert: `
        precision mediump float;
      
        attribute vec2 position;
        varying vec2 uv;
      
        void main() {
          uv = 0.5 * (position + 1.0);
          gl_Position = vec4(position, 0, 1);
        }`,

    attributes: {
      position: [-4, -4, 4, -4, 0, 4],
    },

    depth: { enable: false, mask: false },

    count: 3,
  };

  /**
   * Do Gaussian kernel density estimation
   */
  const gaussian = regl({
    ...computeBase,
    frag: `
      precision mediump float;
    
      uniform sampler2D buffer;
    
      varying vec2 uv;
    
      vec4 getColor(int offsetX, int offsetY) {
        const int canvasWidth = ${reshapedWidth};
        const int canvasHeight = ${reshapedHeight};
        const int sampleWidth = ${heatmapWidth};
        const int sampleHeight = ${heatmapHeight};
    
        int currentX = int(uv.x * float(canvasWidth) + 1e-1);
        int currentY = int(uv.y * float(canvasHeight) + 1e-1);
        int refX = currentX + offsetX;
        int refY = currentY + offsetY;
    
        if (currentX / sampleWidth == refX / sampleWidth && currentY / sampleHeight == refY / sampleHeight && refX >= 0 && refY >= 0) {
          vec2 offsetPixel = vec2(float(offsetX), float(offsetY)) / vec2(float(canvasWidth), float(canvasHeight));
          return texture2D(buffer, uv + offsetPixel);
        } else {
          return vec4(0.0, 0.0, 0.0, 0.0);
        }
      }
    
      void main() {
        gl_FragColor = ${gaussianKernel
          .map((gaussianRow, offsetY) =>
            gaussianRow
              .map(
                (kernelValue, offsetX) =>
                  `getColor(${gaussianIndexOffset - offsetX}, ${offsetY -
                    gaussianIndexOffset}) * ${f(kernelValue)}`
              )
              .join(" + ")
          )
          .join(" + ")};
      }
    `,
    uniforms: {
      buffer: regl.prop<any, "buffer">("buffer"),
    },
    framebuffer: regl.prop<any, "out">("out"),
  });

  /**
   * Compute the sums of each column and put it into a framebuffer
   */
  const sum = regl({
    ...computeBase,

    frag: `
        precision mediump float;
      
        uniform sampler2D buffer;
        varying vec2 uv;
      
        void main() {
          float texelRowStart = floor(uv.y * ${f(repeatsY)}) / ${f(repeatsY)};
          float texelColumnStart = floor(uv.x * ${f(repeatsX)}) / ${f(
      repeatsX
    )};
      
          ${
            doNormalize !== 2
              ? `
          // normalize by the column
          vec4 sum = vec4(0.0);
          for (float j = 0.0; j < ${f(heatmapHeight)}; j++) {
            float texelRow = texelRowStart + (j + 0.5) / ${f(reshapedHeight)};
            vec4 value = texture2D(buffer, vec2(uv.x, texelRow));
            sum += value;
          }
          `
              : `
          // normalize by the column
          vec4 sum = vec4(0.0);
          for ( float i = 0.0; i< ${f(heatmapWidth)}; i++) {
            float texelColumn = texelColumnStart + (i + 0.5) / ${f(
              reshapedWidth
            )};
            for (float j = 0.0; j < ${f(heatmapHeight)}; j++) {
              float texelRow = texelRowStart + (j + 0.5) / ${f(reshapedHeight)};
              vec4 value = texture2D(buffer, vec2(texelColumn, texelRow));
              sum += value;
            }
          }
          
          `
          }
      
          // sum should be at least 1, prevents problems with empty buffers
          gl_FragColor = max(vec4(1.0), sum);
        }`,

    uniforms: {
      buffer: regl.prop<any, "buffer">("buffer"),
    },

    framebuffer: regl.prop<any, "out">("out"),
  });

  /**
   * Normalize the pixels in the buffer by the sums computed before.
   * Alpha blends the outputs.
   */
  const normalize = regl({
    ...computeBase,

    frag: `
        precision mediump float;
      
        uniform sampler2D buffer;
        uniform sampler2D sums;
        varying vec2 uv;
      
        void main() {
          vec4 value = texture2D(buffer, uv);
          vec4 sum = texture2D(sums, uv);
      
          ${
            doNormalize
              ? "gl_FragColor = value / sum;"
              : "gl_FragColor = value;"
          }
        }`,

    uniforms: {
      sums: regl.prop<any, "sums">("sums"),
      buffer: regl.prop<any, "buffer">("buffer"),
    },

    // additive blending
    blend: {
      enable: true,
      func: {
        srcRGB: "one",
        srcAlpha: 1,
        dstRGB: "one",
        dstAlpha: 1,
      },
      equation: {
        rgb: "add",
        alpha: "add",
      },
      color: [0, 0, 0, 0],
    },

    framebuffer: regl.prop<any, "out">("out"),
  });

  /**
   * Merge rgba from the wide buffer into one heatmap buffer
   */
  const mergeBufferHorizontally = regl({
    ...computeBase,

    frag: `
        precision mediump float;
      
        uniform sampler2D buffer;
      
        varying vec2 uv;
      
        void main() {
          vec4 color = vec4(0);
      
          // collect all columns
          for (float i = 0.0; i < ${f(repeatsX)}; i++) {
            float x = (i + uv.x) / ${f(repeatsX)};
            color += texture2D(buffer, vec2(x, uv.y));
          }
      
          gl_FragColor = color;
        }`,

    uniforms: {
      buffer: regl.prop<any, "buffer">("buffer"),
    },

    framebuffer: regl.prop<any, "out">("out"),
  });
  const mergeBufferVertically = regl({
    ...computeBase,

    frag: `
        precision mediump float;
      
        uniform sampler2D buffer;
      
        varying vec2 uv;
      
        void main() {
          vec4 color = vec4(0);
      
          // collect all rows
          for (float i = 0.0; i < ${f(repeatsY)}; i++) {
            float y = (i + uv.y) / ${f(repeatsY)};
            color += texture2D(buffer, vec2(uv.x, y));
          }
      
          float value = color.r + color.g + color.b + color.a;
          gl_FragColor = vec4(vec3(value), 1.0);
        }`,

    uniforms: {
      buffer: regl.prop<any, "buffer">("buffer"),
    },

    framebuffer: regl.prop<any, "out">("out"),
  });

  /**
   * Compute the max density of each column
   */
  const maxDensity = regl({
    ...computeBase,

    frag: `
        precision mediump float;
      
        uniform sampler2D buffer;
        varying vec2 uv;
      
        void main() {
          // normalize by the column
          vec4 sum = vec4(0.0);
          for (float j = 0.0; j < ${f(heatmapHeight)}; j++) {
            float texelRow = (j + 0.5) / ${f(heatmapWidth)};
            vec4 value = texture2D(buffer, vec2(uv.x, texelRow));
            sum = max(sum, value);
          }
        
          // max should be at least 1, prevents problems with empty buffers
          gl_FragColor = max(vec4(1.0), sum);
        }`,

    uniforms: {
      buffer: regl.prop<any, "buffer">("buffer"),
    },

    framebuffer: regl.prop<any, "out">("out"),
  });

  console.time("Allocate buffers");

  const linesBuffer = regl.framebuffer({
    width: reshapedWidth,
    height: reshapedHeight,
    colorFormat: "rgba",
    colorType: "uint8",
  });

  const gaussianBuffer = regl.framebuffer({
    width: reshapedWidth,
    height: reshapedHeight,
    colorFormat: "rgba",
    colorType: "float",
  });

  const sumsBuffer = regl.framebuffer({
    width: reshapedWidth,
    height: repeatsY,
    colorFormat: "rgba",
    colorType: "float",
  });

  const resultBuffer = regl.framebuffer({
    width: reshapedWidth,
    height: reshapedHeight,
    colorFormat: "rgba",
    colorType: "float",
  });

  const preMergedBuffer = regl.framebuffer({
    width: heatmapWidth,
    height: reshapedHeight,
    colorFormat: "rgba",
    colorType: "float",
  });

  const heatBuffer = regl.framebuffer({
    width: heatmapWidth,
    height: heatmapHeight,
    colorFormat: "rgba",
    colorType: "float",
  });

  const maxDensityBuffer = regl.framebuffer({
    width: heatmapWidth,
    height: 1,
    colorFormat: "rgba",
    colorType: "float",
  });
  console.timeEnd("Allocate buffers");

  function colorMask(i) {
    const mask = [false, false, false, false];
    mask[i % 4] = true;
    return mask;
  }

  console.time("Compute heatmap");

  // batches of 4 * repeats
  const batchSize = 4 * repeatsX * repeatsY;

  // index of series
  let series = 0;
  // how many series have already been drawn
  let finishedSeries = 0;

  for (let b = 0; b < numSeries; b += batchSize) {
    console.time("Prepare Batch");

    // array to hold the lines that should be rendered
    let lines = new Array(Math.min(batchSize, numSeries - series));

    // clear the lines buffer before the next batch
    regl.clear({
      color: [0, 0, 0, 0],
      framebuffer: linesBuffer,
    });

    let offset = series;

    loop: for (let row = 0; row < repeatsY; row++) {
      for (let i = 0; i < 4 * repeatsX; i++) {
        if (series >= numSeries) {
          break loop;
        }

        // console.log(series, Math.floor(i / 4), row);

        lines[series - finishedSeries] = {
          ...lineCache[series],
          column: Math.floor(i / 4),
          row: row,
          colorMask: colorMask(i),
          out: linesBuffer,
        };

        series++;
      }
    }
    console.timeEnd("Prepare Batch");

    console.info(`Drawing ${lines.length} lines.`);

    console.time("regl: drawLine");
    drawLine(lines);
    console.timeEnd("regl: drawLine");

    console.time("regl: gaussian");
    gaussian({
      buffer: linesBuffer,
      out: gaussianBuffer,
    });
    console.timeEnd("regl: gaussian");

    finishedSeries += lines.length;

    console.time("regl: sum");
    sum({
      buffer: gaussianBuffer,
      out: sumsBuffer,
    });
    console.timeEnd("regl: sum");

    console.time("regl: normalize");
    normalize({
      buffer: gaussianBuffer,
      sums: sumsBuffer,
      out: resultBuffer,
    });
    console.timeEnd("regl: normalize");
  }

  console.time("regl: merge");
  mergeBufferHorizontally({
    buffer: resultBuffer,
    out: preMergedBuffer,
  });

  mergeBufferVertically({
    buffer: preMergedBuffer,
    out: heatBuffer,
  });
  console.timeEnd("regl: merge");
  console.timeEnd("Compute heatmap");

  maxDensity({
    buffer: heatBuffer,
    out: maxDensityBuffer,
  });

  let res = regl.read({ framebuffer: maxDensityBuffer });
  res = res.filter((_, i) => i % 4 == 0);

  console.log(res);

  const minDensityValue = Math.min(...res);
  const maxDensityValue = Math.max(...res);

  const MAX_STEP = 10;

  const lerp = (value) =>
    1 /
    (((value - minDensityValue) / (maxDensityValue - minDensityValue)) *
      (1 - 1 / MAX_STEP) +
      1 / MAX_STEP);

  const lerpedDistribution = res.map((x) => lerp(x));
  const sliceArray = [];

  for (let i = 0; i < lerpedDistribution.length; ) {
    const step = Math.min(
      Math.floor(lerpedDistribution[i]),
      lerpedDistribution.length - i
    );
    sliceArray.push(step);
    i += step;
  }

  console.log(sliceArray);

  const vectorizedLines = [];

  for (let line of data) {
    const getLinePoint = (x) => {
      const xPixels = line.xValues.map((i) => (i / binX.stop) * heatmapWidth);
      const index = xPixels.findIndex((v) => x >= v);
      if (x <= xPixels[0]) return 0;
      if (index >= line.yValues.length - 1) {
        return line.yValues[line.yValues.length - 1];
      } else {
        const ratio =
          (x - xPixels[index]) / (xPixels[index + 1] - xPixels[index]);
        return (
          line.yValues[index + 1] * ratio + line.yValues[index] * (1 - ratio)
        );
      }
    };
    let pointer = 0;
    const getLineArea = (step) => {
      let areaSum = 0;
      const end = pointer + step;
      for (let i = pointer; i < end; i++) {
        areaSum += getLinePoint(i);
      }
      pointer += step;
      return areaSum / step;
    };
    const normalize = (arr) => {
      // make array 0-mean
      const sum = arr.reduce((p, v) => p + v);
      const avg = sum / arr.length;
      return arr.map((item) => item - avg);
    };
    vectorizedLines.push(normalize(sliceArray.map(getLineArea)));
  }

  console.log(vectorizedLines);

  console.log(meanShift.cluster(vectorizedLines, 25));

  return {
    filterAngle: () => {
      return new Float32Array([]);
    },
    filterRange: () => {
      return new Float32Array([]);
    },
    findKTop: () => {
      console.time("find-top");

      console.time("regl: calWeight");
      return [];
    },
    rerender: () => {},
    destroy: () => {
      regl.destroy();
    },
    get maxDensity() {
      return 1;
    },
    set maxDensity(_) {},
    maxX: binX.stop,
    maxY: binY.stop,
  };
}
