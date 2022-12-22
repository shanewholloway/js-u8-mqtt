function encode_varint(n, a=[]) {
  do {
    const ni = n & 0x7f;
    n >>>= 7;
    a.push( ni | (0===n ? 0 : 0x80) );
  } while (n > 0)
  return a
}


/*
export function decode_varint_loop(u8, i=0) {
  let i0 = i
  let shift = 0, n = (u8[i] & 0x7f)
  while ( 0x80 & u8[i++] )
    n |= (u8[i] & 0x7f) << (shift += 7)

  return [n, i, i0]
}
*/


function decode_varint(u8, i=0) {
  let i0 = i;
  // unrolled for a max of 4 chains
  let n = (u8[i] & 0x7f) <<  0;
  if ( 0x80 & u8[i++] ) {
    n |= (u8[i] & 0x7f) <<  7;
    if ( 0x80 & u8[i++] ) {
      n |= (u8[i] & 0x7f) << 14;
      if ( 0x80 & u8[i++] ) {
        n |= (u8[i] & 0x7f) << 21;
      }
    }
  }
  return [n, i, i0]
}

function _mqtt_raw_pkt_dispatch(decode_raw_pkt) {
  let u8 = new Uint8Array(0);
  return u8_buf => {
    u8 = 0 === u8.byteLength
      ? u8_buf : _u8_join(u8, u8_buf);

    const res = [];
    while (1) {
      const [len_body, len_vh] = decode_varint(u8, 1);
      const len_pkt = len_body + len_vh;

      if ( u8.byteLength < len_pkt )
        return res

      let b0 = u8[0];
      let u8_body = 0 === len_body ? null
        : u8.subarray(len_vh, len_pkt);

      u8 = u8.subarray(len_pkt);

      const pkt = decode_raw_pkt(b0, u8_body);
      if (undefined !== pkt && null !== pkt)
        res.push( pkt );
    }
  }
}

function _u8_join(a, b) {
  const alen = a.byteLength;
  const r = new Uint8Array(alen + b.byteLength);
  r.set(a, 0);
  r.set(b, alen);
  return r
}

const mqtt_props = new Map(); 

{
  const entries = [
    [ 0x01, 'u8',   'payload_format_indicator'],
    [ 0x02, 'u32',  'message_expiry_interval'],
    [ 0x03, 'utf8', 'content_type'],
    [ 0x08, 'utf8', 'response_topic'],
    [ 0x09, 'bin',  'correlation_data'],
    [ 0x0B, 'vint', 'subscription_identifier'],
    [ 0x11, 'u32',  'session_expiry_interval'],
    [ 0x12, 'utf8', 'assigned_client_identifier'],
    [ 0x13, 'u16',  'server_keep_alive'],
    [ 0x15, 'utf8', 'authentication_method'],
    [ 0x16, 'bin',  'authentication_data'],
    [ 0x17, 'u8',   'request_problem_information'],
    [ 0x18, 'u32',  'will_delay_interval'],
    [ 0x19, 'u8',   'request_response_information'],
    [ 0x1A, 'utf8', 'response_information'],
    [ 0x1C, 'utf8', 'server_reference'],
    [ 0x1F, 'utf8', 'reason_string'],
    [ 0x21, 'u16',  'receive_maximum'],
    [ 0x22, 'u16',  'topic_alias_maximum'],
    [ 0x23, 'u16',  'topic_alias'],
    [ 0x24, 'u8',   'maximum_qo_s'],
    [ 0x25, 'u8',   'retain_available'],
    [ 0x26, 'pair', 'user_properties', true],
    [ 0x27, 'u32',  'maximum_packet_size'],
    [ 0x28, 'u8',   'wildcard_subscription_available'],
    [ 0x29, 'u8',   'subscription_identifiers_available', true],
    [ 0x2A, 'u8',   'shared_subscription_available'],
  ];

  for (const [id, type, name, plural] of entries) {
    const prop_obj = {id, type, name};
    if (plural) prop_obj.plural = plural;
    mqtt_props.set(prop_obj.id, prop_obj);
    mqtt_props.set(prop_obj.name, prop_obj);
  }
}

const as_utf8 = u8 =>
  new TextDecoder('utf-8').decode(u8);

const step_from = idx =>
  (width, r) => ( r = idx, idx += width, r );

class mqtt_type_reader {
  constructor(buf, idx=0) {
    this.buf = buf;
    this.step = step_from(idx);
  }

  _fork(buf, idx) {
    return { __proto__: this, buf, step: step_from(idx) }
  }

  has_more() {
    const {buf, step} = this;
    return buf.byteLength > step(0)
  }

  u8() {
    const {buf, step} = this;
    return buf[step(1)]
  }

  u16() {
    const {buf, step} = this;
    const i = step(2);
    return (buf[i]<<8) | buf[i+1]
  }

  u32() {
    const {buf, step} = this;
    const i = step(4);
    return (buf[i]<<24) | (buf[i+1]<<16) | (buf[i+2]<<8) | buf[i+3]
  }

  vint() {
    const {buf, step} = this;
    const [n, vi, vi0] = decode_varint(buf, step(0));
    step(vi - vi0);
    return n
  }

  vbuf() {
    const {buf, step} = this;
    const [n, vi, vi0] = decode_varint(buf, step(0));
    step(n + vi - vi0);
    return 0 === n ? null
      : buf.subarray(vi, step(0))
  }

  bin() {
    const {buf, step} = this;
    const i = step(2);
    const len = (buf[i]<<8) | buf[i+1];
    const i0 = step(len);
    return buf.subarray(i0, i0+len)
  }

  utf8() { return as_utf8(this.bin()) }
  pair() { return [ as_utf8(this.bin()), as_utf8(this.bin()) ] }

  u8_flags(FlagsType) {
    const {buf, step} = this;
    return new FlagsType(buf[step(1)])
  }

  u8_reason(fn_reason) {
    const {buf, step} = this;
    return fn_reason( buf[step(1)] )
  }

  flush() {
    const {buf, step} = this;
    this.step = this.buf = null;
    return buf.subarray(step(0))
  }

