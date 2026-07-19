/**
 * Hand-written type declarations for u8-mqtt (v0.6.x),
 * matching the implementation in `code/`.
 *
 * This module has no runtime counterpart -- it only hosts the shared
 * declarations re-exported by the per-entrypoint `.d.ts` files.
 */

export type QosLevel = 0 | 1 | 2;

/**
 * MQTT reason code as produced by u8-mqtt-packet:
 * a boxed `Number` instance with a descriptive `.reason` string.
 */
export interface ReasonCode extends Number {
	reason: string;
}

/**
 * Option/maybe tuple resolved by the packet-future dispatch:
 * `[pkt]` on answer, or `[undefined, 'expired']` when the pending
 * request rotates out of the internal hashbelt.
 */
export type Either<T> = [T] | [undefined, string];

export type AcceptablePayload = Uint8Array | string | null;

//
// Inbound packets
//

export interface PacketBase {
	/** MQTT command id (0x0 - 0xf) */
	id: number;
	/** MQTT command type, e.g. 'publish', 'connack', 'suback' */
	type: string;
	b0: number;
	props?: Record<string, unknown>;
}

export interface ConnAckPacket extends PacketBase {
	flags: number;
	reason: ReasonCode;
}

export interface AckPacket extends PacketBase {
	pkt_id: number;
	reason?: ReasonCode;
}

export interface SubAckPacket extends AckPacket {
	/** per-topic granted qos / reason codes */
	answers?: ReasonCode[];
}

/**
 * Promise returned by `subscribe` -- in router builds `on_sub`
 * attaches the original subscribe packet onto the promise itself.
 */
export type SubAckPromise = Promise<Either<SubAckPacket>> & {
	pkt?: SubscribePkt;
};

export interface PublishPacket extends PacketBase {
	topic: string;
	payload: Uint8Array;
	qos: QosLevel;
	dup?: boolean;
	retain?: boolean;
	pkt_id?: number;
	/** decode payload (or `u8`) as UTF-8 text */
	utf8(u8?: Uint8Array): string;
	/** alias for {@link PublishPacket.utf8} */
	text(u8?: Uint8Array): string;
	/** `JSON.parse` the UTF-8 decoded payload (or `u8`) */
	json<T = unknown>(u8?: Uint8Array): T;
}

//
// Subscribe / unsubscribe
//

export interface SubscribeExtra {
	qos?: QosLevel;
	[k: string]: unknown;
}

export interface SubscribePkt extends SubscribeExtra {
	topics: (string | { topic: string; [k: string]: unknown })[];
}

export type SubscribeArg = string | Iterable<string> | SubscribePkt;

//
// Publish
//

export interface PubPacket {
	topic: string;
	payload?: AcceptablePayload;
	qos?: QosLevel;
	retain?: boolean | 0 | 1;
	dup?: boolean;
	props?: Record<string, unknown>;
}

export interface PubMsgPacket<T = unknown> extends Omit<PubPacket, 'payload'> {
	/** message encoded via `pub_opt.fn_encode` or `JSON.stringify` */
	msg: T;
	arg?: string;
}

export type EncodeFn<T = unknown> = (
	msg: T,
) => AcceptablePayload | Promise<AcceptablePayload>;

export interface PubOptions<T = unknown> {
	/** alternate encoding to `JSON.stringify(msg)` */
	fn_encode?: EncodeFn<T>;
	/** copied over `pkt.props`, if present */
	props?: Record<string, unknown>;
	/** called before publishing: `pkt = xform(pkt) || pkt` */
	xform?(pkt: PubPacket): PubPacket | void;
}

/** resolves to a puback future for qos >= 1, or `true` for qos 0 */
export type PubResult = Promise<Either<AckPacket> | true>;

/** single-value closure to publish packets on a fixed topic */
export type PubClosure<V = AcceptablePayload> = (v: V) => PubResult;

//
// Connect
//

export interface ConnectOptions {
	/** defaults to a generated, sessionStorage-persisted client id */
	client_id?: string | [prefix: string, suffix: string];
	/** seconds; default 60 */
	keep_alive?: number;
	username?: string;
	password?: string | Uint8Array;
	flags?: {
		clean_start?: boolean;
		[k: string]: unknown;
	};
	will?: {
		topic: string;
		payload?: AcceptablePayload;
		qos?: QosLevel;
		retain?: boolean;
		props?: Record<string, unknown>;
	};
	props?: Record<string, unknown>;
	[k: string]: unknown;
}

