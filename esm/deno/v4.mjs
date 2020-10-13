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

    const flags = pkt.flags =
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
    const as_utf8 = u8 =>
      new TextDecoder('utf-8').decode(u8);

    const std_pkt_api = {
      utf8(u8) { return as_utf8( u8 || this.payload ) },
      json(u8) { return JSON.parse( as_utf8( u8 || this.payload )) },
    };

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

        std_pkt_api );
  }

  return ctx(mqtt_level)
}

function _mqtt_conn(client, [on_mqtt, pkt_future]) {
  const q0 = _tiny_deferred_queue();
  const q = _tiny_deferred_queue();

  const _asy_send = async (...args) =>
    (await q)(...args);
  let _send = client._send = _asy_send;

  const _ping = () => client._send('pingreq');
  let tid_ping, _is_set = false;

  return {
    is_live: (() =>_asy_send !== _send)
  , is_set: (() =>_is_set)

  , reset() {
      tid_ping = clearInterval(tid_ping);
      client._send = _send = _asy_send;
      _is_set = false;

      // call client.on_reconnect in next promise microtask
      _async_evt(client, 'on_reconnect');}

  , ping(td) {
      tid_ping = clearInterval(tid_ping);
      if (td) {
        tid_ping = setInterval(_ping, 1000 * td);
        if (tid_ping.unref) {
          tid_ping.unref();} } }

  , async send_connect(... args) {
      if (_asy_send === _send) {
        _send = await q0;}

      // await connack response
      const res = await _send(...args);

      client._send = _send;
      q.notify(_send);
      return res}

  , set(mqtt_session, send_u8_pkt) {
      _is_set = true;

      const [mqtt_decode, mqtt_encode] = mqtt_session;

      const on_mqtt_chunk = u8_buf =>
        on_mqtt(
          mqtt_decode(u8_buf),
          {mqtt: client});

      _send = async (type, pkt, key) => {
        const res = undefined !== key
          ? pkt_future(key) : true;

        await send_u8_pkt(
          mqtt_encode(type, pkt));

        return res};


      q0.notify(_send);

      // call client.on_live in next promise microtask
      _async_evt(client, 'on_live');

      return on_mqtt_chunk} } }


async function _async_evt(obj, on_evt) {
  // microtask break
  obj[await on_evt](obj);
}
function _tiny_deferred_queue() {
  const q = []; // tiny resetting deferred queue
  q.then = y => { q.push(y); };
  q.notify = v => { for (const fn of q.splice(0,q.length)) fn(v); };
  return q
}