  props() {
    let sub = this.vbuf();
    return null === sub ? null
      : this._fork(sub, 0)._read_props([])
  }

  _read_props(lst) {
    while (this.has_more()) {
      let k = this.u8();
      let p = mqtt_props.get( k );
      let v = this[p.type]();
      lst.push([p.name, v]);
    }
    return lst
  }
}



class U8_Reason extends Number {
  constructor(u8, reason) { super(u8); this.reason = reason; }
}

function bind_reason_lookup(reason_entries) {
  const reason_map = new Map();
  for (const [u8, reason] of reason_entries)
    reason_map.set( u8, new U8_Reason(u8, reason) );

  return reason_map.get.bind(reason_map)
}

function mqtt_decode_connack(ns) {
  class _connack_flags_ extends Number {
    get session_present() { return this & 0x01 !== 0 }
  }

  const _connack_reason_ = bind_reason_lookup([
    // MQTT 3.1.1
    [ 0x00, 'Success'],
    [ 0x01, 'Connection refused, unacceptable protocol version'],
    [ 0x02, 'Connection refused, identifier rejected'],
    [ 0x03, 'Connection refused, server unavailable'],
    [ 0x04, 'Connection refused, bad user name or password'],
    [ 0x05, 'Connection refused, not authorized'],

    // MQTT 5.0
    [ 0x81, 'Malformed Packet'],
    [ 0x82, 'Protocol Error'],
    [ 0x83, 'Implementation specific error'],
    [ 0x84, 'Unsupported Protocol Version'],
    [ 0x85, 'Client Identifier not valid'],
    [ 0x86, 'Bad User Name or Password'],
    [ 0x87, 'Not authorized'],
    [ 0x88, 'Server unavailable'],
    [ 0x89, 'Server busy'],
    [ 0x8A, 'Banned'],
    [ 0x8C, 'Bad authentication method'],
    [ 0x90, 'Topic Name invalid'],
    [ 0x95, 'Packet too large'],
    [ 0x97, 'Quota exceeded'],
    [ 0x99, 'Payload format invalid'],
    [ 0x9A, 'Retain not supported'],
    [ 0x9B, 'QoS not supported'],
    [ 0x9C, 'Use another server'],
    [ 0x9D, 'Server moved'],
    [ 0x9F, 'Connection rate exceeded'],
  ]);


  return ns[0x2] = (pkt, u8_body) => {
    const rdr = new mqtt_type_reader(u8_body, 0);

    pkt.flags =
      rdr.u8_flags(_connack_flags_);

    pkt.reason = rdr.u8_reason(_connack_reason_);
    if (5 <= pkt.mqtt_level)
      pkt.props = rdr.props();
    return pkt }
}

function mqtt_decode_publish(ns) {
  return ns[0x3] = (pkt, u8_body) => {
    const {hdr} = pkt;
    pkt.dup = Boolean(hdr & 0x8);
    pkt.retain = Boolean(hdr & 0x1);
    const qos = pkt.qos = (hdr>>1) & 0x3;

    const rdr = new mqtt_type_reader(u8_body, 0);
    pkt.topic = rdr.utf8();
    if (0 !== qos)
      pkt.pkt_id = rdr.u16();

    if (5 <= pkt.mqtt_level)
      pkt.props = rdr.props();

    pkt.payload = rdr.flush();
    return pkt }
}

function mqtt_decode_puback(ns) {
  const _puback_reason_ = bind_reason_lookup([
    [ 0x00, 'Success'],

    // MQTT 5.0
    [ 0x10, 'No matching subscribers'],
    [ 0x80, 'Unspecified error'],
    [ 0x83, 'Implementation specific error'],
    [ 0x87, 'Not authorized'],
    [ 0x90, 'Topic Name invalid'],
    [ 0x91, 'Packet identifier in use'],
    [ 0x97, 'Quota exceeded'],
    [ 0x99, 'Payload format invalid'],
  ]);


  return ns[0x4] = (pkt, u8_body) => {
    const rdr = new mqtt_type_reader(u8_body, 0);

    pkt.pkt_id = rdr.u16();
    if (5 <= pkt.mqtt_level) {
      pkt.reason = rdr.u8_reason(_puback_reason_);
      pkt.props = rdr.props();
    }

    return pkt }
}

function mqtt_decode_pubxxx(ns) {
  const _pubxxx_reason_ = bind_reason_lookup([
    [ 0x00, 'Success' ],
    [ 0x92, 'Packet Identifier not found' ],
  ]);

  return ns[0x5] = ns[0x6] = ns[0x7] = (pkt, u8_body) => {
    const rdr = new mqtt_type_reader(u8_body, 0);

    pkt.pkt_id = rdr.u16();
    pkt.reason = rdr.u8_reason(_pubxxx_reason_);
    if (5 <= pkt.mqtt_level)
      pkt.props = rdr.props();
    return pkt }
}

function _mqtt_decode_suback(_ack_reason_) {
  return (pkt, u8_body) => {
    const rdr = new mqtt_type_reader(u8_body, 0);

    pkt.pkt_id = rdr.u16();
    if (5 <= pkt.mqtt_level)
      pkt.props = rdr.props();

    const answers = pkt.answers = [];
    while (rdr.has_more())
      answers.push(
        rdr.u8_reason(_ack_reason_) );

    return pkt }
}

function mqtt_decode_suback(ns) {
  const _suback_reason_ = bind_reason_lookup([
    // MQTT 3.1.1
    [ 0x00, 'Granted QoS 0'],
    [ 0x01, 'Granted QoS 1'],
    [ 0x02, 'Granted QoS 2'],

    // MQTT 5.0
    [ 0x80, 'Unspecified error'],
    [ 0x83, 'Implementation specific error'],
    [ 0x87, 'Not authorized'],
    [ 0x8F, 'Topic Filter invalid'],
    [ 0x91, 'Packet Identifier in use'],
    [ 0x97, 'Quota exceeded'],
    [ 0x9E, 'Shared Subscriptions not supported'],
    [ 0xA1, 'Subscription Identifiers not supported'],
    [ 0xA2, 'Wildcard Subscriptions not supported'],
  ]);

  return ns[0x9] = _mqtt_decode_suback(_suback_reason_)
}

