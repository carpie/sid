'use strict';

const test = require('tape');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

let lineCallback = null;

class TailMock  {
  constructor() {
    lineCallback = null;
  }

  on(event, callback) {
    if (event === 'line') {
      lineCallback = callback;
    }
  }

  watch() {
  }
}


const sm = proxyquire('../src/syslogmonitor', {
  'always-tail': TailMock
});
sm._cleanupTimeout = 200;


const reset = () => {
  sm.clearRequests();
};


test('=== syslogmonitor setup', (t) => {
  t.end();
});


test('monitor detects unassigned addresses', (t) => {
  reset();
  sm.monitor();
  t.equal(sm.getRequests().length, 0);
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:01 no address available');
  t.equal(sm.getRequests().length, 1);
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:02 no address available');
  t.equal(sm.getRequests().length, 2);
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:03 no address available');
  t.equal(sm.getRequests().length, 3);
  t.end();
});


test('monitor ignores repeated unassigned addresses', (t) => {
  reset();
  sm.monitor();
  t.equal(sm.getRequests().length, 0);
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:01 no address available');
  t.equal(sm.getRequests().length, 1);
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:02 no address available');
  t.equal(sm.getRequests().length, 2);
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:01 no address available');
  t.equal(sm.getRequests().length, 2);
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:02 no address available');
  t.equal(sm.getRequests().length, 2);
  t.end();
});


test('monitor detects unassigned addresses among syslog noise', (t) => {
  reset();
  sm.monitor();
  t.equal(sm.getRequests().length, 0);
  lineCallback('Apr 22 17:44:24 pi dnsmasq-dhcp[2016]: DHCPREQUEST(eth0) 192.168.0.42 11:22:33:44:55:02');
  lineCallback('Apr 22 17:44:24 pi dnsmasq-dhcp[2016]: DHCPACK(eth0) 192.168.0.42 11:22:33:44:55:02 dalek');
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:01 no address available');
  lineCallback('Apr 22 20:24:30 pi systemd[1]: Stopping Host and Network Name Lookups.');
  lineCallback('Apr 22 20:24:30 pi systemd[1]: Stopping dnsmasq - A lightweight DHCP and caching DNS server...');
  lineCallback('Apr 22 20:24:30 pi dnsmasq[2016]: exiting on receipt of SIGTERM');
  lineCallback('Apr 22 20:24:30 pi systemd[1]: Starting dnsmasq - A lightweight DHCP and caching DNS server...');
  lineCallback('Apr 22 20:24:30 pi dnsmasq[2640]: dnsmasq: syntax check OK.');
  lineCallback('Apr 22 20:24:30 pi dnsmasq[2652]: started, version 2.72 cachesize 150');
  t.equal(sm.getRequests().length, 1);
  t.end();
});


test('isValidRequest returns true if mac address is unassigned list', (t) => {
  reset();
  sm.monitor();
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:01 no address available');
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:02 no address available');
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:03 no address available');
  t.equal(sm.getRequests().length, 3);
  t.ok(sm.isValidRequest('11:22:33:44:55:01'));
  t.ok(sm.isValidRequest('11:22:33:44:55:02'));
  t.ok(sm.isValidRequest('11:22:33:44:55:03'));
  t.end();
});


test('isValidRequest returns false if mac address is not in unassigned list', (t) => {
  reset();
  sm.monitor();
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:01 no address available');
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:02 no address available');
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:03 no address available');
  t.equal(sm.getRequests().length, 3);
  t.notOk(sm.isValidRequest('11:22:33:44:65:01'));
  t.notOk(sm.isValidRequest('11:22:33:44:65:02'));
  t.notOk(sm.isValidRequest('11:22:33:44:65:03'));
  t.end();
});


test('getRequests returns all unassigned addresses', (t) => {
  reset();
  sm.monitor();
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:03 no address available');
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:01 no address available');
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:02 no address available');
  const reqs = sm.getRequests();
  t.equal(reqs.length, 3);
  t.ok(reqs[0].ts instanceof Date);
  t.equal(reqs[0].mac, '11:22:33:44:55:03');
  t.ok(reqs[1].ts instanceof Date);
  t.equal(reqs[1].mac, '11:22:33:44:55:01');
  t.ok(reqs[2].ts instanceof Date);
  t.equal(reqs[2].mac, '11:22:33:44:55:02');
  t.end();
});


test('removeRequest removes the specified mac address', (t) => {
  reset();
  sm.monitor();
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:03 no address available');
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:01 no address available');
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:02 no address available');
  let reqs = sm.getRequests();
  t.equal(reqs.length, 3);
  sm.removeRequest('11:22:33:44:55:01');
  reqs = sm.getRequests();
  t.equal(reqs.length, 2);
  t.ok(reqs[0].ts instanceof Date);
  t.equal(reqs[0].mac, '11:22:33:44:55:03');
  t.ok(reqs[1].ts instanceof Date);
  t.equal(reqs[1].mac, '11:22:33:44:55:02');

  sm.removeRequest('11:22:33:44:55:03');
  reqs = sm.getRequests();
  t.equal(reqs.length, 1);
  t.ok(reqs[0].ts instanceof Date);
  t.equal(reqs[0].mac, '11:22:33:44:55:02');

  sm.removeRequest('11:22:33:44:55:02');
  reqs = sm.getRequests();
  t.equal(reqs.length, 0);
  t.end();
});


test('removeRequest with bad mac address does no harm', (t) => {
  reset();
  sm.monitor();
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:03 no address available');
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:01 no address available');
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:02 no address available');
  let reqs = sm.getRequests();
  t.equal(reqs.length, 3);
  sm.removeRequest('44:22:33:44:55:42');
  reqs = sm.getRequests();
  t.equal(reqs.length, 3);
  t.end();
});


test('clearRequests removes all requests', (t) => {
  reset();
  sm.monitor();
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:03 no address available');
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:01 no address available');
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:02 no address available');
  let reqs = sm.getRequests();
  t.equal(reqs.length, 3);
  sm.clearRequests();
  reqs = sm.getRequests();
  t.equal(reqs.length, 0);
  t.end();
});


test('addr is not added if recently removed', (t) => {
  reset();
  const clock = sinon.useFakeTimers();
  sm.monitor();
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:01 no address available');
  let reqs = sm.getRequests();
  t.equal(reqs.length, 1);
  sm.removeRequest('11:22:33:44:55:01');
  reqs = sm.getRequests();
  t.equal(reqs.length, 0);

  // Address is not detected due to being recently removed
  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:01 no address available');
  reqs = sm.getRequests();
  t.equal(reqs.length, 0);

  // After the timeout, the address is detected again
  clock.tick(60000);
  clock.restore();

  lineCallback('Apr 22 19:07:18 pi dnsmasq-dhcp[2016]: DHCPDISCOVER(eth0) 11:22:33:44:55:01 no address available');
  reqs = sm.getRequests();
  t.equal(reqs.length, 1);
  t.end();
});


test('=== syslogmonitor teardown', (t) => {
  t.end();
});
