'use strict';

const test = require('tape');
const iputil = require('../src/iputil');

test('=== iputil setup', (t) => {
  t.end();
});


test('ipToSegments converts text IP addr to four numeric segments', (t) => {
  t.deepEqual(iputil.ipToSegments('1.2.3.4'), [1, 2, 3, 4]);
  t.deepEqual(iputil.ipToSegments('255.255.255.255'), [255, 255, 255, 255]);
  t.end();
});


test('ipToSegments throws exception on bad input', (t) => {
  t.throws(() => { iputil.ipToSegments('foobar'); }, /Invalid IP address/);
  t.throws(() => { iputil.ipToSegments(''); }, /Invalid IP address/);
  t.throws(() => { iputil.ipToSegments('1234.1.2.3'); }, /Invalid IP address/);
  t.throws(() => { iputil.ipToSegments('123.1.2.3.4'); }, /Invalid IP address/);
  t.throws(() => { iputil.ipToSegments('2.3'); }, /Invalid IP address/);
  t.end();
});


test('generateIp generates sequential IP addresses', (t) => {
  let ip = '192.168.0.0';
  const gen = iputil.generateIp(ip);
  for (let i = 0; i < 256; ++i) {
    ip = gen.next().value;
    t.equal(ip, '192.168.0.' + i);
  }
  t.end();
});


test('generateIp rolls over to the next segment', (t) => {
  let gen = iputil.generateIp('192.168.0.255');
  gen.next();
  t.equal(gen.next().value, '192.168.1.0');

  gen = iputil.generateIp('192.168.255.255');
  gen.next();
  t.equal(gen.next().value, '192.169.0.0');

  gen = iputil.generateIp('192.255.255.255');
  gen.next();
  t.equal(gen.next().value, '193.0.0.0');

  gen = iputil.generateIp('255.255.255.255');
  gen.next();
  t.equal(gen.next().value, '0.0.0.0');
  t.end();
});


test('isOnNetwork can identify IPs on a specified network', (t) => {
  t.ok(iputil.isOnNetwork('192.168.1.0', '255.255.255.0', '192.168.1.42'));
  t.ok(iputil.isOnNetwork('192.168.1.0', '255.255.255.0', '192.168.1.0'));
  t.ok(iputil.isOnNetwork('192.168.1.0', '255.255.255.0', '192.168.1.255'));
  t.notOk(iputil.isOnNetwork('192.168.1.0', '255.255.255.0', '192.168.2.42'));
  t.notOk(iputil.isOnNetwork('192.168.1.0', '255.255.255.0', '192.168.2.0'));
  t.notOk(iputil.isOnNetwork('192.168.1.0', '255.255.255.0', '192.168.2.255'));
  t.notOk(iputil.isOnNetwork('193.168.1.0', '255.255.255.0', '192.168.1.42'));
  t.notOk(iputil.isOnNetwork('192.169.1.0', '255.255.255.0', '192.168.1.42'));
  t.notOk(iputil.isOnNetwork('192.168.2.0', '255.255.255.0', '192.168.1.42'));

  t.notOk(iputil.isOnNetwork('192.168.1.216', '255.255.255.248', '192.168.1.215'));
  t.ok(iputil.isOnNetwork('192.168.1.216', '255.255.255.248', '192.168.1.216'));
  t.ok(iputil.isOnNetwork('192.168.1.216', '255.255.255.248', '192.168.1.217'));
  t.ok(iputil.isOnNetwork('192.168.1.216', '255.255.255.248', '192.168.1.218'));
  t.ok(iputil.isOnNetwork('192.168.1.216', '255.255.255.248', '192.168.1.219'));
  t.ok(iputil.isOnNetwork('192.168.1.216', '255.255.255.248', '192.168.1.220'));
  t.ok(iputil.isOnNetwork('192.168.1.216', '255.255.255.248', '192.168.1.221'));
  t.ok(iputil.isOnNetwork('192.168.1.216', '255.255.255.248', '192.168.1.223'));
  t.notOk(iputil.isOnNetwork('192.168.1.216', '255.255.255.248', '192.168.1.224'));

  t.ok(iputil.isOnNetwork('192.168.1.0', '255.255.255.0', '192.168.1.42'));
  t.ok(iputil.isOnNetwork('192.168.0.0', '255.255.0.0', '192.168.1.42'));
  t.ok(iputil.isOnNetwork('192.0.0.0', '255.0.0.0', '192.168.1.42'));
  t.ok(iputil.isOnNetwork('0.0.0.0', '0.0.0.0', '192.168.1.42'));

  t.end();
});


