// see ../index.html for Web Example Clinet
import MQTTClient from '../esm/node/v4.mjs'

const my_mqtt = new MQTTClient()

my_mqtt
  .on_msg('u8-mqtt-demo/topic/:arg', (pkt, params, ctx) => {
    console.log('topic:', params, [params.arg, pkt.utf8()])
  })
  .on_msg('u8-mqtt-demo/another/:first/:second', (pkt, params, ctx) => {
    console.log('another:', params, [params.first, params.second, pkt.utf8()])
  })


// Connect using NodeJS
my_mqtt.with_tcp(1883, '127.0.0.1')
  .then(somewhere_in_your_code)


// ...
async function somewhere_in_your_code() {

  await my_mqtt.connect({
    client_id: `u8-mqtt--${Math.random().toString(36).slice(2)}`,
    will: {
      topic: 'u8-mqtt-demo/bye',
      payload: 'gone!',
    }
  })

  await my_mqtt.subscribe([
    ['u8-mqtt-demo/another/#', 1],
    ['u8-mqtt-demo/topic/+', 1],
    ['u8-mqtt-demo/bye', 1],
  ])

  my_mqtt.publish({
    topic: 'u8-mqtt-demo/topic/node-side-fun-test',
    payload: 'awesome from both web and node',
    qos: 1,
  })

  my_mqtt.send(
    'u8-mqtt-demo/another/apple/orange',
    'Node-side Fruity fun')
}
