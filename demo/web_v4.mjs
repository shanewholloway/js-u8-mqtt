import mqtt_client from '../esm/web/v4.mjs'

import {somewhere_in_your_code, goodbye} from './_demo_common.mjs'
import demo_cfg from './_demo_config.mjs'


console.log('in web_v4.mjs')

const my_mqtt = mqtt_client({on_live})
  .with_websock(demo_cfg.websock_url)


async function on_live(my_mqtt) {
  try {
    await somewhere_in_your_code(my_mqtt)

    await my_mqtt.send(
      'u8-mqtt-demo/another/pineapple/mango',
      `Web-side v4 Fruity fun: ${new Date}`)

    //await goodbye(my_mqtt)
  } catch (err) {
    console.warn(err)
  }
}


// allow playing with my_mqtt from developer console
window.my_mqtt = my_mqtt
