import {somewhere_in_your_code, goodbye} from './_demo_common.mjs'
import mqtt_client from '../esm/web/v4.mjs' // 'u8-mqtt/esm/web/v4.mjs'

const my_mqtt = mqtt_client({on_live})
  //.with_websock('ws://127.0.0.1:9001')
  .with_websock('wss://test.mosquitto.org:8081')


async function on_live(my_mqtt) {
  try {
    await somewhere_in_your_code(my_mqtt)

    my_mqtt.send(
      'u8-mqtt-demo/another/pineapple/mango',
      'Web-side v4 Fruity fun')

    //await goodbye(my_mqtt)
  } catch (err) {
    console.warn(err)
  }
}


// allow playing with my_mqtt from developer console
window.my_mqtt = my_mqtt
