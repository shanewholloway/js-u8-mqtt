import MQTTClient from 'u8-mqtt-packet/esm/client/node.mjs'

const delay = ms => new Promise(y => setTimeout(y,ms))

async function main(name='noname') {
  const my_mqtt = new MQTTClient()

  my_mqtt.router
    .add('swh/:room_id/m/:from_id/:to_id', (kw, pkt) =>
      console.log("MESSAGE:", {kw, topic: pkt.topic, msg: pkt.json() }))

    .add('swh/:room_id/p/:user_id', (kw, pkt) =>
      console.log("PRESENCE:", { kw, topic: pkt.topic, status: 0!==pkt.payload.length }))


  my_mqtt.with_tcp(1883, '127.0.0.1')

  await my_mqtt.connect({
    client_id: `swh_demo-${name}`,
    will: {
      topic: `swh/abcdef/p/${name}`,
      payload: '',
      qos: 1, retain: true,
    }})

  await my_mqtt.subscribe('swh/#')

  await my_mqtt.publish({
    topic: `swh/abcdef/p/${name}`,
    payload: [1],
    qos: 1, retain: true,
  })

  await my_mqtt.json_send(
    `swh/abcdef/m/${name}/sam`,
    {salutation: 'hello Sam!', signed: name} )

}

main(process.argv.slice(2).pop() || 'noname')
