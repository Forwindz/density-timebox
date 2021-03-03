<template>
  <div
    style="display:flex;flex-direction:row;align-items:center;margin:15px 0 15px 20px;position:relative"
  >
    <canvas
      ref="canvas"
      width="1000"
      height="500"
      :style="{
        width: '1000px',
        height: '500px',
        cursor,
        transform: `scaleY(${upsideDownFactor})`,
      }"
      @mousedown="startMouse"
      @mousemove="moveMouse"
      @click="angleConfirm"
    ></canvas>
    <canvas
      ref="canvasRawLine"
      width="1000"
      height="500"
      style="width:1000px;height:500px;pointer-events:none;position:absolute;top:0;left:0"
      :style="{
        transform: `scaleY(${upsideDownFactor})`,
      }"
    ></canvas>
    <canvas
      ref="canvasOverlay"
      width="1000"
      height="500"
      style="width:1000px;height:500px;pointer-events:none;position:absolute;top:0;left:0"
      :style="{
        transform: `scaleY(${upsideDownFactor})`,
      }"
    ></canvas>
    <div
      ref="axisTop"
      style="width:1000px;height:30px;position:absolute;top:-30px;left:0"
    ></div>
    <div
      ref="axisBottom"
      style="width:1000px;height:30px;position:absolute;bottom:-30px;left:0"
    ></div>
    <div
      ref="axisLeft"
      style="width:30px;height:500px;position:absolute;top:0px;left:-30px"
    ></div>
    <div class="control-panel">
      <div>
        <span>Filter line strategy: </span>
        <RadioGroup v-model="filterMode" type="button">
          <Radio label="knn">KNN</Radio>
          <Radio label="rnn">Radius</Radio>
          <Radio label="rect">Brush</Radio>
          <Radio label="ang">Angle</Radio>
          <Radio label="attr">Attr</Radio>
        </RadioGroup>
      </div>
      <div>
        <span>Representative line config: </span>
        <!-- <RadioGroup v-model="rawMode" type="button">
          <Radio label="null">Null</Radio>
          <Radio label="cur">Hover</Radio>
          <Radio label="out">Min</Radio>
          <Radio label="rep">Max</Radio>
        </RadioGroup> -->
      </div>
      <div v-if="rawMode == 'rep'" style="margin-left:12px">
        <div style="display:flex;align-items:center">
          <span style="margin-right:8px">Rep-line count</span>
          <Slider
            v-model="repCount"
            :min="0"
            :max="20"
            :step="1"
            show-tip="never"
            style="flex-grow:1"
          />
          <span style="margin-left:8px">3</span>
        </div>
        <div style="display:flex;align-items:center">
          <span style="margin-right:8px">Weight</span>
          <Slider
            v-model="diverse"
            :min="0"
            :max="1"
            :step="0.001"
            show-tip="never"
            style="flex-grow:1"
          />
          <span style="margin-left:8px">Diverse</span>
        </div>
      </div>
      <div v-if="rawMode != 'null'">
        <div v-for="i in [0, 1, 2]" :key="i">
          <span
            ><ColorPicker v-model="colorMap[i]" recommend alpha></ColorPicker
          ></span>
          <Poptip
            trigger="hover"
            placement="bottom-end"
            :width="800"
            title="Data preview"
            @on-popper-show="previewIndex = rawLines[i]"
          >
            <span style="margin-left:12px" v-if="i < rawLineNames.length">{{
              rawLineNames[i]
            }}</span>
            <div slot="content">
              <Table :columns="headers" :data="previewData" />
            </div>
          </Poptip>
        </div>
      </div>
      <div>
        <span>Color map: </span>
        <span>1</span>
        <span class="color-map"></span>
        <InputNumber :min="1" v-model="maxDensity" :active-change="false" />
      </div>
      <div>
        <span>Reverse y-axis:</span>
        <iSwitch style="margin-left:12px" v-model="upsideDown" />
      </div>
      <div>
        <span>Show value of cursor:</span>
        <iSwitch style="margin-left:12px" v-model="showCursorValue" />
      </div>
      <div>
        <span>Normalize density:</span>
        <iSwitch style="margin-left:12px" v-model="normalizeDensity" />
      </div>
      <Button icon="md-cloud-download" type="primary" @click="exportFig"
        >export figure</Button
      >
      <Button icon="md-cloud-download" type="primary" @click="exportFig"
        >view selected data</Button
      >
    </div>
  </div>
