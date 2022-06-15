import mqtt_client from 'u8-mqtt/esm/node/v5.mjs'
import demo_cfg from '../support_config.mjs'


const my_mqtt = mqtt_client({on_live})
  .with_tcp(demo_cfg.tcp.port, demo_cfg.tcp.host)


async function on_live(my_mqtt) {
  try {
    await my_mqtt.connect()
    while (1) {
      let ts = new Date()
      let res = await my_mqtt.json_store(
        `u8-mqtt-demo/demo-${(+ts).toString(36)}`, {ts},
        {props: { message_expiry_interval: 0|(Math.random()*120 + 30) }})

      console.log("RES", res)
      await new Promise(done => setTimeout(done, 2000))
    }
  } catch (err) {
    console.warn('ERR', err)
  }
}

