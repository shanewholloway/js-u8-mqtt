# Use from TypeScript

The `u8-mqtt` package ships hand-written type declarations in
[`types/`](../types/). They are wired up via `package.json`
`exports` / `typesVersions`, so both modern (`node16` / `bundler`)
and classic (`node`) module resolution pick them up automatically.

  `npm install --save-dev u8-mqtt`


```typescript
import mqtt_client from 'u8-mqtt/esm/web/v5.js' // or index.js or v4.js

const my_mqtt = mqtt_client()
  .with_websock('wss://test.mosquitto.org:8081')
  .with_autoreconnect()

const [ack, err] = await my_mqtt.connect()
if (err) throw new Error(err)

// Route params are inferred from the topic route string:
// params has type { topic: string }
my_mqtt.subscribe_topic(
  'u8-mqtt/demo-ts/:topic',
  (pkt, params, ctx) => {
    console.log('topic packet', params.topic, pkt.json<{ live: string }>())
  })

await my_mqtt.json_send(
  'u8-mqtt/demo-ts/live',
  { note: 'from TypeScript example',
    live: new Date().toISOString() })
```


## Typed helpers

```typescript
import type {
  PublishPacket,
  Either,
  SubAckPacket,
  OnTopicCallback,
} from 'u8-mqtt/types/api.js'

// pkt.json<T>() for typed payload decoding
const on_state: OnTopicCallback<'device/:id/state'> =
  (pkt, params) => {
    const state = pkt.json<{ online: boolean }>()
    console.log(params.id, state.online)
  }

// subscribe/publish results use an option/maybe tuple:
// [pkt] on success, or [undefined, reason] on expiry
const sub: Either<SubAckPacket> = await my_mqtt.subscribe('a/b', { qos: 1 })

// topic-bound publish closure: omit the payload to get a publisher fn
const publish = await my_mqtt.send('fixed/topic')
await publish('hello')
```


## Errors

Note: `MQTTError` is exported from the `index.js` entrypoint
(the `v4.js` / `v5.js` builds only export the client classes),
and is also available as `my_mqtt.MQTTError` on any client.

```typescript
import { MQTTError } from 'u8-mqtt/esm/web/index.js'

try {
  await my_mqtt.connect({ username: 'nope', password: 'wrong' })
} catch (err) {
  if (err instanceof MQTTError)
    // reason is a boxed Number with a descriptive .reason string
    console.error(`connect refused [0x${Number(err.reason).toString(16)}]`,
      err.reason.reason)
}
```
