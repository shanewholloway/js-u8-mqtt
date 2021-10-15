### Creating an MQTT Client

* `mqtt_v4(opt)`
* `mqtt_v5(opt)`
* `new MQTTClient_v4(opt)`
* `new MQTTClient_v5(opt)`

Creates an MQTT client instance.

If the `opt.on_live(mqtt)` closure is provided, `mqtt.with_live(opt.on_live)` is called.

If the `opt.on_reconnect(mqtt)` closure is provided, `mqtt.with_reconnect(opt.on_reconnect)` is called.

If the `opt.on_mqtt_type` object is provided, `mqtt._init_dispatch(opt)` uses it for packet dispatching.
By default, `mqtt_publish` directs the packet to `mqtt.router` for dispatching.
See [./client-more.md]() for more documentation, and [`base.jsy`](../code/base.jsy) for details.

Packets are decoded via the internal `mqtt._conn_` and the bound `mqtt._mqtt_session` objects.
Please read [`_conn.jsy`](../code/_conn.jsy) for details.


### Transport

* `mqtt.with_websock(websock)` connects to MQTT using a WebSocket. Pass either a URL or a WebSocket instance.

* `mqtt.with_stream(duplex_stream)` connects to MQTT using [NodeJS's duplex stream](https://nodejs.org/api/stream.html#stream_class_stream_duplex) abstraction. See `.with_tcp()` for a simple TCP connection.

* `mqtt.with_tcp(...args)` invokes `this.with_stream(net.connect(...args))` to connect to MQTT over a TCP socket. See [NodeJS's `net.connect()`](https://nodejs.org/api/net.html#net_net_connect)

* Connection callbacks

  * `mqtt.on_live(mqtt)` -- Called upon transport connection. Override or install via constructor.

  * `mqtt.with_live(on_live)` -- Assigns `mqtt.on_live` to the provide closure. Returns `this`.

  * `mqtt.on_reconnect(mqtt)` -- Called upon disconnect or transport interruption. Override or install via constructor.

  * `mqtt.with_reconnect(on_reconnect)` -- Assigns `mqtt.on_reconnect` to the provide closure. Invokes `on_reconnect` if `_conn_.is_set` is `false`. Returns `this`.


### Packets

 [u8-mqtt-packet]: https://github.com/shanewholloway/js-u8-mqtt-packet

See [./pkt-publish.md]() for documentation on sending packets.

See [./pkt-router.md]() for documentation on packet routing and handlers.

See [./pkt-subscribe.md]() for documentation on subscribing and unsubscribing from topics, and packet routing handlers.

See [./pkt-handshaking.md]() for documentation on `connect()`, `disconnect()`, `auth()`, and `ping()` methods.


### More client details

See [./client-more.md]() for more information on utility, advanced, extension, and internal APIs.