test('isNetworkAddress can identify the network address given an ip and mask', (t) => {
  t.ok(iputil.isNetworkAddress('192.168.1.0', '255.255.255.0'));
  t.ok(iputil.isNetworkAddress('192.168.0.0', '255.255.0.0'));
  t.ok(iputil.isNetworkAddress('192.0.0.0', '255.0.0.0'));
  t.ok(iputil.isNetworkAddress('0.0.0.0', '0.0.0.0'));

  t.ok(iputil.isNetworkAddress('192.168.1.128', '255.255.255.128'));
  t.ok(iputil.isNetworkAddress('192.168.128.0', '255.255.128.0'));
  t.ok(iputil.isNetworkAddress('192.128.0.0', '255.128.0.0'));
  t.ok(iputil.isNetworkAddress('128.0.0.0', '128.0.0.0'));

  t.notOk(iputil.isNetworkAddress('192.168.1.1', '255.255.255.0'));
  t.notOk(iputil.isNetworkAddress('192.168.1.255', '255.255.255.0'));
  t.notOk(iputil.isNetworkAddress('192.168.254.0', '255.255.0.0'));
  t.notOk(iputil.isNetworkAddress('192.254.0.0', '255.0.0.0'));
  t.notOk(iputil.isNetworkAddress('192.128.0.0', '255.0.0.0'));

  t.end();
});


test('isBroacastAddress can identify the broadcast address given an ip and mask', (t) => {
  t.ok(iputil.isBroadcastAddress('192.168.1.255', '255.255.255.0'));
  t.ok(iputil.isBroadcastAddress('192.168.255.255', '255.255.0.0'));
  t.ok(iputil.isBroadcastAddress('192.255.255.255', '255.0.0.0'));
  t.ok(iputil.isBroadcastAddress('255.255.255.255', '0.0.0.0'));

  t.ok(iputil.isBroadcastAddress('192.168.1.255', '255.255.254.0'));
  t.ok(iputil.isBroadcastAddress('192.168.127.255', '255.255.128.0'));
  t.ok(iputil.isBroadcastAddress('192.127.255.255', '255.128.0.0'));
  t.ok(iputil.isBroadcastAddress('127.255.255.255', '128.0.0.0'));

  t.ok(iputil.isBroadcastAddress('255.255.255.255', '255.0.0.0'));
  t.ok(iputil.isBroadcastAddress('255.255.255.255', '255.255.1.2'));

  t.notOk(iputil.isBroadcastAddress('192.168.1.254', '255.255.255.0'));
  t.notOk(iputil.isBroadcastAddress('192.168.255.1', '255.255.0.0'));
  t.notOk(iputil.isBroadcastAddress('192.255.255.251', '255.0.0.0'));
  t.notOk(iputil.isBroadcastAddress('1.255.255.255', '0.0.0.0'));

  t.end();
});


test('ipSorter can sort IP addresses', (t) => {
  t.equal(iputil.ipSorter('1.2.3.4', '1.2.3.4'), 0);
  t.equal(iputil.ipSorter('01.002.03.04', '1.2.3.4'), 0);
  t.equal(iputil.ipSorter('1.2.3.4', '1.2.3.5'), -1);
  t.equal(iputil.ipSorter('1.2.3.4', '1.2.4.4'), -1);
  t.equal(iputil.ipSorter('1.2.3.4', '1.3.3.4'), -1);
  t.equal(iputil.ipSorter('1.2.3.4', '2.2.3.4'), -1);
  t.equal(iputil.ipSorter('1.2.3.5', '1.2.3.4'), 1);
  t.equal(iputil.ipSorter('1.2.4.4', '1.2.3.4'), 1);
  t.equal(iputil.ipSorter('1.3.3.4', '1.2.3.4'), 1);
  t.equal(iputil.ipSorter('2.2.3.4', '1.2.3.4'), 1);
  t.end();
});


test('=== iputil teardown', (t) => {
  t.end();
});