</template>

<script>
import { binsx, binsy } from '../core/constants';
import { exportCanvas } from '../core/utils';
import { bin } from 'vega-statistics';
import unobserve from '../store';
import render from '../core';
import * as d3 from 'd3';

export default {
  props: {
    timeIndex: Number,
    valueIndex: Number,
    timeName: String,
    valueName: String,
    filter: Float32Array,
  },
  data() {
    return {
      canvas: null,
      contextHandler: null,
      canvasContext: null,
      rawLineContext: null,
      filterMode: 'rect',
      rawMode: 'rep',
      repCount: 3,
      diverse: 0.15,
      cursor: 'crosshair',
      mouseDown: false,
      listener: null,
      hoverListener: null,
      coord: [0, 0, 0, 0, 0],
      boxes: [],
      maxDensity: 1,
      rawLines: [],
      colorMap: ['aqua', 'limegreen', 'lightgreen'],
      upsideDown: false,
      showCursorValue: true,
      normalizeDensity: true,
      headers: [],
      previewIndex: -1,
    };
  },
  computed: {
    rawLineNames() {
      return [...this.rawLines].map((i) => unobserve.aggregatedData[i].key);
    },
    upsideDownFactor() {
      return this.upsideDown ? -1 : 1;
    },
    previewData() {
      if (this.previewIndex < 0) return [];
      return [...unobserve.aggregatedData[this.previewIndex].ref]
        .slice(0, 6)
        .map((i, ii) =>
          ii == 5 ? this.headers.map((_) => '...') : unobserve.data[i]
        );
    },
  },
  watch: {
    filter(value) {
      this.contextHandler.rerender(value);
      this.getTopK();
    },
    contextHandler() {
      if (this.filter) {
        this.contextHandler.rerender(this.filter);
      }
    },
    filterMode() {
      this.resetFilter();
    },
    rawMode() {
      this.getTopK();
    },
    maxDensity() {
      this.contextHandler.maxDensity = this.maxDensity;
    },
    diverse() {
      this.getTopK();
    },
    colorMap() {
      const kArray = this.rawLines;
      this.rawLineContext.clearRect(0, 0, 1000, 500);
      const colorMap = this.colorMap;
      for (let i = 0; i < kArray.length; i++) {
        const data = unobserve.aggregatedData[kArray[i]];
        this.rawLineContext.globalAlpha = 1;
        this.rawLineContext.strokeStyle = colorMap[i % 3];
        this.rawLineContext.lineWidth = 2;
        this.rawLineContext.beginPath();
        this.rawLineContext.moveTo(
          (data[this.timeIndex][0] / this.contextHandler.maxX) * 1000,
          500 - (data[this.valueIndex][0] / this.contextHandler.maxY) * 500
        );
        for (let j = 0; j < data[this.timeIndex].length; j++) {
          this.rawLineContext.lineTo(
            (data[this.timeIndex][j] / this.contextHandler.maxX) * 1000,
            500 - (data[this.valueIndex][j] / this.contextHandler.maxY) * 500
          );
        }
        this.rawLineContext.stroke();
      }
    },
  },
  methods: {
    hoverLines(e) {
      const x = e.offsetX;
      const y = e.offsetY;
      const kArray = this.contextHandler
        .filterRange(
          (x - 5) / 1000,
          (x + 5) / 1000,
          1 - (y + 5) / 500,
          1 - (y - 5) / 500
        )
        .filter((x) => !this.filter || this.filter.includes(x))
        .slice(0, 3);
      this.rawLineContext.clearRect(0, 0, 1000, 500);
      const colorMap = this.colorMap;
      for (let i = kArray.length - 1; i >= 0; i--) {
        const data = unobserve.aggregatedData[kArray[i]];
        this.rawLineContext.globalAlpha = 1;
        this.rawLineContext.strokeStyle = colorMap[i % 3];
        this.rawLineContext.lineWidth = 2;
        this.rawLineContext.beginPath();
        this.rawLineContext.moveTo(
          (data[this.timeIndex][0] / this.contextHandler.maxX) * 1000,
          500 - (data[this.valueIndex][0] / this.contextHandler.maxY) * 500
        );
        for (let j = 0; j < data[this.timeIndex].length; j++) {
          this.rawLineContext.lineTo(
            (data[this.timeIndex][j] / this.contextHandler.maxX) * 1000,
            500 - (data[this.valueIndex][j] / this.contextHandler.maxY) * 500
          );
        }
        this.rawLineContext.stroke();
      }
      this.rawLines = kArray;
    },
    getTopK() {
      let kArray = [];
      if (this.hoverListener) {
        this.$refs.canvas.removeEventListener('mousemove', this.hoverListener);
      }
      switch (this.rawMode) {
        case 'cur':
          this.hoverListener = this.hoverLines.bind(this);
          this.$refs.canvas.addEventListener('mousemove', this.hoverListener);
          break;
        case 'out':
          kArray = this.contextHandler.findKTop(false);
          break;
        case 'rep':
          kArray = this.contextHandler.findKTop(true, this.diverse);
          break;
      }
      this.rawLineContext.clearRect(0, 0, 1000, 500);
      const colorMap = this.colorMap;
      for (let i = kArray.length - 1; i >= 0; i--) {
        const data = unobserve.aggregatedData[kArray[i]];
        this.rawLineContext.globalAlpha = 1;
        this.rawLineContext.strokeStyle = colorMap[i % 3];
        this.rawLineContext.lineWidth = 2;
        this.rawLineContext.beginPath();
        this.rawLineContext.moveTo(
          (data[this.timeIndex][0] / this.contextHandler.maxX) * 1000,
          500 - (data[this.valueIndex][0] / this.contextHandler.maxY) * 500
        );
        for (let j = 0; j < data[this.timeIndex].length; j++) {
          this.rawLineContext.lineTo(
            (data[this.timeIndex][j] / this.contextHandler.maxX) * 1000,
            500 - (data[this.valueIndex][j] / this.contextHandler.maxY) * 500
          );
        }
        this.rawLineContext.stroke();
      }
      this.rawLines = kArray;
    },
    resetFilter() {
      this.$emit('filterChange', undefined);
      this.boxes = [];
      this.mouseDown = false;
      this.canvasContext.clearRect(0, 0, 1000, 500);
      this.coord = [0, 0, 0, 0, 0];
    },
    startMouse(e) {
      if (this.mouseDown) return;
      this.mouseDown = true;
      let x = e.offsetX,
        y = e.offsetY,
        flag = false;
      if (this.filterMode == 'rect') {
        x /= 1000;
        y = 1 - y / 500;
        for (let box of this.boxes) {
          if (
            (Math.abs(x - box[0]) <= 0.002 || Math.abs(x - box[1]) <= 0.002) &&
            y > box[2] &&
            y < box[3]
          ) {
            if (Math.abs(x - box[0]) <= 0.002) {
              this.mouseDown = 'left';
            } else {
              this.mouseDown = 'right';
            }
            flag = true;
          } else if (
            (Math.abs(y - box[2]) <= 0.004 || Math.abs(y - box[3]) <= 0.004) &&
            x > box[0] &&
            x < box[1]
          ) {
            if (Math.abs(y - box[2]) <= 0.004) {
              this.mouseDown = 'bottom';
            } else {
              this.mouseDown = 'top';
            }
            flag = true;
          } else if (x > box[0] && x < box[1] && y > box[2] && y < box[3]) {
            this.mouseDown = 'move';
            flag = true;
          }
          if (flag) {
            this.coord = [
              box[0] * 1000,
              500 - box[3] * 500,
              box[1] * 1000,
              500 - box[2] * 500,
              0,
            ];
            this.boxes.splice(this.boxes.indexOf(box), 1);
            let filterResult = undefined;
            this.boxes.forEach((b) => {
              let tmpResult = this.contextHandler.filterRange(...b);
              if (!filterResult) {
                filterResult = tmpResult;
              } else {
                filterResult = filterResult.filter((x) =>
                  tmpResult.includes(x)
                );
              }
            });
            this.$emit('filterChange', filterResult);
            break;
          }
        }
      } else {
        if (
          Math.abs(x - this.coord[0]) <= 2 &&
          Math.abs(y - this.coord[1]) <= 2
        ) {
          this.mouseDown = 'move';
          flag = true;
        } else if (
          Math.abs(x - this.coord[2]) <= 2 &&
          Math.abs(y - this.coord[3]) <= Math.abs(this.coord[4] - this.coord[3])
        ) {
          this.mouseDown = 'time';
          flag = true;
        } else if (
          x > this.coord[0] &&
          x < this.coord[2] &&
          y >
            (this.coord[1] * (this.coord[2] - x)) /
              (this.coord[2] - this.coord[0]) +
              ((this.coord[3] - Math.abs(this.coord[4] - this.coord[3])) *
                (x - this.coord[0])) /
                (this.coord[2] - this.coord[0]) &&
          y <
            (this.coord[1] * (this.coord[2] - x)) /
              (this.coord[2] - this.coord[0]) +
              ((this.coord[3] + Math.abs(this.coord[4] - this.coord[3])) *
                (x - this.coord[0])) /
                (this.coord[2] - this.coord[0])
        ) {
          this.mouseDown = 'angular';
          flag = true;
        }
      }
      if (!flag) {
        this.coord = [0, 0, 0, 0, 0];
        this.coord[0] = e.offsetX;
        this.coord[1] = e.offsetY;
      }
      this.listener = this.startFilter.bind(this);
      window.addEventListener('mouseup', this.listener);
    },
    drawBoxes() {
      for (let box of this.boxes) {
        this.canvasContext.fillRect(
          box[0] * 1000,
          500 - box[3] * 500,
          (box[1] - box[0]) * 1000,
          (box[3] - box[2]) * 500
        );
      }
    },
    cursorShape(e) {
      let x = e.offsetX,
        y = e.offsetY;
      switch (this.mouseDown) {
        case 'move':
          this.cursor = 'grabbing';
          return;
        case 'left':
        case 'right':
        case 'time':
          this.cursor = 'ew-resize';
          return;
        case 'top':
        case 'bottom':
        case 'angular':
        case 'range':
          this.cursor = 'ns-resize';
          return;
        case 'magnet':
        case true:
          this.cursor = 'crosshair';
          return;
        default:
          if (this.filterMode == 'rect') {
            x /= 1000;
            y = 1 - y / 500;
            for (let box of this.boxes) {
              if (
                (Math.abs(x - box[0]) <= 0.002 ||
                  Math.abs(x - box[1]) <= 0.002) &&
                y > box[2] &&
                y < box[3]
              ) {
                this.cursor = 'ew-resize';
                return;
              }
              if (
                (Math.abs(y - box[2]) <= 0.004 ||
                  Math.abs(y - box[3]) <= 0.004) &&
                x > box[0] &&
                x < box[1]
              ) {
                this.cursor = 'ns-resize';
                return;
              }
              if (x > box[0] && x < box[1] && y > box[2] && y < box[3]) {
                this.cursor = 'move';
                return;
              }
            }
          } else {
            if (
              Math.abs(x - this.coord[0]) <= 2 &&
              Math.abs(y - this.coord[1]) <= 2
            ) {
              this.cursor = 'move';
              return;
            }
            if (
              Math.abs(x - this.coord[2]) <= 2 &&
              Math.abs(y - this.coord[3]) <=
                Math.abs(this.coord[4] - this.coord[3])
            ) {
              this.cursor = 'ew-resize';
              return;
            }
            if (
              x > this.coord[0] &&
              x < this.coord[2] &&
              y >
                (this.coord[1] * (this.coord[2] - x)) /
                  (this.coord[2] - this.coord[0]) +
                  ((this.coord[3] - Math.abs(this.coord[4] - this.coord[3])) *
                    (x - this.coord[0])) /
                    (this.coord[2] - this.coord[0]) &&
              y <
                (this.coord[1] * (this.coord[2] - x)) /
                  (this.coord[2] - this.coord[0]) +
                  ((this.coord[3] + Math.abs(this.coord[4] - this.coord[3])) *
                    (x - this.coord[0])) /
                    (this.coord[2] - this.coord[0])
            ) {
              this.cursor = 'ns-resize';
              return;
            }
          }
          this.cursor = 'crosshair';
      }
    },
    moveMouse(e) {
      this.cursorShape(e);
      if (!this.mouseDown) return;
      if (this.mouseDown == 'magnet') {
        this.coord[4] = e.offsetY;
      } else if (this.mouseDown == 'move') {
        this.coord[0] += e.movementX;
        this.coord[2] += e.movementX;
        this.coord[1] += e.movementY * this.upsideDownFactor;
        this.coord[3] += e.movementY * this.upsideDownFactor;
        this.coord[4] += e.movementY * this.upsideDownFactor;
      } else if (this.mouseDown == 'left') {
        this.coord[0] = e.offsetX;
      } else if (this.mouseDown == 'right') {
        this.coord[2] = e.offsetX;
      } else if (this.mouseDown == 'bottom') {
        this.coord[3] = e.offsetY;
      } else if (this.mouseDown == 'top') {
        this.coord[1] = e.offsetY;
      } else if (this.mouseDown == 'time') {
        this.coord[2] = Math.max(this.coord[0] + 1, e.offsetX);
      } else if (this.mouseDown == 'angular') {
        this.coord[3] += e.movementY * this.upsideDownFactor;
        this.coord[4] += e.movementY * this.upsideDownFactor;
      } else {
        this.coord[2] = e.offsetX;
        this.coord[3] = e.offsetY;
      }
      this.canvasContext.clearRect(0, 0, 1000, 500);
      if (this.filterMode == 'rect') {
        this.canvasContext.globalAlpha = 0.3;
        this.canvasContext.fillStyle = 'black';
        this.drawBoxes();
        this.canvasContext.fillRect(
          Math.min(this.coord[0], this.coord[2]),
          Math.min(this.coord[1], this.coord[3]),
          Math.abs(this.coord[2] - this.coord[0]),
          Math.abs(this.coord[3] - this.coord[1])
        );
      } else {
        this.canvasContext.globalAlpha = 1;
        this.canvasContext.strokeStyle = 'black';
        this.canvasContext.beginPath();
        this.canvasContext.moveTo(this.coord[0], this.coord[1]);
        this.canvasContext.lineTo(this.coord[2], this.coord[3]);
        this.canvasContext.stroke();
        if (this.mouseDown && this.mouseDown !== true) {
          let offset = this.coord[4] - this.coord[3];
          this.canvasContext.beginPath();
          this.canvasContext.moveTo(this.coord[2], this.coord[3] - offset);
          this.canvasContext.lineTo(this.coord[2], this.coord[3] + offset);
          this.canvasContext.stroke();
          this.canvasContext.globalAlpha = 0.3;
          this.canvasContext.fillStyle = 'black';
          this.canvasContext.beginPath();
          this.canvasContext.moveTo(this.coord[0], this.coord[1]);
          this.canvasContext.lineTo(this.coord[2], this.coord[3] - offset);
          this.canvasContext.lineTo(this.coord[2], this.coord[3] + offset);
          this.canvasContext.fill();
        }
      }
    },
    startFilter() {
      if (this.filterMode == 'rect') {
        this.mouseDown = false;
        if (this.coord[2] != 0 || this.coord[3] != 0) {
          let [left, right] = [this.coord[0], this.coord[2]]
            .map((x) => x / 1000)
            .sort();
          let [bottom, top] = [this.coord[1], this.coord[3]]
            .map((x) => 1 - x / 500)
            .sort();
          this.boxes.push([left, right, bottom, top]);
          let filterResult = this.contextHandler.filterRange(
            left,
            right,
            bottom,
            top
          );
          if (this.filter) {
            this.$emit(
              'filterChange',
              this.filter.filter((x) => filterResult.includes(x))
            );
          } else {
            this.$emit('filterChange', filterResult);
          }
        }
      }
      window.removeEventListener('mouseup', this.listener);
      this.listener = null;
    },
    angleConfirm() {
      if (
        this.filterMode == 'ang' &&
        this.coord[2] &&
        this.coord[3] &&
        this.coord[0] != this.coord[2]
      ) {
        if (this.mouseDown === true) {
          this.mouseDown = 'magnet';
          let start = [0, 0];
          let end = [0, 0];
          if (this.coord[0] < this.coord[2]) {
            start = this.coord.slice(0, 2);
            end = this.coord.slice(2, 4);
          } else {
            end = this.coord.slice(0, 2);
            start = this.coord.slice(2, 4);
          }
          this.coord = [...start, ...end, 0];
        } else if (this.mouseDown) {
          this.mouseDown = false;
          let offset = Math.abs(this.coord[4] - this.coord[3]);
          let startAngle =
            -(this.coord[3] + offset - this.coord[1]) /
            (this.coord[2] - this.coord[0]);
          let endAngle =
            -(this.coord[3] - offset - this.coord[1]) /
            (this.coord[2] - this.coord[0]);
          this.$emit(
            'filterChange',
            this.contextHandler.filterAngle(
              this.coord[0] / 1000,
              this.coord[2] / 1000,
              startAngle,
              endAngle
            )
          );
        }
      }
    },
    exportFig() {
      exportCanvas(
        [this.$refs.canvas, this.$refs.canvasOverlay, this.$refs.canvasRawLine],
        this.upsideDown
      );
    },
  },
  mounted() {
    this.headers = unobserve.headers.map((title, key) => {
      return { title, key, minWidth: 150 };
    });
    this.$Spin.show();
    setTimeout(() => {
      this.canvas = this.$refs.canvas;
      this.canvasContext = this.$refs.canvasOverlay.getContext('2d');
      this.rawLineContext = this.$refs.canvasRawLine.getContext('2d');
      let scopeData = unobserve.aggregatedData.map((row) => {
        return {
          xValues: row[this.timeIndex],
          yValues: row[this.valueIndex],
        };
      });

      let maxY = scopeData[0].yValues[0],
        minY = maxY;
      let maxX = scopeData[0].xValues[0],
        minX = maxX;
      for (let i = 0; i < scopeData.length; i++) {
        let length = scopeData[i].xValues.length;
        for (let j = 0; j < length; j++) {
          let yValue = scopeData[i].yValues[j],
            xValue = scopeData[i].xValues[j];
          maxY = Math.max(maxY, yValue);
          minY = Math.min(minY, yValue);
          maxX = Math.max(maxX, xValue);
          minX = Math.min(minX, xValue);
        }
      }
      for (let i = 0; i < scopeData.length; i++) {
        let length = scopeData[i].xValues.length;
        for (let j = 0; j < length; j++) {
          scopeData[i].xValues[j] -= minX;
        }
      }

      // const scaleY = d3
      //   .scaleLinear()
      //   .domain([0, maxY])
      //   .range([0, 500]);

      // compute nice bin boundaries
      const binConfigX = bin({ maxbins: binsx, extent: [0, maxX - minX] });
      const binConfigY = bin({ maxbins: binsy, extent: [0, maxY] });
      render(
        scopeData,
        [0, maxX - minX, minY, maxY],
        binConfigX,
        binConfigY,
        this.canvas
      ).then((handler) => {
        this.contextHandler = handler;
        this.maxDensity = handler.maxDensity;
      });
      this.$Spin.hide();
    }, 0); // ensure spin shows
  },
  beforeDestroy() {
    if (this.contextHandler) {
      this.contextHandler.destroy();
    }
  },
};
</script>

<style lang="scss">
.control-panel {
  display: flex;
  flex-direction: column;
  margin-left: 50px;

  > * {
    margin-bottom: 8px !important;
  }
}

.color-map {
  background-image: linear-gradient(
    to right,
    #fcfdbf,
    #fece91 10%,
    #fe9f6d 20%,
    #f76f5c 30%,
    #de4968 40%,
    #b6377a 50%,
    #8c2981 60%,
    #651a80 70%,
    #3b0f70 80%,
    #150e37 90%,
    #000004
  );
  display: inline-block;
  width: 200px;
  height: 32px;
  margin: 0 10px;
  vertical-align: middle;
}
</style>
