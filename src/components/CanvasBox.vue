<template>
  <div>
    <div
        style="display:flex;flex-direction:row;align-items:center;margin:15px 0 15px 20px;position:relative"
    >
      <div
          style="width: 1000px; height: 500px; opacity: 0; pointer-events: none;"
      ></div>
      <canvas
          id="canvas"
          width="1000"
          height="500"
          style="transform: scaleY(1); position: absolute; left: 0; top: 0;"
          @mousedown="canvasMousedown"
          @mouseup="canvasMouseup"
          @mousemove="canvasMousemove"
          @wheel="canvasWheel"
          @contextmenu="mouseContextmenu"
      ></canvas>
      <canvas
          id="selectionCanvas"
          width="1000"
          height="500"
          style="transform: scaleY(1); position: absolute; left: 0; top: 0; pointer-events: none;"
      >
      </canvas>
      <canvas
          id="selectionLayer"
          width="1000"
          height="500"
          style="
          transform: scaleY(1);
          position: absolute;
          left: 0;
          top: 0;
          pointer-events: none;
        "
      ></canvas>
      <canvas
          id="rep_layer"
          width="1000"
          height="500"
          style="transform: scaleY(1); position: absolute; left: 0; top: 0; pointer-events: none;"
      >
      </canvas>
      <canvas
          id="raw_lines"
          width="1000"
          height="500"
          style="transform: scaleY(1); position: absolute; left: 0; top: 0; pointer-events: none;"
      >
      </canvas>
      <canvas
          id="mouseLayer"
          width="1000"
          height="500"
          style="
          transform: scaleY(1);
          position: absolute;
          left: 0;
          top: 0;
          pointer-events: none;
          z-index: 999;
        "
      ></canvas>
      <canvas
          id="hoverLayer"
          width="1000"
          height="500"
          style="
          transform: scaleY(1);
          position: absolute;
          left: 0;
          top: 0;
          pointer-events: none;
          z-index: 999;
        "
      ></canvas>
      <svg
          id="axisHelper"
          width="1050"
          height="550"
          style="
          position: absolute;
          left: -50px;
          top: -20px;
          pointer-events: none;
          color: black;
          z-index: 999;
        "
      >
        <g id="cursorHelper" transform="translate(50,20)">
          <line stroke="black" stroke-dasharray="10 5"></line>
          <line stroke="black" stroke-dasharray="10 5"></line>
          <text font-size="12px"></text>
          <text font-size="12px"></text>
        </g>
      </svg>
      <!--      <canvas-->
      <!--        ref="canvas"-->
      <!--        width="1000"-->
      <!--        height="500"-->
      <!--        :style="{-->
      <!--          width: '1000px',-->
      <!--          height: '500px',-->
      <!--          cursor,-->
      <!--          transform: `scaleY(${upsideDownFactor})`,-->
      <!--        }"-->
      <!--        @mousedown="startMouse"-->
      <!--        @mousemove="moveMouse"-->

      <!--        @click="angleConfirm"-->
      <!--      ></canvas>-->
      <!--      <canvas-->
      <!--        ref="canvasRawLine"-->
      <!--        width="1000"-->
      <!--        height="500"-->
      <!--        style="width:1000px;height:500px;pointer-events:none;position:absolute;top:0;left:0"-->
      <!--        :style="{-->
      <!--          transform: `scaleY(${upsideDownFactor})`,-->
      <!--        }"-->
      <!--      ></canvas>-->
      <!--      <canvas-->
      <!--        ref="canvasOverlay"-->
      <!--        width="1000"-->
      <!--        height="500"-->
      <!--        style="width:1000px;height:500px;pointer-events:none;position:absolute;top:0;left:0"-->
      <!--        :style="{-->
      <!--          transform: `scaleY(${upsideDownFactor})`,-->
      <!--        }"-->
      <!--      ></canvas>-->
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
          <span>Filter line by: </span>
          <RadioGroup v-model="filterMode" type="button">
            <!-- <Radio label="knn">KNN</Radio>
            <Radio label="rnn">Radius</Radio> -->
            <Radio label="brush">Brush</Radio>
            <Radio label="ang">Angle</Radio>
            <Radio label="attr">Attr</Radio>
            <Radio label="hover">Hover</Radio>
          </RadioGroup>
        </div>
        <!-- <div>
          <span>Switch brush query method: </span>
          <RadioGroup v-model="brushMethod" type="button" size="small">
            <Radio label="tree">KD Tree</Radio>
            <Radio label="seq">Seq</Radio>
            <Radio label="new">Inc</Radio>
          </RadioGroup>
        </div> -->
        <div v-if="filterMode === 'attr'" style="margin-left: 2em;">
          <Form>
            <FormItem label="Attribute Column">
              <Select
                  v-model="attributeColumn"
                  placeholder="Choose a column for attribute filtering"
              >
                <Option
                    v-for="header in headers"
                    :value="header.key"
                    :key="header.title"
                >{{ header.title }}
                </Option
                >
              </Select>
            </FormItem>
            <FormItem label="Value">
              <AutoComplete
                  v-model="attributeValue"
                  :data="attributeData"
                  @on-search="handleSearch"
              ></AutoComplete>
            </FormItem>
            <Button type="info" style="float: right" @click="addAttrQuery"
            >add attribute query
            </Button
            >
          </Form>
          <!--          <span>Column Name</span>-->
          <!--          <span>Attribute Value</span>-->
        </div>
        <div>
          <span>Representative line parameters: </span>
          <!-- <RadioGroup v-model="rawMode" type="button">
          <Radio label="null">Null</Radio>
          <Radio label="cur">Hover</Radio>
          <Radio label="out">Min</Radio>
          <Radio label="rep">Max</Radio>
        </RadioGroup> -->
        </div>
        <div v-if="rawMode == 'rep'" style="margin-left:2em">
          <div style="display:flex;align-items:center">
            <span style="margin-right:8px">Line count</span>
            <Slider
                v-model="repCount"
                :min="1"
                :max="20"
                :step="1"
                show-tip="never"
                style="flex-grow:1"
            />
            <span style="margin-left:8px">{{ repCount }}</span>

            <span style="margin-right:8px; margin-left: 12px;">Diverse</span>
            <Slider
                v-model="diverse"
                :min="0"
                :max="0.3"
                :step="0.002"
                show-tip="never"
                style="flex-grow:1"
                @on-change="cnt++"
            />
          </div>
          <div style="display:flex;align-items:center"></div>
        </div>
        <!--        <div v-if="rawMode != 'null'">-->
        <!--          <div v-for="i in [0, 1, 2]" :key="i">-->
        <!--            <span-->
        <!--            ><ColorPicker v-model="colorMap[i]" recommend alpha></ColorPicker-->
        <!--            ></span>-->
        <!--            <Poptip-->
        <!--                trigger="hover"-->
        <!--                placement="bottom-end"-->
        <!--                :width="800"-->
        <!--                title="Data preview"-->
        <!--                @on-popper-show="previewIndex = rawLines[i]"-->
        <!--            >-->
        <!--              <span style="margin-left:12px" v-if="i < rawLineNames.length">{{-->
        <!--                  rawLineNames[i]-->
        <!--                }}</span>-->
        <!--              <div slot="content">-->
        <!--                <Table :columns="headers" :data="previewData" />-->
        <!--              </div>-->
        <!--            </Poptip>-->
        <!--          </div>-->
        <!--        </div>-->
        <div style="position:relative">
          <div class="select-colormap">
            <span style="margin:0">Colormap:</span>
            <Select
                id="colormap"
                placeholder="Choose colormap"
                v-model="colormapIndexCache"
            >
              <Option value="0">viridis</Option>
              <Option value="1" selected>magma</Option>
              <Option value="2">inferno</Option>
              <Option value="3">plasma</Option>
              <Option value="4">cividis</Option>
              <Option value="5">turbo</Option>
              <Option value="6">bluegreen</Option>
              <Option value="7">bluepurple</Option>
              <Option value="8">goldgreen</Option>
              <Option value="9">goldorange</Option>
              <Option value="10">goldred</Option>
              <Option value="11">greenblue</Option>
              <Option value="12">orangered</Option>
              <Option value="13">purplebluegreen</Option>
              <Option value="14">purpleblue</Option>
              <Option value="15">purplered</Option>
              <Option value="16">redpurple</Option>
              <Option value="17">yellowgreenblue</Option>
              <Option value="18">yellowgreen</Option>
              <Option value="19">yelloworangebrown</Option>
              <Option value="20">yelloworangered</Option>
            </Select>
          </div>
          <span>1</span>
          <span class="color-map" id="color-map"></span>
          <InputNumber
              :min="1"
              v-model="maxDensity"
              :active-change="false"
              style="width: 50px"
          />
        </div>

        <!-- <Button icon="md-cloud-download" type="primary" @click="exportFig"
        >export figure
        </Button
        > -->
        <div>
          <span>Layers:</span>
        </div>
        <div style="margin-left:2em">
          <draggable v-model="layers">
            <div
                v-for="layer in layers"
                :key="layer.id"
                style="display:flex;align-items:center;border:1px solid #dcdee2;margin-top:4px;background:white;cursor:pointer;border-radius:4px;padding:0 8px"
            >
              <Icon type="md-menu" style="cursor:move"/>
              <!-- <Poptip
                v-if="layer.id == 'selectionCanvas'"
                :width="340"
                :offset="62"
                trigger="click"
              >
                <p style="width:170px;padding-left: 12px">
                  {{ layer.name }}
                </p>
                <div slot="content" style="display:flex;align-items:center">
                  <div class="select-colormap">
                    <span style="margin:0">Colormap:</span>
                    <Select
                      id="colormap"
                      placeholder="Choose colormap"
                      v-model="colormapOverlayIndexCache"
                    >
                      <Option value="0">viridis</Option>
                      <Option value="1" selected>magma</Option>
                      <Option value="2">inferno</Option>
                      <Option value="3">plasma</Option>
                      <Option value="4">cividis</Option>
                      <Option value="5">turbo</Option>
                      <Option value="6">bluegreen</Option>
                      <Option value="7">bluepurple</Option>
                      <Option value="8">goldgreen</Option>
                      <Option value="9">goldorange</Option>
                      <Option value="10">goldred</Option>
                      <Option value="11">greenblue</Option>
                      <Option value="12">orangered</Option>
                      <Option value="13">purplebluegreen</Option>
                      <Option value="14">purpleblue</Option>
                      <Option value="15">purplered</Option>
                      <Option value="16">redpurple</Option>
                      <Option value="17">yellowgreenblue</Option>
                      <Option value="18">yellowgreen</Option>
                      <Option value="19">yelloworangebrown</Option>
                      <Option value="20">yelloworangered</Option>
                    </Select>
                  </div>
                  <span>1</span>
                  <span class="color-map" id="color-map"></span>
                  <InputNumber
                    :min="1"
                    v-model="maxOverlayDensity"
                    :active-change="false"
                    style="width: 50px"
                  />
                </div>
              </Poptip> -->
              <div style="flex-grow:1">
                <div style="display:flex;align-items:center">
                  <p style="width:170px;padding-left: 12px">
                    {{ layer.name }}
                  </p>
                  <Icon
                      :type="layer.opacity === 0 ? 'md-eye-off' : 'md-eye'"
                      :style="{ opacity: layer.opacity * 0.7 + 0.3 }"
                      @click="layer.opacity = layer.opacity === 0 ? 1 : 0"
                  />
                  <Slider
                      v-model="layer.opacity"
                      :min="0"
                      :max="1"
                      :step="0.01"
                      show-tip="never"
                      style="flex-grow:1; margin-left:12px;margin-right:8px"
                  />
                </div>
                <div
                    v-if="layer.id == 'selectionCanvas'"
                    style="display:flex;align-items:center;margin:0 12px 8px;position:relative"
                >
                  <div class="select-colormap">
                    <span style="margin:0">Colormap:</span>
                    <Select
                        id="colormapOverlay"
                        placeholder="Choose colormap"
                        v-model="colormapOverlayIndexCache"
                    >
                      <Option value="0">viridis</Option>
                      <Option value="1" selected>magma</Option>
                      <Option value="2">inferno</Option>
                      <Option value="3">plasma</Option>
                      <Option value="4">cividis</Option>
                      <Option value="5">turbo</Option>
                      <Option value="6">bluegreen</Option>
                      <Option value="7">bluepurple</Option>
                      <Option value="8">goldgreen</Option>
                      <Option value="9">goldorange</Option>
                      <Option value="10">goldred</Option>
                      <Option value="11">greenblue</Option>
                      <Option value="12">orangered</Option>
                      <Option value="13">purplebluegreen</Option>
                      <Option value="14">purpleblue</Option>
                      <Option value="15">purplered</Option>
                      <Option value="16">redpurple</Option>
                      <Option value="17">yellowgreenblue</Option>
                      <Option value="18">yellowgreen</Option>
                      <Option value="19">yelloworangebrown</Option>
                      <Option value="20">yelloworangered</Option>
                    </Select>
                  </div>
                  <span>1</span>
                  <span class="color-map" id="color-map-overlay"></span>
                  <InputNumber
                      :min="1"
                      v-model="maxOverlayDensity"
                      :active-change="false"
                      style="width: 50px"
                  />
                </div>
              </div>
            </div>
          </draggable>
        </div>

        <!-- <Button icon="ios-apps" type="primary" @click="showRepData"
          >view selected data
        </Button> -->

        <div>
          <span>Show value of cursor:</span>
          <iSwitch style="margin-left:12px" v-model="showCursorValue"/>
        </div>
        <div>
          <span>Reverse y-axis:</span>
          <iSwitch style="margin-left:12px" v-model="upsideDown"/>
        </div>
        <div>
          <span>Normalize density:</span>
          <iSwitch style="margin-left:12px" v-model="normalizeDensity"/>
        </div>
        <div>
          <span>Enlarge Axis Font Size:</span>
          <iSwitch style="margin-left:12px" v-model="enlargeFont"/>
        </div>
      </div>
    </div>
    <Table
        :row-class-name="calClassName"
        border
        :columns="tableColumns"
        :data="cnt + 1 && tableData"
        :on-current-change="hoveringQuery"
        id="informationTable"
        style="margin-top: 30px"
    >
      <template slot-scope="{ row, index }" slot="name">
        <p
            v-if="index >= tableData.length - 2"
            style="font-style:italic;font-weight:700"
        >
          {{ row.name }}
        </p>
        <div v-else>{{ row.name }}</div>
      </template>
      <template slot-scope="{ row, index }" slot="op">
        <Button
            ghost
            :type="row.query === selectedQuery ? 'primary' : 'default'"
            size="small"
            style="margin-right: 5px"
            @click="selectedQuery = row.query"
        >Explore
        </Button>
        <!-- <Button
          type="warning"
          style="margin-right: 5px"
          size="small"
          v-if="index < tableData.length - 2"
          >Invisible
        </Button> -->
        <Button
            type="error"
            size="small"
            v-if="index < tableData.length - 2"
            @click="deleteQuery(index)"
        >Delete
        </Button>
      </template>
    </Table>
    <Button
        type="error"
        size="small"
        style="float: right; margin: 20px"
        @click="deleteAllQuery"
    >
      Delete all Querys
    </Button>
    <Modal v-model="repModal" width="1000" :closable="false">
      <p slot="header" style="color:dodgerblue;text-align:center">
        <Icon type="ios-information-circle"></Icon>
        <span>Representative Line Information</span>
      </p>
      <Table border :columns="repColumns" :data="repStaticInformation"></Table>
      <div slot="footer">
        <Button type="primary" size="large" long @click="repModal = false"
        >Confirm
        </Button
        >
      </div>
    </Modal>
  </div>
