# Use from Web CDN

See [live Web CDN demo](https://shanewholloway.github.io/js-u8-mqtt/demo/simple/web-cdn.html)
and [demo/simple/web-cdn.html](../demo/simple/web-cdn.html) source code.


```javascript
import mqtt_client from 'https://cdn.jsdelivr.net/npm/u8-mqtt/esm/web/index.js' // or v4.min.js or v5.min.js

let my_mqtt = mqtt_client()
  .with_websock('wss://test.mosquitto.org:8081')
  .with_autoreconnect()

await my_mqtt.connect()

my_mqtt.subscribe_topic(
  'u8-mqtt/demo-simple/:topic',
  (pkt, params, ctx) => {
    console.log('topic packet', params, pkt, pkt.json())
  })

await my_mqtt.json_send(
  'u8-mqtt/demo-simple/live',
  { note: 'from Web CDN example',
    live: new Date().toISOString() })
```

