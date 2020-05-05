function encode_varint(n, a=[]) {
  do {
    const ni = n & 0x7f;
    n >>>= 7;
    a.push( ni | (0===n ? 0 : 0x80) );
  } while (n > 0)
  return a
}


function decode_varint(u8, vi=0, vi_tuple=[]) {
  // unrolled for a max of 4 chains
  let n = (u8[vi] & 0x7f) <<  0;
  if ( 0x80 & u8[vi++] ) {
    n |= (u8[vi] & 0x7f) <<  7;
    if ( 0x80 & u8[vi++] ) {
      n |= (u8[vi] & 0x7f) << 14;
      if ( 0x80 & u8[vi++] ) {
        n |= (u8[vi] & 0x7f) << 21;
      }
    }
  }

  vi_tuple[0] = n;
  vi_tuple[1] = vi;
  return vi_tuple
}

const [mqtt_cmd_by_type, mqtt_type_entries] = (()=>{

  const entries = [
    [ 0x0, 'reserved'],
    [ 0x1, 'connect'],
    [ 0x2, 'connack'],
    [ 0x3, 'publish'],
    [ 0x4, 'puback'],
    [ 0x5, 'pubrec'],
    [ 0x6, 'pubrel'],
    [ 0x7, 'pubcomp'],
    [ 0x8, 'subscribe'],
    [ 0x9, 'suback'],
    [ 0xa, 'unsubscribe'],
    [ 0xb, 'unsuback'],
    [ 0xc, 'pingreq'],
    [ 0xd, 'pingresp'],
    [ 0xe, 'disconnect'],
    [ 0xf, 'auth'],
  ];

  const type_map = new Map();
  for (const [id, type] of entries) {
    const cmd = id << 4;
    type_map.set(cmd, {type, cmd, id});
  }

  return [
    type_map.get.bind(type_map),
    Array.from(type_map.values()) ]
})();

function _mqtt_raw_pkt_decode_v(u8_ref, _pkt_ctx_) {
  const [u8] = u8_ref;
  const [len_body, len_vh] = decode_varint(u8, 1);

  const len_pkt = len_body + len_vh;
  if ( u8.byteLength >= len_pkt ) {
    const b0 = u8[0], cmd = b0 & 0xf0;
    u8_ref[0] = u8.subarray(len_pkt);

    return { __proto__: _pkt_ctx_,
      b0, cmd, id: b0>>>4, hdr: b0 & 0x0f,
      type_obj: mqtt_cmd_by_type(cmd),
      u8_body: 0 === len_body ? null
        : u8.subarray(len_vh, len_pkt)
      }
  }
}