</template>

<script>
import draggable from "vuedraggable";
import {exportCanvas} from "../core/utils";
import unobserve from "../store";
import render from "../core";
import * as d3 from "d3";
import expandRow from "@/components/expandRow";
import {
  calculateCurvature,
  calculateDifference,
  dist2, distToSegment, distToSegmentSquared,
  eq,
  getAngle2,
  lineRectCollide,
  lineSegmentsCollide,
  mix,
  movePoint,
  sqr,
  updatePoint,
} from "@/core/util";
import KDTree from "../core/kdtree";
import seedrandom from "seedrandom";
import moment from "moment";
import {brensenham, brensenhamArr} from "../core/util";

const tempBuffer = new Float32Array(1000 * 500);
const colorMapCache = {};

export default {
  props: {
    timeIndex: Number,
    valueIndex: Number,
    timeName: String,
    valueName: String,
    filter: Float32Array,
    // layers: Array,
    // headers: Array,
  },
  components: {
    draggable,
  },
  data() {
    return {
      canvas: null,
      contextHandler: null,
      canvasContext: null,
      rawLineContext: null,
      filterMode: "brush",
      brushMethod: "tree",
      rawMode: "rep",
      repCount: 3,
      diverse: 0.1,
      cursor: "crosshair",
      mouseDown: false,
      listener: null,
      hoverListener: null,
      hoveringInd: null,
      coord: [0, 0, 0, 0, 0],
      boxes: [],
      maxDensity: null,
      maxOverlayDensity: null,
      rawLines: [],
      colorMap: ["aqua", "limegreen", "lightgreen"],
      upsideDown: false,
      showCursorValue: true,
      normalizeDensity: true,
      enlargeFont: false,
      headers: [],
      previewIndex: -1,
      selectedQuery: "$int",
      tableColumns: [
        {
          type: "expand",
          width: 50,
          render: (h, params) =>
              h(expandRow, {
                props: {
                  row: params.row.reps,
                },
              }),
        },
        {title: "Query", align: "center", slot: "name"},
        // { title: 'Min start time', align: 'center', key: 'minT' },
        // { title: 'Max start time', align: 'center', key: 'maxT' },
        {title: "Line series count", align: "center", key: "count"},
        {title: "Time points count", align: "center", key: "points"},
        {title: "Min value", align: "center", key: "minV"},
        {title: "Max value", align: "center", key: "maxV"},
        {title: "Mean value", align: "center", key: "mean"},
        {title: "Variance", align: "center", key: "var"},
        {title: "Operations", align: "center", slot: "op", width: 250},
      ],
      repColumns: [
        {title: "Index num.", align: "center", key: "name"},
        {title: "Min start time", align: "center", key: "minT"},
        {title: "Max start time", align: "center", key: "maxT"},
        {title: "Min value", align: "center", key: "minV"},
        {title: "Max value", align: "center", key: "maxV"},
        {title: "Mean value", align: "center", key: "mean"},
      ],
      layers: [
        {
          id: "rep_layer",
          name: "representative line",
          opacity: 1,
        },
        {
          id: "selectionCanvas",
          name: "selected density",
          opacity: 0,
        },
        {
          id: "selectionLayer",
          name: "selected line",
          opacity: 0.4,
        },
        {
          id: "canvas",
          name: "density",
          opacity: 1,
        },
        {
          id: "raw_lines",
          name: "raw line",
          opacity: 0,
        },
      ],
      colormapIndexCache: 1,
      colormapOverlayIndexCache: 1,
      initDensityCache: null,
      initDensityBufferCache: null,
      initDensityMaxCache: 0,
      currentDensityMax: 0,
      currentDensity: null,
      distanceCache: {},
      colorCache: {},
      querys: [],
      preview: null,
      modify: null,
      mark: false,
      selectionLayerContext: null,
      repLayerContext: null,
      rawLinesLayerContext: null,
      mouseLayerContext: null,
      queryResult: [],
      xScale: null,
      yScaleC: null,
      yScale: null,
      cursorHelper: null,
      svg: null,

      tr: null,
      cnt: 0,
      renderSelectedDensity: 0,

      // representative line presentation
      repModal: false,
      repStaticInformation: [],

      attributeColumn: null,
      attributeValue: null,
      attributeData: [],
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
              ii == 5 ? this.headers.map((_) => "...") : unobserve.data[i]
          );
    },
    tableData() {
      if (!this.cnt) {
        return [];
      }
      let res = [];
      let mp = {
        brush: "Brush",
        ang: "Angle",
        knn: "KNN",
        rnn: "Radius",
        attr: "Attribute",
      };
      for (let i = 0; i < unobserve.querys.length; i++) {
        if (!unobserve.querys[i].reps)
          unobserve.querys[i].reps = this.calcRepLines([
            ...unobserve.querys[i].cache,
          ]);
        res.push({
          _expanded: i == this.selectedQuery,
          query: i,
          name: mp[unobserve.querys[i].type],
          ...this.getStaticInformation([...unobserve.querys[i].cache]),
          reps: unobserve.querys[i].reps.map((id) => {
            return {
              id,
              name: unobserve.aggregatedData[id].key,
              color: `rgb(${this.getColor(id).join(",")})`,
              ...this.getStaticInformation([id]),
            };
          }),
        });
      }

      console.log("this is unoberserve interResult");
      console.log(unobserve.interResult);
      unobserve.interReps = this.calcRepLines(unobserve.interResult);
      res.push({
        _expanded: "$int" == this.selectedQuery,
        query: "$int",
        name: unobserve.querys.length ? "intersection" : "global",
        ...this.getStaticInformation(
            unobserve.querys.length
                ? unobserve.interResult
                : new Array(unobserve.aggregatedData.length).fill().map((_, i) => i)
        ),
        reps: (unobserve.querys.length
                ? unobserve.interReps
                : unobserve.globalRep
        ).map((id) => {
          return {
            id,
            name: unobserve.aggregatedData[id].key,
            color: `rgb(${this.getColor(id).join(",")})`,
            ...this.getStaticInformation([id]),
          };
        }),
      });

      if (unobserve.querys.length) {
        unobserve.unionReps = this.calcRepLines(unobserve.unionResult);
        res.push({
          _expanded: "$uni" == this.selectedQuery,
          query: "$uni",
          name: "union",
          ...this.getStaticInformation(unobserve.unionResult),
          reps: unobserve.unionReps.map((id) => {
            return {
              id,
              name: unobserve.aggregatedData[id].key,
              color: `rgb(${this.getColor(id).join(",")})`,
              ...this.getStaticInformation([id]),
            };
          }),
        });
      }
      console.log(res);

      return res;
    },
  },
  watch: {
    enlargeFont(newValue) {
      if (newValue) {
        this.svg.select('#xaxis').attr('font-size', '16px');
        this.svg.select('#yaxis').attr('font-size', '16px');
        this.svg.select('#xaxis').attr('stroke-width', '2px');
        this.svg.select('#yaxis').attr('stroke-width', '2px');
      } else {
        this.svg.select('#xaxis').attr('font-size', '12px');
        this.svg.select('#yaxis').attr('font-size', '12px');
        this.svg.select('#xaxis').attr('stroke-width', '1px');
        this.svg.select('#yaxis').attr('stroke-width', '1px');
      }
    },
    colormapIndexCache(value) {
      console.log(value);
      this.renderColorMap();
      this.renderAllDensity();
    },
    colormapOverlayIndexCache() {
      this.renderColorMapOverlay();
      this.renderDensity();
    },
    repCount(value) {
      this.renderBoxes();
    },
    layers: {
      deep: true,
      handler(value) {
        unobserve.layers = value;
        this.rearrangeLayer(value);
        for (let i in value) {
          const layer = value[i];
          if (layer.id === "selectionCanvas") {
            if (!this.renderSelectedDensity && layer.opacity > 0)
              this.renderDensity();
            this.renderSelectedDensity = layer.opacity > 0;
          }
        }
      },
    },
    showCursorValue() {
      this.svg
          .select("#cursorHelper")
          .selectAll("line")
          .attr("x1", 0)
          .attr("y1", 0)
          .attr("x2", 0)
          .attr("y2", 0);
      this.svg
          .select("#cursorHelper")
          .selectAll("text")
          .attr("x", 0)
          .attr("y", 0)
          .text("");
    },
    upsideDown(value) {
      unobserve.upsideDown = value;
      this.svg
          .select("#cursorHelper")
          .selectAll("line")
          .attr("x1", 0)
          .attr("y1", 0)
          .attr("x2", 0)
          .attr("y2", 0);
      this.svg
          .select("#cursorHelper")
          .selectAll("text")
          .attr("x", 0)
          .attr("y", 0)
          .text("");
      this.setReverseY(value);
    },
    filter(value) {
      this.contextHandler.rerender(value);
      this.getTopK();
    },
    contextHandler() {
      if (this.filter) {
        this.contextHandler.rerender(this.filter);
      }
    },
    filterMode(newV, oldV) {
      if (oldV === 'hover') {
        this.initCanvas(unobserve.hoverLayer);
      }
    },
    rawMode() {
      this.getTopK();
    },
    maxDensity() {
      this.renderAllDensity();
    },
    maxOverlayDensity() {
      this.renderDensity();
    },
    diverse() {
      // this.getTopK();
      clearTimeout(unobserve.diverseChange);
      unobserve.diverseChange = setTimeout(() => {
        this.renderBoxes();
      }, 50);
      // this.drawLine();
    },
    selectedQuery(newValue, oldValue) {
      if (newValue === oldValue) return;
      this.renderBoxes();
      this.renderDensity();
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
    normalizeDensity() {
      this.renderAllDensity(true);
      this.renderDensity();
    },
  },
  methods: {
    leaveQuery(index) {
      this.mark = false;
      this.renderBoxes("mouseLayer");
    },
    handleSearch(value) {
      console.log(value);
      if (this.attributeColumn === undefined || !value.length) {
        this.attributeData = [];
        return;
      }
      const name = unobserve.headers[this.attributeColumn];
      const datas = unobserve.headerMap.get(name);
      console.log(unobserve.headerMap);
      console.log(name, datas, this.attributeValue);
      this.attributeData = datas
          .filter((str) => str.slice(0, value.length) === value)
          .slice(0, 10);
    },
    hoveringQuery(index) {
      console.log(index);
      if (index >= unobserve.querys.length) return;
      this.hovering(index);
    },

    addAttrQuery() {
      unobserve.querys.push({
        type: "attr",
        info: {
          ind: this.attributeColumn,
          val: this.attributeValue,
        },
      });
      // console.log(unobserve.querys);
      this.renderBoxes();
      this.cnt++;
    },

    deleteAllQuery() {
      unobserve.querys = [];
      this.renderBoxes();
      this.cnt++;
    },
    deleteQuery(query) {
      let flag = false;
      if (this.selectedQuery === query) {
        flag = true;
      }
      unobserve.querys.splice(query, 1);
      if (flag) this.selectedQuery = "$int";
      this.renderBoxes();
      this.cnt++;
      this.renderDensity();
    },

    // event handler part
    canvasMousedown(e) {
      if (e.button === 2) return;
      let startPoint = [e.offsetX, e.offsetY];
      let box = this.findBox(startPoint);
      if (box) {
        this.modify = box;
        this.preview = this.modify.instance;

        this.modify.lastPos = startPoint;
        if (this.modify.onBorder) {
          this.modify.type = "resize";
        } else {
          this.modify.type = "drag";
        }
        return;
      }
      if (this.filterMode === "attr") return;
      this.preview = {
        // type: document.getElementById("mode").value,
        type: this.filterMode,
        start: startPoint,
      };
      unobserve.preview = this.preview;
      if (this.preview.type === "knn") {
        this.preview.n = 5;
      } else if (this.preview.type === "rnn") {
        this.preview.n = 10;
      } else if (this.preview.type === "ang") {
        this.preview.n = 5;
      }
    },

    canvasMouseup(e) {
      if (e.button === 2 || !this.preview) return;
      if (this.modify) {
        unobserve.querys[this.modify.i] = this.preview;
        this.modify = this.preview = null;
      } else if (this.filterMode === "attr") {
        return;
      } else {
        const point = [e.offsetX, e.offsetY];
        if (this.preview.type === "knn" || this.preview.type === "rnn") {
          this.preview.start = point;
        } else if (
            this.preview.type === "brush" ||
            this.preview.type === "ang"
        ) {
          this.preview.end = point;
        }
        this.preview.cache = null;
        this.preview.reps = null;
        unobserve.querys.push(this.preview);
        this.preview = null;
      }
      unobserve.preview = this.preview;
      // renderQuerys();

      console.time("renderBoxes in mouseup");
      this.renderBoxes();
      console.timeEnd("renderBoxes in mouseup");

      console.time("render Density in mouseup");
      this.renderDensity();
      console.timeEnd("render Density in mouseup");
      this.cnt++;
    },

    canvasWheel(e) {
      const pointer = [e.offsetX, e.offsetY];
      const res = this.findBox(pointer);
      if (res) {
        e.preventDefault();
        const query = res.instance;
        const sign = Math.sign(e.deltaY);
        if (
            query.type === "knn" ||
            query.type === "rnn" ||
            query.type === "ang"
        ) {
          if (query.type === "ang")
            query.n = Math.min(Math.max(1, query.n - sign), 180);
          else query.n = Math.max(query.n - Math.sign(e.deltaY), 0);
          query.cache = null;
          query.reps = null;
          console.log(query.n);
        }
        // renderQuerys();
        clearTimeout(unobserve.async);
        unobserve.async = setTimeout(() => {
          this.renderBoxes();
        }, 10);
        // this.renderBoxes();
        this.cnt++;
      }
    },

    canvasMousemove(e) {
      const point = [e.offsetX, e.offsetY];
      this.renderAxisHelper(e);
      if (this.filterMode === 'hover') {
        this.initCanvas(unobserve.hoverLayer);
        let radius = 5;
        let res = [];
        while (res.length === 0 && radius < 100) {
          res = this.tr.ee.brush([point[0] - radius, point[1] - radius], [point[0] + radius, point[1] + radius]).filter(id => {
            const line = unobserve.result[id];
            let mx = Infinity;
            for (let i = 0; i < line.length - 1; i++) {
              let dis = distToSegmentSquared(point, [line[i].x, line[i].y], [line[i+1].x, line[i+1].y]);
              if (dis < mx)
                mx = dis;
            }
            return mx <= 9;
          })
          radius *= 2;
        }
        this.drawLineWithLayer(res, unobserve.hoverLayer);
        return;
      }
      if (!this.preview) {
        this.findBox(point);
        return;
      }
      if (this.modify) {
        if (this.modify.type === "resize") {
          if (this.preview.type === "brush") {
            updatePoint(this.preview.end, this.modify.lastPos, point);
            updatePoint(this.preview.start, this.modify.lastPos, point);
          } else if (this.preview.type === "ang") {
            this.preview.end[0] = point[0];
            this.preview.end[1] += point[1] - this.modify.lastPos[1];
          }
        } else {
          const offsetX = point[0] - this.modify.lastPos[0],
              offsetY = point[1] - this.modify.lastPos[1];

          if (this.preview.type === "brush" || this.preview.type === "ang") {
            movePoint(this.preview.end, offsetX, offsetY);
          }
          movePoint(this.preview.start, offsetX, offsetY);
        }

        this.modify.lastPos = point;
      } else {
        if (this.preview.type === "knn" || this.preview.type === "rnn") {
          this.preview.start = point;
        } else if (
            this.preview.type === "brush" ||
            this.preview.type === "ang"
        ) {
          this.preview.end = point;
        }
      }
      this.preview.cache = null;
      console.time("renderBoxes");
      clearTimeout(unobserve.async);
      unobserve.async = setTimeout(() => {
        this.renderBoxes();
      }, 10);
      this.renderBoxes();
      console.timeEnd("renderBoxes");
    },

    mouseContextmenu(e) {
      e.preventDefault();
    },

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
        this.$refs.canvas.removeEventListener("mousemove", this.hoverListener);
      }
      switch (this.rawMode) {
        case "cur":
          this.hoverListener = this.hoverLines.bind(this);
          this.$refs.canvas.addEventListener("mousemove", this.hoverListener);
          break;
        case "out":
          kArray = this.contextHandler.findKTop(false);
          break;
        case "rep":
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
      this.$emit("filterChange", undefined);
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
        this.coord[1] += e.movementY * this.upsideDownFactor;
        this.coord[3] += e.movementY * this.upsideDownFactor;
        this.coord[4] += e.movementY * this.upsideDownFactor;
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
        this.coord[3] += e.movementY * this.upsideDownFactor;
        this.coord[4] += e.movementY * this.upsideDownFactor;
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
                "filterChange",
                this.filter.filter((x) => filterResult.includes(x))
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
              -(this.coord[3] + offset - this.coord[1]) /
              (this.coord[2] - this.coord[0]);
          let endAngle =
              -(this.coord[3] - offset - this.coord[1]) /
              (this.coord[2] - this.coord[0]);
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
    },
    exportFig() {
      // exportCanvas(
      //     [this.$refs.canvas, this.$refs.canvasOverlay, this.$refs.canvasRawLine],
      //     this.upsideDown
      // );
      exportCanvas(
          this.layers.map((layer) => document.getElementById(layer.id)).reverse(),
          this.upsideDown,
          this.layers.map((layer) => layer.opacity).reverse()
      );
    },
    showRepData() {
      this.repModal = true;
      this.repStaticInformation = unobserve.repIds.map((id) => {
        return {
          name: id,
          ...this.getStaticInformation([id]),
        };
      });
    },
    hightlightRow(row) {
      return row.query === this.selectedQuery ? "selected-table-row" : "";
    },
    calClassName(row) {
      let ret =
          this.hightlightRow(row) +
          " " +
          (row.query === this.hoveringInd ? "ivu-table-row-hover" : "");
      return ret;
    },
    calcLineDistance(aid, bid) {
      if (aid == bid) return 0;
      if (aid > bid) {
        [aid, bid] = [bid, aid];
      }
      if (!this.distanceCache[aid]) {
        this.distanceCache[aid] = {};
      }
      if (this.distanceCache[aid][bid] !== undefined)
        return this.distanceCache[aid][bid];
      let distance = 0;
      let count = 0;
      let aPointer = 0;
      let bPointer = 0;
      const aLine = unobserve.result[aid];
      const bLine = unobserve.result[bid];
      while (true) {
        while (
            aPointer < aLine.length &&
            bPointer < bLine.length &&
            aLine[aPointer].x < bLine[bPointer].x
            ) {
          aPointer++;
        }
        while (
            aPointer < aLine.length &&
            bPointer < bLine.length &&
            aLine[aPointer].x > bLine[bPointer].x
            ) {
          bPointer++;
        }
        if (aPointer >= aLine.length || bPointer >= bLine.length) {
          break;
        }
        if (aLine[aPointer].x == bLine[bPointer].x) {
          count++;
          distance += Math.abs(aLine[aPointer].y - bLine[bPointer].y);
          aPointer++;
          bPointer++;
        }
      }
      distance /= count;
      if (!count) {
        distance = Infinity;
      }
      this.distanceCache[aid][bid] = distance;
      return distance;
    },
    drawRawLines() {
      const shuffle = unobserve.result
          .slice()
          .map((line, id) => ({line, id}));
      shuffle.sort(() => (Math.random() > 0.5 ? 1 : -1));
      for (let sid in shuffle) {
        const {line, id} = shuffle[sid];
        unobserve.rawLinesLayerContext.strokeStyle = `rgb(${this.getColor(
            id
        ).join(",")})`;
        unobserve.rawLinesLayerContext.beginPath();
        // for (let seg of line) {
        //   unobserve.rawLinesLayerContext.moveTo(seg[0].x, seg[0].y);
        //   unobserve.rawLinesLayerContext.lineTo(seg[1].x, seg[1].y);
        // }
        unobserve.rawLinesLayerContext.moveTo(line[0].x, line[0].y);
        for (let point of line) {
          unobserve.rawLinesLayerContext.lineTo(point.x, point.y);
        }
        unobserve.rawLinesLayerContext.stroke();
      }
    },

    renderQuerys() {
      const ctner = document.getElementById("query_ctner");
      ctner.innerHTML = "";
      if (!unobserve.querys.length) {
        ctner.innerHTML = "(empty)";
      }
      for (let i = 0; i < unobserve.querys.length; i++) {
        const query = unobserve.querys[i];
        const element = document.createElement("p");

        const icon = document.createElement("i");
        icon.style.display = "inline-block";
        icon.style.background =
            query.type === "knn"
                ? "deepskyblue"
                : query.type === "ang"
                ? "transparent"
                : "gray";
        icon.style.borderRadius =
            query.type === "knn" || query.type === "rnn" ? "50%" : "0";
        icon.style.borderBottom = icon.style.borderRight =
            query.type === "ang" ? "6px solid gray" : "";
        icon.style.borderLeft = icon.style.borderTop =
            query.type === "ang" ? "6px solid transparent" : "";
        icon.style.height = icon.style.width =
            query.type === "ang" ? "0" : "12px";

        const desc = document.createElement("span");
        switch (query.type) {
          case "knn":
            desc.innerText = "KNN";
            break;
          case "rnn":
            desc.innerText = "RNN";
            break;
          case "brush":
            desc.innerText = "Brush";
            break;
          case "ang":
            desc.innerText = "Angular";
            break;
        }

        const conf = document.createElement("p");
        switch (query.type) {
          case "knn":
            conf.innerText = "k=";
            break;
          case "rnn":
            conf.innerText = "r=";
            break;
          case "brush":
            conf.innerHTML = `(${query.start
                .map((x, i) =>
                    i === 0
                        ? unobserve.inferX == "date"
                        ? moment(xScale.invert(x)).format("YYYY-M-D")
                        : xScale.invert(x).toFixed(0)
                        : yScale.invert(500 - x).toFixed(0)
                )
                .join(", ")}) ~<br>(${query.end
                .map((x, i) =>
                    i === 0
                        ? unobserve.inferX == "date"
                        ? moment(xScale.invert(x)).format("YYYY-M-D")
                        : xScale.invert(x).toFixed(0)
                        : yScale.invert(500 - x).toFixed(0)
                )
                .join(", ")})`;
            break;
          case "ang":
            conf.innerText = "degree±";
            break;
        }
        const confInput = document.createElement("input");
        confInput.type = "number";
        confInput.value = query.n;
        confInput.addEventListener("change", () => {
          query.n = parseFloat(confInput.value);
          query.cache = null;
          query.reps = null;
          setTimeout(renderBoxes, 0);
        });
        if (
            query.type === "knn" ||
            query.type === "rnn" ||
            query.type === "ang"
        ) {
          conf.append(confInput);
        }

        const del = document.createElement("button");
        del.innerText = "Delete this query";
        del.addEventListener("click", () => {
          querys.splice(i, 1);
          // setTimeout(renderQuerys, 0);
          setTimeout(renderBoxes, 0);
          setTimeout(renderDensity, 0);
        });

        element.append(icon, desc, conf, del);
        element.addEventListener("mouseenter", () => {
          element.style.border = "1px solid red";
          hoverBox(query);
        });

        element.addEventListener("mouseleave", () => {
          element.style.border = "1px solid transparent";
          renderBoxes();
        });

        ctner.appendChild(element);
      }
    },

    colorSpan(ids) {
      return ids.map((id) => {
        return `<span style="color: rgb(${this.getColor(id).join(
            ","
        )})">${id}</span>`;
      });
    },

    renderResult(ids1, ids2) {
      unobserve.interResult = ids1;
      unobserve.unionResult = ids2;
      // this.queryResult = ids;
      // if (!ids.length) {
      //   document.getElementById("result").innerText = "(empty)";
      // } else {
      //   document.getElementById("result").innerHTML = `${this.colorSpan(ids).join(
      //       ", "
      //   )}`;
      // }
    },

    hovering(index, onBorder) {
      const query = unobserve.querys[index];
      this.hoveringInd = index;
      if (this.mark !== query) {
        this.renderBoxes("mouseLayer");
      }
      this.mark = query;
      this.hoverBox(query);
      if (onBorder) {
        document.getElementById("canvas").style.cursor = "move";
      } else {
        document.getElementById("canvas").style.cursor = "pointer";
      }
    },

    findBox(point) {
      function hovering(index, onBorder) {
        const query = unobserve.querys[index];
        this.hoveringInd = index;
        if (this.mark !== query) {
          this.renderBoxes("mouseLayer");
        }
        this.mark = query;
        this.hoverBox(query);
        if (onBorder) {
          document.getElementById("canvas").style.cursor = "move";
        } else {
          document.getElementById("canvas").style.cursor = "pointer";
        }
      }

      for (let i = unobserve.querys.length - 1; i >= 0; i--) {
        const query = unobserve.querys[i];
        // switch (query.type) {
        // }
        if (query.type === "brush") {
          // update rect
          let minX = Math.min(query.start[0], query.end[0]),
              maxX = Math.max(query.start[0], query.end[0]),
              minY = Math.min(query.start[1], query.end[1]),
              maxY = Math.max(query.start[1], query.end[1]),
              onBorder =
                  eq(minX, point[0]) ||
                  eq(maxX, point[0]) ||
                  eq(minY, point[1]) ||
                  eq(maxY, point[1]);
          // onBorder = [
          //   eq(minX, point[0]) ? -1 : eq(maxX, point[0]) ? 1 : 0,
          //   eq(minY, point[1]) ? -1 : eq(maxY, point[1]) ? 1 : 0,
          // ];
          if (
              minX <= point[0] &&
              point[0] <= maxX &&
              minY <= point[1] &&
              point[1] <= maxY
          ) {
            hovering.call(this, i, onBorder);
            return {instance: query, onBorder, i};
          }
        } else if (query.type === "knn" || query.type === "rnn") {
          let dis = dist2(point, query.start);
          if (sqr(query.n) > dis) {
            hovering.call(this, i);
            return {instance: query, i};
          }
        } else if (query.type === "ang") {
          const endX = Math.max(query.start[0] + 1, query.end[0]);
          const start = query.start,
              end = [endX, query.end[1]],
              onBorder = eq(endX, point[0]);
          if (
              start[0] <= point[0] &&
              point[0] <= endX &&
              ((start[0] === point[0] && start[1] === point[1]) ||
                  (start[0] !== point[0] &&
                      Math.abs(getAngle2(start, point) - getAngle2(start, end)) <=
                      (query.n / 180) * Math.PI))
          ) {
            hovering.call(this, i, onBorder);
            return {instance: query, i, onBorder};
          }
        }
      }
      if (this.mark) {
        this.mark = false;
        document.getElementById("canvas").style.cursor = "default";
        this.renderBoxes("mouseLayer");
        this.hoveringInd = null;
      }
    },

    renderBox(query) {
      if (query.type === "knn") {
        unobserve.mouseLayerContext.beginPath();
        unobserve.mouseLayerContext.arc(...query.start, 6, 0, 2 * Math.PI);
        unobserve.mouseLayerContext.fillStyle = "deepskyblue";
        unobserve.mouseLayerContext.fill();
        if (!query.cache) {
          let result = new Set();
          let base = 0;
          while (result.size < query.n) {
            base += query.n - result.size;
            result = new Set(
                this.tr.ee.knn(query.start, base).map(({id}) => id)
            );
          }
          query.cache = result;
        }
      } else if (query.type === "rnn") {
        unobserve.mouseLayerContext.beginPath();
        unobserve.mouseLayerContext.arc(
            ...query.start,
            query.n,
            0,
            2 * Math.PI
        );
        unobserve.mouseLayerContext.fillStyle = "rgba(0,0,0,0.3)";
        unobserve.mouseLayerContext.fill();
        if (!query.cache) {
          const result = new Set(
              this.tr.ee.rnn(query.start, query.n).map(({id}) => id)
          );
          query.cache = result;
        }
      } else if (query.type === "brush") {
        // if (document.getElementById("line_mode").value === "all") {
        //   unobserve.mouseLayerContext.putImageData(
        //       currentDensity,
        //       0,
        //       0,
        //       ...query.start.map((v, i) => Math.min(v, query.end[i])),
        //       ...query.end.map((v, i) => Math.abs(v - query.start[i]))
        //   );
        // } else {
        unobserve.mouseLayerContext.fillStyle = "rgba(0,0,0,0.3)";
        unobserve.mouseLayerContext.fillRect(
            ...query.start.map((v, i) => Math.min(v, query.end[i])),
            ...query.end.map((v, i) => Math.abs(v - query.start[i]))
        );
        // }
        if (!query.cache) {
          const minX = Math.min(query.start[0], query.end[0]),
              maxX = Math.max(query.start[0], query.end[0]),
              minY = Math.min(query.start[1], query.end[1]),
              maxY = Math.max(query.start[1], query.end[1]);

          if (this.brushMethod === "seq") {
            // console.log(query);
            let result = [];
            // let info = [];
            for (let id in unobserve.result) {
              const line = unobserve.result[id];

              let st = 0,
                  ed = line.length - 1,
                  flag = true;
              if (line[ed].x < minX || line[st].x > maxX) continue;
              while (st < line.length - 1 && line[st].x < minX) st++;
              while (ed > 0 && line[ed].x > maxX) ed--;

              for (let i = st; flag && i <= ed; i++) {
                if (line[i].y < minY || line[i].y > maxY) {
                  flag = false;
                  // info.push({ind: id, pos: i, ...line[i]});
                }
              }
              if (st !== 0) {
                let y = mix(line[st - 1], line[st], minX).y;
                if (y < minY || y > maxY) {
                  // info.push({ind:id, pos: 'left', calY: y, lp: line[st-1], rp: line[st]});
                  flag = false;
                }
              }
              if (ed !== line.length - 1) {
                let y = mix(line[ed], line[ed + 1], maxX).y;
                if (y < minY || y > maxY) {
                  // info.push({ind:id, pos: 'right', calY: y, lp: line[ed], rp: line[ed+1]});
                  flag = false;
                }
              }
              if (flag) result.push(id);
            }
            // console.log('information');
            // console.log(info);
            // console.log('result', result);
            result = new Set(result);
            query.cache = result;
          } else if (this.brushMethod === "tree") {
            const result = new Set(
                this.tr.ee
                    .brush(
                        [
                          Math.min(query.start[0], query.end[0]),
                          Math.min(query.start[1], query.end[1]),
                        ],
                        [
                          Math.max(query.start[0], query.end[0]),
                          Math.max(query.start[1], query.end[1]),
                        ]
                    )
                    .filter((id) => {
                      // return true;
                      const line = unobserve.result[id];
                      let l = 0,
                          r = line.length - 1,
                          lp = 0,
                          rp = r,
                          mid,
                          tmpY;
                      while (l <= r) {
                        mid = (l + r) >> 1;
                        if (line[mid].x >= minX) {
                          lp = mid;
                          r = mid - 1;
                        } else l = mid + 1;
                      }

                      l = 0;
                      r = line.length - 1;
                      while (l <= r) {
                        mid = (l + r) >> 1;
                        if (line[mid].x <= maxX) {
                          rp = mid;
                          l = mid + 1;
                        } else {
                          r = mid - 1;
                        }
                      }
                      // console.log(lp, rp);
                      for (let i = lp; i <= rp; i++) {
                        if (line[i].y < minY || line[i].y > maxY) {
                          // console.log(line[i]);
                          return false;
                        }
                      }
                      if (lp) {
                        tmpY = mix(line[lp - 1], line[lp], minX).y;
                        if (tmpY < minY || tmpY > maxY) {
                          // console.log(tmpY);
                          return false;
                        }
                      }
                      if (rp < line.length - 1) {
                        tmpY = mix(line[rp], line[rp + 1], minX).y;
                        if (tmpY < minY || tmpY > maxY) {
                          // console.log(tmpY);
                          return false;
                        }
                      }
                      return true;
                    })
            );

            query.cache = result;
          } else {
            const yyds = this.tr.ee.brush(
                [
                  Math.min(query.start[0], query.end[0]),
                  Math.min(query.start[1], query.end[1]),
                ],
                [
                  Math.max(query.start[0], query.end[0]),
                  Math.max(query.start[1], query.end[1]),
                ]
            );

            const result = new Set(
                yyds
                    .filter(({raw}) =>
                        lineRectCollide(
                            {
                              x1: raw[0],
                              x2: raw[1],
                              y1: raw[2],
                              y2: raw[3],
                            },
                            {
                              x: Math.min(query.start[0], query.end[0]),
                              y: Math.min(query.start[1], query.end[1]),
                              width: Math.abs(query.start[0] - query.end[0]),
                              height: Math.abs(query.start[1] - query.end[1]),
                            }
                        )
                    )
                    .map(({raw}) => raw[5])
            );

            yyds
                .filter(
                    ({raw}) =>
                        lineSegmentsCollide(
                            {x: raw[0], y: raw[2]},
                            {x: raw[1], y: raw[3]},
                            {
                              x: Math.min(query.start[0], query.end[0]),
                              y: Math.min(query.start[1], query.end[1]) - 1,
                            },
                            {
                              x: Math.max(query.start[0], query.end[0]),
                              y: Math.min(query.start[1], query.end[1]) - 1,
                            }
                        ) ||
                        lineSegmentsCollide(
                            {x: raw[0], y: raw[2]},
                            {x: raw[1], y: raw[3]},
                            {
                              x: Math.min(query.start[0], query.end[0]),
                              y: Math.max(query.start[1], query.end[1]) + 1,
                            },
                            {
                              x: Math.max(query.start[0], query.end[0]),
                              y: Math.max(query.start[1], query.end[1]) + 1,
                            }
                        )
                )
                .forEach(({raw}) => result.delete(raw[5]));
            // this.tr.ee
            //     .brush(
            //         [
            //           Math.min(query.start[0], query.end[0]),
            // Math.max(query.start[1], query.end[1]),
            // ],
            // [
            //   Math.max(query.start[0], query.end[0]),
            //   Math.max(query.start[1], query.end[1]) + 1,
            // ]
            // )
            // .filter(({raw}) =>
            //     lineRectCollide(
            //         {
            //           x1: raw[0],
            //           x2: raw[1],
            //           y1: raw[2],
            //           y2: raw[3],
            //         },
            //         {
            //           x: Math.min(query.start[0], query.end[0]),
            //           y: Math.min(query.start[1], query.end[1]),
            //           width: Math.abs(query.start[0] - query.end[0]),
            //           height: Math.abs(query.start[1] - query.end[1]),
            //         }
            //     )
            // )
            // .forEach(({raw}) => result1.delete(raw[5]));
            query.cache = result;
          }
        }
      } else if (query.type === "ang") {
        const endX = Math.max(query.start[0] + 1, query.end[0]);
        const minX = query.start[0],
            maxX = endX;
        const slopeBase =
            (query.end[1] - query.start[1]) / (endX - query.start[0]);
        const angBase = Math.atan(slopeBase);
        const angMax = Math.min(
            (1 / 2) * Math.PI - 0.0001,
            angBase + (query.n / 180) * Math.PI
        );
        const angMin = Math.max(
            -(1 / 2) * Math.PI + 0.0001,
            angBase - (query.n / 180) * Math.PI
        );
        const slopeMax = Math.tan(angMax);
        const slopeMin = Math.tan(angMin);
        const endYMax = query.start[1] + slopeMax * (endX - query.start[0]);
        const endYMin = query.start[1] + slopeMin * (endX - query.start[0]);
        unobserve.mouseLayerContext.fillStyle = "rgba(0,0,0,0.3)";
        unobserve.mouseLayerContext.beginPath();
        unobserve.mouseLayerContext.moveTo(query.start[0], query.start[1]);
        unobserve.mouseLayerContext.lineTo(endX, endYMin);
        unobserve.mouseLayerContext.lineTo(endX, endYMax);
        unobserve.mouseLayerContext.closePath();
        unobserve.mouseLayerContext.fill();
        unobserve.mouseLayerContext.lineWidth = 1;
        unobserve.mouseLayerContext.strokeStyle = "black";
        unobserve.mouseLayerContext.beginPath();
        unobserve.mouseLayerContext.moveTo(query.start[0], query.start[1]);
        unobserve.mouseLayerContext.lineTo(endX, query.end[1]);
        unobserve.mouseLayerContext.stroke();
        if (!query.cache) {
          const result = new Set(
              this.tr.ee
                  .angular([query.start[0], slopeMin], [endX, slopeMax])
                  .filter((id) => {
                    // return true;
                    const line = unobserve.result[id];
                    let l = 0,
                        r = line.length - 1,
                        lp = 0,
                        rp = r,
                        mid,
                        tmpY;
                    while (l <= r) {
                      mid = (l + r) >> 1;
                      if (line[mid].x >= minX) {
                        lp = mid;
                        r = mid - 1;
                      } else l = mid + 1;
                    }

                    l = 0;
                    r = line.length - 1;
                    while (l <= r) {
                      mid = (l + r) >> 1;
                      if (line[mid].x <= maxX) {
                        rp = mid;
                        l = mid + 1;
                      } else {
                        r = mid - 1;
                      }
                    }
                    // console.log(lp, rp);
                    for (let i = lp; i <= rp; i++) {
                      if (line[i].y < minY || line[i].y > maxY) {
                        // console.log(line[i]);
                        return false;
                      }
                    }
                    if (lp) {
                      tmpY = mix(line[lp - 1], line[lp], minX).y;
                      if (tmpY < minY || tmpY > maxY) {
                        // console.log(tmpY);
                        return false;
                      }
                    }
                    if (rp < line.length - 1) {
                      tmpY = mix(line[rp], line[rp + 1], minX).y;
                      if (tmpY < minY || tmpY > maxY) {
                        // console.log(tmpY);
                        return false;
                      }
                    }
                    return true;
                  })
          );
          query.cache = result;
        }
      } else if (query.type === "attr") {
        if (!query.cache) {
          const {ind, val} = query.info;
          console.log(unobserve.aggregatedData, unobserve.data);
          const result = new Array(unobserve.result.length)
              .fill(0)
              .map((_, i) => i)
              .filter((i) => {
                const exampleInd = unobserve.aggregatedData[i].ref[0];
                const targetVal = unobserve.data[exampleInd][ind];
                return targetVal === val;
              });
          query.cache = new Set(result);
        }
      }
    },

    hoverBox(query) {
      unobserve.mouseLayerContext.lineWidth = 2;
      if (query.type === "knn") {
        unobserve.mouseLayerContext.beginPath();
        unobserve.mouseLayerContext.arc(...query.start, 6, 0, 2 * Math.PI);
        unobserve.mouseLayerContext.strokeStyle = "red";
        unobserve.mouseLayerContext.stroke();
      } else if (query.type === "rnn") {
        unobserve.mouseLayerContext.beginPath();
        unobserve.mouseLayerContext.arc(
            ...query.start,
            query.n,
            0,
            2 * Math.PI
        );
        unobserve.mouseLayerContext.strokeStyle = "red";
        unobserve.mouseLayerContext.stroke();
      } else if (query.type === "brush") {
        unobserve.mouseLayerContext.strokeStyle = "red";
        unobserve.mouseLayerContext.strokeRect(
            ...query.start.map((v, i) => Math.min(v, query.end[i])),
            ...query.end.map((v, i) => Math.abs(v - query.start[i]))
        );
      } else if (query.type === "ang") {
        const endX = Math.max(query.start[0] + 1, query.end[0]);
        const slopeBase =
            (query.end[1] - query.start[1]) / (endX - query.start[0]);
        const angBase = Math.atan(slopeBase);
        const angMax = Math.min(
            (1 / 2) * Math.PI - 0.0001,
            angBase + (query.n / 180) * Math.PI
        );
        const angMin = Math.max(
            -(1 / 2) * Math.PI + 0.0001,
            angBase - (query.n / 180) * Math.PI
        );
        const slopeMax = Math.tan(angMax);
        const slopeMin = Math.tan(angMin);
        const endYMax = query.start[1] + slopeMax * (endX - query.start[0]);
        const endYMin = query.start[1] + slopeMin * (endX - query.start[0]);
        unobserve.mouseLayerContext.strokeStyle = "red";
        unobserve.mouseLayerContext.beginPath();
        unobserve.mouseLayerContext.moveTo(query.start[0], query.start[1]);
        unobserve.mouseLayerContext.lineTo(endX, endYMin);
        unobserve.mouseLayerContext.lineTo(endX, endYMax);
        unobserve.mouseLayerContext.closePath();
        unobserve.mouseLayerContext.stroke();
      }
    },

    initCanvas(context) {
      if (typeof context === 'string')
        context = document.getElementById(context)
            .getContext("2d");
      if (!context)
        return;
      context.fillStyle = "black";
      context.globalAlpha = 1;
      context.fillRect(0, 0, 1000, 500);
      context.clearRect(0, 0, 1000, 500);
    },

    renderBoxes(type = "all") {
      this.initCanvas(unobserve.mouseLayerContext);

      let tmpQueries = [...unobserve.querys];
      if (this.preview && !this.modify) {
        tmpQueries.push(this.preview);
        // drawLine([...preview.cache]);
      }
      console.time("update brush");
      tmpQueries.forEach(this.renderBox);
      console.timeEnd("update brush");

      if (type === "mouseLayer") return;

      this.initCanvas(unobserve.selectionLayerContext);
      this.initCanvas(unobserve.repLayerContext);

      if (!this.preview) {
        let result1 = [],
            result2 = [];
        result1 = tmpQueries.reduce(
            (p, v) =>
                v.hide ? p : new Set([...p].filter((x) => v.cache.has(x))),
            (tmpQueries[0] || {cache: new Set()}).cache
        );
        result2 = tmpQueries.reduce(
            (p, v) => (v.hide ? p : new Set([...p, ...v.cache])),
            (tmpQueries[0] || {cache: new Set()}).cache
        );
        this.renderResult([...result1], [...result2]);
      }
      console.time("begin calculate rep line and draw line");
      this.drawLine(this.getSelectedIds());
      console.timeEnd("begin calculate rep line and draw line");
      // this.drawLine(typeof this.selectedQuery === 'number' ? unobserve.querys[this.selectedQuery] : this.selectedQuery === '$int' ? unobserve.interResult : unobserve.unionResult);

      console.log("render boxes ended ==== \n\n");
    },

    getSelectedIds() {
      return typeof this.selectedQuery === "number"
          ? [...unobserve.querys[this.selectedQuery].cache]
          : this.selectedQuery === "$int"
              ? unobserve.interResult
              : unobserve.unionResult;
    },

    renderAxisHelper(e) {
      const x = e.offsetX;
      const y = !this.upsideDown ? 500 - e.offsetY : e.offsetY;
      const oriX = this.xScale.invert(x);
      const oriY = this.yScale.invert(500 - y);

      const date =
          unobserve.inferX == "date"
              ? moment(oriX).format("YYYY-MM-DD")
              : oriX.toFixed(2);

      const upsideDown = this.upsideDown;
      const enlargeFont = this.enlargeFont;
      const fontWidth = enlargeFont ? 103 : 70;
      const fontHeight = enlargeFont ? 22 : 20;
      const heightInSvg = enlargeFont ? 18 : 12;
      if (this.showCursorValue) {
        this.cursorHelper.selectAll("line").each(function (_, i) {
          d3.select(this)
              .attr('x1', i === 0 ? 0 : x)
              .attr('y1', i === 0 ? 500 - y : upsideDown ? 0 : 500)
              .attr('x2', x)
              .attr('y2', 500 - y)
              .attr('stroke-width', () => enlargeFont ? 2 : 1);
        });

        this.cursorHelper.selectAll("text").each(function (_, i) {
          d3.select(this)
              .attr('x', i === 0 ? 0 : x - (x > 1000 - fontWidth ? fontWidth : 0))
              .attr(
                  'y',
                  i === 0 ? 500 - y + (y > 500 - fontHeight ? heightInSvg : 0) : upsideDown ? heightInSvg : 500
              )
              .text(i === 0 ? oriY.toFixed(2) : date)
              .attr('font-size', enlargeFont ? 20 : 14)
        });
      } else {
        this.cursorHelper
            .selectAll("line")
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", 0)
            .attr("y2", 0);

        this.cursorHelper.selectAll("text").text("");
      }
    },

    getColorMap(overlay = false) {
      const colormaps = [
        [
          [253, 231, 37],
          [188, 223, 39],
          [122, 209, 81],
          [67, 191, 113],
          [34, 168, 132],
          [33, 145, 141],
          [42, 120, 142],
          [53, 96, 141],
          [65, 68, 135],
          [72, 37, 117],
          [68, 1, 84],
        ],
        [
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
        ],
        [
          [252, 255, 164],
          [246, 214, 69],
          [252, 165, 10],
          [243, 119, 26],
          [221, 81, 58],
          [187, 55, 85],
          [147, 38, 103],
          [107, 23, 110],
          [66, 10, 104],
          [23, 12, 59],
          [0, 0, 4],
        ],
        [
          [240, 249, 33],
          [252, 206, 37],
          [252, 166, 54],
          [242, 131, 76],
          [225, 100, 98],
          [203, 71, 121],
          [177, 42, 144],
          [144, 13, 164],
          [106, 0, 168],
          [66, 3, 157],
          [13, 8, 135],
        ],
        [
          [253, 234, 69],
          [234, 209, 86],
          [202, 186, 106],
          [173, 164, 118],
          [148, 143, 120],
          [127, 124, 117],
          [105, 105, 112],
          [77, 86, 109],
          [43, 68, 110],
          [10, 50, 106],
          [0, 32, 81],
        ],
        [
          [144, 12, 0],
          [186, 34, 8],
          [246, 95, 24],
          [255, 164, 35],
          [222, 221, 50],
          [149, 251, 81],
          [77, 248, 132],
          [39, 215, 196],
          [47, 157, 245],
          [74, 88, 221],
          [35, 23, 27],
        ],
        [
          [213, 239, 237],
          [193, 232, 224],
          [167, 221, 209],
          [139, 210, 190],
          [112, 198, 169],
          [88, 186, 145],
          [68, 173, 119],
          [49, 156, 93],
          [32, 137, 70],
          [14, 119, 54],
          [3, 100, 41],
        ],
        [
          [204, 221, 236],
          [186, 208, 228],
          [168, 194, 221],
          [154, 176, 212],
          [145, 156, 201],
          [141, 133, 190],
          [139, 109, 178],
          [138, 85, 166],
          [135, 60, 153],
          [130, 34, 135],
          [115, 15, 113],
        ],
        [
          [244, 209, 102],
          [213, 202, 96],
          [182, 195, 92],
          [152, 187, 89],
          [124, 178, 87],
          [96, 166, 86],
          [75, 156, 83],
          [63, 143, 79],
          [51, 131, 74],
          [37, 119, 64],
          [20, 108, 54],
        ],
        [
          [244, 209, 102],
          [248, 190, 92],
          [248, 170, 76],
          [245, 152, 59],
          [243, 133, 42],
          [239, 112, 27],
          [226, 98, 31],
          [214, 83, 34],
          [197, 73, 35],
          [177, 66, 35],
          [158, 58, 38],
        ],
        [
          [244, 209, 102],
          [246, 190, 89],
          [249, 170, 81],
          [252, 150, 78],
          [246, 131, 75],
          [238, 115, 74],
          [229, 98, 73],
          [219, 82, 71],
          [207, 66, 68],
          [196, 49, 65],
          [183, 29, 62],
        ],
        [
          [211, 238, 206],
          [197, 232, 195],
          [177, 225, 187],
          [155, 216, 187],
          [130, 206, 194],
          [105, 194, 202],
          [81, 178, 205],
          [60, 159, 199],
          [40, 138, 189],
          [22, 117, 177],
          [11, 96, 161],
        ],
        [
          [253, 220, 175],
          [253, 207, 155],
          [253, 193, 138],
          [253, 173, 119],
          [251, 149, 98],
          [246, 125, 83],
          [238, 101, 69],
          [226, 73, 50],
          [211, 45, 30],
          [191, 19, 13],
          [167, 4, 3],
        ],
        [
          [219, 216, 234],
          [200, 206, 228],
          [176, 195, 222],
          [147, 183, 216],
          [114, 172, 209],
          [84, 159, 200],
          [56, 146, 187],
          [28, 136, 163],
          [9, 127, 135],
          [2, 115, 107],
          [1, 99, 83],
        ],
        [
          [219, 218, 235],
          [200, 206, 228],
          [177, 195, 222],
          [151, 183, 216],
          [123, 172, 209],
          [91, 159, 201],
          [58, 144, 192],
          [30, 127, 183],
          [11, 112, 171],
          [5, 97, 153],
          [4, 82, 129],
        ],
        [
          [220, 201, 226],
          [211, 179, 215],
          [206, 158, 204],
          [209, 134, 192],
          [218, 107, 178],
          [225, 77, 160],
          [226, 49, 137],
          [217, 30, 111],
          [198, 17, 89],
          [171, 7, 73],
          [143, 2, 58],
        ],
        [
          [252, 207, 204],
          [252, 190, 192],
          [250, 169, 184],
          [249, 143, 175],
          [245, 113, 165],
          [236, 83, 157],
          [219, 54, 149],
          [196, 27, 138],
          [169, 8, 128],
          [141, 1, 121],
          [112, 1, 116],
        ],
        [
          [239, 249, 189],
          [219, 241, 180],
          [189, 229, 181],
          [148, 213, 185],
          [105, 197, 190],
          [69, 180, 194],
          [44, 158, 192],
          [33, 130, 184],
          [33, 99, 170],
          [35, 71, 156],
          [28, 49, 133],
        ],
        [
          [228, 244, 172],
          [209, 236, 160],
          [185, 226, 148],
          [158, 214, 136],
          [128, 201, 124],
          [98, 187, 110],
          [71, 170, 94],
          [50, 151, 80],
          [32, 131, 68],
          [14, 114, 59],
          [3, 96, 52],
        ],
        [
          [254, 234, 161],
          [254, 221, 132],
          [254, 204, 99],
          [254, 183, 70],
          [252, 160, 49],
          [246, 137, 33],
          [235, 114, 21],
          [219, 94, 11],
          [197, 76, 5],
          [171, 61, 3],
          [143, 50, 4],
        ],
        [
          [254, 224, 135],
          [254, 209, 111],
          [254, 189, 89],
          [254, 168, 73],
          [253, 144, 62],
          [252, 115, 53],
          [249, 82, 43],
          [238, 52, 35],
          [222, 27, 32],
          [202, 11, 34],
          [175, 2, 37],
        ],
      ];
      return colormaps[
          overlay ? this.colormapOverlayIndexCache : this.colormapIndexCache
          ];
    },

    renderColorMap() {
      // document.getElementById("colorMax").innerText = currentDensityMax;
      document.getElementById(
          "color-map"
      ).style.background = `linear-gradient(to right, ${this.getColorMap()
          .map(
              (color, i, arr) =>
                  `rgb(${color.join(", ")}) ${((i / (arr.length - 1)) * 100).toFixed(
                      0
                  )}%`
          )
          .join(", ")})`;
    },

    renderColorMapOverlay() {
      // document.getElementById("colorMax").innerText = currentDensityMax;
      document.getElementById(
          "color-map-overlay"
      ).style.background = `linear-gradient(to right, ${this.getColorMap(true)
          .map(
              (color, i, arr) =>
                  `rgb(${color.join(", ")}) ${((i / (arr.length - 1)) * 100).toFixed(
                      0
                  )}%`
          )
          .join(", ")})`;
    },

    rgb(i, overlay = false) {
      const ci = overlay
          ? this.colormapOverlayIndexCache
          : this.colormapIndexCache;
      if (colorMapCache[ci]?.[Math.round(i * 100)]) {
        return colorMapCache[ci][Math.round(i * 100)];
      }
      const colormap = this.getColorMap(overlay);
      const base = Math.floor(i * 10);
      if (i <= 0) return colormap[0];
      if (i >= 1) return colormap[10];
      if (colormap[base] === undefined) console.log(colormap, base, i);
      const result = colormap[base].map(
          (v, ci) => v + (colormap[base + 1][ci] - v) * (i * 10 - base)
      );
      if (!colorMapCache[ci]) {
        colorMapCache[ci] = {};
      }
      colorMapCache[ci][Math.round(i * 100)] = result;
      return result;
    },

    //#region old render method
    // renderAllDensity() {
    //   let ids;
    //   ids = new Array(unobserve.result.length).fill(0).map((_, i) => i);
    //   let initFlag = true;
    //   const bgContext = document.getElementById('canvas').getContext('2d');

    //   console.time('temp canvas');
    //   const tempCanvas = document.createElement('canvas');
    //   tempCanvas.width = 1000;
    //   tempCanvas.height = 500;
    //   const tempContext = tempCanvas.getContext('2d');
    //   tempContext.globalCompositeOperation = 'lighter';
    //   tempContext.strokeStyle = '#010101';
    //   for (let id of ids) {
    //     const line = unobserve.result[id];
    //     tempContext.beginPath();
    //     tempContext.moveTo(line[0].x, line[0].y);
    //     for (let point of line) {
    //       tempContext.lineTo(point.x, point.y);
    //     }
    //     tempContext.stroke();
    //   }

    //   const tempImageData = tempContext.getImageData(0, 0, 1000, 500);
    //   if (initFlag) {
    //     this.initDensityBufferCache = tempContext.getImageData(0, 0, 1000, 500);
    //   }
    //   console.timeEnd('temp canvas');
    //   console.time('render');
    //   bgContext.fillStyle = 'black';
    //   bgContext.globalAlpha = 1;
    //   bgContext.fillRect(0, 0, 1000, 500);
    //   bgContext.clearRect(0, 0, 1000, 500);
    //   const maxWeight =
    //     this.maxDensity ||
    //     tempImageData.data.reduce((p, v, i) =>
    //       i % 4 === 3 ? p : Math.max(p, v)
    //     );
    //   this.maxDensity = maxWeight;
    //   for (let i = 0; i < 1000; i++) {
    //     for (let j = 0; j < 500; j++) {
    //       const ratio = tempImageData.data[(j * 1000 + i) * 4] / maxWeight;
    //       const color = this.rgb(ratio);
    //       tempImageData.data.set(color, (j * 1000 + i) * 4);
    //       tempImageData.data[(j * 1000 + i) * 4 + 3] = ratio <= 0 ? 0 : 255;
    //     }
    //   }
    //   bgContext.putImageData(tempImageData, 0, 0);
    //   console.timeEnd('render');
    //   if (initFlag) {
    //     this.initDensityMaxCache = maxWeight;
    //     this.initDensityCache = bgContext.getImageData(0, 0, 1000, 500);
    //   }
    //   this.currentDensityMax = maxWeight;
    //   this.currentDensity = bgContext.getImageData(0, 0, 1000, 500);
    //   // renderColorMap();
    // },
    //#endregion

    renderAllDensity(initFlag) {
      const bgContext = document.getElementById("canvas").getContext("2d");
      if (!unobserve.slopePixelCache) {
        const cache = new Array(1000)
            .fill()
            .map(() => new Array(500).fill().map(() => ({})));
        for (let id in unobserve.result) {
          const line = unobserve.result[id];
          for (let i = 0; i < line.length - 1; i++) {
            brensenhamArr(
                [line[i], line[i + 1]],
                cache,
                id,
                (line[i + 1].y - line[i].y) / (line[i + 1].x - line[i].x)
            );
          }
        }
        unobserve.slopePixelCache = cache;
      }
      console.time("temp canvas");
      const tempBuffer = new Float32Array(1000 * 500).map((_, i) => {
        const row = i % 500;
        const col = Math.floor(i / 500);
        const pixelCache = Object.values(unobserve.slopePixelCache[col][row]);
        if (this.normalizeDensity) {
          return pixelCache.reduce((p, v) => p + v, 0);
        } else {
          return pixelCache.length;
        }
      });
      if (initFlag) {
        this.initDensityBufferCache = tempBuffer;
      }
      console.timeEnd("temp canvas");
      console.time("render");
      bgContext.fillStyle = "black";
      bgContext.globalAlpha = 1;
      bgContext.fillRect(0, 0, 1000, 500);
      bgContext.clearRect(0, 0, 1000, 500);
      const tempImageBuffer = new Uint8ClampedArray(1000 * 500 * 4);
      const tempImageData = new ImageData(tempImageBuffer, 1000, 500);
      const maxWeight = Math.ceil(
          (!initFlag && this.maxDensity) ||
          tempBuffer.reduce((p, v) => Math.max(p, v))
      );
      this.maxDensity = maxWeight;
      if (initFlag) {
        this.maxOverlayDensity = maxWeight;
      }
      const colorCache = {};
      for (let i = 0; i < 1000; i++) {
        for (let j = 0; j < 500; j++) {
          const ratio = Math.round((tempBuffer[i * 500 + j] / maxWeight) * 100);
          if (!colorCache[ratio]) {
            colorCache[ratio] = this.rgb(ratio / 100);
          }
          const color = colorCache[ratio];
          tempImageBuffer.set(color, (j * 1000 + i) * 4);
          tempImageBuffer[(j * 1000 + i) * 4 + 3] = ratio <= 0 ? 0 : 255;
        }
      }
      bgContext.putImageData(tempImageData, 0, 0);
      console.timeEnd("render");
      if (initFlag) {
        this.initDensityMaxCache = maxWeight;
        this.initDensityCache = bgContext.getImageData(0, 0, 1000, 500);
      }
      this.currentDensityMax = maxWeight;
      this.currentDensity = bgContext.getImageData(0, 0, 1000, 500);
      // renderColorMap();
    },

    renderDensity() {
      let ids = this.getSelectedIds();
      const fastMapping = {};
      ids.forEach((id) => (fastMapping[id] = 1));
      let initFlag = false;
      let renderFlag = false;
      for (let i in this.layers) {
        const layer = this.layers[i];
        if (layer.name === "selected density" && layer.opacity > 0) {
          renderFlag = true;
        }
      }
      if (!renderFlag) return;
      const bgContext = document
          .getElementById("selectionCanvas")
          .getContext("2d");

      console.time("render");
      bgContext.fillStyle = "black";
      bgContext.globalAlpha = 1;
      bgContext.fillRect(0, 0, 1000, 500);
      bgContext.clearRect(0, 0, 1000, 500);
      const tempImageBuffer = new Uint8ClampedArray(1000 * 500 * 4);
      const tempImageData = new ImageData(tempImageBuffer, 1000, 500);
      const maxWeight = this.maxOverlayDensity;
      for (let i = 0; i < 1000; i++) {
        for (let j = 0; j < 500; j++) {
          let weight = 0;
          const pixelCache = Object.entries(unobserve.slopePixelCache[i][j]);
          if (this.normalizeDensity) {
            weight = pixelCache.reduce(
                (p, v) => p + (fastMapping[v[0]] ? v[1] : 0),
                0
            );
          } else {
            weight = pixelCache.reduce(
                (p, v) => p + (fastMapping[v[0]] ? 1 : 0),
                0
            );
          }
          const ratio = weight / maxWeight;
          const color = this.rgb(ratio, true);
          tempImageBuffer.set(color, (j * 1000 + i) * 4);
          tempImageBuffer[(j * 1000 + i) * 4 + 3] = ratio <= 0 ? 0 : 255;
        }
      }
      bgContext.putImageData(tempImageData, 0, 0);
      console.timeEnd("render");
      this.currentDensityMax = maxWeight;
      this.currentDensity = bgContext.getImageData(0, 0, 1000, 500);
    },

    rearrangeLayer(
        options = [
          {
            name: "raw_lines",
            opacity: 0,
            zIndex: 0,
          },
          {
            name: "canvas",
            opacity: 1,
            zIndex: 1,
          },
          {
            name: "selectionCanvas",
            opacity: 0,
            zIndex: 2,
          },
          {
            name: "selectionLayer",
            opacity: 0.4,
            zIndex: 3,
          },
          {
            name: "rep_layer",
            opacity: 1,
            zIndex: 4,
          },
        ]
    ) {
      for (let ind in options) {
        const option = options[ind];
        let ele = document.getElementById(option.id);
        ele.style.opacity = option.opacity;
        ele.style.zIndex = `${6 - ind}`;
      }
    },

    setReverseY() {
      console.log("before set", this.yScale.range());
      this.yScale.range(this.upsideDown ? [0, 500] : [500, 0]);
      console.log("after set", this.yScale.range());

      const scaleY = `scaleY(${!this.upsideDown ? 1 : -1})`;

      //#region reverse the every canvas
      const canvasList = [
        "canvas",
        "selectionCanvas",
        "selectionLayer",
        "rep_layer",
        "raw_lines",
        "mouseLayer",
      ];
      for (let id of canvasList) {
        document.getElementById(id).style.transform = scaleY;
      }
      //#regionend

      this.svg.select("#xaxis").remove();
      this.svg.select("#yaxis").remove();
      // svg.append("g").attr("transform", "translate(30,500)").call(xAxis);
      this.svg
          .append('g')
          .attr('id', 'yaxis')
          .attr('transform', 'translate(50,20)')
          .call(unobserve.yAxis);
      this.svg
          .append('g')
          .attr('id', 'xaxis')
          .attr('transform', `translate(50,${this.upsideDown ? 20 : 520})`)
          .call(this.upsideDown ? unobserve.xAxisR : unobserve.xAxis);
    },
    getStaticInformation(ids) {
      if (!ids || !ids.length) return {};
      // ids = new Array(unobserve.result.length).fill(0).map((_,i) => i);
      const minX = d3.min(ids, (id) => unobserve.result[id][0].x);
      const maxX = d3.max(ids, (id) => unobserve.result[id][0].x);
      const minY = d3.min(ids, (id) =>
          d3.min(unobserve.result[id], (d) => this.yScaleC.invert(d.y))
      );
      const maxY = d3.max(ids, (id) =>
          d3.max(unobserve.result[id], (d) => this.yScaleC.invert(d.y))
      );
      const means = ids.map((id) =>
          d3.mean(unobserve.result[id], (d) => this.yScaleC.invert(d.y))
      );
      const mean = d3.mean(means);
      const variance =
          means.length > 1
              ? d3.variance(means)
              : d3.variance(unobserve.result[ids[0]], (d) =>
                  this.yScaleC.invert(d.y)
              );

      return {
        minT: moment(this.xScale.invert(minX)).format("YYYY-M-D"),
        maxT: moment(this.xScale.invert(maxX)).format("YYYY-M-D"),
        minV: minY.toFixed(2),
        maxV: maxY.toFixed(2),
        count: ids.length,
        points: ids.reduce((p, v) => p + unobserve.result[v]?.length ?? 0, 0),
        mean: mean.toFixed(2),
        var: variance.toFixed(2),
      };
    },

    getColor(id) {
      if (this.colorCache[id]) return this.colorCache[id];

      function luminance(r, g, b) {
        var a = [r, g, b].map(function (v) {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
      }

      function contrast(rgb1, rgb2) {
        var lum1 = luminance(rgb1[0], rgb1[1], rgb1[2]);
        var lum2 = luminance(rgb2[0], rgb2[1], rgb2[2]);
        var brightest = Math.max(lum1, lum2);
        var darkest = Math.min(lum1, lum2);
        return (brightest + 0.05) / (darkest + 0.05);
      }

      const r = seedrandom(id);
      let res = new Array(3).fill(0).map(() => Math.floor(r() * 255));
      while (contrast(res, [255, 255, 255]) < 3) {
        res = new Array(3).fill(0).map(() => Math.floor(r() * 255));
      }
      this.colorCache[id] = res;
      return res;
    },

    calcRepLines(ids) {
      const lineCount = this.repCount;
      const lineWeights = ids
          .map((id) => ({
            id,
            w: this.calcLineWeight(id),
            cur: calculateCurvature(
                unobserve.result[id].filter((point) =>
                    unobserve.querys.length <= 0 && !unobserve.preview
                        ? true
                        : (unobserve.preview
                            ? [unobserve.preview]
                            : unobserve.querys
                        ).find((query) => {
                          if (query.type === "knn") {
                            return true; // TODO: only line in knn
                          } else if (query.type === "rnn") {
                            return (
                                Math.sqrt(
                                    Math.pow(point.x - query.start[0], 2) +
                                    Math.pow(point.y - query.start[1], 2)
                                ) <= query.n
                            );
                          } else if (query.type === "brush") {
                            const startX = Math.min(query.start[0], query.end[0]);
                            const startY = Math.min(query.start[1], query.end[1]);
                            const endX = Math.max(query.start[0], query.end[0]);
                            const endY = Math.max(query.start[1], query.end[1]);
                            return (
                                point.x >= startX &&
                                point.y >= startY &&
                                point.x <= endX &&
                                point.y <= endY
                            );
                          } else if (query.type === "ang") {
                            const startX = Math.min(query.start[0], query.end[0]);
                            const endX = Math.max(query.start[0], query.end[0]);
                            return point.x >= startX && point.x <= endX;
                          }
                        })
                )
            ),
          }))
          .sort(
              (a, b) => b.w[0] * Math.sqrt(b.w[1]) - a.w[0] * Math.sqrt(a.w[1])
          );
      // const extend0 = d3.extent(lineWeights, d => d.cur[0]);
      // const extend1 = d3.extent(lineWeights, d => d.cur[1]);
      // const scale0 = d3.scaleLinear().domain(extend0).range([0, 1]);
      // const scale1 = d3.scaleLinear().domain(extend1).range([0, 1]);
      //
      // lineWeights.forEach(d => {
      //   d.cur[0] = scale0(d.cur[0]);
      //   d.cur[1] = scale1(d.cur[1]);
      // })
      console.log("this is line weight");
      console.log(lineWeights);

      return (
          lineWeights
              .reduce((p, v) => {
                // if (document.getElementById("show-all-clusters").checked) {
                //   p.push(v);
                //   return p;
                // }
                if (
                    p.length >= lineCount ||
                    v.w[1] < 1000 / 3 ||
                    p.find((a) => calculateDifference(a.cur, v.cur) < this.diverse)
                ) {
                  return p;
                }
                p.push(v);
                return p;
              }, [])
              // .slice(0, lineCount)
              .map((x) => x.id)
      );
    },
    drawLineWithLayer(ids, layer) {
      for (let id of ids) {
        const line = unobserve.result[id];
        layer.strokeStyle = `rgb(${this.getColor(id).join(',')})`;
        layer.beginPath();
        layer.moveTo(line[0].x, line[0].y);
        for (let point of line) {
          layer.lineTo(point.x, point.y);
        }
        layer.stroke();
      }
    },
    drawLine(ids) {
      // Selected Part =====================
      if (this.preview) {
        ids = ids.slice(0, 5);
      }
      if (!this.preview) {
        this.drawLineWithLayer(ids, unobserve.selectionLayerContext);
      }

      // REP PART =====================

      if (this.preview) {
        ids = [...this.preview.cache];
      } else if (!unobserve.querys.length) {
        ids = new Array(unobserve.result.length).fill(0).map((_, i) => i);
      }
      const topIds = this.calcRepLines(ids);

      if (!unobserve.querys.length) {
        unobserve.globalRep = topIds;
      }
      this.drawLineWithLayer(topIds, unobserve.repLayerContext);
    },
    calcLineWeight(id) {
      let weight = 0;
      let passedPixels = 0;
      let lineLen = 0;
      const hasBrush = unobserve.querys.find((q) => q.type === "brush");
      const brushes = unobserve.querys
          .filter((q) => q.type === "brush")
          .map((b) => [
            Math.min(b.start[0], b.end[0]),
            Math.max(b.start[0], b.end[0]),
            Math.min(b.start[1], b.end[1]),
            Math.max(b.start[1], b.end[1]),
          ]);
      // if (unobserve.weightCache[id] !== undefined && !hasBrush) return unobserve.weightCache[id];
      const line = unobserve.result[id];

      for (let i = 0; i < line.length - 1; i++) {
        let xx = Math.floor(line[i + 1].x);
        let yy = Math.floor(line[i + 1].y);
        let x = Math.floor(line[i].x);
        let y = Math.floor(line[i].y);
        // BRENSENHAM
        let dx = Math.abs(xx - x);
        let sx = x < xx ? 1 : -1;
        let dy = -Math.abs(yy - y);
        let sy = y < yy ? 1 : -1;
        let err = dx + dy;
        let errC; // error value
        let end = false;
        let x1 = x;
        let y1 = y;
        let px = 0;

        while (!end) {
          if (
              (!hasBrush ||
                  brushes.find(
                      (b) => b[0] <= x1 && b[1] >= x1 && b[2] <= y1 && b[3] >= y1
                  )) &&
              x1 >= 0 &&
              x1 < 1000 &&
              y1 >= 0 &&
              y1 < 500
          ) {
            weight += this.initDensityBufferCache[x1 * 500 + y1];
            passedPixels++;
            if (x1 !== px) {
              px = x1;
              lineLen++;
            }
          }
          if (x1 === xx && y1 === yy) {
            end = true;
          } else {
            errC = 2 * err;
            if (errC >= dy) {
              err += dy;
              x1 += sx;
            }
            if (errC <= dx) {
              err += dx;
              y1 += sy;
            }
          }
        }
      }

      let oldWeight = weight;
      weight /= passedPixels;

      if (!isFinite(weight) || isNaN(weight)) {
        console.log(weight, passedPixels, oldWeight);
        weight = 0.00001;
      }

      if (!hasBrush) {
        unobserve.weightCache[id] = [
          weight * Math.sqrt(lineLen),
          line[line.length - 1].x - line[0].x,
        ];
      }
      return [weight * Math.sqrt(lineLen), line[line.length - 1].x - line[0].x];
    },
  },
  mounted() {
    unobserve.querys = [];
    unobserve.weightCache = [];
    unobserve.layers = this.layers;
    unobserve.upsideDown = this.upsideDown;

    this.headers = unobserve.headers.map((title, key) => {
      return {title, key, minWidth: 150};
    });

    const headerMap = new Map();
    const sets = [];
    unobserve.headers.forEach(() => {
      sets.push(new Set());
    });

    unobserve.data.forEach((column) => {
      column.forEach((d, i) => {
        sets[i].add(d);
      });
    });
    unobserve.headers.forEach((d, i) => {
      headerMap.set(d, [...sets[i]]);
    });
    unobserve.headerMap = headerMap;

    const data = unobserve.aggregatedData;
    console.log(data);
    const minX = d3.min(data, (line) => d3.min(line[this.timeIndex]));
    const maxX = d3.max(data, (line) => d3.max(line[this.timeIndex]));
    const minY = d3.min(data, (line) => d3.min(line[this.valueIndex]));
    const maxY = d3.max(data, (line) => d3.max(line[this.valueIndex]));
    console.log(minX, maxX, minY, maxY);

    const xScaleData = d3
        .scaleLinear()
        .domain([minX, maxX])
        .range([0, 1000]);
    this.xScale =
        unobserve.inferX == "date"
            ? d3
                .scaleTime()
                .domain([
                  new Date(minX * 3600 * 24 * 1000),
                  new Date(maxX * 3600 * 24 * 1000),
                ])
                .range([0, 1000])
            : xScaleData;
    this.yScale = d3
        .scaleLinear()
        .domain([minY, maxY])
        .range([500, 0]);
    this.yScaleC = d3
        .scaleLinear()
        .domain([minY, maxY])
        .range([500, 0]);

    let result = data.map((line) => {
      let res = [];
      line[this.timeIndex].forEach((d, i) => {
        res.push({
          x: xScaleData(d),
          y: this.yScale(line[this.valueIndex][i]),
        });
      });
      return res;
    });
    unobserve.result = result;
    let drawMode = "all";
    let reverseY = false;
    //#endregion

    // #region init tree

    this.tr = {}; // Avoid tracking properties in tree
    this.tr.ee = new KDTree(result);
    // this.tr.ee.buildKDTree();

    // tree.render(
    //   document.getElementById("canvas"),
    //   [
    //     [0, 1000],
    //     [0, 500],
    //   ],
    //   [
    //     [0, 1000],
    //     [0, 500],
    //   ],
    //   [[1]]
    // ); // GPU will be faster
    // In order to have a high performance, we use JS fallback instead
    this.renderAllDensity(true);
    this.renderDensity();
    //#endregion

    //#region init helpers
    unobserve.selectionLayerContext = document
        .getElementById("selectionLayer")
        .getContext("2d");
    unobserve.mouseLayerContext = document
        .getElementById("mouseLayer")
        .getContext("2d");
    unobserve.repLayerContext = document
        .getElementById("rep_layer")
        .getContext("2d");
    unobserve.rawLinesLayerContext = document
        .getElementById("raw_lines")
        .getContext("2d");
    unobserve.hoverLayer = document
        .getElementById('hoverLayer')
        .getContext("2d");
    this.svg = d3.select(document.getElementById("axisHelper"));
    this.cursorHelper = d3.select(document.getElementById("cursorHelper"));

    const xAxis = d3.axisBottom(this.xScale);
    const xAxisR = d3.axisTop(this.xScale);
    const yAxis = d3.axisLeft(this.yScale);
    unobserve.yAxis = yAxis;
    unobserve.xAxis = xAxis;
    unobserve.xAxisR = xAxisR;

    this.svg
        .append('g')
        .attr('id', 'xaxis')
        .attr('transform', 'translate(50,520)')
        .call(xAxis);
    // svg.append("g").attr("transform", "translate(50,0)").call(yAxis);
    this.svg
        .append('g')
        .attr('id', 'yaxis')
        .attr('transform', 'translate(50,20)')
        .call(yAxis);

    //#endregion

    //#region init functions

    //#endregion

    // renderQuerys();
    this.renderBoxes();
    this.drawRawLines();
    this.rearrangeLayer(this.layers);
    this.cnt++;
    // console.log(this.layers);
    this.colormapIndexCache = 1;
    this.renderColorMap();
    this.renderColorMapOverlay();
    // const colormapList = document.querySelector('#colormap > div.ivu-select-dropdown > ul.ivu-select-dropdown-list');

    // const table = document.querySelector(
    //   "#app > div > div.ivu-layout-content > div:nth-child(2) > div > div > div > div > div.ivu-table-wrapper.ivu-table-wrapper-with-border > div.ivu-table.ivu-table-default.ivu-table-border"
    // );
    const tableId = document.getElementById("informationTable");
    tableId.addEventListener("mousemove", (e) => {
      let ele = null;
      if (e.path.length >= 18) ele = e.path[e.path.length - 18];
      if (
          !ele ||
          !(
              ele.tagName.toLowerCase() === "tr" &&
              ele.parentNode.tagName.toLowerCase() === "tbody"
          )
      ) {
        this.hoveringInd = null;
        this.renderBoxes("mouseLayer");
      } else {
        let ind;
        const children = ele.parentNode.children;
        let counter = 0;
        for (let i = 0; i < children.length; i++) {
          const e = children[i];
          if (e.className?.includes("ivu-table-row")) {
            counter++;
          }
          if (e === ele) {
            ind = counter - 1;
            break;
          }
        }
        if (ind >= unobserve.querys.length) {
          this.renderBoxes("mouseLayer");
          this.hoveringInd = null;
          return;
        }
        this.hoveringQuery(ind);
      }
    });

    tableId.addEventListener("mouseleave", () => {
      this.renderBoxes("mouseLayer");
      this.hoveringInd = null;
    });
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
  //background-image: linear-gradient(
  //        to right,
  //        #fcfdbf,
  //        #fece91 10%,
  //        #fe9f6d 20%,
  //        #f76f5c 30%,
  //        #de4968 40%,
  //        #b6377a 50%,
  //        #8c2981 60%,
  //        #651a80 70%,
  //        #3b0f70 80%,
  //        #150e37 90%,
  //        #000004
  //);
  display: inline-block;
  width: 200px;
  height: 32px;
  margin: 0 10px;
  vertical-align: middle;
  border-radius: 4px;

  &#color-map-overlay {
    width: 160px;
  }
}

.select-colormap {
  width: 90px;
  display: inline-block;
  vertical-align: middle;
  // margin: 0 7px;
}

#informationTable {
  > .ivu-table {
    > .ivu-table-body {
      > table > .ivu-table-tbody {
        > tr.ivu-table-row-hover {
          outline: 2px solid red;
          outline-offset: -2px;

          > td {
            background: transparent;
          }
        }

        > tr.selected-table-row td {
          background: #d3ebff;
        }

        .ivu-btn-ghost.ivu-btn-default {
          color: #000;
          border-color: #888;
        }
      }
    }
  }
}

#colormap,
#colormapOverlay {
  width: 200px;
  position: absolute;
  left: 107px;
  top: 0;

  &#colormapOverlay {
    width: 160px;
  }

  .ivu-select-selection {
    background: transparent;
    border: none;

    .ivu-select-selected-value,
    .ivu-select-placeholder {
      display: none;
    }
  }
}
</style>
