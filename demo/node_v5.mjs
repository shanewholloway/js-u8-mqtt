import mqtt_client from 'u8-mqtt/esm/node/v5.mjs'

import {somewhere_in_your_code, goodbye} from './_demo_common.mjs'
import demo_cfg from './_demo_config.mjs'


const my_mqtt = mqtt_client({on_live})
  .with_tcp(demo_cfg.tcp.port, demo_cfg.tcp.host)


async function on_live(my_mqtt) {
  try {
    await somewhere_in_your_code(my_mqtt)

    await my_mqtt.send(
      'u8-mqtt-demo/another/apple/orange',
      `Node-side v5 Fruity fun: ${new Date}`)

    await goodbye(my_mqtt)
  } catch (err) {
    console.warn(err)
  }
}


// allow playing with my_mqtt from Node REPL
globalThis.my_mqtt = my_mqtt
