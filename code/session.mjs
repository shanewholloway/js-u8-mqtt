import {
  _bind_mqtt_session_ctx,

  mqtt_decode_connack,
  mqtt_decode_publish,
  mqtt_decode_puback,
  mqtt_decode_pubxxx,
  mqtt_decode_pingxxx,
  mqtt_decode_suback,
  mqtt_decode_unsuback,
  mqtt_decode_auth,

  mqtt_encode_connect,
  mqtt_encode_disconnect,
  mqtt_encode_publish,
  mqtt_encode_puback,
  mqtt_encode_pingxxx,
  mqtt_encode_subscribe,
  mqtt_encode_unsubscribe,
  mqtt_encode_auth,
} from 'u8-mqtt-packet'


export default mqtt_session_ctx
export function mqtt_session_ctx(mqtt_level) {
  let {ctx} = mqtt_session_ctx
  if (undefined === ctx ) {
    const as_utf8 = u8 =>
      new TextDecoder('utf-8').decode(u8)

    const std_pkt_api = {
      utf8(u8) { return as_utf8( u8 || this.payload ) },
      json(u8) { return JSON.parse( as_utf8( u8 || this.payload )) },
    }

    mqtt_session_ctx.ctx = ctx =
      _bind_mqtt_session_ctx(
        [ // lst_decode_ops
          mqtt_decode_connack,
          mqtt_decode_publish,
          mqtt_decode_puback,
          mqtt_decode_pubxxx,
          mqtt_decode_pingxxx,
          mqtt_decode_suback,
          mqtt_decode_unsuback,
          mqtt_decode_auth, ],

        [ // lst_encode_ops
          mqtt_encode_connect,
          mqtt_encode_disconnect,
          mqtt_encode_publish,
          mqtt_encode_puback,
          mqtt_encode_pingxxx,
          mqtt_encode_subscribe,
          mqtt_encode_unsubscribe,
          mqtt_encode_auth, ],

        std_pkt_api )
  }

  return ctx(mqtt_level)
}

