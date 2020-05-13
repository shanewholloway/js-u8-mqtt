import {somewhere_in_your_code} from './_demo_common.mjs'
import mqtt_client from '../esm/node/v4.mjs' // 'u8-mqtt/esm/node/v4.mjs'

const my_mqtt = mqtt_client()

// allow playing with my_mqtt from Node REPL 
globalThis.my_mqtt = my_mqtt

my_mqtt
  .with_tcp(1883, '127.0.0.1')
  //.with_tcp(1883, 'test.mosquitto.org')
  .then(somewhere_in_your_code)
  .then(()=> {
    my_mqtt.send(
      'u8-mqtt-demo/another/apple/orange',
      'Node-side Fruity fun')
  })
  .catch(err => console.error(err))

setTimeout(()=>null, 2000)
