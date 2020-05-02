import ndarray from "ndarray";
import regl_ from "regl";
import { MAX_REPEATS_X, MAX_REPEATS_Y } from "./constants";
import { float as f, range, makePair, slope } from "./utils";

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
    extensions: ["OES_texture_float"],
    attributes: { preserveDrawingBuffer: true },
  });

  regl.on("lost", () => {
    alert("Out of GPU memory, charts will be destroyed!");
  });

  // See https://github.com/regl-project/regl/issues/498
  const maxRenderbufferSize = Math.min(regl.limits.maxRenderbufferSize, 4096);

  const maxRepeatsX = Math.floor(maxRenderbufferSize / heatmapWidth);
  const maxRepeatsY = Math.floor(maxRenderbufferSize / heatmapHeight);

  const repeatsX = Math.min(
    maxRepeatsX,
    Math.ceil(numSeries / 4 - 1e-6),
    MAX_REPEATS_X
  );
  const repeatsY = Math.min(
    maxRepeatsY,
    Math.ceil(numSeries / (repeatsX * 4)),
    MAX_REPEATS_Y
  );

  console.info(
    `Can repeat ${maxRepeatsX}x${maxRepeatsY} times. Repeating ${repeatsX}x${repeatsY} times.`
  );

  const reshapedWidth = heatmapWidth * repeatsX;
  const reshapedHeight = heatmapHeight * repeatsY;

  console.info(
    `Canvas size ${reshapedWidth}x${reshapedHeight}. Tangent Gaussian size ${tangentExtent}. Normal Gaussian size ${f(
      normalExtent
    )}. Line width ${lineWidth}. MaxX ${binX.stop}. MaxY ${binY.stop}`
  );

  const drawLine = regl({
    vert: `
    precision mediump float;
      
    attribute float time;
    attribute float value;
  
    uniform float maxX;
    uniform float maxY;
    uniform float column;
    uniform float row;
  
    void main() {
      float repeatsX = ${f(repeatsX)};
      float repeatsY = ${f(repeatsY)};
  
      // time and value start at 0 so we can simplify the scaling
      float x = column / repeatsX + time / (maxX * repeatsX);
      
      // move up by 0.3 pixels so that the line is guaranteed to be drawn
      float yOffset = row / repeatsY + 0.3 / ${f(reshapedHeight)};
      // squeeze by 0.6 pixels
      float squeeze = 1.0 - 0.6 / ${f(heatmapHeight)};
      float yValue = value / (maxY * repeatsY) * squeeze;
      float y = yOffset + yValue;
  
      // squeeze y by 0.3 pixels so that the line is guaranteed to be drawn
      float yStretch = 2.0 - 0.6 / ${f(reshapedHeight)};
  
      // scale to [-1, 1]
      gl_Position = vec4(
        2.0 * (x - 0.5),
        2.0 * (y - 0.5),
        0, 1);
    }`,

    frag: `
    precision mediump float;
    varying vec4 uv;
  
    void main() {
      // we will control the color with the color mask
      gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }`,

    uniforms: {
      maxX: regl.prop<any, "maxX">("maxX"),
      maxY: regl.prop<any, "maxY">("maxY"),
      column: regl.prop<any, "column">("column"),
      row: regl.prop<any, "row">("row"),
    },

    attributes: {
      time: regl.prop<any, "times">("times"),
      value: regl.prop<any, "values">("values"),
    },

    colorMask: regl.prop<any, "colorMask">("colorMask"),

    depth: { enable: false, mask: false },

    count: regl.prop<any, "count">("count"),

    primitive: "line strip",
    lineWidth: () => 1,

    framebuffer: regl.prop<any, "out">("out"),
  });

  const drawFlatLine = regl({
    vert: `
        precision mediump float;

        attribute float value;
        attribute float time;

        uniform float maxX;
        uniform float maxY;
        uniform float lineIdx;

        varying float v;

        void main() {
          v = value / maxY;

          vec2 position = vec2(time / maxX, (floor(lineIdx / 4.0) + 0.5) / ceil(${f(
            data.length
          )} / 4.0));

          // scale to [-1, 1]
          gl_Position = vec4(
            2.0 * (position.x - 0.5),
            2.0 * (position.y - 0.5),
            0, 1);
        }`,

    frag: `
        precision mediump float;

        varying float v;
      
        void main() {
          gl_FragColor = vec4(v);
        }`,

    uniforms: {
      maxX: regl.prop<any, "maxX">("maxX"),
      maxY: regl.prop<any, "maxY">("maxY"),
      lineIdx: regl.prop<any, "lineIdx">("lineIdx"),
    },

    attributes: {
      value: regl.prop<any, "values">("values"),
      time: regl.prop<any, "times">("times"),
    },

    colorMask: regl.prop<any, "colorMask">("colorMask"),

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

    depth: { enable: false, mask: false },

    count: regl.prop<any, "count">("count"),

    primitive: "line strip",
    lineWidth: () => 1,

    framebuffer: regl.prop<any, "flatOut">("flatOut"),
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
   * Helper function to draw a the texture in a buffer.
   */
  const drawTexture = regl({
    ...computeBase,

    frag: `
        precision mediump float;
      
        uniform sampler2D buffer;
        uniform float plasma[33];
        uniform float maxi;
        
        varying vec2 uv;
        
        void main() {
          // get r and draw it
          float value = texture2D(buffer, uv).r;

          if (value <= 0.01) {
            gl_FragColor = vec4(0);
          } else {
            float normValue = value / maxi;
            float step = 1.0 / 10.0;
            for (int i = 0; i < 10; i++) {
              if (normValue <= float(i + 1) * step) {
                float rangeValue = (normValue - float(i) * step) * 10.0;
                vec3 aColor = vec3(plasma[i * 3 + 0], plasma[i * 3 + 1], plasma[i * 3 + 2]);
                vec3 bColor = vec3(plasma[(i + 1) * 3 + 0], plasma[(i + 1) * 3 + 1], plasma[(i + 1) * 3 + 2]);
                gl_FragColor = vec4(aColor * (1.0 - rangeValue) + bColor * rangeValue, 1.0);
                return;
              }
            }
            gl_FragColor = vec4(plasma[30], plasma[31], plasma[32], 1);
          }
        }`,

    uniforms: {
      buffer: regl.prop<any, "buffer">("buffer"),
      maxi: regl.prop<any, "maxi">("maxi"),
      ...[
        [0.9882352941176471, 0.9921568627450981, 0.7490196078431373],
        [0.996078431372549, 0.807843137254902, 0.5686274509803921],
        [0.996078431372549, 0.6235294117647059, 0.42745098039215684],
        [0.9686274509803922, 0.43529411764705883, 0.3607843137254902],
        [0.8705882352941177, 0.28627450980392155, 0.40784313725490196],
        [0.7137254901960784, 0.21568627450980393, 0.47843137254901963],
        [0.5490196078431373, 0.1607843137254902, 0.5058823529411764],
        [0.396078431372549, 0.10196078431372549, 0.5019607843137255],
        [0.23137254901960785, 0.058823529411764705, 0.4392156862745098],
        [0.08235294117647059, 0.054901960784313725, 0.21568627450980393],
        [0, 0, 0.01568627450980392],
      ]
        // ...[
        //   [0.9411764705882353, 0.9764705882352941, 0.12941176470588237],
        //   [0.9882352941176471, 0.807843137254902, 0.1450980392156863],
        //   [0.9882352941176471, 0.6509803921568628, 0.21176470588235294],
        //   [0.9490196078431372, 0.5137254901960784, 0.2980392156862745],
        //   [0.8823529411764706, 0.39215686274509803, 0.3843137254901961],
        //   [0.796078431372549, 0.2784313725490196, 0.4745098039215686],
        //   [0.6941176470588235, 0.16470588235294117, 0.5647058823529412],
        //   [0.5647058823529412, 0.050980392156862744, 0.6431372549019608],
        //   [0.41568627450980394, 0, 0.6588235294117647],
        //   [0.25882352941176473, 0.011764705882352941, 0.615686274509804],
        //   [0.050980392156862744, 0.03137254901960784, 0.5294117647058824],
        // ]
        .reduce((p, v) => [...p, ...v], [])
        .reduce((p, v, i) => {
          return {
            ...p,
            [`plasma[${i}]`]: v,
          };
        }, {}),
    },
  });

  const filterByAngles = regl({
    ...computeBase,

    frag: `
        precision mediump float;
      
        uniform sampler2D buffer;
        uniform float startTime;
        uniform float endTime;
        uniform float startAngle;
        uniform float endAngle;
        
        varying vec2 uv;
        
        void main() {
          // get r and draw it
          float width = ${f(heatmapWidth)};
          float height = ${f(heatmapHeight)};
          float start = startTime * width;
          float end = endTime * width;
          vec4 result = vec4(1);
          vec4 valid = vec4(0);
          for (float pointer = 0.0;pointer<=${f(heatmapWidth)};pointer++){
            if (pointer >= start && pointer <= end){
              vec4 angle = texture2D(buffer, vec2((pointer + 0.5) / width, uv.y));
              for (float pointer2 = 0.0;pointer2<=${f(
                heatmapWidth
              )};pointer2++){
                if (pointer2 > pointer && pointer2 <= end){
                  vec4 angle2 = texture2D(buffer, vec2((pointer2 + 0.5) / width, uv.y));
                  float diff = 0.0;
                  ${[0, 1, 2, 3]
                    .map(
                      (i) => `
                  if(angle2[${i}] > 0.0) {
                    valid[${i}] = 1.0;
                  }
                  diff = (angle2[${i}] - angle[${i}]) * 500.0 / (pointer2 - pointer) * width / 1000.0;
                  if (diff < startAngle || diff > endAngle) {
                    result[${i}] = 0.0;
                  }
                  `
                    )
                    .join("")}
                }
              }
            }
          }
          ${[0, 1, 2, 3]
            .map(
              (i) => `
          if(valid[${i}] <= 0.0) {
            result[${i}] = 0.0;
          }
          `
            )
            .join("")}
          gl_FragColor = result;
        }`,

    uniforms: {
      buffer: regl.prop<any, "buffer">("buffer"),
      startTime: regl.prop<any, "startTime">("startTime"),
      endTime: regl.prop<any, "endTime">("endTime"),
      startAngle: regl.prop<any, "startAngle">("startAngle"),
      endAngle: regl.prop<any, "endAngle">("endAngle"),
    },

    framebuffer: regl.prop<any, "out">("out"),
  });

  const filterByValues = regl({
    ...computeBase,

    frag: `
        precision mediump float;
      
        uniform sampler2D buffer;
        uniform float startTime;
        uniform float endTime;
        uniform float startValue;
        uniform float endValue;
        
        varying vec2 uv;
        
        void main() {
          // get r and draw it
          float width = ${f(heatmapWidth)};
          float start = startTime * width;
          float end = endTime * width;
          vec4 result = vec4(0);
          for (float pointer = 0.0;pointer<=${f(heatmapWidth)};pointer++){
            if (pointer >= start && pointer <= end){
              vec4 angle = texture2D(buffer, vec2((pointer + 0.5) / width, uv.y));
              ${[0, 1, 2, 3]
                .map(
                  (i) => `
              if (angle[${i}] >= startValue && angle[${i}] <= endValue) {
                result[${i}] = 1.0;
              }
              `
                )
                .join("")}
            }
          }
          gl_FragColor = result;
        }`,

    uniforms: {
      buffer: regl.prop<any, "buffer">("buffer"),
      startTime: regl.prop<any, "startTime">("startTime"),
      endTime: regl.prop<any, "endTime">("endTime"),
      startValue: regl.prop<any, "startValue">("startValue"),
      endValue: regl.prop<any, "endValue">("endValue"),
    },

    framebuffer: regl.prop<any, "out">("out"),
  });

  const findMax = regl({
    ...computeBase,

    frag: `
        precision mediump float;
      
        uniform sampler2D buffer;
        
        varying vec2 uv;
        
        void main() {
          float width = ${f(heatmapWidth)};
          float height = ${f(heatmapHeight)};
          vec4 result = vec4(0);
          for (float x = 0.0;x<=${f(heatmapWidth)};x++){
            for (float y = 0.0;y<=${f(heatmapHeight)};y++){
              result = max(result, texture2D(buffer, vec2(x / width, y / height)));
            }
          }
          gl_FragColor = result;
        }`,

    uniforms: {
      buffer: regl.prop<any, "buffer">("buffer"),
    },

    framebuffer: regl.prop<any, "out">("out"),
  });

  const calWeight = regl({
    ...computeBase,
    frag: `
    precision mediump float;
      
    uniform sampler2D buffer;
    uniform sampler2D heat;
    
    varying vec2 uv;
    
    void main() {
      float width = ${f(heatmapWidth)};
      float height = ${f(heatmapHeight)};
      vec4 sum = vec4(0);
      for (float i = 0.0; i< ${f(heatmapWidth)};i++){
        vec4 pointer = texture2D(buffer, vec2(i / width, uv.y));
        ${[0, 1, 2, 3]
          .map(
            (i) => `
        sum[${i}] += texture2D(heat, vec2(i / width, pointer[${i}])).x;
        `
          )
          .join("")}
      }
      gl_FragColor = sum;
    }
    `,

    uniforms: {
      buffer: regl.prop<any, "buffer">("buffer"),
      heat: regl.prop<any, "heat">("heat"),
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

  const flatLinesBuffer = regl.framebuffer({
    width: heatmapWidth,
    height: Math.ceil(data.length / 4),
    colorFormat: "rgba",
    colorType: "float",
  });

  const filterAngleBuffer = regl.framebuffer({
    width: 1,
    height: Math.ceil(data.length / 4),
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

  const maxValueBuffer = regl.framebuffer({
    width: 1,
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

  regl.clear({
    color: [0, 0, 0, 0],
    framebuffer: flatLinesBuffer,
  });

  for (let b = 0; b < numSeries; b += batchSize) {
    console.time("Prepare Batch");

    // array to hold the lines that should be rendered
    let lines = new Array(Math.min(batchSize, numSeries - series));

    // clear the lines buffer before the next batch
    regl.clear({
      color: [0, 0, 0, 0],
      framebuffer: linesBuffer,
    });

    loop: for (let row = 0; row < repeatsY; row++) {
      for (let i = 0; i < 4 * repeatsX; i++) {
        if (series >= numSeries) {
          break loop;
        }

        // console.log(series, Math.floor(i / 4), row);
        let valueLength = data[series].xValues.length;

        lines[series - finishedSeries] = {
          values: ndarray(data[series].yValues),
          times: ndarray(data[series].xValues),
          maxY: binY.stop,
          maxX: maxDataPoints,
          lineIdx: series,
          column: Math.floor(i / 4),
          row: row,
          colorMask: colorMask(i),
          count: valueLength,
          out: linesBuffer,
          flatOut: flatLinesBuffer,
        };

        series++;
      }
    }
    console.timeEnd("Prepare Batch");

    console.info(`Drawing ${lines.length} lines.`);

    console.time("regl: drawFlatLine");
    drawFlatLine(lines);
    console.timeEnd("regl: drawFlatLine");

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

  console.time("regl: findMax");
  findMax({
    buffer: heatBuffer,
    out: maxValueBuffer,
  });
  let maxDensity = Math.ceil(regl.read({ framebuffer: maxValueBuffer })[0]);

  console.timeEnd("regl: findMax");
  console.log("max density is:", maxDensity);

  drawTexture({
    buffer: heatBuffer,
    maxi: maxDensity,
  });

  let indexCache = range(data.length);

  return {
    filterAngle: (startTime, endTime, startAngle, endAngle) => {
      console.time("compute angle range");
      [startTime, endTime] = slope([startTime, endTime], 0, 1);
      [startAngle, endAngle] = slope([startAngle, endAngle], -90, 90);
      filterByAngles({
        buffer: flatLinesBuffer,
        out: filterAngleBuffer,
        startTime,
        endTime,
        startAngle,
        endAngle,
      });
      let filterResult = regl.read({ framebuffer: filterAngleBuffer });
      console.timeEnd("compute angle range");
      return new Float32Array(filterResult)
        .map((x, i) => (x ? i + 1 : 0))
        .filter((x) => x)
        .map((x) => x - 1);
    },
    filterRange: (startTime, endTime, startValue, endValue) => {
      console.time("compute rect range");
      [startTime, endTime, startValue, endValue] = slope(
        [startTime, endTime, startValue, endValue],
        0,
        1
      );
      filterByValues({
        buffer: flatLinesBuffer,
        out: filterAngleBuffer,
        startTime,
        endTime,
        startValue,
        endValue,
      });
      let filterResult = regl.read({ framebuffer: filterAngleBuffer });
      console.timeEnd("compute rect range");
      return new Float32Array(filterResult)
        .map((x, i) => (x ? i + 1 : 0))
        .filter((x) => x)
        .map((x) => x - 1);
    },
    findKTop: (isHighest, diverse) => {
      console.time("find-top");

      console.time("regl: calWeight");
      calWeight({
        buffer: flatLinesBuffer,
        heat: heatBuffer,
        out: filterAngleBuffer,
      });
      const weights = [...regl.read({ framebuffer: filterAngleBuffer })]
        .map((w, i) => {
          if (!data[i]) return { w: 0, i };
          return { w: w, i };
        })
        .filter((o) => indexCache.includes(o.i))
        .sort((a, b) => (isHighest ? b.w - a.w : a.w - b.w));
      console.timeEnd("regl: calWeight");

      if (isHighest && diverse) {
        let diversityList = [];
        for (let i = 0; diversityList.length < 3 && i < weights.length; i++) {
          let flag = true;
          for (let j = 0; j < diversityList.length; j++) {
            let insertLine = data[weights[i].i];
            let testLine = data[diversityList[j]];
            let testLength = Math.min(
              insertLine.xValues.length,
              testLine.xValues.length
            );
            let subArr = insertLine.yValues
              .slice(insertLine.yValues.length - testLength)
              .map(
                (v, i) =>
                  (v -
                    testLine.yValues[
                      testLine.yValues.length - testLength + i
                    ]) /
                  binY.stop
              );
            if (standardDeviation(subArr) < diverse) {
              flag = false;
              break;
            }
          }
          if (flag) {
            diversityList.push(weights[i].i);
          }
        }
        console.timeEnd("find-top");
        return diversityList;
      } else {
        console.timeEnd("find-top");
        return weights.slice(0, 3).map((o) => o.i);
      }
    },
    rerender: (indexes) => {
      if (!indexes) {
        indexes = range(data.length);
      }
      indexCache = indexes;
      console.time("Compute heatmap");
      // batches of 4 * repeats
      const batchSize = 4 * repeatsX * repeatsY;
      // index of series
      let series = 0;
      // how many series have already been drawn
      let finishedSeries = 0;
      regl.clear({
        color: [0, 0, 0, 0],
        framebuffer: resultBuffer,
      });
      for (let b = 0; b < indexes.length; b += batchSize) {
        console.time("Prepare Batch");
        // array to hold the lines that should be rendered
        let lines = new Array(Math.min(batchSize, indexes.length - series));
        // clear the lines buffer before the next batch
        regl.clear({
          color: [0, 0, 0, 0],
          framebuffer: linesBuffer,
        });
        loop2: for (let row = 0; row < repeatsY; row++) {
          for (let i = 0; i < 4 * repeatsX; i++) {
            if (series >= indexes.length) {
              break loop2;
            }
            // console.log(series, Math.floor(i / 4), row);
            let valueLength = data[indexes[series]].xValues.length;
            lines[series - finishedSeries] = {
              values: ndarray(data[indexes[series]].yValues),
              times: ndarray(data[indexes[series]].xValues),
              maxY: binY.stop,
              maxX: maxDataPoints,
              column: Math.floor(i / 4),
              row: row,
              colorMask: colorMask(i),
              count: valueLength,
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
      drawTexture({
        buffer: heatBuffer,
        maxi: maxDensity,
      });
    },
    destroy: () => {
      regl.destroy();
    },
    get maxDensity() {
      return maxDensity;
    },
    set maxDensity(v) {
      if (maxDensity == v || v < 1) return;
      maxDensity = v;
      drawTexture({
        buffer: heatBuffer,
        maxi: maxDensity,
      });
    },
    maxX: binX.stop,
    maxY: binY.stop,
  };
}

function standardDeviation(values) {
  var avg = average(values);

  var squareDiffs = values.map(function(value) {
    var diff = value - avg;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });

  var avgSquareDiff = average(squareDiffs);

  var stdDev = Math.sqrt(avgSquareDiff);
  return stdDev;
}

function average(data) {
  var sum = data.reduce(function(sum, value) {
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;
}
