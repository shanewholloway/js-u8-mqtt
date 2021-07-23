const cfg_localhost = {
  tcp: { port: 1883, host: '127.0.0.1'},
  websock_url: 'ws://127.0.0.1:9001',
}

const cfg_test_mosquitto_org = {
  tcp: { port: 1883, host: 'test.mosquitto.org'},
  websock_url: 'wss://test.mosquitto.org:8081',
}

export default cfg_localhost
