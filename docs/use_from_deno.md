# Use from Deno

See [demo/simple/deno-cdn.js](../demo/simple/deno-cdn.js) source code.
Run with:

    deno run --allow-net ./demo/simple/deno-cdn.js

```javascript
import mqtt_client from 'https://esm.sh/u8-mqtt/esm/deno/index.js'

let my_mqtt = mqtt_client()
  .with_tcp('tcp://test.mosquitto.org:1883')
  // or .with_tcp(1883, 'test.mosquitto.org')
  .with_autoreconnect()

await my_mqtt.connect()

my_mqtt.subscribe_topic(
  'u8-mqtt/demo-simple/:topic',
  (pkt, params, ctx) => {
    console.log('topic packet', params, pkt, pkt.json())
  })

await my_mqtt.json_send(
  'u8-mqtt/demo-simple/live',
  { note: 'from Deno example',
    live: new Date().toISOString() })
```