function _rxp_parse (str, loose) {
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
  const pri_lsts=[[],[]];
  const find = topic => _mqtt_routes_iter(pri_lsts, topic);

  return {find,

    add(topic_route, ...args) {
      let fn = args.pop();
      const priority = args.pop();

      if ('function' !== typeof fn) {
        if (false === fn) {
          fn = _ignore;}
        else throw new TypeError()}

      let rte = _rxp_parse(
        topic_route.replace(/[+#]$/, '*'));

      rte.tgt = fn;
      pri_lsts[priority ? 0 : 1].push(rte);
      return this}

  , async invoke(pkt, ctx) {
      ctx.idx = 0;

      for (const [fn, params] of find(pkt.topic)) {
        await fn(pkt, params, ctx);

        if (ctx.done) {
          break}
        else ctx.idx++;}

      const {pkt_id, qos} = pkt;
      if (1 === qos) {
        await ctx.mqtt._send('puback', {pkt_id});} } } }


function * _mqtt_routes_iter(all_route_lists, topic) {
  for (const route_list of all_route_lists) {
    for (const route of route_list) {
      const res = _mqtt_route_match_one(topic, route);
      if (undefined !== res) {
        yield res;} } } }


function _mqtt_route_match_one(topic, {keys, pattern, tgt}) {
  const match = pattern.exec('/'+topic);
  if (null === match) {
    return}

  if (false === keys) {
    const {groups} = match;
    if (! groups) {
      return [tgt]}

    const params = {};
    for (let k in groups) {
      params[k] = groups[k];}

    return [tgt, params]}

  if (0 === keys.length) {
    return [tgt]}

  const params = {};
  for (let i=0; i<keys.length; i++) {
    params[ keys[i] ] = match[1+i];}
  return [tgt, params]}

const _mqtt_cmdid_dispatch ={
  create(target) {
    return {__proto__: this, target, hashbelt: [new Map()]} }

, bind_pkt_future(_pkt_id=100) {
    const {hashbelt} = this;

    let _tmp_; // use _tmp_ to reuse _by_key closure
    const _by_key = answer_monad =>
      hashbelt[0].set(_tmp_, answer_monad);

    return (( pkt_or_key ) => {
      if ('string' === typeof pkt_or_key) {
        _tmp_ = pkt_or_key;}
      else {
        _pkt_id = (_pkt_id + 1) & 0xffff;
        _tmp_ = pkt_or_key.pkt_id = _pkt_id;}

      return new Promise(_by_key)}) }

, answer(key, pkt) {
    for (const map of this.hashbelt) {
      const answer_monad = map.get(key);
      if (undefined !== answer_monad) {
        map.delete(key);

        answer_monad([pkt, /*err*/]); // option/maybe monad
        return true} }
    return false}

, rotate_belt(n) {
    const {hashbelt} = this;
    hashbelt.unshift(new Map());
    for (const old of hashbelt.splice(n || 5)) {
      for (const answer_monad of old.values()) {
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
      const fn = target[`mqtt_${pkt.type}`]
        || target.mqtt_pkt;

      if (undefined !== fn) {
        await fn.call(target, pkt, ctx);} } })()) };

function _mqtt_dispatch(opt, target) {
  const _disp_ = _mqtt_cmdid_dispatch.create(target);
  const { cmdids } = _disp_;

  // default rotate at 1s across 5 buckets
  const { td: rotate_td=1000, n: rotate_n=5 } =
    opt && opt.rotate || {};

  let rotate_ts = rotate_td + Date.now();

  return [on_mqtt,
    _disp_.bind_pkt_future()]

  function on_mqtt(pkt_list, ctx) {
    for (const pkt of pkt_list) {
      cmdids[pkt.id](_disp_, pkt, ctx); }

    if (Date.now() > rotate_ts) {
      _disp_.rotate_belt(rotate_n);
      rotate_ts = rotate_td + Date.now();} } }

class MQTTBaseClient {
  constructor(opt={}) {
    this._conn_ = _mqtt_conn(this,
      this._init_dispatch(opt, this)); }

  // Handshaking Packets

  async connect(pkt={}) {
    let {client_id: cid} = pkt;
    if (! cid) {
      pkt.client_id = cid = this.init_client_id(['u8-mqtt--', '']);}
    else if (Array.isArray(cid)) {
      pkt.client_id = cid = this.init_client_id(cid);}
    else {this.client_id = cid;}

    if (null == pkt.keep_alive) {
      pkt.keep_alive = 60;}

    const res = await this._conn_
      .send_connect('connect', pkt, 'connack');

    // TODO: merge with server's keep_alive frequency
    this._conn_.ping(pkt.keep_alive);
    return res}

  async disconnect(pkt={}) {
    const res = await this._send('disconnect', pkt);
    this._conn_.reset();
    return res}

  auth(pkt={}) {
    return this._send('auth', pkt, 'auth')}

  ping() {return this._send('pingreq', null, 'pingresp')}


  // alias: sub
  subscribe(pkt, ex) {
    pkt = _as_topics(pkt, ex);
    return this._send('subscribe', pkt, pkt)}

  // alias: unsub
  unsubscribe(pkt, ex) {
    pkt = _as_topics(pkt, ex);
    return this._send('unsubscribe', pkt, pkt)}

  // alias: sub_route
  subscribe_topic(topic_route, ...args) {
    let topic = topic_route.replace(/[:*].*$/, '#');
    this.on_topic(topic_route, true, args.pop() );// handler
    this.subscribe([[ topic ]], args.pop() );// ex
    return this}


  // alias: pub
  publish(pkt) {return _pub(this, pkt)}
  post(topic, payload) {return _pub(this, {qos:0, topic, payload})}
  send(topic, payload) {return _pub(this, {qos:1, topic, payload})}
  json_post(topic, msg) {return _pub(this, {qos:0, topic, msg, arg:'msg'})}
  json_send(topic, msg) {return _pub(this, {qos:1, topic, msg, arg:'msg'})}



  // Utility Methods

  init_client_id(parts) {
    let cid = this.client_id;

    if (undefined === cid) {
      this.client_id = cid = (
        

        
        this.new_client_id(parts)
        );}

    return cid}

  new_client_id(parts) {
    return [parts[0], Math.random().toString(36).slice(2), parts[1]].join('')}

  









  // Internal API

  /* async _send(type, pkt) -- provided by _conn_ and transport */

  _init_router(opt) {
    const router = _mqtt_topic_router();
    this.on_topic = router.add;
    return this.router = router}

  _init_dispatch(opt) {
    const router = this._init_router(opt, this);

    const tgt ={
      __proto__: opt.on_mqtt_type || {}
    , mqtt_publish: router.invoke};

    return _mqtt_dispatch(this, tgt) } }


 {
  const p = MQTTBaseClient.prototype;
  Object.assign(p,{
    pub: p.publish
  , sub: p.subscribe
  , unsub: p.unsubscribe
  , sub_topic: p.subscribe_topic} );

  /*
    p.on_mqtt_type = {
      mqtt_auth(pkt, ctx) ::
      mqtt_connect(pkt, ctx) ::
      mqtt_connack(pkt, ctx) ::
      mqtt_disconnect(pkt, ctx) ::

      mqtt_subscribe(pkt, ctx) ::
      mqtt_unsubscribe(pkt, ctx) ::

      mqtt_pingreq(pkt, ctx) ::
      mqtt_pingresp(pkt, ctx) ::
    }
  */}


function _pub(self, pkt) {
  let key, {qos, msg, payload} = pkt;
  if (undefined === payload) {
    if (undefined === msg) {
      const arg = pkt.arg || 'payload';
      return v => _pub(self, {...pkt, [arg]: v}) }

    pkt.payload = JSON.stringify(msg);}

  if (1 === qos) key = pkt;
  return self._send('publish', pkt, key)}

function _as_topics(pkt, ex) {
  if ('string' === typeof pkt) {
    return {topics:[pkt], ... ex}}
  if (pkt[Symbol.iterator]) {
    return {topics:[... pkt], ... ex}}
  return ex ? {...pkt, ...ex} : pkt}

class MQTTCoreClient extends MQTTBaseClient {
  static _with_session(mqtt_session) {
    this.prototype._mqtt_session = mqtt_session;}

  constructor(opt={}) {
    super(opt);
    this.with_live(opt.on_live);
    this.with_reconnnect(opt.on_reconnect);}


  // on_live(client) ::
  with_live(on_live) {
    if (on_live) {
      this.on_live = on_live;}

    return this}

  // on_reconnect(client) ::
  with_reconnnect(on_reconnnect) {
    if (on_reconnnect) {
      this.on_reconnnect = on_reconnnect;

      if (! this._conn_.is_set) {
        on_reconnnect(this);} }

    return this}


  with_async_iter(async_iter, write_u8_pkt) {
    const on_mqtt_chunk = this._conn_.set(
      this._mqtt_session(),
      write_u8_pkt);

    this._msg_loop = ((async () => {
      async_iter = await async_iter;
      for await (const chunk of async_iter)
        on_mqtt_chunk(chunk);

      this._conn_.reset();})());

    return this}


  
  with_tcp(port, hostname) {
    if (!Number.isFinite(port)) {
      ({port, host: hostname} = port);}

    Deno.connect({
      port: port || 1883, hostname, transport: 'tcp'})
    .then (( conn ) =>
      this.with_async_iter(
        Deno.iter(conn),
        u8_pkt => conn.write(u8_pkt)) );

    return this}


  








  











  with_websock(websock) {
    if (null == websock) {
      websock = 'ws://127.0.0.1:9001';}

    if (websock.origin || 'string' === typeof websock) {
      websock = new WebSocket(new URL(websock), ['mqtt']);}

    websock.binaryType = 'arraybuffer';

    let ready, {readyState} = websock;
    if (1 !== readyState) {
      if (0 !== readyState) {
        throw new Error('Invalid WebSocket readyState') }

      ready = new Promise( y =>
        websock.addEventListener('open', y, {once: true}));}


    const {_conn_} = this;
    const on_mqtt_chunk = _conn_.set(
      this._mqtt_session(),
      async u8_pkt =>(
        await ready
      , websock.send(u8_pkt)) );

    websock.addEventListener('close',
      (() => {
        delete websock.onmessage;
        _conn_.reset();})

    , {once: true});

    websock.onmessage = evt =>
      on_mqtt_chunk(
        new Uint8Array(evt.data));

    return this} }

class MQTTClient_v4 extends MQTTCoreClient {
  _mqtt_session() { return mqtt_session_ctx(4)() }
}

const mqtt_v4 = opt => new MQTTClient_v4(opt);

export default mqtt_v4;
export { MQTTClient_v4 as MQTTClient, MQTTClient_v4, mqtt_v4 as mqtt, mqtt_v4 };
//# sourceMappingURL=v4.mjs.map
