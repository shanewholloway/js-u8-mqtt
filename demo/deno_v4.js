import mqtt_client from '../esm/deno/v4.js'
import demo_cfg from './support_config.js'
import {
  setup_in_your_code,
  somewhere_in_your_code,
  goodbye,
} from './support_common.js'


const ONESHOT = 'oneshot' == Deno.env.get('U8_MQTT')
console.log('in deno_v4.js', {ONESHOT})

const my_mqtt = mqtt_client({on_live})
  .with_tcp(demo_cfg.tcp.port, demo_cfg.tcp.host)
  .with_autoreconnect()

setup_in_your_code(my_mqtt)

async function on_live(my_mqtt) {
  try {
    await somewhere_in_your_code(my_mqtt)

    await my_mqtt.send(
      'u8-mqtt-demo/another/grape/lime',
      `Deno-side v4 Fruity fun: ${new Date}`)

    if (ONESHOT)
      await goodbye(my_mqtt)
  } catch (err) {
    console.warn(err)
  }
}
