'use strict';

const test = require('tape');
const proxyquire = require('proxyquire');


process.env.DNSMASQ_CONF_FILE = 'home.dns';
process.env.NETWORK_ADDR = '192.168.0.0';
process.env.NETWORK_MASK = '255.255.255.0';

const testData = {
  conexecCalled: false,
  dnsData: [],
  homeDnsFile: null,

  reset() {
    this.conexecCalled = false;
    this.dnsData = [];
    this.homeDnsFile =`
# General configuration
domain-needed
bogus-priv
dhcp-range=192.168.0.10,static,48h
dhcp-option=3,192.168.0.1

# Static IPs
dhcp-host=11:22:33:00:89:01,thedoctor,192.168.0.10
dhcp-host=11:22:44:10:88:02,tardis,192.168.0.42
dhcp-host=11:22:55:42:87:03,sonicscrewdriver,192.168.0.11
`;
  }
};

const cm = proxyquire('../src/configmanager', {
  'fs': {
    readFile: (file, callback) => {
      if (file === 'home.dns') {
        return callback(null, testData.homeDnsFile);
      }
    },
    appendFile: (file, data, callback) => {
      testData.dnsData = data.split('\n');
      callback(null);
    }
  },
  './conexec': {
    conexec: () => {
      testData.conexecCalled = true;
      return Promise.resolve(0);
    }
  }
});


test('=== configmanager setup', (t) => {
  t.end();
});


test('addMac assigns an IP and restarts dnsmasq', (t) => {
  testData.reset();

  cm.addMac('11:22:33:44:55:66', 'foo')
  .then(() => {
    t.ok(testData.conexecCalled);
    const data = testData.dnsData;
    t.equal(data.filter((x) => /dhcp-host=11:22:33:44:55:66,foo,192\.168\.0\.12/.test(x)).length, 1, data);
    t.end();
  })
  .catch((err) => {
    t.fail(err);
    t.end();
  });
});


test('addMac can assign very first ip', (t) => {
  testData.reset();
  testData.homeDnsFile =`
# General configuration
domain-needed
bogus-priv
dhcp-range=192.168.0.10,192.168.0.12,static,48h
dhcp-option=3,192.168.0.1

# Static IPs
`;

  cm.addMac('11:22:33:44:55:66', 'foo')
  .then(() => {
    t.ok(testData.conexecCalled);
    const data = testData.dnsData;
    t.equal(data.filter((x) => /dhcp-host=11:22:33:44:55:66,foo,192\.168\.0\.10/.test(x)).length, 1, data);
    t.end();
  })
  .catch((err) => {
    t.fail(err);
    t.end();
  });
});


test('addMac assigns next available guest host if no host is given', (t) => {
  testData.reset();
  testData.homeDnsFile =`
# General configuration
domain-needed
bogus-priv
dhcp-range=192.168.0.10,192.168.0.12,static,48h
dhcp-option=3,192.168.0.1

# Static IPs
dhcp-host=11:22:33:00:89:01,guest1,192.168.0.10
dhcp-host=11:22:44:10:88:02,guest3,192.168.0.42
dhcp-host=11:22:55:42:87:03,guest42,192.168.0.11
`;

  cm.addMac('11:22:33:44:55:66')
  .then(() => {
    t.ok(testData.conexecCalled);
    const data = testData.dnsData;
    t.equal(data.filter((x) => /dhcp-host=11:22:33:44:55:66,guest2,192\.168\.0\.12/.test(x)).length, 1, data);
    t.end();
  })
  .catch((err) => {
    t.fail(err);
    t.end();
  });
});


test('addMac can assign first guest host if no host is given', (t) => {
  testData.reset();
  testData.homeDnsFile =`
# General configuration
domain-needed
bogus-priv
dhcp-range=192.168.0.10,192.168.0.12,static,48h
dhcp-option=3,192.168.0.1

# Static IPs
`;

  cm.addMac('11:22:33:44:55:66')
  .then(() => {
    t.ok(testData.conexecCalled);
    const data = testData.dnsData;
    t.equal(data.filter((x) => /dhcp-host=11:22:33:44:55:66,guest1,192\.168\.0\.10/.test(x)).length, 1, data);
    t.end();
  })
  .catch((err) => {
    t.fail(err);
    t.end();
  });
});




test('addMac rejects request when mac is already assigned', (t) => {
  testData.reset();

  cm.addMac('11:22:33:00:89:01', 'foo')
  .then(() => {
    t.fail('should not have added record due to mac already being assigned');
    t.end();
  })
  .catch((err) => {
    t.equal(err.toString(), 'Error: MAC is already assigned an address');
    t.end();
  });
});


test('addMac rejects request when hostname is already used', (t) => {
  testData.reset();

  cm.addMac('11:22:33:44:55:66', 'tardis')
  .then(() => {
    t.fail('should not have added record due to hostname already being used');
    t.end();
  })
  .catch((err) => {
    t.equal(err.toString(), 'Error: Hostname is already in use');
    t.end();
  });
});


test('addMac rejects request when network out of IPs', (t) => {
  testData.reset();

  testData.homeDnsFile =`
# General configuration
domain-needed
bogus-priv
dhcp-range=192.168.0.10,192.168.0.12,static,48h
dhcp-option=3,192.168.0.1

# Static IPs
dhcp-host=11:22:33:00:89:01,thedoctor,192.168.0.10
dhcp-host=11:22:44:10:88:02,tardis,192.168.0.11
dhcp-host=11:22:55:42:87:03,sonicscrewdriver,192.168.0.12
`;

  cm.addMac('11:22:33:44:55:66', 'foo')
  .then(() => {
    t.fail('should not have added record due to network out of ips: ');
    t.end();
  })
  .catch((err) => {
    t.equal(err.toString(), 'Error: no ip available');
    t.end();
  });
});


test('addMac rejects request when next IP is broadcast IP', (t) => {
  testData.reset();

  testData.homeDnsFile =`
# General configuration
domain-needed
bogus-priv
dhcp-range=192.168.0.252,static,48h
dhcp-option=3,192.168.0.1

# Static IPs
dhcp-host=11:22:33:00:89:01,thedoctor,192.168.0.252
dhcp-host=11:22:44:10:88:02,tardis,192.168.0.253
dhcp-host=11:22:55:42:87:03,sonicscrewdriver,192.168.0.254
`;

  cm.addMac('11:22:33:44:55:66', 'foo')
  .then(() => {
    t.fail('should not have added record due ip being broadcast ip: ');
    t.end();
  })
  .catch((err) => {
    t.equal(err.toString(), 'Error: no ip available');
    t.end();
  });
});


test('=== configmanager teardown', (t) => {
  t.end();
});
