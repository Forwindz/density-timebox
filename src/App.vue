<template>
  <div id="app">
    <Layout>
      <Header>
        <h1 class="layout-logo">KD-Box</h1>
        <Menu mode="horizontal" theme="dark" @on-select="eventHandler">
          <div class="layout-nav">
            <Upload
              action="/"
              v-show="false"
              ref="upload"
              :before-upload="readFileHandler"
            />
            <Submenu name="3">
              <template slot="title">
                <Icon type="ios-archive"></Icon>
                Example data
              </template>
              <MenuItem name="1-1">Stocks(25.2M)</MenuItem>
              <MenuItem name="1-2">Airline(10.6M)</MenuItem>
              <MenuItem name="1-3">Weather(29.6M)</MenuItem>
              <MenuItem name="1-4">Reading(18.5M)</MenuItem>
            </Submenu>
            <MenuItem name="2">
              <Icon type="ios-cloud-upload-outline"></Icon>
              Load data
            </MenuItem>
          </div>
        </Menu>
      </Header>
      <Content
        :style="{
          width: '1850px',
          margin: '0 auto',
          padding: '0 50px',
          display: 'flex',
          flexDirection: 'row',
        }"
      >
        <Card class="sticky-content">
          <div>
            <Button @click="eventHandler('2')" style="width: 200px" type="info">
              <Icon type="ios-cloud-upload-outline"></Icon>
              Load data
            </Button>
            <Poptip style="width: 200px; display: block;">
              <Button style="width: 200px">Example Data</Button>
              <div
                style="display: flex; flex-direction: column;"
                slot="content"
              >
                <Button style="width: 200px" @click="eventHandler('1-1')"
                  >Stocks(25.2M)</Button
                >
                <Button style="width: 200px" @click="eventHandler('1-2')"
                  >Airline(10.6M)</Button
                >
                <Button style="width: 200px" @click="eventHandler('1-3')"
                  >Weather(29.6M)</Button
                >
                <Button style="width: 200px" @click="eventHandler('1-4')"
                  >Reading(18.5M)</Button
                >
              </div>
            </Poptip>
            <Upload
              action="/"
              v-show="false"
              ref="upload"
              :before-upload="readFileHandler"
            />
            <!--            <Menu-->
            <!--                active-name="2"-->
            <!--                :open-names="[]"-->
            <!--                style="margin-bottom: 100px; width: 200px;"-->
            <!--                @on-select="eventHandler"-->
            <!--            >-->
            <!--              <MenuItem name="2">-->
            <!--                <Icon type="ios-cloud-upload-outline"></Icon>-->
            <!--                Load data-->
            <!--              </MenuItem>-->
            <!--              <Submenu name="1">-->
            <!--                <template slot="title">-->
            <!--                  <Icon type="ios-archive"/>-->
            <!--                  Example Data-->
            <!--                </template>-->
            <!--                <MenuItem name="1-1">Stocks(25.2M)</MenuItem>-->
            <!--                <MenuItem name="1-2">Airline(10.6M)</MenuItem>-->
            <!--                <MenuItem name="1-3">Weather(29.6M)</MenuItem>-->
            <!--                <MenuItem name="1-4">Reading(18.5M)</MenuItem>-->
            <!--              </Submenu>-->
            <!--            </Menu>-->

            <p style="margin-top: 100px">Line Aggregation Attribute:</p>
            <Select v-model="aggregateAttr" style="width:200px">
              <Option v-for="(attr, i) in headers" :value="i" :key="i"
                >{{ attr }}
              </Option>
            </Select>
            <p>Time Attribute:</p>
            <Select v-model="timeAttr" style="width:200px">
              <template v-for="(attr, i) in headers">
                <Option v-if="inferTypes[i] != 'string'" :value="i" :key="i"
                  >{{ attr }}
                </Option>
              </template>
            </Select>
            <p>Value Attribute:</p>
            <Select v-model="valueAttr" style="width:200px">
              <template v-for="(attr, i) in headers">
                <Option v-if="inferTypes[i] == 'number'" :value="i" :key="i"
                  >{{ attr }}
                </Option>
              </template>
            </Select>
            <br />
            <br />
            <Button
              @click="generateCharts"
              type="primary"
              style="width:200px"
              :disabled="!headers.length"
              >generate chart
            </Button>
            <div style="margin-top:100px">
              <Button type="primary" @click="exportFig" style="width:200px"
                >export figure
              </Button>
              <br />
              <Button
                type="primary"
                @click="exportData(1)"
                style="margin-top:12px;width:200px"
                >export representative lines
              </Button>
              <br />
              <Button
                type="primary"
                @click="exportData(0)"
                style="margin-top:12px;width:200px"
                >export select lines
              </Button>
              <!-- <p>Layers:</p> -->
              <!-- <draggable v-model="layers">
                <div
                  v-for="layer in layers"
                  :key="layer.id"
                  style="display:flex;align-items:center;border:1px solid gray;margin-top:4px;background:white;cursor:pointer"
                >
                  <Icon type="md-menu" style="cursor:move" />
                  <Poptip
                    :width="200"
                    style="flex-grow:1"
                    trigger="click"
                    :title="'Layer: ' + layer.name"
                  >
                    <p style="width:170px;padding-left: 12px">
                      {{ layer.name }}
                    </p>
                    <div slot="content" style="display:flex;align-items:center">
                      <span style="margin-right:8px">Opacity</span>
                      <Slider
                        v-model="layer.opacity"
                        :min="0"
                        :max="1"
                        :step="0.01"
                        show-tip="never"
                        style="flex-grow:1"
                      />
                      <span style="margin-left:8px;white-space:pre-wrap;"
                        >{{
                          Math.round(layer.opacity * 100)
                            .toString()
                            .padStart(3)
                        }}%</span
                      >
                    </div>
                  </Poptip>
                  <Icon
                    :type="layer.opacity === 0 ? 'md-eye-off' : 'md-eye'"
                    :style="{ opacity: layer.opacity * 0.7 + 0.3 }"
                    @click="layer.opacity = layer.opacity === 0 ? 1 : 0"
                  />
                </div>
              </draggable> -->
            </div>
          </div>
        </Card>
        <Card style="margin-left:20px;flex-grow:1">
          <div style="min-height: 200px;color:red" v-if="!headers.length">
            Please load a dataset (.csv file) first!
            <Button
              @click="eventHandler('1-1')"
              type="primary"
              icon="ios-archive"
              style="margin:0 12px"
              >Example Stocks(25.2M)
            </Button>
            <Button
              @click="eventHandler('1-2')"
              type="primary"
              icon="ios-archive"
              style="margin:0 12px"
              >Example Airline(10.6M)
            </Button>
            <Button
              @click="eventHandler('1-3')"
              type="primary"
              icon="ios-archive"
              style="margin:0 12px"
              >Example Weather(29.6M)
            </Button>
            <Button
              @click="eventHandler('1-4')"
              type="primary"
              icon="ios-archive"
              style="margin:0 12px"
              >Example Reading(18.5M)
            </Button>
            <Button
              @click="eventHandler('2')"
              type="primary"
              icon="ios-cloud-upload-outline"
              style="margin:0 12px"
              >Load data
            </Button>
          </div>
          <div v-else>
            <div
              style="min-height: 200px;color:red"
              v-if="!chartConfigs.length"
            >
              Please use a valid configuration in left panel!
            </div>
            <div v-else>
              <template v-for="(config, i) in chartConfigs">
                <CanvasBox
                  :key="
                    config.aggregateName +
                      '#' +
                      config.timeName +
                      '#' +
                      config.valueName
                  "
                  :timeIndex="config.timeIndex"
                  :valueIndex="config.valueIndex"
                  :timeName="config.timeName"
                  :valueName="config.valueName"
                  :filter="config.filter"
                  :layers="layers"
                  @filterChange="handleFilterChange(i, $event)"
                />
              </template>
            </div>
          </div>
        </Card>
      </Content>
      <!-- <Footer class="layout-footer-center">2020 &copy; VisLab.Wang</Footer> -->
    </Layout>
  </div>
