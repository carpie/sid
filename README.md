# Simple IP Dispenser (SID)

SID is a web service that manages static IP reservations in a dnsmasq configuration file.  It monitors requests for IPs
and stores the requests in the service.  A REST API is provided to allow or deny the requests.  If a request is
accepted, the MAC of the requester is assigned the next available IP and given a host name (supplied by user or
`guest#`).  The service then restarts dnsmasq at which point the requester should be given an IP address by dnsmasq.

While potentially being able to be used anywhere, this service was designed to run on a Raspberry Pi configured to be a
DNS/DHCP server.  Specifically, this service compliments my
[carpie.net article](https://carpie.net/articles/setting-up-a-home-network-dhcp-dns-server-with-dnsmasq) describing
dnsmasq configuration on a Raspberry Pi.


## Installation

This service installs on a Raspberry Pi using a Debian package.  First, make sure you have the dependencies installed in
order to build a Debian package:

```
sudo apt-get install build-essentials debhelper devscripts
```

Then, to build the package, clone the repo, then run:

```
cd sid/src
npm install --only=production
cd ../deb/sid
make deb
```

The output will be `sid_1.0.0_all.deb` in `sid/deb`.  Copy to your Raspberry Pi and install with:

```
sudo dpkg -i sid_1.0.0_all.deb
```

Please note that your Pi will need internet access for installation because the Debian package will automatically
install the appropriate version of Node.js for the service.  (The installation is sandboxed and will not interfere with
any other Node.js installations you may have.)


## Configuration

SID comes preconfigured with the default options used in the previously mentioned article.  If you wish to change one or
more of those options, after installation, run:

```
sudo dpkg-reconfigure sid
```

Follow the prompts for configuration.  You may also edit the configuration by hand by editing `/opt/sid/src/.env`.  If
you edit by hand, remember to restart the service with:

```
sudo service sid restart
```

## API

By default the service listens on port `4253` and presents the following API.


---

### GetRequests

Returns an array of requests for IP addresses that have no static entry in the configuration file.  Array entries are in
the form:
```
{
    "ts": <Date timestamp string>,
    "mac" <MAC address string in the form 11:22:33:44:55:66>
}
```

**URL**: `/requests`

**Method**: `GET`

**Success Response**:
- *Code*: 200
- *Content*: `[{ ts: '2017-04-24T15:43:28.607Z', mac: '11:22:33:44:55:66'}, ...]`

**Example**:
```
$ curl 192.168.0.2:4253/requests
[{"ts":"2017-04-24T16:55:51.779Z","mac":"11:22:33:77:88:99"},{"ts":"2017-04-24T16:56:26.793Z","mac":"11:22:33:44:55:66"}]
```


---

### AddMAC

Adds a static reservation for the specified MAC address with an optional host name.

**URL**: `/requests/:mac`

**Method**: `POST`

**URL Params**:
- `:mac` (required) form: `11:22:33:44:55:66` - specifies the MAC address to assign an IP to

**Data Params**:
- `hostname` (optional) - specifies the hostname to assign to the device
   ```
   { "hostname": "foo" }
   ```

**Success Response**:
- *Code*: 200
- *Content*: `{"mac":"11:22:33:44:55:66","ip":"192.168.0.12","hostname":"phone"}`

**Error Response**:
- *Code*: 500
- *Content*: `{"error":"Error: MAC address is already assigned an address"}`

**Example**:
```
$ curl -H "Content-Type: application/json" -d '{"hostname": "phone"}' -X POST 192.168.0.2:4253/requests/11:22:33:44:55:66
{"mac":"11:22:33:44:55:66","ip":"192.168.0.12","hostname":"phone"}

$ curl -H "Content-Type: application/json" -d '{"hostname": "phone"}' -X POST 192.168.0.2:4253/requests/11:22:33:44:55:66
{"error":"Error: MAC address is already assigned an address"}

```

---

### DenyMAC

Tells SID to not assign an IP address for the specified MAC.  SID will remove the request from the list of outstanding
requests, however a new request may be added back if the device re-requests an address after they deny operation.


**URL**: `/requests/:mac`

**Method**: `DELETE`

**URL Params**:
- `:mac` (required) form: `11:22:33:44:55:66` - specifies the MAC address request to remove

**Success Response**:
- *Code*: 200
- *Content*: `{}`

**Error Response**:
- *Code*: 404
- *Content*: `{"error":"Not found"}`
- *Description*: The specified MAC address request was not found in the list of outstanding requests
- *Code*: 500
- *Content*: `{"error":"Error: Server error"}`
- *Description*: Something went wrong internally with the server. Check the server logs

**Example**:
```
$ curl -X DELETE 192.168.0.2:4253/requests/11:22:33:77:88:99
{}

$ curl -X DELETE 192.168.0.2:4253/requests/11:22:33:77:88:99
{"error":"Not found"}

```

## License

MIT