function mqtt_decode_unsuback(ns) {
  const _unsuback_reason_ = bind_reason_lookup([
    [ 0x00, 'Success'],
    [ 0x11, 'No subscription existed'],
    [ 0x80, 'Unspecified error'],
    [ 0x83, 'Implementation specific error'],
    [ 0x87, 'Not authorized'],
    [ 0x8F, 'Topic Filter invalid'],
    [ 0x91, 'Packet Identifier in use'],
  ]);

  return ns[0xb] = _mqtt_decode_suback(_unsuback_reason_)
}

function mqtt_decode_pingxxx(ns) {
  return ns[0xc] = ns[0xd] = pkt => pkt
}

function mqtt_decode_disconnect(ns) {
  const _disconnect_reason_ = bind_reason_lookup([
    // MQTT 5.0
    [ 0x00, 'Normal disconnection'],
    [ 0x04, 'Disconnect with Will Message'],
    [ 0x80, 'Unspecified error'],
    [ 0x81, 'Malformed Packet'],
    [ 0x82, 'Protocol Error'],
    [ 0x83, 'Implementation specific error'],
    [ 0x87, 'Not authorized'],
    [ 0x89, 'Server busy'],
    [ 0x8B, 'Server shutting down'],
    [ 0x8D, 'Keep Alive timeout'],
    [ 0x8E, 'Session taken over'],
    [ 0x8F, 'Topic Filter invalid'],
    [ 0x90, 'Topic Name invalid'],
    [ 0x93, 'Receive Maximum exceeded'],
    [ 0x94, 'Topic Alias invalid'],
    [ 0x95, 'Packet too large'],
    [ 0x96, 'Message rate too high'],
    [ 0x97, 'Quota exceeded'],
    [ 0x98, 'Administrative action'],
    [ 0x99, 'Payload format invalid'],
    [ 0x9A, 'Retain not supported'],
    [ 0x9B, 'QoS not supported'],
    [ 0x9C, 'Use another server'],
    [ 0x9D, 'Server moved'],
    [ 0x9E, 'Shared Subscriptions not supported'],
    [ 0x9F, 'Connection rate exceeded'],
    [ 0xA0, 'Maximum connect time'],
    [ 0xA1, 'Subscription Identifiers not supported'],
    [ 0xA2, 'Wildcard Subscriptions not supported'],
  ]);


  return ns[0xe] = (pkt, u8_body) => {
    if (u8_body && 5 <= pkt.mqtt_level) {
      const rdr = new mqtt_type_reader(u8_body, 0);
      pkt.reason = rdr.u8_reason(_disconnect_reason_);
      pkt.props = rdr.props();
    }
    return pkt }
}

function mqtt_decode_auth(ns) {
  const _auth_reason_ = bind_reason_lookup([
    // MQTT 5.0
    [ 0x00, 'Success' ],
    [ 0x18, 'Continue authentication' ],
    [ 0x19, 'Re-authenticate' ],
  ]);

  return ns[0xf] = (pkt, u8_body) => {
    if ( 5 <= pkt.mqtt_level ) {
      const rdr = new mqtt_type_reader(u8_body, 0);
      pkt.reason = rdr.u8_reason(_auth_reason_);
      pkt.props = rdr.props();
    }
    return pkt }
}

function mqtt_pkt_writer_pool() {
  const _pool_ = [];
  return host =>
    0 === _pool_.length
      ? mqtt_pkt_writer(host, _pool_)
      : _pool_.pop()(host)
}

function mqtt_pkt_writer(host, _pool_) {
  // avoid GCing push/pull when they can be reused
  let n=0, rope=[];
  return install(host)

  function install(_host) {
    host = _host;
    host.push = push;
    host.pack = pack;
  }

  function push(u8) {
    rope.push(u8);
    n += u8.length;
  }

  function pack(hdr) {
    host = host.push = host.pack = null;

    const res = _mqtt_pkt_rope(hdr, n, rope);
    n=0; rope=[];
    if (undefined !== _pool_)
      _pool_.push(install);

    return res
  }
}


function _mqtt_pkt_rope(hdr, n, rope) {
  const header = encode_varint(n, hdr);
  let i = header.length;

  const pkt = new Uint8Array(n + i);
  pkt.set(header, 0);
  for (const vec of rope) {
    pkt.set(vec, i);
    i += vec.length;
  }
  return pkt
}

const _is_array = Array.isArray;
const pack_utf8 = v => new TextEncoder('utf-8').encode(v);
const pack_u16 = v => [ (v>>>8) & 0xff, v & 0xff ];
const pack_u32 = v => [ (v>>>24) & 0xff, (v>>>16) & 0xff, (v>>>8) & 0xff, v & 0xff ];

class mqtt_type_writer {
  constructor() {
    this._pkt_writer(this);
  }

  as_pkt(hdr) { return this.pack([hdr]) }

  u8(v) { this.push([ v & 0xff ]);}
  u16(v) { this.push( pack_u16(v) );}
  u32(v) { this.push( pack_u32(v) );}
  vint(v) { this.push( encode_varint(v) );}

  _u16_bin(u8_buf) {
    const {push} = this;
    push( pack_u16( u8_buf.byteLength ));
    push( u8_buf );
  }

  flush(buf) {
    if (null != buf)
      this.push(
        'string' === typeof buf
          ? pack_utf8(buf) : buf );

    this.push = false;
  }

  bin(u8_buf) {
    if (! u8_buf) return this.u16(0)
    if ('string' === typeof u8_buf)
      return this.utf8(u8_buf)

    if (u8_buf.length !== u8_buf.byteLength)
      u8_buf = new Uint8Array(u8_buf);
    this._u16_bin(u8_buf);
  }

  utf8(v) { this._u16_bin( new TextEncoder('utf-8').encode(v) ); }

  pair(k,v) {
    this.utf8(k);
    this.utf8(v);
  }

