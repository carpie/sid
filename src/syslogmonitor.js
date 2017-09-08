'use strict';
const Tail = require('always-tail');

const logger = require('./logger');

let _unassignedAddrs = [];
let _recentlyRemovedAddrs = [];
let _cleanupTimerId = null;

const _parseDnsmasqLine = (line) => {
  const reNoAddr = /([0-9a-f]+:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+).* no address available/i;

  const noAddr = reNoAddr.exec(line);
  if (noAddr) {
    if (!isValidRequest(noAddr[1])) {
      // syslog may have received more no address requests by the time we assign an address. So, we will ignore
      // recently removed address for a minute
      if (!isRecentlyRemoved(noAddr[1])) {
        logger.info('detetcted a request with no address assigned: %s', noAddr[1]);
        _unassignedAddrs = [..._unassignedAddrs, { ts: new Date(), mac: noAddr[1] }];
      }
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


const clearRequests = () => {
  _unassignedAddrs = [];
  clearTimeout(_cleanupTimerId);
  _cleanupTimerId = null;
  _recentlyRemovedAddrs = [];
};


const removeRequest = (mac) => {
  logger.debug('Received request to remove mac: ', mac);
  const pos = _unassignedAddrs.findIndex(x => x.mac === mac);
  if (pos >= 0) {
    logger.debug('removed %s', mac);
    clearTimeout(_cleanupTimerId);
    _recentlyRemovedAddrs = [..._recentlyRemovedAddrs, _unassignedAddrs[pos]];
    _cleanupTimerId = setTimeout(() => {
      _recentlyRemovedAddrs = [];
      _cleanupTimerId = null;
    }, 60000);
    _unassignedAddrs = [..._unassignedAddrs.slice(0, pos), ..._unassignedAddrs.slice(pos + 1)];
  }
};


const isValidRequest = (mac) => {
  return !!_unassignedAddrs.find(x => x.mac === mac);
};


const isRecentlyRemoved = (mac) => {
  return !!_recentlyRemovedAddrs.find(x => x.mac === mac);
};

module.exports = {
  monitor,
  getRequests,
  removeRequest,
  clearRequests,
  isValidRequest
};
