export declare const version: string;

import { MQTTCore, MQTTCoreOptions } from './api.js';

/** basic build: no topic router -- use subscribe/pub directly */
export declare class MQTTClient_v4 extends MQTTCore {}
export declare class MQTTClient_v5 extends MQTTCore {}
export { MQTTClient_v5 as MQTTClient };

export declare function mqtt_v4(opt?: MQTTCoreOptions): MQTTClient_v4;
export declare function mqtt_v5(opt?: MQTTCoreOptions): MQTTClient_v5;
export { mqtt_v5 as mqtt };
export default mqtt_v5;
