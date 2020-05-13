import mqtt_session_ctx from './session.mjs'
import MQTTCore from './core.jsy'

class MQTTClient_v4 extends MQTTCore {}
MQTTClient_v4._with_session(mqtt_session_ctx(4))

const mqtt_v4 = opt => new MQTTClient_v4(opt)

export {
  MQTTClient_v4,
  MQTTClient_v4 as MQTTClient,

  mqtt_v4,
  mqtt_v4 as mqtt,
  mqtt_v4 as default,
}
