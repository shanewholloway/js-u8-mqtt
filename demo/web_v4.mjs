import mqtt_client from '../esm/web/v4.mjs'
import demo_cfg from './support_config.mjs'
import {
  setup_in_your_code,
  somewhere_in_your_code,
  goodbye,
} from './support_common.mjs'


const ONESHOT = '#oneshot' == location.hash
console.log('in web_v4.mjs', {ONESHOT})

const my_mqtt = mqtt_client({on_live})
  .with_websock(demo_cfg.websock_url)
  .with_autoreconnect()

setup_in_your_code(my_mqtt)

async function on_live(my_mqtt) {
  try {
    await somewhere_in_your_code(my_mqtt)

    await my_mqtt.send(
      'u8-mqtt-demo/another/pineapple/mango',
      `Web-side v4 Fruity fun: ${new Date}`)

    if (ONESHOT)
      await goodbye(my_mqtt)
  } catch (err) {
    console.warn(err)
  }
}
