#### Routing and Handling Packets

[regexparam]: https://github.com/lukeed/regexparam#readme 
[expressjs]: https://github.com/expressjs/express#readme

Route topic handlers like [expressjs][] routes.

  * Static (`/foo`, `/foo/bar`)
  * Parameter (`/:title`, `/books/:title`, `/books/:genre/:title`)
  * Parameter w/ Suffix (`/movies/:title.mp4`, `/movies/:title.(mp4|mov)`)
  * Optional Parameters (`/:title?`, `/books/:title?`, `/books/:genre/:title?`)
  * Wildcards (`*`, `/books/*`, `/books/:genre/*`)

See [regexparam][] for routing rule details for `topic_route`.


* `mqtt.on_topic(topic_route, [priority=false,] handler)` -- alias for `mqtt.router.add`

* `mqtt.subscribe_topic(topic_route, [ex={qos:0},] handler)`

  Alias for:

  ```javascript
  mqtt.on_topic(topic_route, true, handler);
  mqtt.subscribe([[topic_route]], ex);
  ```

* `mqtt.sub_topic` -- alias for `mqtt.subscribe_topic`


#### Packet Router

Uses [regexparam][] for path matching routing dispatch.

* `mqtt.router.add(topic_route, [priority=false,], handler)`

  The `handler(pkt, params, ctx)` passes the matched `params` along with the `pkt` and `ctx`

  If `handler` is `false`, an ignore handler is used that sets `ctx.done = true`. Useful for skipping messages to self-messages on the pubsub party line.

* `mqtt.router.find(topic)` returns an iterable of matching `[handler, route_params]` for the topic.

* `mqtt.router.invoke(pkt)` uses `.find(pkt.topic)` to dispatch publish packets to `topic_route` handlers.

  Hanlders are invoked in registration order with priority handlers first.
  If the `handler(pkt, params, ctx)` sets `ctx.done` to a truthy value,
  remaining handlers are skipped.

  Automatically sends `puback` response packet when `pkt.qos === 1` if no exceptions are thrown.

See [`_router.jsy`](../code/_router.jsy) for details.
See `mqtt._init_router` and `mqtt._init_dispatch` for client integration.

