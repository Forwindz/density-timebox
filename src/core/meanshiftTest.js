const regl_ = require("regl");
const gl_ = require("gl");
const parse = require("csv-parse/lib/sync");
const fs = require("fs");
const { bin } = require("vega-statistics");
const MeanShift = require("./meanshift");

function getData() {
  const arr = [];

  let result = fs.readFileSync("../data/stocks.filtered.csv");
  let data = parse(result, {
    skip_empty_lines: true,
  });

  const rand = Math.random;
  const theta = 5;

  let name = "",
    number = -1,
    count = 0,
    count2 = 0,
    flag,
    flag2;

  for (let i = 1; i < data.length; ++i) {
    name = data[i][0];
    count = 0;
    flag = false;
    flag2 = false;
    let flag3 = true;
    let tmpx = [],
      tmpy = [];
    for (let j = i; j < data.length && name === data[j][0]; j++) {
      let date = Date.parse(data[j][1]) / (24 * 3600 * 1000),
        value = parseFloat(data[j][2]);
      count++;
      if (
        j > i &&
        Math.abs(parseFloat(data[j - 1][2]) - parseFloat(data[j][2])) > 5
      ) {
        flag2 = true;
      }
      if (
        j > i &&
        Math.abs(parseFloat(data[j - 1][2]) - parseFloat(data[j][2])) > 2
      ) {
        flag3 = false;
      }
      if (parseFloat(data[j][2]) > 70) {
        flag = true;
      }
      if (date > 300 + 13179 && date < 1100 + 13179) {
        tmpx.push(date);
        tmpy.push(value);
      }
    }
    if (
      parseFloat(data[i + count - 1][2]) > 20 &&
      parseFloat(data[i + count - 1][2]) < 30 &&
      rand() > 0.1
    ) {
      flag = true;
    }
    if (
      parseFloat(data[i + count - 1][2]) > 10 &&
      parseFloat(data[i + count - 1][2]) < 20 &&
      rand() > 0.1
    ) {
      flag = true;
    }
    if (tmpx.length <= 1 || flag || !(flag2 || flag3)) {
      i += count;
      continue;
    }
    number++;
    if (count == 1) {
      // console.log(data[i], data[i-1], data[i][0]===data[i-1][0]);
    }
    arr.push({
      xValues: new Float32Array(tmpx.length),
      yValues: new Float32Array(tmpx.length),
    });
    for (let j = 0; j < tmpx.length; j++) {
      arr[number].xValues[j] = tmpx[j];
      arr[number].yValues[j] = tmpy[j];
    }
    i += count;
  }

  console.log(arr);
  return arr;
}

function f(i) {
  if (i - Math.floor(i) > 0) {
    return i;
  }
  return `${Math.floor(i)}.0`;
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
function main(
  data,
  attribute,
  binX,
  binY,
  canvas,
  gaussianKernel,
  lineWidth = 1,
  tangentExtent = 0,
  normalExtent = 0,
  doNormalize = 1,
  scaleOption
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

  const gl = gl_(1000, 500, { preserveDrawingBuffer: true });

  const regl = regl_({
    gl,
    extensions: [
      "OES_texture_float",
      "ANGLE_instanced_arrays",
      "WEBGL_color_buffer_float", // for FireFox needs to explicit enable float
    ],
  });

  regl.on("lost", () => {
    console.error("Out of GPU memory, charts will be destroyed!");
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
      column: regl.prop("column"),
      row: regl.prop("row"),
    },

    attributes: {
      position: {
        buffer: segmentInstanceGeometry,
        divisor: 0,
      },
      timeA: {
        buffer: timeBuffer,
        divisor: 1,
        offset: regl.prop("offsetA"),
        stride: Float32Array.BYTES_PER_ELEMENT,
      },
      timeB: {
        buffer: timeBuffer,
        divisor: 1,
        offset: regl.prop("offsetB"),
        stride: Float32Array.BYTES_PER_ELEMENT,
      },
      valueA: {
        buffer: valueBuffer,
        divisor: 1,
        offset: regl.prop("offsetA"),
        stride: Float32Array.BYTES_PER_ELEMENT,
      },
      valueB: {
        buffer: valueBuffer,
        divisor: 1,
        offset: regl.prop("offsetB"),
        stride: Float32Array.BYTES_PER_ELEMENT,
      },
    },

    colorMask: regl.prop("colorMask"),

    depth: { enable: false, mask: false },

    instances: regl.prop("count"),

    count: 6,

    primitive: "triangles",
    // lineWidth: () => 1,

    framebuffer: regl.prop("out"),
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
      buffer: regl.prop("buffer"),
    },
    framebuffer: regl.prop("out"),
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
      buffer: regl.prop("buffer"),
    },

    framebuffer: regl.prop("out"),
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
      sums: regl.prop("sums"),
      buffer: regl.prop("buffer"),
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

    framebuffer: regl.prop("out"),
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
      buffer: regl.prop("buffer"),
    },

    framebuffer: regl.prop("out"),
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
      buffer: regl.prop("buffer"),
    },

    framebuffer: regl.prop("out"),
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
            sum += value;
          }
        
          // max should be at least 1, prevents problems with empty buffers
          gl_FragColor = max(vec4(1.0), sum);
        }`,

    uniforms: {
      buffer: regl.prop("buffer"),
    },

    framebuffer: regl.prop("out"),
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

  const res = regl.read({ framebuffer: maxDensityBuffer });
  return res.filter((_, i) => i % 4 == 0);
}

const data = getData();
let maxY = data[0].yValues[0],
  minY = maxY;
let maxX = data[0].xValues[0],
  minX = maxX;
for (let i = 0; i < data.length; i++) {
  let length = data[i].xValues.length;
  for (let j = 0; j < length; j++) {
    let yValue = data[i].yValues[j],
      xValue = data[i].xValues[j];
    if (yValue > 5000) {
      console.log("!!!!!!", i);
    }
    maxY = Math.max(maxY, yValue);
    minY = Math.min(minY, yValue);
    maxX = Math.max(maxX, xValue);
    minX = Math.min(minX, xValue);
  }
}
for (let i = 0; i < data.length; i++) {
  let length = data[i].xValues.length;
  for (let j = 0; j < length; j++) {
    data[i].xValues[j] -= minX;
    data[i].yValues[j] -= minY;
  }
}
console.log(maxX, maxY, minX, minY);
// compute nice bin boundaries
const binConfigX = bin({ maxbins: 1000, extent: [0, maxX - minX] });
const binConfigY = bin({ maxbins: 500, extent: [0, maxY - minY] });

const meanShift = new MeanShift();

const heatmap = main(
  getData(),
  [0, maxX - minX, 0, maxY - minY],
  binConfigX,
  binConfigY
);

console.log(heatmap);
