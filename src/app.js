'use strict';

const express = require('express');
const app = express();

const syslogMonitor = require('./syslogmonitor.js');

app.use('/$', (req, res) => {
  res.send('Hello world.');
});

app.get('/requests$', (req, res) => {
  res.json(syslogMonitor.getRequests());
});

app.listen(3400, () => {
  console.log('SID listening on port 3400...');
  syslogMonitor.monitor();
});
