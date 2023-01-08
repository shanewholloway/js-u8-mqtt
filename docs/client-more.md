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

* `mqtt._send(type, pkt, key)` -- Encode and send an MQTT packet of `type`. See [`_conn.jsy`](../code/_conn.jsy) for details.

* `mqtt._init_router(opt)` -- Creates an express-like topic router. See [`_router.jsy`](../code/_router.jsy) for details.

* `mqtt._init_dispatch(opt)` -- Connects `opt.on_mqtt_type` with the publish packet topic-router. See [`_dispatch.jsy`](../code/_dispatch.jsy) for details.

