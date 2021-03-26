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
        >Explore
      </Button>
    </template>
  </Table>
</template>

<script>
import unobserve from '../store';

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
  mounted() {
    console.log('this is rows', this.row);
  },
  methods: {
    showData(row) {
      const aggIndex = unobserve.headers.indexOf(unobserve.aggregateName);
      console.log(this.$Modal.info);
      this.$Modal.info({
        width: 1000,
        closable: true,
        maskClosable: true,
        render: (h) =>
          h('Table', {
            props: {
              columns: unobserve.headers.map((title, key) => ({
                title,
                align: 'center',
                key,
              })),
              data: unobserve.data.filter((x) => x[aggIndex] == row.name),
              stripe: true,
            },
          }),
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