  u8_flags(v, enc_flags, b0=0) {
    if (undefined !== v && isNaN(+v))
      v = enc_flags(v, 0);

    v |= b0;
    this.push([v]);
    return v
  }

  u8_reason(v) { this.push([v | 0]); }

  props(props) {
    if (! props)
      return this.u8(0)

    if (! _is_array(props))
      props = props.entries
        ? Array.from(props.entries())
        : Object.entries(props);

    if (0 === props.length)
      return this.u8(0)

    const wrt = this._fork();
    for (const [name, value] of props) {
      const {id, type} = mqtt_props.get(name);
      wrt.u8(id);
      wrt[type](value);
    }

    this.push(wrt.pack([]));
  }

  _fork() {
    let self = { __proto__: this };
    this._pkt_writer(self);
    return self
  }
}

mqtt_type_writer.prototype._pkt_writer = 
  mqtt_pkt_writer_pool();

const _c_mqtt_proto = new Uint8Array([
  0, 4, 0x4d, 0x51, 0x54, 0x54 ]);

function mqtt_encode_connect(ns) {
  const _enc_flags_connect = flags => 0
      | ( flags.reserved ? 0x01 : 0 )
      | ( (flags.will_qos & 0x3) << 3 )
      | ( flags.clean_start ? 0x02 : 0 )
      | ( flags.will_flag ? 0x04 : 0 )
      | ( flags.will_retain ? 0x20 : 0 )
      | ( flags.password ? 0x40 : 0 )
      | ( flags.username ? 0x80 : 0 );

  const _enc_flags_will = will => 0x4
      | ( (will.qos & 0x3) << 3 )
      | ( will.retain ? 0x20 : 0 );

  return ns.connect = ( mqtt_level, pkt ) => {
    const wrt = new mqtt_type_writer();

    wrt.push(_c_mqtt_proto);
    wrt.u8( mqtt_level );

    const {will, username, password} = pkt;
    const flags = wrt.u8_flags(
      pkt.flags,
      _enc_flags_connect,
      0 | (username ? 0x80 : 0)
        | (password ? 0x40 : 0)
        | (will ? _enc_flags_will(will) : 0) );

    wrt.u16(pkt.keep_alive);

    if (5 <= mqtt_level)
      wrt.props(pkt.props);


    wrt.utf8(pkt.client_id);
    if (flags & 0x04) { // .will_flag
      if (5 <= mqtt_level)
        wrt.props(will.props);

      wrt.utf8(will.topic);
      wrt.bin(will.payload);
    }

    if (flags & 0x80) // .username
      wrt.utf8(username);

    if (flags & 0x40) // .password
      wrt.bin(password);

    return wrt.as_pkt(0x10)
  }
}

function mqtt_encode_publish(ns) {
  return ns.publish = ( mqtt_level, pkt ) => {
    const qos = (pkt.qos & 0x3) << 1;
    const wrt = new mqtt_type_writer();

    wrt.utf8(pkt.topic);
    if (0 !== qos)
      wrt.u16(pkt.pkt_id);

    if ( 5 <= mqtt_level) {
      wrt.props(pkt.props);
      wrt.flush(pkt.payload);
    } else {
      wrt.flush(pkt.payload);
    }

    return wrt.as_pkt(
      0x30 | qos | (pkt.dup ? 0x8 : 0) | (pkt.retain ? 0x1 : 0) )
  }
}

function mqtt_encode_puback(ns) {
  return ns.puback = ( mqtt_level, pkt ) => {
    const wrt = new mqtt_type_writer();

    wrt.u16(pkt.pkt_id);
    if (5 <= mqtt_level) {
      wrt.u8_reason(pkt.reason);
      wrt.props(pkt.props);
    }

    return wrt.as_pkt(0x40)
  }
}

function mqtt_encode_subscribe(ns) {
  const _enc_subscribe_flags = opts => 0
      | ( opts.qos & 0x3 )
      | ( opts.retain ? 0x4 : 0 )
      | ( (opts.retain_handling & 0x3) << 2 );

  return ns.subscribe = ( mqtt_level, pkt ) => {
    const wrt = new mqtt_type_writer();

    wrt.u16(pkt.pkt_id);
    if (5 <= mqtt_level)
      wrt.props(pkt.props);

    const f0 = _enc_subscribe_flags(pkt);
    for (const each of pkt.topics) {
      if ('string' === typeof each) {
        wrt.utf8(each);
        wrt.u8(f0);
      } else {
        let [topic, opts] =
          _is_array(each) ? each
            : [each.topic, each.opts];

        wrt.utf8(topic);
        if (undefined === opts) wrt.u8(f0);
        else wrt.u8_flags(opts, _enc_subscribe_flags);
      }
    }

    return wrt.as_pkt(0x82)
  }
}

function mqtt_encode_unsubscribe(ns) {
  return ns.unsubscribe = ( mqtt_level, pkt ) => {
    const wrt = new mqtt_type_writer();

    wrt.u16(pkt.pkt_id);
    if (5 <= mqtt_level)
      wrt.props(pkt.props);

    for (const topic of pkt.topics)
      wrt.utf8(topic);

    return wrt.as_pkt(0xa2)
  }
}

function mqtt_encode_pingxxx(ns) {
  ns.pingreq  = () => new Uint8Array([ 0xc0, 0 ]);
  ns.pingresp = () => new Uint8Array([ 0xd0, 0 ]);
}

function mqtt_encode_disconnect(ns) {
  return ns.disconnect = ( mqtt_level, pkt ) => {
    const wrt = new mqtt_type_writer();

    if (pkt && 5 <= mqtt_level) {
      if (pkt.reason || pkt.props) {
        wrt.u8_reason(pkt.reason);
        wrt.props(pkt.props);
      }
    }

    return wrt.as_pkt(0xe0)
  }
}

function mqtt_encode_auth(ns) {
  return ns.auth = ( mqtt_level, pkt ) => {
    if (5 > mqtt_level)
      throw new Error('Auth packets are only available after MQTT 5.x')

    const wrt = new mqtt_type_writer();

    wrt.u8_reason(pkt.reason);
    wrt.props(pkt.props);

    return wrt.as_pkt(0xf0)
  }
}