//
// Topic routing
//

/**
 * Extract `:param` names from a topic route,
 * e.g. `'device/:id/state'` yields `{ id: string }`.
 * MQTT wildcards `+` map to positional `$1`, `$2`, ... params;
 * a trailing `*` (or `#`) is available as `params['*']` / `params.wild`.
 */
export type RouteParams<R extends string> = R extends `${infer Head}/${infer Rest}`
	? RouteSegParam<Head> & RouteParams<Rest>
	: RouteSegParam<R>;

type RouteSegParam<S extends string> = S extends `:${infer P}`
	? { [k in P]: string }
	: S extends '+'
		? { [k: `$${number}`]: string }
		: S extends `${string}*` | '#'
			? { '*': string; wild: string }
			: unknown;

export interface SessionContext {
	mqtt: MQTTCore;
	[k: string]: unknown;
}

export interface TopicRouteContext extends SessionContext {
	/** index of the current route within the dispatch loop */
	idx: number;
	/** return this symbol from a handler to remove the route */
	rm: symbol;
	/** set true to stop dispatching to further matching routes */
	done?: boolean;
}

export type OnTopicCallback<T extends string = string> = (
	pkt: PublishPacket,
	params: RouteParams<T>,
	ctx: TopicRouteContext,
) => unknown;

export interface TopicRouter {
	/** translate a topic route into an MQTT topic filter (`:x` -> `+`, `*` -> `#`) */
	mqtt_topic(topic_route: string): string;
	add(topic_route: string, fn?: OnTopicCallback | null): this;
	add(topic_route: string, priority: boolean, fn?: OnTopicCallback | null): this;
	remove(topic_route: string, fn?: OnTopicCallback | null): number;
	remove(topic_route: string, priority: boolean, fn?: OnTopicCallback | null): number;
	count(topic_route?: string): number;
	clear(priority?: boolean | null): void;
	find?(
		topic: string,
	): Iterable<[OnTopicCallback, Record<string, string>, unknown]>;
	invoke(pkt: PublishPacket, ctx: TopicRouteContext): Promise<void>;
}

//
// Client options
//

export interface StorageLike {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

export interface AutoReconnectOptions {
	/** milliseconds; default 2000 */
	delay?: number;
	/** milliseconds; default `0.2 * delay` */
	jitter?: number;
	reconnect?(value: unknown): unknown;
	error?(err: unknown): unknown;
}

export interface MQTTCoreOptions {
	/** defaults to `globalThis.sessionStorage`; used to persist the client id */
	sess_stg?: StorageLike | null;
	/** override the negotiated keep alive interval (seconds) */
	keep_alive?: number;
	/** wait for an enhanced authentication (AUTH) step after CONNACK */
	use_auth?: boolean;
	/** packet-future hashbelt rotation: `td` ms per bucket, `n` buckets */
	rotate?: { td?: number; n?: number };

	on_live?(client: MQTTCore, has_connected?: boolean): unknown;
	on_ready?(client: MQTTCore): unknown;
	on_conn?(client: MQTTCore): unknown;
	on_auth?(client: MQTTCore, is_connect?: boolean): unknown;
	on_reconnect?(client: MQTTCore): unknown;
	on_disconnect?(client: MQTTCore, intentional: boolean, err?: unknown): unknown;
	log_conn?(evt: string, arg?: unknown, err_arg?: unknown): unknown;
	on_error?(err: unknown, evt?: string): unknown;

	/** low-level `mqtt_{type}(pkt, ctx)` handlers, e.g. `mqtt_publish` */
	on_mqtt_type?: Record<
		string,
		(pkt: PacketBase, ctx: TopicRouteContext) => unknown
	>;

	[k: string]: unknown;
}

//
// Errors
//

export declare class MQTTError extends Error {
	constructor(mqtt_pkt: PacketBase & { reason?: ReasonCode }, reason?: ReasonCode);
	mqtt_pkt: PacketBase;
	reason: ReasonCode;
}

//
// Client classes
//

export declare class MQTTBase {
	client_id?: string;
	/** class available on the prototype for `instanceof`-friendly throws */
	MQTTError: typeof MQTTError;

	/** @throws {MQTTError} when CONNACK reason is non-zero */
	connect(pkt?: ConnectOptions): Promise<Either<ConnAckPacket>>;
	/** `pkt` is an optional partial DISCONNECT packet */
	disconnect(pkt?: Record<string, unknown>): Promise<unknown>;
	/** @throws {MQTTError} when AUTH reason is non-zero */
	auth(pkt?: Record<string, unknown>): Promise<Either<PacketBase>>;

