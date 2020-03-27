<template>
  <div id="app">
    <Layout>
      <Header>
        <Menu mode="horizontal" theme="dark" @on-select="eventHandler">
          <h1 class="layout-logo">Density-based Timebox</h1>
          <div class="layout-nav">
            <Upload
              action="/"
              v-show="false"
              ref="upload"
              :before-upload="readFileHandler"
            />
            <MenuItem name="1">
              <Icon type="ios-archive"></Icon>
              Example data
            </MenuItem>
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
          flexDirection: 'row'
        }"
      >
        <Card class="sticky-content">
          <div>
            <p>Line Aggregation Attribute:</p>
            <Select v-model="aggregateAttr" style="width:200px">
              <Option v-for="(attr, i) in headers" :value="i" :key="i">{{
                attr
              }}</Option>
            </Select>
            <p>Time Attribute:</p>
            <Select v-model="timeAttr" style="width:200px">
              <template v-for="(attr, i) in headers">
                <Option v-if="inferTypes[i] != 'string'" :value="i" :key="i">{{
                  attr
                }}</Option>
              </template>
            </Select>
            <p>Value Attribute(s):</p>
            <Select v-model="valueAttr" style="width:200px" multiple>
              <template v-for="(attr, i) in headers">
                <Option v-if="inferTypes[i] == 'number'" :value="i" :key="i">{{
                  attr
                }}</Option>
              </template>
            </Select>
            <br />
            <br />
            <Button
              @click="generateCharts"
              type="primary"
              style="width:200px"
              :disabled="!headers.length"
              >generate chart(s)</Button
            >
          </div>
        </Card>
        <Card style="margin-left:20px;flex-grow:1">
          <div style="min-height: 200px;color:red" v-if="!chartConfigs.length">
            Please load a dataset (.csv file) first!
            <Button
              @click="eventHandler('1')"
              type="primary"
              icon="ios-archive"
              style="margin:0 12px"
              >Example data</Button
            >
            <Button
              @click="eventHandler('2')"
              type="primary"
              icon="ios-cloud-upload-outline"
              style="margin:0 12px"
              >Load data</Button
            >
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
                @filterChange="handleFilterChange(i, $event)"
              />
            </template>
          </div>
        </Card>
      </Content>
      <Footer class="layout-footer-center">2020 &copy; VisLab.Wang</Footer>
    </Layout>
  </div>
</template>

<script>
import CanvasBox from "./components/CanvasBox.vue";
import { generateData, readData } from "./core/data-gen";
import unobserve from "./store";

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
    CanvasBox
  },
  data() {
    return {
      headers: [],
      inferTypes: [],
      aggregateAttr: 0,
      timeAttr: 0,
      valueAttr: [],
      chartConfigs: [],
      filters: []
    };
  },
  methods: {
    eventHandler(type) {
      this.$Spin.show();
      switch (type) {
        case "1":
          generateData().then(data => {
            this.$Spin.hide();
            this.preProcessData(data);
            this.generateCharts();
          });
          break;
        case "2":
          this.$refs.upload.handleClick();
          this.$Spin.hide();
          break;
      }
    },
    readFileHandler(file) {
      this.$Spin.show();
      readData(file).then(data => {
        this.$Spin.hide();
        this.preProcessData(data);
        this.generateCharts();
      });
      return false;
    },
    preProcessData(data) {
      this.headers = data[0];
      unobserve.data = data.slice(1);
      if (data.length > 1) {
        this.inferTypes = data[1].map(attr => {
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
        let valueAttr = this.inferTypes.indexOf("number");
        if (this.aggregateAttr < 0) this.aggregateAttr = 0;
        if (this.timeAttr < 0) this.timeAttr = 0;
        if (valueAttr >= 0) this.valueAttr = [valueAttr];
      }
    },
    generateCharts() {
      if (this.valueAttr.length > 3) {
        if (
          !confirm(
            "This may causing out of GPU memory, are you sure to continue?"
          )
        ) {
          return;
        }
      }
      this.$Spin.show();
      if (
        this.headers[this.aggregateAttr] !=
          (this.chartConfigs.length && this.chartConfigs[0].aggregateName) ||
        this.valueAttr.find(
          idx => !this.chartConfigs.find(config => config.valueIndex === idx)
        )
      ) {
        unobserve.aggregatedData = [];
        let aggrMap = new Map();
        const infers = {
          [this.timeAttr]: this.inferTypes[this.timeAttr],
          ...this.valueAttr
            .map(idx => {
              return { [idx]: this.inferTypes[idx] };
            })
            .reduce((p, v) => {
              return { ...p, ...v };
            }, {})
        };
        unobserve.data.forEach(row => {
          let aggrList;
          const aggrKey = row[this.aggregateAttr];
          if (!aggrMap.has(aggrKey)) {
            aggrList = {
              [this.timeAttr]: [],
              ...this.valueAttr
                .map(idx => {
                  return { [idx]: [] };
                })
                .reduce((p, v) => {
                  return { ...p, ...v };
                }, {})
            };
            aggrMap.set(aggrKey, aggrList);
          } else {
            aggrList = aggrMap.get(aggrKey);
          }
          aggrList[this.timeAttr].push(
            parseField(row[this.timeAttr], infers[this.timeAttr])
          );
          this.valueAttr.forEach(idx => {
            aggrList[idx].push(parseField(row[idx], infers[idx]));
          });
        });
        for (let aggregated of aggrMap.values()) {
          unobserve.aggregatedData.push(
            Object.entries(aggregated).reduce((p, v) => {
              return {
                ...p,
                [v[0]]: new Float32Array(v[1])
              };
            }, {})
          );
        }
        aggrMap.clear();
      }
      this.chartConfigs = this.valueAttr.map(attr => {
        return {
          aggregateIndex: this.aggregateAttr,
          timeIndex: this.timeAttr,
          valueIndex: attr,
          aggregateName: this.headers[this.aggregateAttr],
          timeName: this.headers[this.timeAttr],
          valueName: this.headers[attr],
          filter: undefined,
          emitFilter: undefined
        };
      });
      this.filters = this.valueAttr.map(_ => undefined);
      this.$Spin.hide();
    },
    handleFilterChange(index, filter) {
      this.filters.splice(index, 1, filter);
      if (!this.filters.find(f => f)) {
        this.chartConfigs.forEach(config => {
          this.$set(config, "filter", undefined);
        });
        return;
      }
      const set = new Float32Array(
        new Set(
          this.filters
            .reduce((p, v) => [...p, ...(v ? v : [])], [])
            .filter(x => !this.filters.find(f => !(f && f.includes(x))))
        )
      );
      this.chartConfigs.forEach(config => {
        this.$set(config, "filter", set);
      });
    }
  }
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
</style>
