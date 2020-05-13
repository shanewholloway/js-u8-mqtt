import {somewhere_in_your_code} from './_demo_common.mjs'
import mqtt_client from '../esm/web/v5.mjs' // 'u8-mqtt/esm/web/v5.mjs'

const my_mqtt = mqtt_client()

// allow playing with my_mqtt from developer console
window.my_mqtt = my_mqtt

my_mqtt
  //.with_websock('ws://127.0.0.1:9001')
  .with_websock('wss://test.mosquitto.org:8081')
  .then(somewhere_in_your_code)
  .then(()=> {
    my_mqtt.send(
      'u8-mqtt-demo/another/pineapple/mango',
      'Web-side Fruity fun')
  })
  .catch(err => console.error(err))