</template>

<script>
import { exportCanvas } from "./core/utils";
import CanvasBox from "./components/CanvasBox.vue";
import { generateData, readData } from "./core/data-gen";
import unobserve from "./store";
import download from "downloadjs";

function parseField(value, type) {
  switch (type) {
    case "string":
      return 0;
    case "date":
      return Math.floor(new Date(value) / (24 * 3600 * 1000));
    case "number":
      return parseFloat(value);
  }
}

export default {
  name: "App",
  components: {
    CanvasBox,
  },
  data() {
    return {
      headers: [],
      inferTypes: [],
      aggregateAttr: 0,
      timeAttr: 0,
      valueAttr: 0,
      chartConfigs: [],
      filters: [],
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
    };
  },
  methods: {
    eventHandler(type) {
      this.$Spin.show();
      if (type.startsWith("1")) {
        generateData(type.split("-")[1]).then((data) => {
          this.$Spin.hide();
          this.preProcessData(data);
          this.generateCharts();
        });
      } else if (type == "2") {
        this.$refs.upload.handleClick();
        this.$Spin.hide();
      }
    },
    readFileHandler(file) {
      this.$Spin.show();
      readData(file).then((data) => {
        this.$Spin.hide();
        this.preProcessData(data);
        this.generateCharts();
      });
      return false;
    },
    preProcessData(data) {
      this.headers = data[0];
      unobserve.headers = data[0];
      unobserve.data = data.slice(1);
      if (data.length > 1) {
        this.inferTypes = data[1].map((attr) => {
          if (attr.includes("-") || attr.includes("/")) {
            let isDate = new Date(attr).toString();
            if (isDate.startsWith("Invalid")) {
              return "string";
            }
            return "date";
          }
          if (/^\d*(\.\d*)?$/.test(attr)) {
            return "number";
          }
          return "string";
        });
        this.aggregateAttr = this.inferTypes.indexOf("string");
        this.timeAttr = this.inferTypes.indexOf("date");
        if (this.aggregateAttr < 0) this.aggregateAttr = 0;
        if (this.timeAttr < 0) {
          this.timeAttr = this.inferTypes.indexOf("number");
          if (this.aggregateAttr === this.timeAttr)
            this.timeAttr = this.inferTypes.indexOf(
              "number",
              this.aggregateAttr + 1
            );
        }
        if (this.timeAttr < 0) this.timeAttr = 0;
        this.valueAttr = this.inferTypes.indexOf("number");
        if (
          this.valueAttr === this.timeAttr ||
          this.valueAttr === this.aggregateAttr
        )
          this.valueAttr = this.inferTypes.indexOf("number", this.timeAttr + 1);
        if (this.valueAttr < 0) this.valueAttr = 0;
      }
    },
    generateCharts() {
      this.$Spin.show();
      if (
        this.headers[this.aggregateAttr] !=
          (this.chartConfigs.length && this.chartConfigs[0].aggregateName) ||
        !this.chartConfigs.find(
          (config) => config.valueIndex === this.valueAttr
        )
      ) {
        unobserve.aggregatedData = [];
        let aggrMap = new Map();
        const infers = {
          [this.timeAttr]: this.inferTypes[this.timeAttr],
          [this.valueAttr]: this.inferTypes[this.valueAttr],
        };
        unobserve.data.forEach((row, i) => {
          let aggrList;
          const aggrKey = row[this.aggregateAttr];
          if (!aggrMap.has(aggrKey)) {
            aggrList = {
              ref: [],
              [this.timeAttr]: [],
              [this.valueAttr]: [],
            };
            aggrMap.set(aggrKey, aggrList);
          } else {
            aggrList = aggrMap.get(aggrKey);
          }
          aggrList.ref.push(i);
          aggrList[this.timeAttr].push(
            parseField(row[this.timeAttr], infers[this.timeAttr])
          );
          aggrList[this.valueAttr].push(
            parseField(row[this.valueAttr], infers[this.valueAttr])
          );
        });
        for (let [key, aggregated] of aggrMap.entries()) {
          unobserve.aggregatedData.push(
            Object.entries(aggregated).reduce(
              (p, v) => {
                return {
                  ...p,
                  [v[0]]: new Float32Array(v[1]),
                };
              },
              { key }
            )
          );
        }
        aggrMap.clear();
      }
      if (this.valueAttr === this.timeAttr) {
        this.chartConfigs = [];
      } else {
        this.chartConfigs = [
          {
            aggregateIndex: this.aggregateAttr,
            timeIndex: this.timeAttr,
            valueIndex: this.valueAttr,
            aggregateName: this.headers[this.aggregateAttr],
            timeName: this.headers[this.timeAttr],
            valueName: this.headers[this.valueAttr],
            filter: undefined,
            emitFilter: undefined,
          },
        ];
        unobserve.aggregateName = this.headers[this.aggregateAttr];
        unobserve.slopePixelCache = null;
        unobserve.inferX = this.inferTypes[this.timeAttr];
      }
      this.filters = this.chartConfigs.map((_) => undefined);
      this.$Spin.hide();
    },
    handleFilterChange(index, filter) {
      this.filters.splice(index, 1, filter);
      if (!this.filters.find((f) => f)) {
        this.chartConfigs.forEach((config) => {
          this.$set(config, "filter", undefined);
        });
        return;
      }
      const set = new Float32Array(
        new Set(
          this.filters
            .reduce((p, v) => [...p, ...(v ? v : [])], [])
            .filter((x) => !this.filters.find((f) => !(f && f.includes(x))))
        )
      );
      this.chartConfigs.forEach((config) => {
        this.$set(config, "filter", set);
      });
    },
    exportFig() {
      // exportCanvas(
      //     [this.$refs.canvas, this.$refs.canvasOverlay, this.$refs.canvasRawLine],
      //     this.upsideDown
      // );
      exportCanvas(
        unobserve.layers
          .map((layer) => document.getElementById(layer.id))
          .reverse(),
        unobserve.upsideDown,
        unobserve.layers.map((layer) => layer.opacity).reverse()
      );
    },
    exportData(mode) {
      let ids = unobserve[mode ? "repIds" : "selectedLines"];
      if (!ids || !ids.length) return;
      let previousName = "";
      let previousId = -1;
      const exportData = unobserve.data.filter((raw) => {
        if (raw[this.aggregateAttr] !== previousName) {
          previousId++;
          previousName = raw[this.aggregateAttr];
        }
        if (ids.includes(previousId)) {
          return true;
        } else {
          return false;
        }
      });
      download(
        unobserve.headers.join(",") +
          "\n" +
          exportData.map((d) => d.join(",")).join("\n"),
        "export.csv",
        "text/csv"
      );
    },
  },
};
</script>

<style lang="scss">
#app {
  min-width: 1850px;
}

.layout {
  border: 1px solid #d7dde4;
  background: #f5f7f9;
  position: relative;
  border-radius: 4px;
}

.layout-logo {
  float: left;
  position: relative;
  left: 20px;
  color: white;
}

.layout-nav {
  // width: 420px;
  float: right;
  margin: 0 auto;
  margin-right: 20px;
}

.layout-footer-center {
  text-align: center;
}

.sticky-content > * {
  position: sticky;
  top: 0;
}
.ivu-poptip-body {
  padding: 0 !important;
}
</style>
