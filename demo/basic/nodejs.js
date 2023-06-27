import mqtt_v5 from 'u8-mqtt/esm/node/basic-v5.js'

function my_custom_publish_handler(pkt, ctx) {
  console.log('On publish: %o', pkt.json(), this)
}

let my_mqtt = mqtt_v5({
    on_mqtt_type: {
      mqtt_publish: my_custom_publish_handler,
    }})
  .with_tcp('tcp://test.mosquitto.org:1883')
  // or .with_tcp(1883, 'test.mosquitto.org')
  .with_autoreconnect()



await my_mqtt.connect()

await my_mqtt.subscribe('u8-mqtt/#')


await my_mqtt.json_send(
  'u8-mqtt/demo-basic/basic-v5',
  { note: 'from NodeJS example',
    live: new Date().toISOString() })

