import mqtt_client from 'u8-mqtt/esm/node/v4.mjs'
import demo_cfg from './support_config.mjs'

console.log('in script_like_updates.mjs')

const my_mqtt = mqtt_client()
  .with_tcp(demo_cfg.tcp.port, demo_cfg.tcp.host)
  .with_autoreconnect()

await my_mqtt.connect()

for (let i=9; i>=0; i--) {
  await my_mqtt.delay(1000)

  let ts = new Date()
  console.log('SENDING[%o]: %s', i, ts)
  await my_mqtt.send(
    'u8-mqtt-demo/another/lemon/lime',
    `Script-like updates [${i}]: ${ts}`)
}

await my_mqtt.disconnect()

