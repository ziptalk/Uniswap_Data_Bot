const WebSocket = require('ws');
const moment = require('moment');

class BinanceFutureOrderbookSocket {
  constructor(endPoint, path, msg, redisClient, socketEmiiter) {
    this.endPoint = endPoint;
    this.path = path;
    this.msg = msg;
    this.redisClient = redisClient;
    this.socketEmiiter = socketEmiiter;
    this.ws = new WebSocket(`${this.endPoint}/?streams=${this.path}`);
  }

  processWebSocket() {
    this.ws.onopen = () => {
      this.ws.send(this.msg);
      console.log('binance_ws_open');
      this.ws.isAlive = true;
      this.ws.on('pong', () => {
        this.ws.isAlive = true;
      });
    };

    this.ws.onerror = (err) => {
      console.log('binance_ws_error');
      console.error(err);
      this.ws.close();
    };

    this.ws.onclose = () => {
      console.log('binance_ws_close');
      this.ws = new WebSocket(`${this.endPoint}/?streams=${this.path}`);
      setTimeout(() => {
        this.processWebSocket();
      }, 1000);

      clearInterval(interval);
    };

    this.ws.onmessage = (event) => {
      if (event.data.result !== null) {
        const data = JSON.parse(event.data).data;
        this.processEventCallback(data);
      }
    };

    const interval = setInterval(() => {
      if (this.ws.isAlive === false) return this.ws.terminate();
      this.ws.isAlive = false;
      this.ws.ping();
    }, 30000);
  }

  processEventCallback(data) {
    try {
      if (data) {
        const key = data['s'];
        const value = {
          best_ask: data['a'][0][0],
          best_bid: data['b'][0][0],
        };
        this.socketEmiiter.emit(key, value);
      }
    } catch (error) {
      console.error(`[Binance-Socket] ${error.message} (${moment().format()}`);
    }
  }

  processSocketEmitterCallback(ticker) {
    try {
      this.socketEmiiter.on(ticker, (data) => {
        this.redisClient.setValue(ticker, JSON.stringify(data));
      });
    } catch (error) {
      console.error(`[SOCKET EMIT CALLBACK] ${error}`);
    }
  }
}

module.exports = { BinanceFutureOrderbookSocket };
