import mqtt_client from 'u8-mqtt/esm/node/v5.js'
import demo_cfg from '../support_config.js'


const my_mqtt = mqtt_client({on_live})
  .with_tcp(demo_cfg.tcp.port, demo_cfg.tcp.host)


async function on_live(my_mqtt) {
  try {
    await my_mqtt.connect()

    let topic = `u8-mqtt-demo/refresh}`
    let pub_opt = {props: { message_expiry_interval: 30 }}

    while (1) {
      let ts = new Date()
      let res = await my_mqtt.json_store(topic, {ts}, pub_opt)

      console.log("RES", res)
      await new Promise(done => setTimeout(done, 2000))
    }
  } catch (err) {
    console.warn('ERR', err)
  }
}

