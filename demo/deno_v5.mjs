import mqtt_client from '../esm/deno/v5.mjs'

import {somewhere_in_your_code, goodbye} from './support_common.mjs'
import demo_cfg from './support_config.mjs'


const my_mqtt = mqtt_client({on_live})
  .with_tcp(demo_cfg.tcp.port, demo_cfg.tcp.host)


async function on_live(my_mqtt) {
  try {
    await somewhere_in_your_code(my_mqtt)

    await my_mqtt.send(
      'u8-mqtt-demo/another/grape/lime',
      `Deno-side v5 Fruity fun: ${new Date}`)

    await goodbye(my_mqtt)
  } catch (err) {
    console.warn(err)
  }
}


// allow playing with my_mqtt from Node REPL
globalThis.my_mqtt = my_mqtt
