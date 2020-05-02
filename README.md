# u8-mqtt

## Use

```javascript
// using NodeJS
import MQTTClient from 'u8-mqtt-packet/esm/client/node.mjs'

// or using WebSockets
import MQTTClient from 'u8-mqtt-packet/esm/client/web.mjs'


const my_mqtt = new MQTTClient()

my_mqtt.router
  .add('u8-mqtt-demo/topic/:arg', (kw, pkt) => {
    console.log('topic:', kw, [kw.arg, pkt.utf8()])
  })
  .add('u8-mqtt-demo/another/:first/:second', (kw, pkt) => {
    console.log('another:', kw, [kw.first, kw.second, pkt.utf8()])
  })


// Connect using NodeJS
my_mqtt.with_tcp(1883, '127.0.0.1')
  .then(somewhere_in_your_code)

// or connect using WebSockets
my_mqtt.with_websock('ws://127.0.0.1:9001')
  .then(somewhere_in_your_code)
  

// ...
async function somewhere_in_your_code() {

  await my_mqtt.connect({
    client_id: 'u8-mqtt-packet-demo-node',
    will: {
      topic: 'u8-mqtt-demo/bye',
      payload: 'gone!',
    }
  })

  await my_mqtt.subscribe([
    'u8-mqtt-demo/another/#',
    'u8-mqtt-demo/topic/+',
    'u8-mqtt-demo/bye',
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

## License

[BSD-2-Clause](LICENSE)

