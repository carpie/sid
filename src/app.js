'use strict';

const express = require('express');
const app = express();

app.use('/$', (req, res) => {
  res.send('Hello world.');
});

app.listen(3400, () => {
  console.log('SID listening on port 3400...');
});
