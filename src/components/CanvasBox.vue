<template>
  <div
    style="display:flex;flex-direction:row;align-items:center;margin-bottom:20px;position:relative"
  >
    <canvas
      ref="canvas"
      width="1000"
      height="500"
      style="width:1000px;height:500px;cursor:crosshair"
      @mousedown="startMouse"
      @mousemove="moveMouse"
      @click="angleConfirm"
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
      <!-- <div>
        <span>Raw line strategy: </span>
        <RadioGroup v-model="rawMode" type="button">
          <Radio label="null">Null</Radio>
          <Radio label="out">Outlier</Radio>
          <Radio label="rep">Representative</Radio>
        </RadioGroup>
      </div> -->
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
      filterMode: "rect",
      rawMode: "null",
      mouseDown: false,
      listener: null,
      coord: [0, 0, 0, 0, 0],
      boxes: []
    };
  },
  watch: {
    filter(value) {
      this.contextHandler.rerender(value);
    },
    contextHandler() {
      if (this.filter) {
        this.contextHandler.rerender(this.filter);
      }
    },
    filterMode() {
      this.resetFilter();
    }
  },
  methods: {
    resetFilter() {
      this.$emit("filterChange", undefined);
      this.boxes = [];
      this.mouseDown = false;
      this.canvasContext.clearRect(0, 0, 1000, 500);
    },
    filterBox() {},
    startMouse(e) {
      if (this.mouseDown) return;
      this.mouseDown = true;
      this.coord = [0, 0, 0, 0, 0];
      this.coord[0] = e.offsetX;
      this.coord[1] = e.offsetY;
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
    moveMouse(e) {
      if (!this.mouseDown) return;
      if (this.mouseDown == "magnet") {
        this.coord[4] = e.offsetY;
      } else {
        this.coord[2] = e.offsetX;
        this.coord[3] = e.offsetY;
      }
      this.canvasContext.clearRect(0, 0, 1000, 500);
      if (this.filterMode == "rect") {
        this.canvasContext.globalAlpha = 0.3;
        this.canvasContext.fillColor = "black";
        this.drawBoxes();
        this.canvasContext.fillRect(
          Math.min(this.coord[0], this.coord[2]),
          Math.min(this.coord[1], this.coord[3]),
          Math.abs(this.coord[2] - this.coord[0]),
          Math.abs(this.coord[3] - this.coord[1])
        );
      } else {
        this.canvasContext.globalAlpha = 1;
        this.canvasContext.stokeColor = "black";
        this.canvasContext.beginPath();
        this.canvasContext.moveTo(this.coord[0], this.coord[1]);
        this.canvasContext.lineTo(this.coord[2], this.coord[3]);
        this.canvasContext.stroke();
        if (this.mouseDown == "magnet") {
          let offset = this.coord[4] - this.coord[3];
          this.canvasContext.beginPath();
          this.canvasContext.moveTo(this.coord[2], this.coord[3] - offset);
          this.canvasContext.lineTo(this.coord[2], this.coord[3] + offset);
          this.canvasContext.stroke();
          this.canvasContext.globalAlpha = 0.3;
          this.canvasContext.fillColor = "black";
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
        } else if (this.mouseDown == "magnet") {
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
