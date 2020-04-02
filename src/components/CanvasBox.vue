<template>
  <div
    style="display:flex;flex-direction:row;align-items:center;margin-bottom:20px;position:relative"
  >
    <canvas
      ref="canvas"
      width="1000"
      height="500"
      :style="{ width: '1000px', height: '500px', cursor }"
      @mousedown="startMouse"
      @mousemove="moveMouse"
      @click="angleConfirm"
    ></canvas>
    <canvas
      ref="canvasRawLine"
      width="1000"
      height="500"
      style="width:1000px;height:500px;pointer-events:none;position:absolute;top:0;left:0"
    ></canvas>
    <canvas
      ref="canvasOverlay"
      width="1000"
      height="500"
      style="width:1000px;height:500px;pointer-events:none;position:absolute;top:0;left:0"
    ></canvas>
    <div class="control-panel">
      <p>Chart of "{{ timeName }}" - "{{ valueName }}"</p>
      <Button icon="md-sync" @click="resetFilter">reset filter</Button>
      <div>
        <span>Filter line strategy: </span>
        <RadioGroup v-model="filterMode" type="button">
          <Radio label="rect">Rectangle Range</Radio>
          <Radio label="ang">Angular Range</Radio>
        </RadioGroup>
      </div>
      <div>
        <span>Raw line strategy: </span>
        <RadioGroup v-model="rawMode" type="button">
          <Radio label="null">Null</Radio>
          <Radio label="out">Outlier</Radio>
          <Radio label="rep">Representative</Radio>
        </RadioGroup>
      </div>
    </div>
  </div>
</template>

<script>
import { binsx, binsy } from "../core/constants";
import { bin } from "vega-statistics";
import unobserve from "../store";
import render from "../core";

