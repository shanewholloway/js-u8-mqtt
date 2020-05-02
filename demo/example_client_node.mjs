// see ../index.html for Web Example Clinet
import MQTTClient from 'u8-mqtt-packet/esm/client/node.mjs'

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
    'Node-side Fruity fun')

}
