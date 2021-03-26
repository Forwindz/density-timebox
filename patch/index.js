const fs = require('fs');

const iviewSource = fs.readFileSync('node_modules/view-design/dist/iview.js', {
  encoding: 'utf-8',
});

const iviewPatched = iviewSource.replace(
  'maskClosable: false',
  'maskClosable: true'
);

fs.writeFileSync('node_modules/view-design/dist/iview.js', iviewPatched, {
  encoding: 'utf-8',
});
