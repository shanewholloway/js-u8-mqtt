# [u8-mqtt ![npm published version][img-npm-ver]][npm-u8-mqtt]

A JavaScript MQTT client using async/await support QOS-0 and QOS-1.
for use in modern ES6 environments: the Browser, [NodeJS](https://nodejs.org/en/), and [Deno](https://deno.land/).

- Zero external dependencies.
- [Small bundle][bundlephobia-u8-mqtt] footprint. 
- [Tree-shaking](https://rollupjs.org/guide/en/) friendly.

Use ExpressJS-like router to handle publish messages for matching topics.

  * Static (`/foo`, `/foo/bar`)
  * Parameter (`/:title`, `/books/:title`, `/books/:genre/:title`)
  * Parameter w/ Suffix (`/movies/:title.mp4`, `/movies/:title.(mp4|mov)`)
  * Optional Parameters (`/:title?`, `/books/:title?`, `/books/:genre/:title?`)
  * Wildcards (`*`, `/books/*`, `/books/:genre/*`)

 (Thanks to @lukeed and the excellent [regexparam][] library!)


 [u8-mqtt-packet]: https://github.com/shanewholloway/js-u8-mqtt-packet
 [regexparam]: https://github.com/lukeed/regexparam#readme 

 [npm-u8-mqtt]: https://www.npmjs.com/package/u8-mqtt
 [bundlephobia-u8-mqtt]: https://bundlephobia.com/package/u8-mqtt
 [img-npm-ver]: https://badgen.net/npm/v/u8-mqtt
 [img-min]: https://badgen.net/bundlephobia/min/u8-mqtt
 [img-minzip]: https://badgen.net/bundlephobia/minzip/u8-mqtt
 [img-deps]: https://badgen.net/bundlephobia/dependency-count/u8-mqtt
 [img-treeshake]: https://badgen.net/bundlephobia/tree-shaking/u8-mqtt


## Docs

- [API docs](./docs/api.md)
- See [u8-mqtt-packet][] for details on packet encode and decoding.


Targeting [MQTT-3.1.1 (v4)][spec-3.1.1] and [MQTT-5.0.0 (v5)][spec-5.0.0] compatibility.

 [spec-5.0.0]: https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html
 [spec-3.1.1]: http://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html


## Use

- from [Web CDN](./docs/use_from_web_cdn.md)
- from [Web bundler](./docs/use_from_web_bundler.md) like [Rollup][] or [ESBuild][]
- from [NodeJS](./docs/use_from_nodejs.md)
- from [Deno](./docs/use_from_deno.md)

 [Rollup]: https://rollupjs.org
 [ESBuild]: https://esbuild.github.io


```javascript
import mqtt_client from 'https://cdn.jsdelivr.net/npm/u8-mqtt/esm/web/index.js'
// or import mqtt_client from 'u8-mqtt'

let my_mqtt = mqtt_client()
  .with_websock('wss://test.mosquitto.org:8081')
  // or .with_tcp('tcp://test.mosquitto.org:1883')
  .with_autoreconnect()

await my_mqtt.connect()

my_mqtt.subscribe_topic(
  'u8-mqtt/demo-simple/:topic',
  (pkt, params, ctx) => {
    console.log('topic packet', params, pkt, pkt.json())
  })

await my_mqtt.json_send(
  'u8-mqtt/demo-simple/live',
  { note: 'from README example',
    live: new Date().toISOString() })
```

## Module size

Built for small bundle footprint with ES Modules (ESM) using embedded [u8-mqtt-packet][] and [regexparam][] libraries.
(See [BundlePhobia][bundlephobia-u8-mqtt] page)

| module                  |   brotli | minified |
|:------------------------|---------:|---------:|
| `u8-mqtt`               |   6587 B |  19962 B |
| `u8-mqtt/esm/v5.min.js` |   6504 B |  19789 B |
| `u8-mqtt/esm/v4.min.js` |   5420 B |  15379 B |

([automated sizing report](./docs/compressed.md))


#### MQTT Client sizes

| minifeid | (x)  | Project        | Measurement |
|---------:|-----:|----------------|-------------|
|  187.0KB |  12x | [MQTT.js][]    | `curl -sL https://cdn.jsdelivr.net/npm/mqtt@4.0.1/dist/mqtt.min.js \| wc -c`
|   32.3KB |   2x | [paho][]       | `curl -sL https://cdn.jsdelivr.net/npm/paho-mqtt@1.1.0/paho-mqtt.min.js \| wc -c`
|   19.8KB | 1.3x | [u8-mqtt][] v5 | `cat ./u8-mqtt/esm/web/v5.min.js \| wc -c`
|   15.4KB |   1x | [u8-mqtt][] v4 | `cat ./u8-mqtt/esm/web/v4.min.js \| wc -c`

 [MQTT.js]: https://github.com/mqttjs/MQTT.js/
 [paho]: https://github.com/eclipse/paho.mqtt.javascript/
 [u8-mqtt]: https://github.com/shanewholloway/js-u8-mqtt/


## Prior Art

The `u8-mqtt` project was inspired by [mqtt](orig-mqtt) and [mqtt-packet](orig-mqtt-packet) written for NodeJS.
The codecs of those project are written with a NodeJS ecosystem in mind: Buffer, EventEmitter, Streams.

 [orig-mqtt]: https://github.com/mqttjs/MQTT.js#readme
 [orig-mqtt-packet]: https://github.com/mqttjs/mqtt-packet#readme


## License

[BSD-2-Clause](LICENSE)

