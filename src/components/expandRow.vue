<template>
  <Table
      :columns="repColumns"
      :data="row"
  >
    <template slot-scope="{row, index}" slot="name">
      <div style="display: flex; flex-direction: row; justify-content: center; align-items: center;">
        <div class="small-point" v-bind:style=" {background: row.color}"></div>
        <p>{{row.name}}</p>
      </div>
    </template>
  </Table>
</template>

<script>
export default {
  name: "expandRow",
  props: {
    row: Array,
  },
  data() {
    return {
      repColumns: [
        { title: 'Index num.', align: 'center', slot: 'name' },
        // { title: 'Min start time', align: 'center', key: 'minT' },
        // { title: 'Max start time', align: 'center', key: 'maxT' },
        { title: 'Min value', align: 'center', key: 'minV' },
        { title: 'Max value', align: 'center', key: 'maxV' },
        { title: 'Mean value', align: 'center', key: 'mean' },
        { title: 'Variance', align: 'center', key: 'var' },
      ],
    }
  },
  mounted() {
    console.log('this is rows', this.row);
  }
}
</script>

<style >
.small-point {
  height: 12px;
  width: 12px;
  border-radius: 50%;
  margin-right: 6px;
}
</style>
