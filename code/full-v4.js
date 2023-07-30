import mqtt_opts_v4 from 'u8-mqtt-packet/esm/codec_v4_full.js'
import {with_topic_path_router} from './router_path.jsy'
import MQTTCore from './core.jsy'
export * from './version.js'

const MQTTClient_v4 = /* #__PURE__ */
  with_topic_path_router(
    MQTTCore.mqtt_ctx(4, mqtt_opts_v4) )

const mqtt_v4 = opt =>
  new MQTTClient_v4(opt)

export {
  MQTTClient_v4,
  MQTTClient_v4 as MQTTClient,

  mqtt_v4,
  mqtt_v4 as mqtt,
  mqtt_v4 as default,
}
