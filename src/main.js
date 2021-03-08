import Vue from "vue";
import App from "./App.vue";
import iView from "view-design";

import "view-design/dist/styles/iview.css";

Vue.use(iView);

Vue.config.productionTip = false;

new Vue({
  render: h => h(App)
}).$mount("#app");

// Detect integrated GPU
const canvas = document.createElement("canvas");
const gl = canvas.getContext("webgl");
const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
const gpuInfo = gl
  .getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
  .toLowerCase();
