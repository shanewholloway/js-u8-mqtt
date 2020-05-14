import mqtt_client from '../esm/node/v4.mjs' // 'u8-mqtt/esm/node/v4.mjs'

import {somewhere_in_your_code, goodbye} from './_demo_common.mjs'

const my_mqtt = mqtt_client({on_live})
  //.with_tcp(1883, '127.0.0.1')
  .with_tcp(1883, 'test.mosquitto.org')


async function on_live(my_mqtt) {
  try {
    await somewhere_in_your_code(my_mqtt)

    my_mqtt.send(
      'u8-mqtt-demo/another/apple/orange',
      'Node-side v4 Fruity fun')

    //await goodbye(my_mqtt)
  } catch (err) {
    console.warn(err)
  }
}


// allow playing with my_mqtt from Node REPL
globalThis.my_mqtt = my_mqtt
