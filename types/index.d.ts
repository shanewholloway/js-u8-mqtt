export * from './api.js';
export declare const version: string;

import { MQTTCoreOptions, MQTTRouterCore } from './api.js';

export declare class MQTTClient_v4 extends MQTTRouterCore {}
export declare class MQTTClient_v5 extends MQTTRouterCore {}

export declare function mqtt_v4(opt?: MQTTCoreOptions): MQTTClient_v4;
export declare function mqtt_v5(opt?: MQTTCoreOptions): MQTTClient_v5;

export default mqtt_v4;
