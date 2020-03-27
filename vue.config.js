module.exports = {
  chainWebpack: config => {
    config.resolve.extensions.prepend(".ts").prepend(".tsx");
    config.module
      .rule("typescript")
      .test(/\.tsx?$/)
      .use("ts-loader")
      .loader("ts-loader");
    config.module
      .rule("csv")
      .test(/\.csv$/)
      .use("file-loader")
      .loader("file-loader");
  }
};
