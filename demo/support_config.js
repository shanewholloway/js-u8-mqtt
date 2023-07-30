export const cfg_test_mosquitto_org = {
  tcp: { port: 1883, host: 'test.mosquitto.org'},
  websock_url: 'wss://test.mosquitto.org:8081',
}

export const cfg_socat = {
  // for testing disconnection issues
  // $ npm run socat:tcp:mosquitto_v16
  // $ npm run socat:ws:mosquitto_v16
  tcp: { port: 6883, host: '127.0.0.1'},
  websock_url: 'ws://127.0.0.1:6880',
}

export const cfg_integ = {
  // configs matching `npm run dkr_deps` -- ../test/integ/deps-deploy.yml
  mosquitto_v16: {
    tcp: { port: 9883, host: '127.0.0.1'},
    websock_url: 'ws://127.0.0.1:9880',
  },

  mosquitto_v20: {
    tcp: { port: 9893, host: '127.0.0.1'},
    websock_url: 'ws://127.0.0.1:9890',
  },

  ejabberd: {
    tcp: { port: 5883, host: '127.0.0.1'},
    // ejabberd typically uses path '/mqtt', but not this specific setup
    websock_url: 'ws://127.0.0.1:5880',
  },

  socat: cfg_socat
}

//export default cfg_test_mosquitto_org
export default cfg_integ.mosquitto_v16
//export default cfg_integ.mosquitto_v20
//export default cfg_integ.ejabberd
//export default cfg_socat
