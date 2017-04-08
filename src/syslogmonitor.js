'use strict';
const Tail = require('always-tail');

const logger = require('./logger');

let _unassignedAddrs = [];

const _parseDnsmasqLine = (line) => {
  const reRestart = /started, version/;
  const reNoAddr = /([0-9a-f]+:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+).* no address available/i;

  if (reRestart.test(line)) {
    logger.info('dnsmasq restart detected, clearing unassigned address maps');
    _unassignedAddrs = [];
    return;
  }

  const noAddr = reNoAddr.exec(line);
  if (noAddr) {
    if (!isValidRequest(noAddr[1])) {
      logger.info('detetcted a request with no address assigned: %s', noAddr[1]);
      _unassignedAddrs.push({ ts: new Date(), mac: noAddr[1] });
    }
  }
};


const monitor = () => {
  const reDnsmasq = / dnsmasq/;
  const tail = new Tail(process.env.SYSLOG_FILE, '\n');
  tail.on('line', (line) => {
    if (reDnsmasq.test(line)) {
      _parseDnsmasqLine(line);
    }
  });
  tail.on('error', (err) => {
    logger.error('error monitorinig syslog: %s', err);
  });
  tail.watch();
};


const getRequests = () => {
  return [..._unassignedAddrs];
};


const removeRequest = (mac) => {
  logger.debug('Received request to remove mac: ', mac);
  const pos = _unassignedAddrs.findIndex(x => x.mac === mac);
  if (pos >= 0) {
    logger.debug('removed %s', mac);
    _unassignedAddrs = [..._unassignedAddrs.slice(0, pos), ..._unassignedAddrs.slice(pos + 1)];
  }
};


const isValidRequest = (mac) => {
  return !!_unassignedAddrs.find(x => x.mac === mac);
};

module.exports = {
  monitor,
  getRequests,
  removeRequest,
  isValidRequest
};