function _mqtt_raw_pkt_dispatch(u8_pkt_dispatch) {
  const _px0_ = {};
  _px0_._base_ = _px0_;
  return (_pkt_ctx_=_px0_) => {
    if (_pkt_ctx_ !== _pkt_ctx_._base_)
      throw '_pkt_ctx_._base_'

    const l = [new Uint8Array(0)]; // reuse array to prevent garbage collection churn on ephemeral ones
    return u8_buf => {
      l[0] = 0 === l[0].byteLength
        ? u8_buf : _u8_join(l[0], u8_buf);

      const res = [];
      while (true) {
        const u8_pkt = _mqtt_raw_pkt_decode_v(l, _pkt_ctx_);
        if (undefined === u8_pkt) return res

        const pkt = u8_pkt_dispatch(u8_pkt);
        if (null != pkt)
          res.push( pkt );
      }
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

const [mqtt_props_by_id, mqtt_props_entries] = (()=>{
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


  const prop_map = new Map();
  for (const [id, type, name, plural] of entries) {
    const prop_obj = {id, type, name};
    //if (plural) prop_obj.plural = plural
    prop_map.set(prop_obj.id, prop_obj);
    prop_map.set(prop_obj.name, prop_obj);
  }

  return [
    prop_map.get.bind(prop_map),
    new Set( prop_map.values() ) ]
})();

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
    const [n, vi] = decode_varint(buf, step(0));
    step(vi);
    return n
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
    const {buf, step} = this;

    const [len, vi] = decode_varint(buf, step(0));
    const end_part = vi + len;
    step(end_part);
    if (0 === len)
      return null

    const prop_entries = [];
    const rdr = this._fork(
      buf.subarray(vi, end_part) );

    while (rdr.has_more()) {
      const {name, type} = mqtt_props_by_id( rdr.u8() );
      const value = rdr[type]();
      prop_entries.push([ name, value ]);
    }

    return prop_entries
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


  return ns[0x2] = pkt => {
    const rdr = new mqtt_type_reader(pkt.u8_body, 0);

    const flags = pkt.flags =
      rdr.u8_flags(_connack_flags_);

    pkt.reason = rdr.u8_reason(_connack_reason_);
    if (5 <= pkt.mqtt_level)
      pkt.props = rdr.props();
    return pkt }
}

function mqtt_decode_publish(ns) {
  return ns[0x3] = pkt => {
    const {hdr} = pkt;
    pkt.dup = Boolean(hdr & 0x8);
    pkt.retain = Boolean(hdr & 0x1);
    const qos = pkt.qos = (hdr>>1) & 0x3;

    const rdr = new mqtt_type_reader(pkt.u8_body, 0);
    pkt.topic = rdr.utf8();
    if (0 !== qos)
      pkt.pkt_id = rdr.u16();

    if (5 <= pkt.mqtt_level) {
      pkt.props = rdr.props();
      pkt.payload = rdr.flush();
    } else {
      pkt.payload = rdr.flush();
    }

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


  return ns[0x4] = pkt => {
    const rdr = new mqtt_type_reader(pkt.u8_body, 0);

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

  return ns[0x5] = ns[0x6] = ns[0x7] = pkt => {
    const rdr = new mqtt_type_reader(pkt.u8_body, 0);

    pkt.pkt_id = rdr.u16();
    pkt.reason = rdr.u8_reason(_pubxxx_reason_);
    if (5 <= pkt.mqtt_level)
      pkt.props = rdr.props();
    return pkt }
}

function _mqtt_decode_suback(_ack_reason_) {
  return pkt => {
    const rdr = new mqtt_type_reader(pkt.u8_body, 0);

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

  return ns[0xf] = pkt => {
    if ( 5 <= pkt.mqtt_level ) {
      const rdr = new mqtt_type_reader(pkt.u8_body, 0);
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

    if (! Array.isArray(props))
      props = props.entries
        ? Array.from(props.entries())
        : Object.entries(props);

    const wrt = this._fork();
    for (const [name, value] of props) {
      const {id, type} = mqtt_props_by_id(name);
      wrt.u8(id);
      wrt[type](value);
    }

    this.push(wrt.pack([]));
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

    const {will} = pkt;
    const flags = wrt.u8_flags(
      pkt.flags,
      _enc_flags_connect,
      will ? _enc_flags_will(will) : 0 );

    wrt.u16(pkt.keep_alive);

    if (5 <= mqtt_level)
      wrt.props(pkt.props);


    wrt.utf8(pkt.client_id);
    if (flags & 0x04) { // .will_flag
      if (5 <= mqtt_level)
        wrt.props(will.properties);

      wrt.utf8(will.topic);
      wrt.bin(will.payload);
    }

    if (flags & 0x80) // .username
      wrt.utf8(pkt.username);

    if (flags & 0x40) // .password
      wrt.bin(pkt.password);

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
    if (5 <= pkt.mqtt_level)
      wrt.props(pkt.props);

    const f0 = _enc_subscribe_flags(pkt);
    for (const each of pkt.topics) {
      if ('string' === typeof each) {
        wrt.utf8(each);
        wrt.u8(f0);
      }

      else if (Array.isArray(each)) {
        wrt.utf8(each[0]);
        if (undefined !== each[1])
          wrt.u8_flags(each[1], _enc_subscribe_flags);
        else wrt.u8(f0);

      } else {
        wrt.utf8(each.topic);
        if (undefined !== each.opts)
          wrt.u8_flags(each.opts, _enc_subscribe_flags);
        else wrt.u8(f0);
      }
    }

    return wrt.as_pkt(0x82)
  }
}

function mqtt_encode_unsubscribe(ns) {
  return ns.unsubscribe = ( mqtt_level, pkt ) => {
    const wrt = new mqtt_type_writer();

    wrt.u16(pkt.pkt_id);
    if (5 <= pkt.mqtt_level)
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

    if (5 <= mqtt_level) {
      wrt.u8_reason(pkt.reason);
      wrt.props(pkt.props);
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

  return _mqtt_raw_pkt_dispatch( pkt => {
    const decode_pkt = by_id[pkt.type_obj.id] || by_id[0];
    if (undefined !== decode_pkt)
      return decode_pkt(pkt)
  })
}


function _bind_mqtt_encode(lst_encode_ops) {
  const by_type = {};
  for (const op of lst_encode_ops) op(by_type);

  return mqtt_level => {
    mqtt_level = +mqtt_level || mqtt_level.mqtt_level;
    return (type, pkt) =>
      by_type[type]( mqtt_level, pkt )
  }
}


function _bind_mqtt_session_ctx(sess_decode, sess_encode, _pkt_ctx_) {
  sess_decode = _bind_mqtt_decode(sess_decode);
  sess_encode = _bind_mqtt_encode(sess_encode);

  const _sess_ctx = mqtt_level =>
    () => {
      let x = {__proto__: _pkt_ctx_, mqtt_level};
      x._base_ = x;
      return [sess_decode(x), sess_encode(x)]
    };

  _sess_ctx.v4 = _sess_ctx(4);
  _sess_ctx.v5 = _sess_ctx(5);
  return _sess_ctx
}

function mqtt_session_ctx() {
  let {ctx} = mqtt_session_ctx;
  if (undefined === ctx) {
    const as_utf8 = u8 =>
      new TextDecoder('utf-8').decode(u8);

    const std_pkt_api ={
      utf8(u8) {return as_utf8(u8 || this.payload)}
    , json(u8) {return JSON.parse(as_utf8(u8 || this.payload) )} };


    mqtt_session_ctx.ctx = ctx =
      _bind_mqtt_session_ctx(
        [// lst_decode_ops
          mqtt_decode_connack,
          mqtt_decode_publish,
          mqtt_decode_puback,
          mqtt_decode_pubxxx,
          mqtt_decode_pingxxx,
          mqtt_decode_suback,
          mqtt_decode_unsuback,
          mqtt_decode_auth,]

      , [// lst_encode_ops
          mqtt_encode_connect,
          mqtt_encode_disconnect,
          mqtt_encode_publish,
          mqtt_encode_puback,
          mqtt_encode_pingxxx,
          mqtt_encode_subscribe,
          mqtt_encode_unsubscribe,
          mqtt_encode_auth,]

      , std_pkt_api); }

  return ctx}

function _mqtt_conn(client, [on_mqtt, pkt_future]) {
  const q = []; // tiny version of deferred
  q.then = y => void q.push(y);
  q.notify = v => {for (const fn of q.splice(0,q.length)) {fn(v);} };

  const _asy_send = (async ( ...args ) => { (await q)(...args);});
  const _ping = (() =>client._send('pingreq'));

  let tid_ping;
  client._send = _asy_send;
  return {
    is_live: (() =>_asy_send !== client._send)
  , reset() {
      tid_ping = clearInterval(tid_ping);
      client._send = _asy_send;}

  , ping(td) {
      tid_ping = clearInterval(tid_ping);
      if (td) {
        tid_ping = setInterval(_ping, 1000 * td);
        if (tid_ping.unref) {
          tid_ping.unref();} } }

  , set(mqtt_session, send_u8_pkt) {
      const [mqtt_decode, mqtt_encode] =
        mqtt_session();


      const on_mqtt_chunk = u8_buf =>
        on_mqtt(
          mqtt_decode(u8_buf)
        , {mqtt: client});


      const send_pkt = (async ( type, pkt, key ) => {
        const res = undefined !== key
          ? pkt_future(key) : true;

        await send_u8_pkt(
          mqtt_encode(type, pkt));

        return res});


      client._send = send_pkt;
      q.notify(send_pkt);
      return on_mqtt_chunk} } }

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

function _msg_ignore(pkt, params, ctx) {ctx.done = true;}

function _mqtt_topic_router() {
  const pri_lsts=[[],[]];
  const find = topic => _mqtt_routes_iter(pri_lsts, topic);

  return {find,

    add(...args) {
      let fn = args.pop();
      if ('function' !== typeof fn) {
        if (false === fn) {
          fn = _msg_ignore;}
        else throw new TypeError()}

      const priority = true === args[0] && args.shift();

      let rte = _rxp_parse(
        args.shift()
          .replace(/[+#]$/, '*'));
      rte.tgt = fn;
      pri_lsts[priority?0:1].push(rte);
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

    let _hb_key;
    const _by_key = resolve =>
      hashbelt[0].set(_hb_key, resolve);

    return (( pkt_or_key ) => {
      if ('string' === typeof pkt_or_key) {
        _hb_key = pkt_or_key;}
      else {
        _pkt_id = (_pkt_id + 1) & 0xffff;
        _hb_key = pkt_or_key.pkt_id = _pkt_id;}

      return new Promise(_by_key)}) }

, answer(key, pkt) {
    for (const map of this.hashbelt) {
      const resolve = map.get(key);
      if (undefined !== resolve) {
        map.delete(key);
        resolve([pkt]);
        return true} }
    return false}

, rotate_belt(n) {
    const {hashbelt} = this;
    hashbelt.unshift(new Map());
    for (const old of hashbelt.splice(n || 5)) {
      for (const resolve of old.values()) {
        resolve([undefined, 'expired']); } } }

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
    , by_evt   // 0xc pingreq
    , by_evt   // 0xd pingresp
    , by_evt   // 0xe disconnect
    , by_type  ]// 0xf auth


    function by_id(disp, pkt) {
      disp.answer(pkt.pkt_id, pkt); }

    function by_type(disp, pkt, ctx) {
      disp.answer(pkt.type_obj.type, pkt);
      by_evt(disp, pkt, ctx);}

    async function by_evt({target}, pkt, ctx) {
      const fn = target[`mqtt_${pkt.type_obj.type}`]
        || target.mqtt_pkt;

      if (undefined !== fn) {
        await fn.call(target, pkt, ctx);} } })()) };

const mqtt_pkt_proto ={
  mqtt_auth(pkt) {}
, mqtt_connect(pkt) {}
, mqtt_connack(pkt) {}
, mqtt_disconnect(pkt) {}

, mqtt_publish(pkt) {}
, mqtt_subscribe(pkt) {}
, mqtt_unsubscribe(pkt) {}

, mqtt_pingreq(pkt) {}
, mqtt_pingresp(pkt) {} };


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
  constructor(opt) {
    this._conn_ = _mqtt_conn(this,
      this._init_dispatch(opt, this)); }

  static create(opt) {return new this(opt)}

  // Core API:

  new_client_id(pre='u8-mqtt--') {
    return pre + Math.random().toString(36).slice(2)}

  auth(pkt={}) {
    return this._send('auth', pkt, 'auth')}

  async connect(pkt={}) {
    if (! pkt.client_id) {
      pkt.client_id = this.new_client_id();}
    if (null == pkt.keep_alive) {
      pkt.keep_alive = 60;}

    const res = await this._send('connect', pkt, 'connack');
    // TODO: merge with server's keep_alive frequency

    this._conn_.ping(pkt.keep_alive);
    return res}

  async disconnect(pkt={}) {
    const res = await this._send('disconnect', pkt);
    this._conn_.reset();
    return res}

  ping() {return this._send('pingreq', null, 'pingresp')}

  // alias: sub
  subscribe(pkt, ex) {
    pkt = _as_topics(pkt, ex);
    return this._send('subscribe', pkt, pkt)}

  // alias: unsub
  unsubscribe(pkt, ex) {
    pkt = _as_topics(pkt, ex);
    return this._send('unsubscribe', pkt, pkt)}

  // alias: pub
  publish(pkt) {return _pub(this, pkt.qos, pkt)}
  post(topic, payload) {return _pub(this, 0, {topic, payload})}
  send(topic, payload) {return _pub(this, 1, {topic, payload})}
  json_post(topic, msg) {return _pub(this, 0, {topic, msg, arg:'msg'})}
  json_send(topic, msg) {return _pub(this, 1, {topic, msg, arg:'msg'})}

  // alias: sub_route
  subscribe_route(topic, ...args) {
    this.add_route(true, topic, args.pop());
    this.subscribe([
      [topic, args.shift()|0 ] ]);// qos
    return this}


  /* async _send(type, pkt) -- provided by _conn_ and transport */

  _init_router(opt) {
    const router = _mqtt_topic_router();
    this.add_route = router.add;
    return this.router = router}

  _init_dispatch(opt) {
    const router = this._init_router(opt, this);

    const tgt ={
      __proto__: this.mqtt_pkt_proto
    , mqtt_publish: router.invoke};

    return _mqtt_dispatch(this, tgt) } }


 {
  const p = MQTTBaseClient.prototype;
  Object.assign(p,{
    mqtt_pkt_proto
  , pub: p.publish
  , sub_route: p.subscribe_route
  , sub: p.subscribe
  , unsub: p.unsubscribe} ); }


function _pub(self, qos, pkt) {
  let key, {msg, payload} = pkt;
  if (undefined === payload) {
    if (undefined === msg) {
      const arg = pkt.arg || 'payload';
      return v => _pub(self, qos, {...pkt, [arg]: v}) }

    pkt.payload = JSON.stringify(msg);}

  if (qos > 0) {key = pkt;}
  return self._send('publish', pkt, key) }

function _as_topics(pkt, ex) {
  if ('string' === typeof pkt) {
    return {topics:[pkt], ... ex}}
  if (pkt[Symbol.iterator]) {
    return {topics:[... pkt], ... ex}}
  return ex ? {...pkt, ...ex} : pkt}

class MQTTWebClient extends MQTTBaseClient {
  async with_websock(websock) {
    if (null == websock) {
      websock = 'ws://127.0.0.1:9001';}

    if ('string' === typeof websock) {
      websock = new WebSocket(websock, ['mqtt']);}

    const {readyState} = websock;
    websock.binaryType = 'arraybuffer';
    if (1 !== readyState) {
      if (0 !== readyState) {
        throw new Error('Invalid WebSocket readyState') }

      await new Promise(y =>
        websock.addEventListener('open', y, {once: true}) ); }


    const {_conn_} = this;
    const on_mqtt_chunk = _conn_.set(
      this.mqtt_session
    , u8_pkt => websock.send(u8_pkt) );

    websock.addEventListener('close',
      (() => {
        delete websock.onmessage;
        _conn_.reset();})

    , {once: true});

    websock.onmessage = evt =>
      on_mqtt_chunk(
        new Uint8Array(evt.data));

    return this} }

class MQTTClient_v4 extends MQTTWebClient {}
MQTTClient_v4.prototype.mqtt_session = mqtt_session_ctx().v4;

export default MQTTClient_v4;
//# sourceMappingURL=v4.mjs.map
