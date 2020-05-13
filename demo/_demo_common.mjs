
export async function somewhere_in_your_code(my_mqtt) {
  my_mqtt
    .subscribe_route('u8-mqtt-demo/topic/:arg', (pkt, params, ctx) => {
      console.log('topic:', params, [params.arg, pkt.utf8()])
    })
    .sub_route('u8-mqtt-demo/another/:first/:second', (pkt, params, ctx) => {
      console.log('another:', params, [params.first, params.second, pkt.utf8()])
    })


  await my_mqtt.connect({
    client_id: `u8-mqtt--${Math.random().toString(36).slice(2)}`,
    will: {
      topic: 'u8-mqtt-demo/bye',
      payload: 'gone!',
    }
  })

  await my_mqtt.subscribe([
    ['u8-mqtt-demo/another/#', 1],
    ['u8-mqtt-demo/topic/+', 1],
    ['u8-mqtt-demo/bye', 1],
  ])

  my_mqtt.publish({
    topic: 'u8-mqtt-demo/topic/node-side-fun-test',
    payload: 'awesome from both web and node',
    qos: 1,
  })

  my_mqtt.send(
    'u8-mqtt-demo/another/grape/lime',
    'Web/Node/Deno common source fruity fun')
}
