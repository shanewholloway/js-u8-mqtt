import mqtt_client from 'u8-mqtt/esm/node/v4.mjs'
import demo_cfg from './support_config.mjs'
import {
  setup_in_your_code,
  somewhere_in_your_code,
  goodbye,
} from './support_common.mjs'


const ONESHOT = 'oneshot' == process.env.U8_MQTT
console.log('in node_v4.mjs', {ONESHOT})

const my_mqtt = mqtt_client({on_live})
  .with_tcp(demo_cfg.tcp.port, demo_cfg.tcp.host)

if (! ONESHOT)
  my_mqtt.with_autoreconnect()

setup_in_your_code(my_mqtt)

async function on_live(my_mqtt) {
  try {
    await somewhere_in_your_code(my_mqtt)

    await my_mqtt.send(
      'u8-mqtt-demo/another/apple/orange',
      `Node-side v4 Fruity fun: ${new Date}`)

    if (ONESHOT)
      await goodbye(my_mqtt)
  } catch (err) {
    console.warn(err)
  }
}
