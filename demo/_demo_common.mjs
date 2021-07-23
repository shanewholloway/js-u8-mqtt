
export async function somewhere_in_your_code(my_mqtt) {
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

  await my_mqtt.connect({
    client_id: ['my-mqtt--', '--demo'],
    will: {
      topic: 'u8-mqtt-demo/bye',
      payload: 'gone!',
    }
  })

  await my_mqtt.subscribe('u8-mqtt-demo/topic/+', {qos: 1})

  my_mqtt.publish({
    topic: 'u8-mqtt-demo/topic/node-side-fun-test',
    payload: 'Awesome from the web, NodeJS, and Deno',
    qos: 1,
  })

  my_mqtt.send(
    'u8-mqtt-demo/another/kiwi/starfruit',
    'Web/Node/Deno common source fruity fun')
}


export const delay = ms => new Promise(y => setTimeout(y, ms))

export async function goodbye(my_mqtt) {
  await delay(100)

  console.log()
  console.log('Will be disconnecting soon')
  await delay(150)

  console.log()
  console.log(`Disconnecting ${my_mqtt.client_id}`)
  await my_mqtt.post('u8-mqtt-demo/bye', `Nicely leaving: ${my_mqtt.client_id}`)
  await my_mqtt.disconnect()
  console.log('Bye!')
  console.log()
}
