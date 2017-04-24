'use strict';

const ipToSegments = (ip) => {
  if (!/^\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}$/.test(ip)) {
    throw new Error('Invalid IP address');
  }
  return ip.split('.').map(segment => parseInt(segment, 10) & 0xFF);
};

const ipSorter = (a, b) => {
  const aSegments = ipToSegments(a);
  const bSegments = ipToSegments(b);
  if (aSegments[0] === bSegments[0]) {
    if (aSegments[1] === bSegments[1]) {
      if (aSegments[2] === bSegments[2]) {
        if (aSegments[3] === bSegments[3]) {
          return 0;
        }
        return (aSegments[3] - bSegments[3]);
      }
      return (aSegments[2] - bSegments[2]);
    }
    return (aSegments[1] - bSegments[1]);
  }
  return (aSegments[0] - bSegments[0]);
};

const isOnNetwork = (addr, mask, ip) => {
  const addrSegments = ipToSegments(addr);
  const maskSegments = ipToSegments(mask);
  const ipSegments = ipToSegments(ip);
  for (let i = 0; i < 4; i += 1) {
    if ((addrSegments[i] & maskSegments[i]) !== (ipSegments[i] & maskSegments[i])) {
      return false;
    }
  }
  return true;
};

const isNetworkAddress = (ip, mask) => {
  const maskSegments = ipToSegments(mask);
  const res = ipToSegments(ip).reduce((acc, val, idx) => {
    return acc + (val & (~maskSegments[idx]));
  }, 0);
  return (res === 0);
};

const isBroadcastAddress = (ip, mask) => {
  const maskSegments = ipToSegments(mask);
  const res = ipToSegments(ip).reduce((acc, val, idx) => {
    return acc + (~(val | maskSegments[idx]) & 0xFF);
  }, 0);
  return (res === 0);
};

function* generateIp(startIp) {
  let ip = startIp;
  const incSegment = (segments, i) => {
    segments[i] += 1;
    if (segments[i] > 255) {
      segments[i] = 0;
      if (i > 0) {
        incSegment(segments, i - 1);
      }
    }
    return segments;
  };

  while (ip) {
    yield ip;
    ip = incSegment(ipToSegments(ip), 3).join('.');
  }
}


module.exports = {
  generateIp,
  isOnNetwork,
  isNetworkAddress,
  isBroadcastAddress,
  ipSorter,
  ipToSegments
};
