import mqtt_client from 'u8-mqtt/esm/node/v5.js'
import demo_cfg from '../support_config.js'


const my_mqtt = mqtt_client({on_live})
  .with_tcp(demo_cfg.tcp.port, demo_cfg.tcp.host)
  .with_autoreconnect()


async function on_live(my_mqtt, is_reconnect) {
  try {
    let conn_ans = await my_mqtt.connect()
    if (is_reconnect)
      return console.log("reconnect", is_reconnect, conn_ans[0])

    my_mqtt.sub_topic('u8-mqtt-demo/#', {qos:1}, pkt =>
      console.log(`SAW {qos:${pkt.qos} retain:${pkt.retain} '${pkt.topic}'}:`, pkt.props))
  } catch (err) {
    console.warn(err)
  }
}

