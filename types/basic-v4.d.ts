export declare const version: string;

import { MQTTCore, MQTTCoreOptions } from './api.js';

/** basic build: no topic router -- use subscribe/pub directly */
export declare class MQTTClient_v4 extends MQTTCore {}
export { MQTTClient_v4 as MQTTClient };

export declare function mqtt_v4(opt?: MQTTCoreOptions): MQTTClient_v4;
export { mqtt_v4 as mqtt };
export default mqtt_v4;