	ping(): Promise<Either<PacketBase>>;
	puback(pkt: { pkt_id: number }): Promise<unknown>;

	subscribe(
		pkt: SubscribeArg,
		ex?: SubscribeExtra | string,
		topic_prefix?: string,
	): Promise<Either<SubAckPacket>>;
	/** alias for {@link MQTTBase.subscribe} */
	sub: MQTTBase['subscribe'];

	unsubscribe(
		pkt: SubscribeArg,
		ex?: SubscribeExtra | string,
		topic_prefix?: string,
	): Promise<Either<AckPacket>>;
	/** alias for {@link MQTTBase.unsubscribe} */
	unsub: MQTTBase['unsubscribe'];

	/** returns a topic-bound publish closure when payload/msg is omitted */
	pub<T = unknown>(
		pkt: PubMsgPacket<T> & { msg: EncodeFn<T> | null },
		pub_opt?: PubOptions<T> | EncodeFn<T>,
	): PubClosure<T>;
	pub<T = unknown>(
		pkt: PubPacket | PubMsgPacket<T>,
		pub_opt?: PubOptions<T> | EncodeFn<T>,
	): PubResult;
	/** alias for {@link MQTTBase.pub} */
	publish: MQTTBase['pub'];

	/** `pub({topic, payload, qos: 0})` */
	post(topic: string): PubClosure;
	post(topic: string, payload: AcceptablePayload, pub_opt?: PubOptions): PubResult;
	/** `pub({topic, payload, qos: 1})` */
	send(topic: string): PubClosure;
	send(topic: string, payload: AcceptablePayload, pub_opt?: PubOptions): PubResult;
	/** `pub({topic, payload, qos: 1, retain: 1})` */
	store(topic: string): PubClosure;
	store(topic: string, payload: AcceptablePayload, pub_opt?: PubOptions): PubResult;

	/** JSON/`fn_encode` variant of {@link MQTTBase.post} (qos 0) */
	obj_post<T = unknown>(topic: string, msg?: EncodeFn<T> | null): PubClosure<T>;
	obj_post<T = unknown>(
		topic: string,
		msg: T,
		pub_opt?: PubOptions<T> | EncodeFn<T>,
	): PubResult;
	/** JSON/`fn_encode` variant of {@link MQTTBase.send} (qos 1) */
	obj_send<T = unknown>(topic: string, msg?: EncodeFn<T> | null): PubClosure<T>;
	obj_send<T = unknown>(
		topic: string,
		msg: T,
		pub_opt?: PubOptions<T> | EncodeFn<T>,
	): PubResult;
	/** JSON/`fn_encode` variant of {@link MQTTBase.store} (qos 1, retain) */
	obj_store<T = unknown>(topic: string, msg?: EncodeFn<T> | null): PubClosure<T>;
	obj_store<T = unknown>(
		topic: string,
		msg: T,
		pub_opt?: PubOptions<T> | EncodeFn<T>,
	): PubResult;

	/** alias for {@link MQTTBase.obj_post} */
	json_post: MQTTBase['obj_post'];
	/** alias for {@link MQTTBase.obj_send} */
	json_send: MQTTBase['obj_send'];
	/** alias for {@link MQTTBase.obj_store} */
	json_store: MQTTBase['obj_store'];
}

export declare class MQTTCore extends MQTTBase {
	constructor(opt?: MQTTCoreOptions);

	sess_stg?: StorageLike | null;
	/** set by `with_tcp` / `with_tls` / `with_websock(url)`; re-dials the transport */
	reconnect?: () => unknown;

	/** copy all function-valued entries of `fns_ns` onto the client */
	with(fns_ns: Record<string, unknown>): this;

	/** create a subclass bound to an u8-mqtt-packet codec */
	static mqtt_ctx(
		mqtt_level: number,
		mqtt_opts: unknown,
		pkt_ctx?: unknown,
	): typeof MQTTCore;

	conn_emit(evt: string, arg?: unknown, err_arg?: unknown): Promise<void>;
	on_error(err: unknown, evt?: string): void;
	log_conn(evt: string, arg?: unknown, err_arg?: unknown): void;

	/** automatic client id for `connect()`; persisted in `sess_stg` when available */
	init_client_id(parts?: [prefix: string, suffix: string]): string;

