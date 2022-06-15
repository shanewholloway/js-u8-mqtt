import mqtt_client from 'u8-mqtt/esm/node/v5.mjs'
import demo_cfg from '../support_config.mjs'


const my_mqtt = mqtt_client({on_live})
  .with_tcp(demo_cfg.tcp.port, demo_cfg.tcp.host)


async function on_live(my_mqtt) {
  console.log('AAA')
  try {
    await my_mqtt.connect()

    my_mqtt.shared_sub('', 'u8-mqtt-demo/*', pkt =>
      console.log(`AAA {${pkt.retain ? 'retain' : ''} topic:'${pkt.topic}'}`))
  } catch (err) {
    console.warn(err)
  }
}

