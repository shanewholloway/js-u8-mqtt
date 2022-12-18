
export function setup_in_your_code(my_mqtt) {
  // allow playing with my_mqtt from Node REPL
  globalThis.my_mqtt = my_mqtt

  my_mqtt
    .on_topic('u8-mqtt-demo/topic/:arg', (pkt, params, ctx) => {
      console.log('topic:', params, [params.arg, pkt.utf8()])
    })
    .subscribe_topic('u8-mqtt-demo/another/:first/:second', {qos: 1}, (pkt, params, ctx) => {
      console.log('another:', params, [params.first, params.second, pkt.utf8()])
    })
    .sub_topic('u8-mqtt-demo/bye', (pkt, params, ctx) => {
      console.log('other mqtt said bye:', params, [pkt.utf8()])
    })
    .sub_topic('u8-mqtt-demo/json/*', (pkt, params, ctx) => {
      console.log('json posted:', params, [pkt.json()])
    })
    .sub_topic('u8-mqtt-demo/obj/*', (pkt, params, ctx) => {
      console.log('obj posted:', params, [pkt.payload])
    })
}

export async function somewhere_in_your_code(my_mqtt) {
  let res_conn = await my_mqtt.connect({
    client_id: ['my-mqtt--', '--demo'],
    will: {
      topic: 'u8-mqtt-demo/bye',
      payload: 'gone!',
    }
  })

  console.log('Connected', ...res_conn)
  if (0) return;

  await my_mqtt.subscribe('u8-mqtt-demo/topic/+', {qos: 1})

  my_mqtt.publish({
    topic: 'u8-mqtt-demo/topic/fun-test',
    payload: 'Awesome from the web, NodeJS, and Deno',
    qos: 1,
  })

  my_mqtt.send(
    'u8-mqtt-demo/another/kiwi/starfruit',
    'Web/Node/Deno common source fruity fun')


  if (0) {
    my_mqtt.json_post(
      'u8-mqtt-demo/json/post',
      {op: 'json_post', ts: new Date().toISOString() })
    my_mqtt.json_send(
      'u8-mqtt-demo/json/send',
      {op: 'json_send', ts: new Date().toISOString() })
    my_mqtt.json_store(
      'u8-mqtt-demo/json/store',
      {op: 'json_store', ts: new Date().toISOString() })
  }

  if (0) {
    my_mqtt.obj_post(
      'u8-mqtt-demo/obj/post',
      {op: 'obj_post', ts: new Date().toISOString() })
    my_mqtt.obj_send(
      'u8-mqtt-demo/obj/send',
      {op: 'obj_send', ts: new Date().toISOString() })
    my_mqtt.obj_store(
      'u8-mqtt-demo/obj/store',
      {op: 'obj_store', ts: new Date().toISOString() })
  }
}


export async function goodbye(my_mqtt) {
  await my_mqtt.delay(100)

  console.log()
  console.log('Will be disconnecting soon')
  await my_mqtt.delay(150)

  console.log()
  console.log(`Disconnecting ${my_mqtt.client_id}`)
  await my_mqtt.post('u8-mqtt-demo/bye', `Nicely leaving: ${my_mqtt.client_id}`)
  await my_mqtt.disconnect()
  console.log('Bye!')
  console.log()
}
