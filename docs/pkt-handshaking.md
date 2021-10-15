#### Handshaking Packets

See [u8-mqtt-packet][] for MQTT packet encoding details


* `mqtt.connect(pkt={})` -- Encode and send an MQTT connect packet. All arguments are optional. Returns a promise resolved by the `connack` response packet.

  If `pkt.client_id` is falsy or an Array, `client_id` is initialized with `mqtt.init_client_id(pkt.client_id)`

  If `pkt.keep_alive` is nullish, it is defaulted to `60`. After recieving the `connack` reply packet, an automated ping process is started via `mqtt._conn_.ping(pkt.keep_alive)`

  Returns a `Promise<[connack pkt, error]>` in the style of an [Option / Maybe monad](https://en.wikipedia.org/wiki/Option_type).

  See [`u8-mqtt-packet/docs/mqtt_codec_connect.md`](https://github.com/shanewholloway/js-u8-mqtt-packet/blob/master/docs/mqtt_codec_connect.md) for MQTT packet encoding details

* `mqtt.disconnect(pkt)` -- Encode and send an MQTT disconnect packet. All arguments are optional. Resets the `_conn` connection.

  See [`u8-mqtt-packet/docs/mqtt_codec_disconnect.md`](https://github.com/shanewholloway/js-u8-mqtt-packet/blob/master/docs/mqtt_codec_disconnect.md) for MQTT packet encoding details

* `mqtt.auth(pkt)` -- Encode and send an MQTT auth packet.

  See [`u8-mqtt-packet/docs/mqtt_codec_auth.md`](https://github.com/shanewholloway/js-u8-mqtt-packet/blob/master/docs/mqtt_codec_auth.md) for MQTT packet encoding details

* `mqtt.ping()` -- Encode and send an MQTT pingreq packet. Returns a promise that is resolved after a `pingresp` packet is received. 

  Note that `mqtt.connect` automatically pings the MQTT server based on `keep_alive` setting.

  Returns a `Promise<[pingresp pkt, error]>` in the style of an [Option / Maybe monad](https://en.wikipedia.org/wiki/Option_type).

  See [`u8-mqtt-packet/docs/mqtt_codec_pingreq_pingresp.md`](https://github.com/shanewholloway/js-u8-mqtt-packet/blob/master/docs/mqtt_codec_pingreq_pingresp.md) for MQTT packet encoding details

