'use strict';

const ipToSegments = (ip) => {
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

function* generateIp(startIp) {
  let ip = startIp;
  const incSegment = (segments, i) => {
    segments[i] += 1;
    if (segments[i] > 254) {
      segments[i] = 0;
      if (i > 0) {
        incSegment(segments, i - 1);
      }
    }
    return segments;
  };

  while (ip) {
    ip = incSegment(ipToSegments(ip), 3).join('.');
    yield ip;
  }
}


module.exports = {
  generateIp,
  isOnNetwork,
  ipSorter,
  ipToSegments
};