	on_live(client: this, is_reconnect?: boolean): unknown;
	on_disconnect(client: this, intentional: boolean, err?: unknown): unknown;

	with_autoreconnect(opt?: number | AutoReconnectOptions): this;
	delay(ms: number, ms_jitter?: number): Promise<void>;

	with_async_iter(
		async_iter:
			| AsyncIterable<Uint8Array>
			| PromiseLike<AsyncIterable<Uint8Array>>,
		write_u8_pkt: (u8_pkt: Uint8Array) => unknown,
	): this;

	/** node/deno builds */
	with_stream(
		read_stream: AsyncIterable<Uint8Array> & {
			write?(u8_pkt: Uint8Array): unknown;
		},
		write_stream?: { write(u8_pkt: Uint8Array): unknown },
	): this;

	/** web/node/deno builds; defaults to `ws://127.0.0.1:9001` */
	with_websock(websock?: WebSocket | string | URL): this;

	/** node/deno builds only */
	with_tcp(port: number, hostname?: string, options?: object): this;
	with_tcp(url: string | URL, options?: object): this;
	/** node/deno builds only */
	with_tls(port: number, hostname?: string, options?: object): this;
	with_tls(url: string | URL, options?: object): this;
}

/** MQTTCore extended by `with_topic_path_router` -- base of MQTTClient_v4/v5 */
export declare class MQTTRouterCore extends MQTTCore {
	router: TopicRouter;

	/** router.add + mqtt subscribe; fluent -- track acks via {@link MQTTRouterCore.subs_settled} */
	subscribe_topic<T extends string>(
		topic_route: T,
		handler: OnTopicCallback<T>,
	): this;
	subscribe_topic<T extends string>(
		topic_route: T,
		ex: SubscribeExtra | string,
		handler: OnTopicCallback<T>,
	): this;
	subscribe_topic<T extends string>(
		topic_route: T,
		ex: SubscribeExtra,
		topic_prefix: string,
		handler: OnTopicCallback<T>,
	): this;
	/** alias for {@link MQTTRouterCore.subscribe_topic} */
	sub_topic: MQTTRouterCore['subscribe_topic'];

	/** returns null while other handlers for the same route remain */
	unsubscribe_topic(
		topic_route: string,
		fn?: OnTopicCallback,
	): Promise<Either<AckPacket>> | null;
	unsubscribe_topic(
		topic_route: string,
		topic_prefix: string,
		fn?: OnTopicCallback,
	): Promise<Either<AckPacket>> | null;
	/** alias for {@link MQTTRouterCore.unsubscribe_topic} */
	unsub_topic: MQTTRouterCore['unsubscribe_topic'];

	/** add a topic handler without sending a subscribe packet */
	on_topic<T extends string>(
		topic_route: T,
		handler?: OnTopicCallback<T> | null,
	): this;
	on_topic<T extends string>(
		topic_route: T,
		priority: boolean,
		handler?: OnTopicCallback<T> | null,
	): this;

	/** settle all subscribe acks queued by {@link MQTTRouterCore.subscribe_topic} */
	subs_settled(): Promise<PromiseSettledResult<Either<SubAckPacket>>[]>;
}

//
// Router factories
//

export declare function with_topic_router(
	mqtt_topic_router: (
		opt: MQTTCoreOptions,
		client: MQTTCore,
		target: unknown,
	) => TopicRouter,
): <K extends typeof MQTTCore>(klass: K) => K & typeof MQTTRouterCore;

export declare function with_topic_path_router<K extends typeof MQTTCore>(
	klass: K,
): K & typeof MQTTRouterCore;

/** translate an MQTT topic filter into a route path (`+` -> `:$n`, `#` -> `*`) */
export declare function as_topic_path(topic_route: string): string;

//
// Internal plumbing (exported by esm/index.js)
//

export declare function _mqtt_conn(
	opt: MQTTCoreOptions,
	client: MQTTCore,
	dispatch: [on_mqtt: unknown, pkt_future: unknown],
): unknown;

export declare function _mqtt_dispatch(
	opt: MQTTCoreOptions,
	target: unknown,
): [
	on_mqtt: (pkt_list: PacketBase[], ctx?: unknown) => void,
	pkt_future: (pkt_or_key: string | { pkt_id?: number }) => Promise<Either<PacketBase>>,
];

export declare const _mqtt_cmdids: Array<
	(target: unknown, answer: unknown, pkt: PacketBase, ctx?: unknown) => unknown
>;
