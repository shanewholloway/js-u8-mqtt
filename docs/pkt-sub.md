#### Subscribe Packet

* `mqtt.subscribe(pkt)` -- Encode and send an MQTT subscribe packet.
  * `mqtt.subscribe(topic, ex)` -- alias for `mqtt.subscribe({topics: [topic], ...ex})`
  * `mqtt.subscribe(topic_list, ex)` -- alias for `mqtt.subscribe({topics: [... topic_list], ...ex})`
  * `mqtt.sub` -- alias for `mqtt.subscribe` variants

  Returns a `Promise<[suback pkt, error]>` in the style of an [Option / Maybe monad](https://en.wikipedia.org/wiki/Option_type).

  See [`u8-mqtt-packet/docs/mqtt_codec_subscribe.md`](https://github.com/shanewholloway/js-u8-mqtt-packet/blob/master/docs/mqtt_codec_subscribe.md) for MQTT packet encoding details


###### Routing and Handling Packets

See [./pkt-router.md](./pkt-router.md) for documentation on packet routing and handlers.


#### Unsubscribe Packet

* `mqtt.unsubscribe(pkt)` -- Encode and send an MQTT unsubscribe packet.
  * `mqtt.unsub` -- alias for `mqtt.unsubscribe`
  * `mqtt.unsubscribe(topic, ex)` -- alias for `mqtt.unsubscribe({topics: [topic], ...ex})`
    * `mqtt.unsub(topic, ex)` -- alias for `mqtt.unsubscribe({topics: [topic], ...ex})`
  * `mqtt.unsubscribe(topic_list, ex)` -- alias for `mqtt.unsubscribe({topics: [... topic_list], ...ex})`
    * `mqtt.unsub(topic_list, ex)` -- alias for `mqtt.unsubscribe({topics: [... topic_list], ...ex})`

  Returns a `Promise<[unsuback pkt, error]>` in the style of an [Option / Maybe monad](https://en.wikipedia.org/wiki/Option_type).

  See [`u8-mqtt-packet/docs/mqtt_codec_unsubscribe.md`](https://github.com/shanewholloway/js-u8-mqtt-packet/blob/master/docs/mqtt_codec_unsubscribe.md) for MQTT packet encoding details


