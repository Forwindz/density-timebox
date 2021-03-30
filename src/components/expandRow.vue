<template>
  <Table :columns="repColumns" :data="row">
    <template slot-scope="{ row }" slot="name">
      <div
        style="display: flex; flex-direction: row; justify-content: center; align-items: center;"
      >
        <div class="small-point" v-bind:style="{ background: row.color }"></div>
        <p>{{ row.name }}</p>
      </div>
    </template>
    <template slot="op" slot-scope="{ row }">
      <Button ghost type="primary" size="small" @click="showData(row)"
        >Detail
      </Button>
    </template>
  </Table>
</template>

<script>
import unobserve from '../store';
import * as d3 from 'd3';

export default {
  name: 'expandRow',
  props: {
    row: Array,
  },
  data() {
    return {
      repColumns: [
        {
          title: `Line "${unobserve.aggregateName}"`,
          align: 'center',
          slot: 'name',
        },
        // { title: 'Min start time', align: 'center', key: 'minT' },
        // { title: 'Max start time', align: 'center', key: 'maxT' },
        { title: 'Min value', align: 'center', key: 'minV' },
        { title: 'Max value', align: 'center', key: 'maxV' },
        { title: 'Mean value', align: 'center', key: 'mean' },
        { title: 'Variance', align: 'center', key: 'var' },
        { title: 'Operation', align: 'center', slot: 'op' },
      ],
    };
  },
  methods: {
    showData(row) {
      const aggIndex = unobserve.headers.indexOf(unobserve.aggregateName);
      this.$Modal.info({
        width: 1000,
        closable: true,
        render: (h) =>
          h('div', [
            h('svg', {
              attrs: {
                id: 'rep-line-svg',
                viewBox: '0 0 1050 550',
              },
              style: {
                height: '550px',
                width: '950px',
              },
            }),
            h('Table', {
              props: {
                columns: unobserve.headers.map((title, key) => ({
                  title,
                  align: 'center',
                  key,
                })),
                data: unobserve.data
                  .filter((x) => x[aggIndex] == row.name)
                  .map((x) => x.reduce((p, v, i) => ({ ...p, [i]: v }), {})),
                stripe: true,
              },
            }),
          ]),
      });
      this.$nextTick().then(() => {
        console.log('svgsvg');
        const svg = d3.select('#rep-line-svg');
        console.log(svg);
        svg
          .append('g')
          .attr('id', 'yaxis')
          .attr('transform', 'translate(50,20)')
          .call(unobserve.yAxis);
        svg
          .append('g')
          .attr('id', 'xaxis')
          .attr('transform', `translate(50,${unobserve.upsideDown ? 20 : 520})`)
          .call(unobserve.upsideDown ? unobserve.xAxisR : unobserve.xAxis);
        svg
          .append('g')
          .attr('transform', `translate(50,20)`)
          .append('path')
          .attr(
            'd',
            d3.line()(
              unobserve.screenResult[row.id].map(({ x, y }) => [
                x,
                unobserve.upsideDown ? 500 - y : y,
              ])
            )
          )
          .attr('stroke', row.color)
          .attr('fill', 'none');
      });
    },
  },
};
</script>

<style>
.small-point {
  height: 12px;
  width: 12px;
  border-radius: 50%;
  margin-right: 6px;
}
</style>