function _bind_mqtt_decode(lst_decode_ops) {
  const by_id = [];
  for (const op of lst_decode_ops) op(by_id);

  return _pkt_ctx_ => _mqtt_raw_pkt_dispatch(
    (b0, u8_body) => {
      const decode_pkt = by_id[b0>>>4] || by_id[0];
      if (undefined !== decode_pkt)
        return decode_pkt({__proto__: _pkt_ctx_, b0}, u8_body)
    })
}


function _bind_mqtt_encode(lst_encode_ops) {
  const by_type = {};
  for (const op of lst_encode_ops) op(by_type);

  return ({mqtt_level}) => (type, pkt) =>
      by_type[type]( mqtt_level, pkt )
}


const _pkt_types = ['reserved', 'connect', 'connack', 'publish', 'puback', 'pubrec', 'pubrel', 'pubcomp', 'subscribe', 'suback', 'unsubscribe', 'unsuback', 'pingreq', 'pingresp', 'disconnect', 'auth'];
const _bind_pkt_ctx = _pkt_ctx_ =>
  Object.defineProperties(_pkt_ctx_ || {}, {
    hdr:  {get() { return this.b0 & 0xf }},
    id:   {get() { return this.b0 >>> 4 }},
    type: {get() { return _pkt_types[this.b0 >>> 4] }},
  });

function _bind_mqtt_session_ctx(sess_decode, sess_encode, _pkt_ctx_) {
  sess_decode = _bind_mqtt_decode(sess_decode);
  sess_encode = _bind_mqtt_encode(sess_encode);
  _pkt_ctx_ = _bind_pkt_ctx(_pkt_ctx_);

  return mqtt_level => _base_ => {
    _base_ = _base_ || {__proto__: _pkt_ctx_, mqtt_level, get _base_() { return _base_ }};
    return [ sess_decode(_base_), sess_encode(_base_), _base_ ] }
}

