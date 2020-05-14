### Creating an MQTT Client

* `mqtt_v4(opt)`
* `mqtt_v5(opt)`
* `new MQTTClient_v4(opt)`
* `new MQTTClient_v5(opt)`

Creates an MQTT client instance.

If the `opt.on_mqtt_type` object is provided, `mqtt._init_dispatch(opt)` uses it for packet dispatching.

If the `opt.on_live(mqtt)` closure is provided, `mqtt.with_live(opt.on_live)` is called.

Packets are decoded via the internal `mqtt._conn_` and the bound `mqtt._mqtt_session` objects. Please read [`_conn.jsy`][../code/_conn.jsy] for details.


### Transport

* `mqtt.with_websock(websock)` connects to MQTT using a WebSocket. Pass either a URL or a WebSocket instance.

* `mqtt.with_stream(duplex_stream)` connects to MQTT using [NodeJS's duplex stream](https://nodejs.org/api/stream.html#stream_class_stream_duplex) abstraction. See `.with_tcp()` for a simple TCP connection.

* `mqtt.with_tcp(...args)` invokes `.with_stream(net.connect(...args))` to connect to MQTT over a TCP socket. See [NodeJS's `net.connect()`](https://nodejs.org/api/net.html#net_net_connect)

* `mqtt.on_live(mqtt)` -- Called upon transport connection. Override or install via constructor.

* `mqtt.with_live(on_live)` -- Assigns `mqtt.on_live` to the provide closure. Returns `this`.


### Packets

 [u8-mqtt-packet]: https://github.com/shanewholloway/js-u8-mqtt-packet
 [regexparam]: https://github.com/lukeed/regexparam#readme 


#### Dispatching Publish Packets

Route topic handlers like [expressjs]() routes.

  * Static (/foo, /foo/bar)
  * Parameter (/:title, /books/:title, /books/:genre/:title)
  * Parameter w/ Suffix (/movies/:title.mp4, /movies/:title.(mp4|mov))
  * Optional Parameters (/:title?, /books/:title?, /books/:genre/:title?)
  * Wildcards (*, /books/*, /books/:genre/*)

See [regexparam][] for routing rule details for `topic_route`.


* `mqtt.on_topic(topic_route, [priority=false,] handler)` -- alias for `mqtt.router.add`

* `mqtt.subscribe_topic(topic_route, [ex={qos:0},] handler)` -- alias for `mqtt.on_topic(topic_route, true, handler)` and `mqtt.subscribe([[topic_route]], ex)`
  * `mqtt.sub_topic` -- alias for `mqtt.subscribe_topic`

* `mqtt.router`

  * `mqtt.router.add(topic_route, [priority=false,], handler)`

    The `handler(pkt, params, ctx)` passes the matched `params` along with the `pkt` and `ctx`

    If `handler` is `false`, an ignore handler is used that sets `ctx.done = true`. Useful for skipping messages to self-messages on the pubsub party line.

  * `mqtt.router.find(topic)` returns an iterable of matching `[handler, route_params]` for the topic.

  * `mqtt.router.invoke(pkt)` uses `.find(pkt.topic)` to dispatch publish packets to `topic_route` handlers.

    Hanlders are invoked in registration order with priority handlers first.
    If the `handler(pkt, params, ctx)` sets `ctx.done` to a truthy value,
    remaining handlers are skipped.

    Automatically sends `puback` response packet when `pkt.qos === 1` if no exceptions are thrown.

  See [`_router.jsy`][../code/_router.jsy] for details.
  See `mqtt._init_router` and `mqtt._init_dispatch` for client integration.


##### Handshaking Packets

See [u8-mqtt-packet][] for MQTT packet encoding details


* `mqtt.connect(pkt={})` -- Encode and send an MQTT connect packet. All arguments are optional. Returns a promise resolved by the `connack` response packet.

  If `pkt.client_id` is falsy or an Array, `client_id` is initialized with `mqtt.init_client_id(pkt.client_id)`

  If `pkt.keep_alive` is nullish, it is defaulted to `60`. After recieving the `connack` reply packet, an automated ping process is started via `mqtt._conn_.ping(pkt.keep_alive)`

  See [`u8-mqtt-packet/docs/mqtt_codec_connect.md`](https://github.com/shanewholloway/js-u8-mqtt-packet/blob/master/docs/mqtt_codec_connect.md) for MQTT packet encoding details

* `mqtt.disconnect(pkt)` -- Encode and send an MQTT disconnect packet. All arguments are optional. Resets the `_conn` connection.

  See [`u8-mqtt-packet/docs/mqtt_codec_disconnect.md`](https://github.com/shanewholloway/js-u8-mqtt-packet/blob/master/docs/mqtt_codec_disconnect.md) for MQTT packet encoding details

* `mqtt.auth(pkt)` -- Encode and send an MQTT auth packet.

  See [`u8-mqtt-packet/docs/mqtt_codec_auth.md`](https://github.com/shanewholloway/js-u8-mqtt-packet/blob/master/docs/mqtt_codec_auth.md) for MQTT packet encoding details

* `mqtt.ping()` -- Encode and send an MQTT pingreq packet. Returns a promise that is resolved after a `pingresp` packet is received. 

  Note that `mqtt.connect` automatically pings the MQTT server based on `keep_alive` setting.

  See [`u8-mqtt-packet/docs/mqtt_codec_pingreq_pingresp.md`](https://github.com/shanewholloway/js-u8-mqtt-packet/blob/master/docs/mqtt_codec_pingreq_pingresp.md) for MQTT packet encoding details


##### Subscription Packets

* `mqtt.subscribe(pkt)` -- Encode and send an MQTT subscribe packet.
  * `mqtt.sub` -- alias for `mqtt.subscribe`
  * `mqtt.subscribe(topic, ex)` -- alias for `mqtt.subscribe({topics: [topic], ...ex})`
    * `mqtt.sub(topic, ex)` -- alias for `mqtt.subscribe({topics: [topic], ...ex})`
  * `mqtt.subscribe(topic_list, ex)` -- alias for `mqtt.subscribe({topics: [... topic_list], ...ex})`
    * `mqtt.sub(topic_list, ex)` -- alias for `mqtt.subscribe({topics: [... topic_list], ...ex})`

  See [`u8-mqtt-packet/docs/mqtt_codec_subscribe.md`](https://github.com/shanewholloway/js-u8-mqtt-packet/blob/master/docs/mqtt_codec_subscribe.md) for MQTT packet encoding details

* `mqtt.unsubscribe(pkt)` -- Encode and send an MQTT unsubscribe packet.
  * `mqtt.unsub` -- alias for `mqtt.unsubscribe`
  * `mqtt.unsubscribe(topic, ex)` -- alias for `mqtt.unsubscribe({topics: [topic], ...ex})`
    * `mqtt.unsub(topic, ex)` -- alias for `mqtt.unsubscribe({topics: [topic], ...ex})`
  * `mqtt.unsubscribe(topic_list, ex)` -- alias for `mqtt.unsubscribe({topics: [... topic_list], ...ex})`
    * `mqtt.unsub(topic_list, ex)` -- alias for `mqtt.unsubscribe({topics: [... topic_list], ...ex})`


  See [`u8-mqtt-packet/docs/mqtt_codec_unsubscribe.md`](https://github.com/shanewholloway/js-u8-mqtt-packet/blob/master/docs/mqtt_codec_unsubscribe.md) for MQTT packet encoding details

* `mqtt.subscribe_topic(topic, [qos=0,] handler)` -- alias for `mqtt.on_topic(topic, true, handler)` and `mqtt.subscribe([[topic, qos]])`
  * `mqtt.sub_topic` -- alias for `mqtt.subscribe_topic`


##### Publish Packets

* `mqtt.publish(pkt)` -- Encode and send an MQTT publish packet. Handles `puback` for `QOS:1`.
  * `mqtt.pub(pkt)` -- alias for `mqtt.publish(pkt)`

  See [`u8-mqtt-packet/docs/mqtt_codec_publish.md`](https://github.com/shanewholloway/js-u8-mqtt-packet/blob/master/docs/mqtt_codec_publish.md) for MQTT packet encoding details

* `mqtt.post(topic, payload)` -- alias for `mqtt.publish({topic, qos: 0, payload})`
  * `mqtt.post(topic)` -- closure of `payload => mqtt.post(topic, payload)`

* `mqtt.send(topic, payload)` -- alias for `mqtt.publish({topic, qos: 1, payload})`
  * `mqtt.send(topic)` -- closure of `payload => mqtt.send(topic, payload)`

* `mqtt.json_post(topic, msg)` -- alias for `mqtt.publish({topic, qos: 0, payload: JSON.stringify(msg))`
  * `mqtt.json_post(topic)` -- closure of `msg => mqtt.json_post(topic, msg)`

* `mqtt.json_send(topic, msg)` -- alias for `mqtt.publish({topic, qos: 1, payload: JSON.stringify(msg))`
  * `mqtt.json_send(topic)` -- closure of `msg => mqtt.json_send(topic, msg)`


### Utilities

* `mqtt.init_client_id(parts)` -- lazy initialization of `mqtt.client_id`. Calls `mqtt.sess_client_id` or `mqtt.new_client_id`.

* `mqtt.sess_client_id(parts)` -- re-uses `client_id` across [`window.sessionStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) keyed by `parts`. Calls `mqtt.new_client_id`.

* `mqtt.new_client_id(parts)` -- generates a new `client_id` by joining `parts` with a URL-safe random string.


### Advanced API

An `on_mqtt_type` object of packet handlers can be passed during creation of the MQTT client.

```javascript
opt.on_mqtt_type = {
  mqtt_auth(pkt, ctx) { /* ... */ },
  mqtt_connect(pkt, ctx) { /* ... */ },
  mqtt_connack(pkt, ctx) { /* ... */ },
  mqtt_disconnect(pkt, ctx) { /* ... */ },

  mqtt_subscribe(pkt, ctx) { /* ... */ },
  mqtt_unsubscribe(pkt, ctx) { /* ... */ },

  mqtt_pingreq(pkt, ctx) { /* ... */ },
  mqtt_pingresp(pkt, ctx) { /* ... */ },

  mqtt_publish(pkt, ctx) { /* NOTE: this is overridden by mqtt._init_dispatch(opt) */ },
}
```


### Internal/Extension API

* `MQTTClient._with_session(mqtt_session)` -- static method that assigns prototype-shared `mqtt._mqtt_session`. See [`v4.mjs`](../code/v4.mjs) and [`v5.mjs`](../code/v5.mjs)
  * `mqtt._mqtt_session` -- See [`session.mjs`](code/session.mjs)

* `mqtt._send(type, pkt, key)` -- Encode and send an MQTT packet of `type`. See [`_conn.jsy`][../code/_conn.jsy] for details.

* `mqtt._init_router(opt)` -- Creates an express-like topic router. See [`_router.jsy`][../code/_router.jsy] for details.

* `mqtt._init_dispatch(opt)` -- Connects `opt.on_mqtt_type` with the publish packet topic-router. See [`_dispatch.jsy`][../code/_dispatch.jsy] for details.

