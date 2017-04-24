'use strict';
require('dotenv').config();

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const logger = require('./logger');

logger.level = process.env.LOG_LEVEL;

const syslogMonitor = require('./syslogmonitor.js');
const configManager = require('./configmanager.js');

app.use(bodyParser.json());


app.get('/requests$', (req, res) => {
  res.json(syslogMonitor.getRequests());
});


app.post('/requests/:mac$', (req, res) => {
  logger.info('assigning address for %s as %s', req.params.mac, req.body.hostname);
  configManager.addMac(req.params.mac, req.body.hostname)
  .then((rec) => {
    syslogMonitor.removeRequest(req.params.mac);
    return res.json(rec);
  })
  .catch((err) => {
    logger.error('addMac failed: %s', err);
    return res.status(500).json({ error: err.toString() });
  });
});


app.delete('/requests/:mac$', (req, res) => {
  if (!syslogMonitor.isValidRequest(req.params.mac)) {
    return res.status(404).json({ error: 'Not found' });
  }
  logger.info('denying address for %s', req.params.mac);
  syslogMonitor.removeRequest(req.params.mac);
  return res.json({});
});


app.listen(process.env.PORT, () => {
  logger.info('SID listening on port %s...', process.env.PORT);
  logger.info('Log level is %s', logger.level);
  syslogMonitor.monitor();
});
