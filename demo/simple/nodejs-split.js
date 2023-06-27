import mqtt_v5 from 'u8-mqtt/esm/node/v5.js'

let my_mqtt = mqtt_v5()
  .with_tcp('tcp://test.mosquitto.org:1883')
  // or .with_tcp(1883, 'test.mosquitto.org')
  .with_autoreconnect()


my_mqtt.on_topic(
  'u8-mqtt/*',
  (pkt, params, ctx) => {
    console.log('other topic packet', params, pkt.json())
  })



await my_mqtt.connect()

await my_mqtt.subscribe('u8-mqtt/+/#')


await my_mqtt.json_send(
  'u8-mqtt/demo-simple/v5-split',
  { note: 'from NodeJS example',
    live: new Date().toISOString() })