function mqtt_session_ctx(mqtt_level) {
  let {ctx} = mqtt_session_ctx;
  if (undefined === ctx ) {
    let as_utf8 = u8 =>
      new TextDecoder('utf-8').decode(u8);

    let std_pkt_api = {
      utf8(u8) { return as_utf8( u8 || this.payload ) },
      json(u8) { return JSON.parse( this.utf8(u8) || null ) },
      text(u8) { return this.utf8(u8) },
    };

    mqtt_session_ctx.ctx = ctx =
      _bind_mqtt_session_ctx(
        [ // lst_decode_ops
          mqtt_decode_connack,
          mqtt_decode_disconnect,
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

        std_pkt_api );
  }

  return ctx(mqtt_level)
}

Object.freeze({ao_done: true});

function ao_defer_ctx(as_res = (...args) => args) {
  let y,n,_pset = (a,b) => { y=a, n=b; };
  return p =>(
    p = new Promise(_pset)
  , as_res(p, y, n)) }

const ao_defer_v = /* #__PURE__ */
  ao_defer_ctx();

Promise.resolve({type:'init'});

function _mqtt_conn(client, [on_mqtt, pkt_future]) {
  let _q_init = ao_defer_v(), _q_ready = ao_defer_v();
  let _send_ready = async (...args) => (await _q_ready[0])(...args);
  let _send_mqtt_pkt, _has_connected;
  client._send = _send_ready;

  return {
    async when_ready() {await _q_ready[0];}

  , ping: _ping_interval (() =>_send_mqtt_pkt?.('pingreq'))

  , reset(err) {
      if (! _send_mqtt_pkt) {return}

      if (err) {
        _q_init[2](err);}

      _send_mqtt_pkt = null;
      _q_init = ao_defer_v();
      client._send = _send_ready;

      // call client.on_conn_reset in next promise microtask
      client.conn_emit('on_disconnect', false===err, err);}

  , async send_connect(... args) {
      if (! _send_mqtt_pkt) {
        await _q_init[0]; }// _send_mqtt_pkt is set before fulfilled

      // await connack response
      let res = await _send_mqtt_pkt(...args);
      if (0 == res[0].reason) {
        _has_connected = true;
        // resolve _q_ready[0] with _send_mqtt_pkt closure
        _q_ready[1](client._send = _send_mqtt_pkt);
        _q_ready = ao_defer_v();
        client.conn_emit('on_ready', _has_connected);}

      return res}

  , is_set: (() =>!! _send_mqtt_pkt)
  , set([mqtt_decode, mqtt_encode], send_u8_pkt) {
      if (_send_mqtt_pkt) {
        throw new Error('Already connected')}

      let mqtt_ctx = {mqtt: client};
      let on_mqtt_chunk = u8_buf =>
        on_mqtt(mqtt_decode(u8_buf), mqtt_ctx);

      _send_mqtt_pkt = async (type, pkt, key) => {
        let res = undefined !== key
          ? pkt_future(key) : true;

        await send_u8_pkt(
          mqtt_encode(type, pkt));

        return res};

      _q_init[1](_send_mqtt_pkt); // resolve _q_init with _send_mqtt_pkt closure

      // call client.on_live in next promise microtask
      client.conn_emit('on_live', _has_connected);
      return on_mqtt_chunk} } }


function _ping_interval(send_ping) {
  let tid;
  return (( td ) => {
    tid = clearInterval(tid);
    if (td) {
      tid = setInterval(send_ping, 1000 * td);
      


      
      // ensure the interval allows the NodeJS event loop to exit
      tid.unref?.();
      return true} }) }

function parse(str, loose) {
	if (str instanceof RegExp) return { keys:false, pattern:str };
	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
	arr[0] || arr.shift();

	while (tmp = arr.shift()) {
		c = tmp[0];
		if (c === '*') {
			keys.push('wild');
			pattern += '/(.*)';
		} else if (c === ':') {
			o = tmp.indexOf('?', 1);
			ext = tmp.indexOf('.', 1);
			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
		} else {
			pattern += '/' + tmp;
		}
	}

	return {
		keys: keys,
		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
	};
}

// Use [regexparam][] for url-like topic parsing

function _ignore(pkt, params, ctx) {ctx.done = true;}

function _mqtt_topic_router() {
  let pri_lsts = [[],[]], rm = Symbol();
  let find = topic => _mqtt_routes_iter(pri_lsts, topic);

  return {find,

    add(topic_route, ...args) {
      let fn = args.pop();
      let priority = args.pop();

      if ('function' !== typeof fn) {
        if (false === fn) {
          fn = _ignore;}
        else throw new TypeError()}

      let rte = parse(
        topic_route.replace(/[+#]$/, '*'));

      rte.key = topic_route;
      rte.tgt = fn;
      pri_lsts[priority ? 0 : 1].push(rte);
      return this}

  , remove(topic_route, priority) {
      let lst = pri_lsts[priority ? 0 : 1];
      return _mqtt_route_remove([lst], topic_route)}

  , clear(priority) {
      pri_lsts[priority ? 0 : 1] = [];
      if (null == priority) {
        pri_lsts[1] = [];} }

  , async invoke(pkt, ctx) {
      ctx.idx = 0;
      ctx.rm = rm;

      for (let [fn, params] of find(pkt.topic)) {
        let res = await fn(pkt, params, ctx);

        if (rm === res) {
          _mqtt_route_remove(pri_lsts, fn);}

        if (ctx.done) {
          break}
        else ctx.idx++;}

      let {pkt_id, qos} = pkt;
      if (1 === qos) {
        await ctx.mqtt._send('puback', {pkt_id});} } } }


function * _mqtt_routes_iter(all_route_lists, topic) {
  for (let route_list of all_route_lists) {
    for (let route of route_list) {
      let res = _mqtt_route_match_one(topic, route);
      if (undefined !== res) {
        yield res;} } } }


function _mqtt_route_match_one(topic, {keys, pattern, tgt}) {
  let match = '/' !== topic[0]
    ? pattern.exec('/'+topic)
    : pattern.exec(topic);

  if (null === match) {
    return}

  if (false === keys) {
    let {groups} = match;
    if (! groups) {
      return [tgt]}

    let params = {};
    for (let k in groups) {
      params[k] = groups[k];}

    return [tgt, params]}

  if (0 === keys.length) {
    return [tgt]}

  let params = {};
  for (let i=0; i<keys.length; i++) {
    params[ keys[i] ] = match[1+i];}
  return [tgt, params]}


function _mqtt_route_remove(all_route_lists, query) {
  let match = route => route===query || route.tgt===query || route.key===query;
  for (let lst of all_route_lists) {
    let i = lst.findIndex(match);
    if (0 <= i) {return !! lst.splice(i,1)} }
  return false}

const _mqtt_cmdid_dispatch ={
  create(target) {
    return {__proto__: this, target, hashbelt: [new Map()]} }

, bind_pkt_future(_pkt_id=100) {
    let {hashbelt} = this;

    let _tmp_; // use _tmp_ to reuse _by_key closure
    let _by_key = answer_monad =>
      hashbelt[0].set(_tmp_, answer_monad);

    return (( pkt_or_key ) => {
      if ('string' === typeof pkt_or_key) {
        _tmp_ = pkt_or_key;}
      else {
        _pkt_id = (_pkt_id + 1) & 0xffff;
        _tmp_ = pkt_or_key.pkt_id = _pkt_id;}

      return new Promise(_by_key)}) }

, answer(key, pkt) {
    for (let map of this.hashbelt) {
      let answer_monad = map.get(key);
      if (undefined !== answer_monad) {
        map.delete(key);

        answer_monad([pkt, /*err*/]); // option/maybe monad
        return true} }
    return false}

, rotate_belt(n) {
    let {hashbelt} = this;
    hashbelt.unshift(new Map());
    for (let old of hashbelt.splice(n || 5)) {
      for (let answer_monad of old.values()) {
        answer_monad([/*pkt*/, 'expired']); } } }// option/maybe monad

, cmdids: ((() => {
    return [
      (() =>{}    )// 0x0 reserved
    , by_evt   // 0x1 connect
    , by_type  // 0x2 connack
    , by_evt   // 0x3 publish
    , by_id    // 0x4 puback
    , by_id    // 0x5 pubrec
    , by_id    // 0x6 pubrel
    , by_id    // 0x7 pubcomp
    , by_evt   // 0x8 subscribe
    , by_id    // 0x9 suback
    , by_evt   // 0xa unsubscribe
    , by_id    // 0xb unsuback
    , by_type  // 0xc pingreq
    , by_type  // 0xd pingresp
    , by_evt   // 0xe disconnect
    , by_type  ]// 0xf auth


    function by_id(disp, pkt) {
      disp.answer(pkt.pkt_id, pkt); }

    function by_type(disp, pkt, ctx) {
      disp.answer(pkt.type, pkt);
      by_evt(disp, pkt, ctx);}

    async function by_evt({target}, pkt, ctx) {
      let fn = target[`mqtt_${pkt.type}`]
        || target.mqtt_pkt;

      if (undefined !== fn) {
        await fn.call(target, pkt, ctx);} } })()) };

function _mqtt_dispatch(opt, target) {
  let _disp_ = _mqtt_cmdid_dispatch.create(target);
  let { cmdids } = _disp_;

  // default rotate at 1s across 5 buckets
  let { td: rotate_td=1000, n: rotate_n=5 } =
    opt && opt.rotate || {};

  let rotate_ts = rotate_td + Date.now();

  return [on_mqtt,
    _disp_.bind_pkt_future()]

  function on_mqtt(pkt_list, ctx) {
    for (let pkt of pkt_list) {
      cmdids[pkt.id](_disp_, pkt, ctx); }

    if (Date.now() > rotate_ts) {
      _disp_.rotate_belt(rotate_n);
      rotate_ts = rotate_td + Date.now();} } }

class MQTTError extends Error {
  constructor(mqtt_pkt, reason=mqtt_pkt.reason) {
    super(`[0x${reason.toString(16)}] ${reason.reason}`);
    this.mqtt_pkt = mqtt_pkt;
    this.reason = reason;} }

class MQTTBaseClient {
  constructor(opt={}) {
    this._conn_ = _mqtt_conn(this,
      this._init_dispatch(opt, this)); }

  async conn_emit(evt, arg, err_arg) {
    try {
      let fn_evt = this[await evt]; // microtask break
      if (fn_evt) {
        await fn_evt.call(this, this, arg, err_arg);}
      else if (err_arg) {
        await this.on_error(err_arg, evt);} }
    catch (err) {
      this.on_error(err, evt);} }

  on_error(err, err_path) {
    console.warn('[[u8-mqtt error: %s]]', err_path, err); }

  // Handshaking Packets

  async connect(pkt={}) {
    let cid = pkt.client_id || ['u8-mqtt--', ''];
    if (Array.isArray(cid)) {
      pkt.client_id = cid = this.init_client_id(cid);}
    this.client_id = cid;

    if (null == pkt.keep_alive) {
      pkt.keep_alive = 60;}

    let res = await this._conn_
      .send_connect('connect', pkt, 'connack');

    if (0 != res[0].reason) {
      throw new this.MQTTError(res[0])}

    // TODO: merge with server's keep_alive frequency
    this._conn_.ping(pkt.keep_alive);
    return res}

  async disconnect(pkt={}) {
    let res = await this._send('disconnect', pkt);
    this._conn_.reset(false);
    return res}

  auth(pkt={}) {
    return this._send('auth', pkt, 'auth')}

  ping() {return this._send('pingreq', null, 'pingresp')}


  // alias: sub
  subscribe(pkt, ex) {
    pkt = _as_topics(pkt, ex);
    return this._send('subscribe', pkt, pkt)}
  _sub_chain(topic, ex) {
    let res = this.subscribe([[ topic ]], ex);
    let subs = this.subs ||(this.subs = new Map());
    subs.set((res.topic = topic), (subs.last = res));
    return this }// fluent api -- return this and track side effects

  // alias: unsub
  unsubscribe(pkt, ex) {
    pkt = _as_topics(pkt, ex);
    return this._send('unsubscribe', pkt, pkt)}

  get on_topic() {return this.router.add}

  // alias: sub_topic
  subscribe_topic(topic_route, ...args) {
    this.router.add(topic_route, true, args.pop() );// handler
    let topic = this.topic_for(topic_route);
    return this._sub_chain(topic, args.pop() ) }// ex

  // alias: unsub_topic
  unsubscribe_topic(topic_route) {
    this.router.remove(topic_route, true);
    let topic = this.topic_for(topic_route);
    return this.unsubscribe([[ topic ]]) }

  // alias: shared_sub
  shared_subscribe(group, topic_route, ...args) {
    this.router.add(topic_route, true, args.pop() );// handler
    let topic = this.topic_for(topic_route);
    if (null != group) {
      topic = `$share/${group}/${topic}`;}
    return this._sub_chain(topic, args.pop() ) }// ex

  // alias: shared_unsub
  shared_unsubscribe(group, topic_route) {
    this.router.remove(topic_route, true);
    let topic = this.topic_for(topic_route);
    if (null != group) {
      topic = `$share/${group}/${topic}`;}
    return this.unsubscribe([[ topic ]]) }

  topic_for(topic_route) {
    return topic_route.replace(/[:*].*$/, '#')}


  // alias: pub
  publish(pkt, pub_opt) {return _pub(this, pkt, pub_opt)}
  post(topic, payload, pub_opt) {return _pub.m(this, topic, payload, pub_opt)}
  send(topic, payload, pub_opt) {return _pub.mq(this, topic, payload, pub_opt)}
  store(topic, payload, pub_opt) {return _pub.mqr(this, topic, payload, pub_opt)}

  json_post(topic, msg, pub_opt) {return _pub.o(this, topic, msg, pub_opt)}
  json_send(topic, msg, pub_opt) {return _pub.oq(this, topic, msg, pub_opt)}
  json_store(topic, msg, pub_opt) {return _pub.oqr(this, topic, msg, pub_opt)}

  obj_post(topic, msg, pub_opt) {return _pub.o(this, topic, msg, pub_opt)}
  obj_send(topic, msg, pub_opt) {return _pub.oq(this, topic, msg, pub_opt)}
  obj_store(topic, msg, pub_opt) {return _pub.oqr(this, topic, msg, pub_opt)}



  // Utility Methods

  init_client_id(parts) {
    let cid = this.client_id;

    if (undefined === cid) {
      this.client_id = cid = (
        
        this.sess_client_id(parts)
        

        );}

    return cid}

  new_client_id(parts) {
    return [parts[0], Math.random().toString(36).slice(2), parts[1]].join('')}

  
  sess_client_id(parts) {
    let key = parts.join('\x20');
    let cid = sessionStorage.getItem(key);
    if (null == cid) {
      cid = this.new_client_id(parts);
      sessionStorage.setItem(key, cid);}
    return cid}


  // Internal API

  /* async _send(type, pkt) -- provided by _conn_ and transport */

  _init_router(opt) {
    return this.router = _mqtt_topic_router()}

  _init_dispatch(opt) {
    let router = this._init_router(opt, this);

    let tgt ={
      __proto__: opt.on_mqtt_type || {}
    , router};

    if (! tgt.mqtt_publish) {
      tgt.mqtt_publish = router.invoke;}

    return _mqtt_dispatch(this, tgt)} }


 {
  let p = MQTTBaseClient.prototype;
  Object.assign(p,{
    MQTTError
  , pub: p.publish
  , sub: p.subscribe
  , unsub: p.unsubscribe
  , sub_topic: p.subscribe_topic
  , unsub_topic: p.unsubscribe_topic
  , shared_sub: p.shared_subscribe
  , shared_unsub: p.shared_unsubscribe} );

  /*
    p.on_mqtt_type = {
      mqtt_auth(pkt, ctx) ::
      mqtt_connect(pkt, ctx) ::
      mqtt_connack(pkt, ctx) ::
      mqtt_disconnect(pkt, ctx) ::

      mqtt_publish(pkt, ctx)
      mqtt_subscribe(pkt, ctx) ::
      mqtt_unsubscribe(pkt, ctx) ::

      mqtt_pingreq(pkt, ctx) ::
      mqtt_pingresp(pkt, ctx) ::
    }
  */}


function _as_topics(pkt, ex) {
  if ('string' === typeof pkt) {
    return {topics:[pkt], ... ex}}
  if (pkt[Symbol.iterator]) {
    return {topics:[... pkt], ... ex}}
  return ex ? {...pkt, ...ex} : pkt}


async function _pub(self, pkt, pub_opt) {
  if (undefined === pkt.payload) {
    if ('function' === typeof pub_opt) {
      pub_opt = {fn_encode: pub_opt};}

    let {msg} = pkt;
    switch (typeof msg) {
      case 'function':
        pub_opt = {...pub_opt, fn_encode: msg};
        // flow into 'undefined' case
      case 'undefined':
        // return a single-value closure to publish packets
        return v => _pub(self, {...pkt, [pkt.arg || 'payload']: v}, pub_opt)

      default:
        // Encode payload from msg; fn_encode allows alternative to JSON.stringify
        let {fn_encode} = pub_opt || {};
        pkt.payload = fn_encode
          ? await fn_encode(msg)
          : JSON.stringify(msg);} }

  if (pub_opt) {
    if (pub_opt.props) {
      pkt.props = pub_opt.props;}
    if (pub_opt.xform) {
      pkt = pub_opt.xform(pkt) || pkt;} }

  return self._send('publish', pkt,
    pkt.qos ? pkt : void 0 ) }// key

 {
  Object.assign(_pub,{
    m: (self, topic, payload, pub_opt) =>
      _pub(self, {topic, payload, qos:0}, pub_opt)
  , mq: (self, topic, payload, pub_opt) =>
      _pub(self, {topic, payload, qos:1}, pub_opt)
  , mqr: (self, topic, payload, pub_opt) =>
      _pub(self, {topic, payload, qos:1, retain: 1}, pub_opt)

  , o: (self, topic, msg, pub_opt) =>
      _pub(self, {topic, msg, arg: 'msg', qos:0}, pub_opt)
  , oq: (self, topic, msg, pub_opt) =>
      _pub(self, {topic, msg, arg: 'msg', qos:1}, pub_opt)
  , oqr: (self, topic, msg, pub_opt) =>
      _pub(self, {topic, msg, arg: 'msg', qos:1, retain: 1}, pub_opt)} ); }

class MQTTCoreClient extends MQTTBaseClient {
  static _with_session(mqtt_session) {
    this.prototype._mqtt_session = mqtt_session;}

  constructor(opt={}) {
    super(opt);
    this.with(opt);}

  with(fns_ns) {
    for (let [k,v] of Object.entries(fns_ns)) {
      if ('function' === typeof v) {this[k] = v;} }
    return this}

  log_conn(evt, arg, err_arg) {
    }//console.info @ '[[u8-mqtt log: %s]]', evt, arg, err_arg
  async conn_emit(evt, arg, err_arg) {
    this.log_conn(evt, arg, err_arg);
    return super.conn_emit(evt, arg, err_arg)}

  on_live(client, has_connected) {
    if (has_connected) {
      client.connect();} }
  with_live(on_live) {return this.with({on_live})}

  // on_reconnect(client) ::
  with_reconnect(on_reconnect) {return this.with({on_reconnect})}

  _use_conn(fn_reconnect) {
    return (this.reconnect = fn_reconnect)?.()}
  with_autoreconnect(opt=2000) {
    if (opt.toFixed) {opt ={delay: opt};}
    return this.with({
      on_reconnect() {
        this.delay(opt.delay || 2000)
          .then(this.reconnect)
          .then(opt.reconnect, opt.error);} }) }

  async on_disconnect(client, intentional) {
    if (! intentional && client.on_reconnect) {
      await client.on_reconnect();} }

  delay(ms) {
    return new Promise(done => setTimeout(done, ms)) }

  with_async_iter(async_iter, write_u8_pkt) {
    let on_mqtt_chunk = this._conn_.set(
      this._mqtt_session(),
      write_u8_pkt);

    this._msg_loop = ((async () => {
      try {
        async_iter = await async_iter;
        for await (let chunk of async_iter)
          on_mqtt_chunk(chunk);
        this._conn_.reset();}
      catch (err) {
        this._conn_.reset(err);} })());

    return this}


  















  









  










  with_websock(websock) {
    if (null == websock) {
      websock = 'ws://127.0.0.1:9001';}

    if (websock.send) {
      return this._with_websock(websock)}

    websock = new URL(websock);
    return this._use_conn (() =>
      this._with_websock(
        new WebSocket(websock, ['mqtt'])) ) }


  _with_websock(websock) {
    websock.binaryType = 'arraybuffer';

    let ready, {readyState} = websock;
    if (1 !== readyState) {
      if (0 !== readyState) {
        throw new Error('Invalid WebSocket readyState') }

      ready = new Promise(fn => websock.onopen = fn); }


    let {_conn_} = this;
    let on_mqtt_chunk = _conn_.set(
      this._mqtt_session(),
      async u8_pkt =>(
        await ready
      , websock.send(u8_pkt)) );

    websock.onmessage = evt =>(on_mqtt_chunk(new Uint8Array(evt.data)));
    websock.onclose = evt => {
      if (! evt.wasClean) {
        var err = new Error('websocket connection close');
        err.code = evt.code;
        err.reason = evt.reason;}

      _conn_.reset(err);};

    return this} }

class MQTTClient_v4 extends MQTTCoreClient {
  _mqtt_session() { return mqtt_session_ctx(4)() }
}

const mqtt_v4 = opt => new MQTTClient_v4(opt);

export { MQTTClient_v4 as MQTTClient, MQTTClient_v4, mqtt_v4 as default, mqtt_v4 as mqtt, mqtt_v4 };
//# sourceMappingURL=v4.mjs.map
