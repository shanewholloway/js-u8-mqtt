### Use

- from [Web CDN](./use_from_web_cdn.md)
- from [Web bundler](./use_from_web_bundler.md) like [Rollup][] or [ESBuild][]
- from [NodeJS](./use_from_nodejs.md)
- from [Deno](./use_from_deno.md)

 [Rollup]: https://rollupjs.org
 [ESBuild]: https://esbuild.github.io

### Creating an MQTT Client

* `mqtt_v4(opt)`
* `mqtt_v5(opt)`
* `new MQTTClient_v4(opt)`
* `new MQTTClient_v5(opt)`

Creates an MQTT client instance.

If the `opt.on_mqtt_type` object is provided, `mqtt._init_dispatch(opt)` uses it for packet dispatching.
By default, `mqtt_publish` directs the packet to `mqtt.router` for dispatching.
See [./client-more.md](./client-more.md) for more documentation, and [`base.jsy`](../code/base.jsy) for details.

Packets are decoded via the internal `mqtt._conn_` and the bound `mqtt._mqtt_session` objects.
Please read [`_conn.jsy`](../code/_conn.jsy) for details.


### Transport

* `mqtt.with_autoreconnect(u16 | {delay : u16, reconnect: function, error: function})` will set up `mqtt.on_reconnect` callback to restore connection.

* `mqtt.with_websock(websock)` connects to MQTT using a WebSocket. Pass either a URL or a WebSocket instance.

* `mqtt.with_tcp(...args)` connects to MQTT over a TCP socket. See [NodeJS's `net.connect()`](https://nodejs.org/api/net.html#net_net_connect)

* `mqtt.with_stream(duplex_stream)` connects to MQTT using [NodeJS's duplex stream](https://nodejs.org/api/stream.html#stream_class_stream_duplex) abstraction. See `.with_tcp()` for a simple TCP connection.

* `mqtt.with_async_iter(async_iter, write_u8_pkt)`

* Connection callbacks

  * `mqtt.on_live(mqtt, is_reconnect : boolean)` -- Called upon transport connection or reconnection. Override or install via constructor.

  * `mqtt.on_disconnect(mqtt, intentional : boolean)` -- Called upon disconnect or transport interruption. Override or install via constructor.

  * `mqtt.on_reconnect(mqtt)` -- Called upon unintentional disconnect. Override or install via constructor.

  * `mqtt.log_conn(evt, arg, err_arg)` -- Called for observing state transitions of an MQTT connection.

      `mqtt.with({ log_conn(evt, arg, err_arg) { console.info('[[u8-mqtt log: %s]]', evt, arg, err_arg) } })`


### Packets

See [./pkt-pub.md](./pkt-pub.md) for documentation on sending packets.

See [./pkt-router.md](./pkt-router.md) for documentation on packet routing and handlers.

See [./pkt-sub.md](./pkt-sub.md) for documentation on subscribing and unsubscribing from topics, and packet routing handlers.

See [./pkt-conn.md](./pkt-conn.md) for documentation on `connect()`, `disconnect()`, `auth()`, and `ping()` methods.


### More client details

See [./client-more.md](./client-more.md) for more information on utility, advanced, extension, and internal APIs.

