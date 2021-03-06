'use strict';
const BPromise = require('bluebird');

const fs = BPromise.promisifyAll(require('fs'));

const conexec = require('./conexec').conexec;
const logger = require('./logger');
const iputil = require('./iputil');

const _configFile = process.env.DNSMASQ_CONF_FILE;

// Regular expressions to match config file entries
const reDhcpRangeEntry = /^dhcp-range=/;
const reDhcpHostEntry = /^dhcp-host=/;
const reIp = /^\d+\.\d+\.\d+\.\d+$/;
const reHost = /^[A-Za-z0-9-_]+$/;
const reMac = /^[A-Fa-f0-9]{2}:[A-Fa-f0-9]{2}:[A-Fa-f0-9]{2}:[A-Fa-f0-9]{2}:[A-Fa-f0-9]{2}:[A-Fa-f0-9]{2}$/;

const _getHost = (host) => {
  if (host) {
    return BPromise.resolve(host);
  }
  return fs.readFileAsync(_configFile)
  .then((data) => {
    return data.toString().split('\n')
    .filter(line => reDhcpHostEntry.test(line) && line.search('guest') >= 0)
    .map(line => parseInt(line.split('=')[1].split(',').find(x => x.search('guest') >= 0).replace(/guest/, ''), 10))
    .sort();
  })
  .then((guests) => {
    for (let i = 1; i; i += 1) {
      if (guests.indexOf(i) < 0) {
        return 'guest' + i;
      }
    }
  });
};

const _getIpRange = () => {
  logger.debug('_getIpRange');
  return fs.readFileAsync(_configFile)
  .then((data) => {
    const ips = data.toString().split('\n')
    .filter(line => reDhcpRangeEntry.test(line))[0]
    .split('=')[1]
    .split(',');
    // Ending ranges are optional in dnsmasq, so we test the second entry for an IP
    if ((ips.length > 1) && reIp.test(ips[1])) {
      // We have start and end
      return ips.slice(0, 2);
    }
    return [...ips.slice(0, 1), null];
  });
};

const _getAssignedIps = (network, netmask) => {
  logger.debug('_getAssignedIps');
  return fs.readFileAsync(_configFile)
  .then((data) => {
    // Extract a set of ips out of the dhcp-host lines
    return data.toString().split('\n')
    .filter(line => reDhcpHostEntry.test(line))
    .map(line => {
      return line.split('=')[1].split(',').filter(entry => reIp.test(entry.trim()))[0];
    })
    .filter(ip => iputil.isOnNetwork(network, netmask, ip))
    .sort(iputil.ipSorter);
  });
};

const _getNextAvailableIp = () => {
  logger.debug('_getNextAvailableIp');
  // Get the starting IP
  let startIp;
  let endIp;
  return _getIpRange()
  .then((ips) => {
    startIp = ips[0];
    endIp = ips[1];
    return _getAssignedIps(process.env.NETWORK_ADDR, process.env.NETWORK_MASK);
  })
  .then((ips) => {
    const addr = process.env.NETWORK_ADDR;
    const mask = process.env.NETWORK_MASK;
    for (let ip of iputil.generateIp(startIp)) {
      if (!iputil.isOnNetwork(addr, mask, ip) ||
          iputil.isBroadcastAddress(ip, mask) ||
          iputil.isNetworkAddress(ip, mask)) {
        break;
      }
      if (ips.indexOf(ip) < 0) {
        if (!endIp || iputil.ipSorter(ip, endIp) <= 0) {
          logger.debug('found available ip %s', ip);
          return ip;
        }
      }
    }
    throw new Error('no ip available');
  });
};

const _addEntry = (mac, ip, host) => {
  logger.debug('_addEntry');
  let retVal = {};
  return _getHost(host)
  .then((hostname) => {
    retVal = { mac, ip, hostname };
    return fs.appendFileAsync(_configFile, `dhcp-host=${mac},${hostname},${ip}\n`);
  })
  .then(() => {
    return retVal;
  });
};

const _checkMacAndHostNotAlreadyAssigned = (mac, host) => {
  logger.debug('_checkMacAndHostNotAlreadyAssigned');
  return fs.readFileAsync(_configFile)
  .then((data) => {
    // Extract a set of ips out of the dhcp-host lines
    return data.toString().split('\n')
    .filter(line => reDhcpHostEntry.test(line))
    .map(line => {
      const lineParts = line.split('=')[1].split(',');
      return {
        host: lineParts.filter(entry => reHost.test(entry.trim()))[0],
        macs: lineParts.filter(entry => reMac.test(entry.trim())),
        ip: lineParts.filter(entry=> reIp.test(entry.trim()))[0]
      };
    })
    .filter(entry => iputil.isOnNetwork(process.env.NETWORK_ADDR, process.env.NETWORK_MASK, entry.ip));
  })
  .then((recs) => {
    if (recs.find(x => x.host === host)) {
      throw new Error('Hostname is already in use');
    }
    if (recs.find(x => x.macs.indexOf(mac) >= 0)) {
      throw new Error('MAC is already assigned an address');
    }
  });
};

const _restartDnsMasq = () => {
  return conexec('sudo', ['service', 'dnsmasq', 'restart']);
};

const addMac = (mac, host) => {
  let retVal;
  // Reject macs that already have an address
  return _checkMacAndHostNotAlreadyAssigned(mac, host)
  .then(() => {
    // Find an available IP
    return _getNextAvailableIp();
  })
  .then((ip) => {
    // Add entry to home.dns
    return _addEntry(mac, ip, host);
  })
  .then((res) => {
    retVal = res;
    // Restart dnsmasq
    return _restartDnsMasq();
  })
  .then(() => {
    return retVal;
  });
};

module.exports = {
  addMac
};
