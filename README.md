# u8-mqtt

- See [u8-mqtt-packet][] for MQTT packet parser details
- See [regexparam][] for routing rule details for `route` of `.on_msg(route, fn(kw, pkt)=>{})`

 [u8-mqtt-packet]: https://github.com/shanewholloway/js-u8-mqtt-packet
 [regexparam]: https://github.com/lukeed/regexparam#readme 


## Use

```javascript
// using NodeJS
import MQTTClient from 'u8-mqtt-packet/esm/node/v4.mjs'

// or using WebSockets
import MQTTClient from 'u8-mqtt-packet/esm/web/v4.mjs'


const my_mqtt = new MQTTClient()

my_mqtt
  .on_msg('u8-mqtt-demo/topic/:arg', (kw, pkt) => {
    console.log('topic:', kw, [kw.arg, pkt.utf8()])
  })
  .on_msg('u8-mqtt-demo/another/:first/:second', (kw, pkt) => {
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