export default {
  props: {
    timeIndex: Number,
    valueIndex: Number,
    timeName: String,
    valueName: String,
    filter: Float32Array
  },
  data() {
    return {
      canvas: null,
      contextHandler: null,
      canvasContext: null,
      rawLineContext: null,
      filterMode: "rect",
      rawMode: "null",
      cursor: "crosshair",
      mouseDown: false,
      listener: null,
      coord: [0, 0, 0, 0, 0],
      boxes: []
    };
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
    }
  },
  methods: {
    getTopK() {
      let kArray = [];
      switch (this.rawMode) {
        case "out":
          kArray = this.contextHandler.findKTop(false);
          break;
        case "rep":
          kArray = this.contextHandler.findKTop(true);
          break;
      }
      this.rawLineContext.clearRect(0, 0, 1000, 500);
      const colorMap = ["aqua", "limegreen", "brown"];
      for (let i = 0; i < kArray.length; i++) {
        const data = unobserve.aggregatedData[kArray[i]];
        this.rawLineContext.globalAlpha = 1;
        this.rawLineContext.strokeStyle = colorMap[i % 3];
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
    resetFilter() {
      this.$emit("filterChange", undefined);
      this.boxes = [];
      this.mouseDown = false;
      this.canvasContext.clearRect(0, 0, 1000, 500);
    },
    startMouse(e) {
      if (this.mouseDown) return;
      this.mouseDown = true;
      let x = e.offsetX,
        y = e.offsetY,
        flag = false;
      if (this.filterMode == "rect") {
        x /= 1000;
        y = 1 - y / 500;
        for (let box of this.boxes) {
          if (
            (Math.abs(x - box[0]) <= 0.002 || Math.abs(x - box[1]) <= 0.002) &&
            y > box[2] &&
            y < box[3]
          ) {
            if (Math.abs(x - box[0]) <= 0.002) {
              this.mouseDown = "left";
            } else {
              this.mouseDown = "right";
            }
            flag = true;
          } else if (
            (Math.abs(y - box[2]) <= 0.004 || Math.abs(y - box[3]) <= 0.004) &&
            x > box[0] &&
            x < box[1]
          ) {
            if (Math.abs(y - box[2]) <= 0.004) {
              this.mouseDown = "bottom";
            } else {
              this.mouseDown = "top";
            }
            flag = true;
          } else if (x > box[0] && x < box[1] && y > box[2] && y < box[3]) {
            this.mouseDown = "move";
            flag = true;
          }
          if (flag) {
            this.coord = [
              box[0] * 1000,
              500 - box[3] * 500,
              box[1] * 1000,
              500 - box[2] * 500,
              0
            ];
            this.boxes.splice(this.boxes.indexOf(box), 1);
            let filterResult = undefined;
            this.boxes.forEach(b => {
              let tmpResult = this.contextHandler.filterRange(...b);
              if (!filterResult) {
                filterResult = tmpResult;
              } else {
                filterResult = filterResult.filter(x => tmpResult.includes(x));
              }
            });
            this.$emit("filterChange", filterResult);
            break;
          }
        }
      } else {
        if (
          Math.abs(x - this.coord[0]) <= 2 &&
          Math.abs(y - this.coord[1]) <= 2
        ) {
          this.mouseDown = "move";
          flag = true;
        } else if (
          Math.abs(x - this.coord[2]) <= 2 &&
          Math.abs(y - this.coord[3]) <= Math.abs(this.coord[4] - this.coord[3])
        ) {
          this.mouseDown = "time";
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
          this.mouseDown = "angular";
          flag = true;
        }
      }
      if (!flag) {
        this.coord = [0, 0, 0, 0, 0];
        this.coord[0] = e.offsetX;
        this.coord[1] = e.offsetY;
      }
      this.listener = this.startFilter.bind(this);
      window.addEventListener("mouseup", this.listener);
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
        case "move":
          this.cursor = "grabbing";
          return;
        case "left":
        case "right":
        case "time":
          this.cursor = "ew-resize";
          return;
        case "top":
        case "bottom":
        case "angular":
        case "range":
          this.cursor = "ns-resize";
          return;
        case "magnet":
        case true:
          this.cursor = "crosshair";
          return;
        default:
          if (this.filterMode == "rect") {
            x /= 1000;
            y = 1 - y / 500;
            for (let box of this.boxes) {
              if (
                (Math.abs(x - box[0]) <= 0.002 ||
                  Math.abs(x - box[1]) <= 0.002) &&
                y > box[2] &&
                y < box[3]
              ) {
                this.cursor = "ew-resize";
                return;
              }
              if (
                (Math.abs(y - box[2]) <= 0.004 ||
                  Math.abs(y - box[3]) <= 0.004) &&
                x > box[0] &&
                x < box[1]
              ) {
                this.cursor = "ns-resize";
                return;
              }
              if (x > box[0] && x < box[1] && y > box[2] && y < box[3]) {
                this.cursor = "move";
                return;
              }
            }
          } else {
            if (
              Math.abs(x - this.coord[0]) <= 2 &&
              Math.abs(y - this.coord[1]) <= 2
            ) {
              this.cursor = "move";
              return;
            }
            if (
              Math.abs(x - this.coord[2]) <= 2 &&
              Math.abs(y - this.coord[3]) <=
                Math.abs(this.coord[4] - this.coord[3])
            ) {
              this.cursor = "ew-resize";
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
              this.cursor = "ns-resize";
              return;
            }
          }
          this.cursor = "crosshair";
      }
    },
    moveMouse(e) {
      this.cursorShape(e);
      if (!this.mouseDown) return;
      if (this.mouseDown == "magnet") {
        this.coord[4] = e.offsetY;
      } else if (this.mouseDown == "move") {
        this.coord[0] += e.movementX;
        this.coord[2] += e.movementX;
        this.coord[1] += e.movementY;
        this.coord[3] += e.movementY;
        this.coord[4] += e.movementY;
      } else if (this.mouseDown == "left") {
        this.coord[0] = e.offsetX;
      } else if (this.mouseDown == "right") {
        this.coord[2] = e.offsetX;
      } else if (this.mouseDown == "bottom") {
        this.coord[3] = e.offsetY;
      } else if (this.mouseDown == "top") {
        this.coord[1] = e.offsetY;
      } else if (this.mouseDown == "time") {
        this.coord[2] = Math.max(this.coord[0] + 1, e.offsetX);
      } else if (this.mouseDown == "angular") {
        this.coord[3] += e.movementY;
        this.coord[4] += e.movementY;
      } else {
        this.coord[2] = e.offsetX;
        this.coord[3] = e.offsetY;
      }
      this.canvasContext.clearRect(0, 0, 1000, 500);
      if (this.filterMode == "rect") {
        this.canvasContext.globalAlpha = 0.3;
        this.canvasContext.fillStyle = "black";
        this.drawBoxes();
        this.canvasContext.fillRect(
          Math.min(this.coord[0], this.coord[2]),
          Math.min(this.coord[1], this.coord[3]),
          Math.abs(this.coord[2] - this.coord[0]),
          Math.abs(this.coord[3] - this.coord[1])
        );
      } else {
        this.canvasContext.globalAlpha = 1;
        this.canvasContext.strokeStyle = "black";
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
          this.canvasContext.fillStyle = "black";
          this.canvasContext.beginPath();
          this.canvasContext.moveTo(this.coord[0], this.coord[1]);
          this.canvasContext.lineTo(this.coord[2], this.coord[3] - offset);
          this.canvasContext.lineTo(this.coord[2], this.coord[3] + offset);
          this.canvasContext.fill();
        }
      }
    },
    startFilter() {
      if (this.filterMode == "rect") {
        this.mouseDown = false;
        if (this.coord[2] != 0 || this.coord[3] != 0) {
          let [left, right] = [this.coord[0], this.coord[2]]
            .map(x => x / 1000)
            .sort();
          let [bottom, top] = [this.coord[1], this.coord[3]]
            .map(x => 1 - x / 500)
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
              "filterChange",
              this.filter.filter(x => filterResult.includes(x))
            );
          } else {
            this.$emit("filterChange", filterResult);
          }
        }
      }
      window.removeEventListener("mouseup", this.listener);
      this.listener = null;
    },
    angleConfirm() {
      if (
        this.filterMode == "ang" &&
        this.coord[2] &&
        this.coord[3] &&
        this.coord[0] != this.coord[2]
      ) {
        if (this.mouseDown === true) {
          this.mouseDown = "magnet";
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
            -(
              Math.atan(
                (this.coord[3] + offset - this.coord[1]) /
                  (this.coord[2] - this.coord[0])
              ) / Math.PI
            ) * 180;
          let endAngle =
            -(
              Math.atan(
                (this.coord[3] - offset - this.coord[1]) /
                  (this.coord[2] - this.coord[0])
              ) / Math.PI
            ) * 180;
          this.$emit(
            "filterChange",
            this.contextHandler.filterAngle(
              this.coord[0] / 1000,
              this.coord[2] / 1000,
              startAngle,
              endAngle
            )
          );
        }
      }
    }
  },
  mounted() {
    this.$Spin.show();
    setTimeout(() => {
      this.canvas = this.$refs.canvas;
      this.canvasContext = this.$refs.canvasOverlay.getContext("2d");
      this.rawLineContext = this.$refs.canvasRawLine.getContext("2d");
      let scopeData = unobserve.aggregatedData.map(row => {
        return {
          xValues: row[this.timeIndex],
          yValues: row[this.valueIndex]
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

      // compute nice bin boundaries
      const binConfigX = bin({ maxbins: binsx, extent: [0, maxX - minX] });
      const binConfigY = bin({ maxbins: binsy, extent: [0, maxY] });
      render(
        scopeData,
        [0, maxX - minX, minY, maxY],
        binConfigX,
        binConfigY,
        this.canvas
      ).then(handler => (this.contextHandler = handler));
      this.$Spin.hide();
    }, 0); // ensure spin shows
  },
  beforeDestroy() {
    if (this.contextHandler) {
      this.contextHandler.destroy();
    }
  }
};
</script>

<style lang="scss">
.control-panel {
  display: flex;
  flex-direction: column;
  margin-left: 50px;

  > * {
    margin-bottom: 12px !important;
  }
}
</style>
