import mqtt_client from 'u8-mqtt/esm/node/v5.js'
import demo_cfg from '../support_config.js'


const my_mqtt = mqtt_client({on_live})
  .with_tcp(demo_cfg.tcp.port, demo_cfg.tcp.host)


async function on_live(my_mqtt) {
  try {
    await my_mqtt.connect()
    my_mqtt.sub_topic('u8-mqtt-demo/*', pkt =>
      console.log(`SAW {qos:${pkt.qos} retain:${pkt.retain} '${pkt.topic}'}:`, pkt.props))
  } catch (err) {
    console.warn(err)
  }
}

