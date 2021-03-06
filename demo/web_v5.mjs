import mqtt_client from '../esm/web/v5.mjs' // 'u8-mqtt/esm/web/v5.mjs'

import {somewhere_in_your_code, goodbye} from './_demo_common.mjs'


const my_mqtt = mqtt_client({on_live})
  //.with_websock('ws://127.0.0.1:9001')
  .with_websock('wss://test.mosquitto.org:8081')


async function on_live(my_mqtt) {
  try {
    await somewhere_in_your_code(my_mqtt)

    await my_mqtt.send(
      'u8-mqtt-demo/another/pineapple/mango',
      'Web-side v5 Fruity fun')

    //await goodbye(my_mqtt)
  } catch (err) {
    console.warn(err)
  }
}


// allow playing with my_mqtt from developer console
window.my_mqtt = my_mqtt
