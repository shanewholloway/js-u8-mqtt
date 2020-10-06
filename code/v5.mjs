import mqtt_session_ctx from './session.mjs'
import MQTTCore from './core.jsy'

class MQTTClient_v5 extends MQTTCore {
  _mqtt_session() { return mqtt_session_ctx(5)() }
}

const mqtt_v5 = opt => new MQTTClient_v5(opt)

export {
  MQTTClient_v5,
  MQTTClient_v5 as MQTTClient,

  mqtt_v5,
  mqtt_v5 as mqtt,
  mqtt_v5 as default,
}
