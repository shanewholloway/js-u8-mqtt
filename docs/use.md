# Using `u8-mqtt`

- from [Web CDN](./use_from_web_cdn.md)
- from [Web bundler](./use_from_web_bundler.md) like [Rollup][] or [ESBuild][]
- from [NodeJS](./use_from_nodejs.md)
- from [Deno](./use_from_deno.md)


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

