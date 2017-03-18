'use strict';
const Tail = require('always-tail');

let _unassignedAddrs = [];

const _parseDnsmasqLine = (line) => {
  const reRestart = /started, version/;
  const reNoAddr = /([0-9a-f]+:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+).* no address available/i;

  if (reRestart.test(line)) {
    console.log('dnsmasq restart detected, clearing unassigned address maps');
    _unassignedAddrs = [];
    return;
  }

  const noAddr = reNoAddr.exec(line);
  if (noAddr) {
    console.log('noaddr', noAddr[1]);
    _unassignedAddrs.push({ ts: new Date(), mac: noAddr[1] });
  }
};


const monitor = () => {
  const reDnsmasq = / dnsmasq/;
  const tail = new Tail('/var/log/syslog', '\n', { start: 0 });
  tail.on('line', (line) => {
    if (reDnsmasq.test(line)) {
      _parseDnsmasqLine(line);
    }
  });
  tail.on('error', (err) => {
    console.log('error', err);
  });
  tail.watch();
};


const getRequests = () => {
  return [..._unassignedAddrs];
};


module.exports = {
  monitor,
  getRequests
};
