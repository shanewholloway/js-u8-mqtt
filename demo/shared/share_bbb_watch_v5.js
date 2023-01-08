import mqtt_client from 'u8-mqtt/esm/node/v5.js'
import demo_cfg from '../support_config.js'


const my_mqtt = mqtt_client({on_live})
  .with_tcp(demo_cfg.tcp.port, demo_cfg.tcp.host)


async function on_live(my_mqtt) {
  console.log('BBB')
  try {
    // demo not using shared_subscribe utility:
    my_mqtt.on_topic('u8-mqtt-demo/*', pkt =>
      console.log(`BBB {${pkt.retain ? 'retain' : ''} topic:'${pkt.topic}'}:`))

    await my_mqtt.connect()
    await my_mqtt.subscribe('$share/BBB/u8-mqtt-demo/#')
  } catch (err) {
    console.warn(err)
  }
}

