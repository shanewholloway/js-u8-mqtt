# u8-mqtt

A JavaScript MQTT client using async/await support QOS-0 and QOS-1.
Zero external dependencies. [Tree-shaking friendly](https://rollupjs.org/guide/en/).
Suited for use in modern ES6 environments: the Browser, [NodeJS](https://nodejs.org/en/), and [Deno](https://deno.land/).

Use ExpressJS-like router to handle publish messages for matching topics.

  * Static (`/foo`, `/foo/bar`)
  * Parameter (`/:title`, `/books/:title`, `/books/:genre/:title`)
  * Parameter w/ Suffix (`/movies/:title.mp4`, `/movies/:title.(mp4|mov)`)
  * Optional Parameters (`/:title?`, `/books/:title?`, `/books/:genre/:title?`)
  * Wildcards (`*`, `/books/*`, `/books/:genre/*`)

 (Thanks to @lukeed and the excellent [regexparam][] library!)


 [u8-mqtt-packet]: https://github.com/shanewholloway/js-u8-mqtt-packet
 [regexparam]: https://github.com/lukeed/regexparam#readme 


## Docs

- [API docs](./docs/api.md)
- See [u8-mqtt-packet][] for details on packet encode and decoding.


Targeting [MQTT-3.1.1 (v4)][spec-3.1.1] and [MQTT-5.0.0 (v5)][spec-5.0.0] compatibility.

 [spec-5.0.0]: https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html
 [spec-3.1.1]: http://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html


## Use

```javascript
// using NodeJS
import mqtt_client from 'u8-mqtt/esm/node/v4.mjs'

// or using Deno
import mqtt_client from 'u8-mqtt/esm/deno/v4.mjs'

// or using WebSockets
import mqtt_client from 'u8-mqtt/esm/web/v4.mjs'


const my_mqtt = mqtt_client()


// Connect using NodeJS or Deno
my_mqtt.with_tcp(1883, '127.0.0.1')

// or connect using WebSockets
my_mqtt.with_websock('ws://127.0.0.1:9001')


// use on_live to converse with the MQTT server
my_mqtt.on_live = somewhere_in_your_code


// ...
async function somewhere_in_your_code(my_mqtt) {
  my_mqtt
    .on_topic('u8-mqtt-demo/topic/:arg', (pkt, params, ctx) => {
      console.log('topic:', params, [params.arg, pkt.utf8()])
    })
    .on_topic('u8-mqtt-demo/another/:first/:second', (pkt, params, ctx) => {
      console.log('another:', params, [params.first, params.second, pkt.utf8()])
    })
    .subscribe_topic('u8-mqtt-demo/bye', (pkt, params, ctx) => {
      console.log('other mqtt said bye:', params, [pkt.utf8()])
    })


  await my_mqtt.connect({
    client_id: ['my-mqtt--', '--demo'],
    will: {
      topic: 'u8-mqtt-demo/bye',
      payload: 'gone!',
    }
  })

  await my_mqtt.subscribe([
    'u8-mqtt-demo/another/#',
    'u8-mqtt-demo/topic/+',
  ])

  my_mqtt.publish({
    topic: 'u8-mqtt-demo/topic/node-side-fun-test',
    payload: 'awesome from both web and node',
  })

  my_mqtt.send(
    'u8-mqtt-demo/another/apple/orange',
    'MQTT Fruity fun')

}
```

## Sizes

Built for small footprint with ES Modules (ESM) using embedded [u8-mqtt-packet][] and [regexparam][] libraries.

| Size  | (x) | Measurement
|-------|-----|------------
| 187KB | 13x | `curl -sL https://cdn.jsdelivr.net/npm/mqtt@4.0.1/dist/mqtt.min.js  \| wc -c`
|  32KB |  2x | `curl -sL https://cdn.jsdelivr.net/npm/paho-mqtt@1.1.0/paho-mqtt.min.js \| wc -c`
|  16KB |  1x | `cat ./u8-mqtt/esm/web/v4.min.mjs \| wc -c`


## Prior Art

The `u8-mqtt` project was inspired by [mqtt](https://github.com/mqttjs/MQTT.js#readme) and [mqtt-packet](https://github.com/mqttjs/mqtt-packet) written for NodeJS. The codecs of those project are written with a NodeJS ecosystem in mind: Buffer, EventEmitter, Streams.


## License

[BSD-2-Clause](LICENSE)

