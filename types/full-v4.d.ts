export declare const version: string;

import { MQTTCoreOptions, MQTTRouterCore } from './api.js';

export declare class MQTTClient_v4 extends MQTTRouterCore {}
export { MQTTClient_v4 as MQTTClient };

export declare function mqtt_v4(opt?: MQTTCoreOptions): MQTTClient_v4;
export { mqtt_v4 as mqtt };
export default mqtt_v4;
