import mqtt_client from 'u8-mqtt/esm/node/index.js'

let my_mqtt = mqtt_client()
  .with_tcp('tcp://test.mosquitto.org:1883')
  // or .with_tcp(1883, 'test.mosquitto.org')
  .with_autoreconnect()



await my_mqtt.connect()

my_mqtt.subscribe_topic(
  'u8-mqtt/demo-simple/:topic',
  (pkt, params, ctx) => {
    console.log('topic packet', params, pkt.json())
  })

my_mqtt.subscribe_topic(
  'u8-mqtt/*',
  (pkt, params, ctx) => {
    console.log('other topic packet', params, pkt.json())
  })


await my_mqtt.json_send(
  'u8-mqtt/demo-simple/node',
  { note: 'from NodeJS example',
    live: new Date().toISOString() })

