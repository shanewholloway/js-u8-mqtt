import mqtt_opts_v5 from 'u8-mqtt-packet/esm/codec_v5_full.js'
import {with_topic_path_router} from './router_path.jsy'
import MQTTCore from './core.jsy'
export * from './version.js'

const MQTTClient_v4 = /* #__PURE__ */
  with_topic_path_router(
    MQTTCore.mqtt_ctx(4, mqtt_opts_v5) )

const MQTTClient_v5 = /* #__PURE__ */
  with_topic_path_router(
    MQTTCore.mqtt_ctx(5, mqtt_opts_v5) )

const mqtt_v4 = opt =>
  new MQTTClient_v4(opt)

const mqtt_v5 = opt =>
  new MQTTClient_v5(opt)

export {
  MQTTClient_v4,
  MQTTClient_v5,
  MQTTClient_v5 as MQTTClient,

  mqtt_v4,
  mqtt_v5,
  mqtt_v5 as mqtt,
  mqtt_v5 as default,
}
