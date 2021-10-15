#### Publish Packets


* `mqtt.publish(pkt[, fn_encode])` -- Encode and send an MQTT publish packet. If `qos:1`, also handles `puback` protocol.
  * `mqtt.pub(pkt[, fn_encode])` -- alias for `mqtt.publish(pkt[, fn_encode])`

  Returns a `Promise<[puback pkt, error]>` in the style of an [Option / Maybe monad](https://en.wikipedia.org/wiki/Option_type).

  See [`u8-mqtt-packet/docs/mqtt_codec_publish.md`](https://github.com/shanewholloway/js-u8-mqtt-packet/blob/master/docs/mqtt_codec_publish.md) for MQTT packet encoding details

###### Routing and Handling Packets

See [./pkt-router.md][] for documentation on packet routing and handlers.


##### Semantic packets methods

* `mqtt.post(topic, payload)` -- alias for

    ```javascript
    mqtt.publish({qos: 0, topic, payload})
    ```

* `mqtt.send(topic, payload)` -- alias for

    ```javascript
    mqtt.publish({qos: 1, topic, payload})
    ```

* `mqtt.store(topic, payload)` -- alias for

    ```javascript
    mqtt.publish({qos: 1, retain: true, topic, payload})
    ```

* Returns closures without `msg` argument

  ```javascript

  let my_post = mqtt.post(topic)
  // returns optimized closure over `topic`; e.g.
  my_post = msg => mqtt.post(topic, msg)

  let my_send = mqtt.send(topic)
  // returns optimized closure over `topic`; e.g.
  my_send = msg => mqtt.send(topic, msg)

  let my_store = mqtt.store(topic)
  // returns optimized closure over `topic`; e.g.
  my_store = msg => mqtt.store(topic, msg)`

  ```


##### JSON Encoded packet methods

* `mqtt.json_post(topic, msg)` -- alias for

    ```javascript
    mqtt.publish({qos: 0, topic, payload: JSON.stringify(msg))
    ```

* `mqtt.json_send(topic, msg)` -- alias for

    ```javascript
    mqtt.publish({qos: 1, topic, payload: JSON.stringify(msg))
    ```

* `mqtt.json_store(topic, msg)` -- alias for

    ```javascript
    mqtt.publish({qos: 1, retain:true, topic, payload: JSON.stringify(msg))
    ```

* Returns closures without `msg` argument

  ```javascript

  let my_json_post = mqtt.json_post(topic)
  // returns optimized closure over `topic`; e.g.
  my_json_post = msg => mqtt.json_post(topic, msg)

  let my_json_send = mqtt.json_send(topic)
  // returns optimized closure over `topic`; e.g.
  my_json_send = msg => mqtt.json_send(topic, msg)

  let my_json_store = mqtt.json_store(topic)
  // returns optimized closure over `topic`; e.g.
  my_json_store = msg => mqtt.json_store(topic, msg)`

  ```

##### Other encoded packet methods

For use with codecs such as [MsgPack](https://msgpack.org) or [CBOR](http://cbor.io).
See [cbor-codec](https://github.com/shanewholloway/js-cbor-codec).


* `mqtt.obj_post(topic, msg, fn_encode)` -- alias for

    ```javascript
    mqtt.publish({qos: 0, topic, payload: JSON.stringify(msg))
    ```

* `mqtt.obj_send(topic, msg, fn_encode)` -- alias for

    ```javascript
    mqtt.publish({qos: 1, topic, payload: JSON.stringify(msg))
    ```

* `mqtt.obj_store(topic, msg, fn_encode)` -- alias for

    ```javascript
    mqtt.publish({qos: 1, retain:true, topic, payload: JSON.stringify(msg))`
    ```

* Returns closures without `msg` argument

  ```javascript

  let my_obj_post = mqtt.obj_post(topic, fn_encode)
  // returns optimized closure over `topic` and `fn_encode`; e.g.
  my_obj_post = msg => mqtt.obj_post(topic, msg, fn_encode)

  let my_obj_send = mqtt.obj_send(topic, fn_encode)
  // returns optimized closure over `topic` and `fn_encode`; e.g.
  my_obj_send = msg => mqtt.obj_send(topic, msg, fn_encode)

  let my_obj_store = mqtt.obj_store(topic, fn_encode)
  // returns optimized closure over `topic` and `fn_encode`; e.g.
  my_obj_store = msg => mqtt.obj_store(topic, msg, fn_encode)`

  ```

