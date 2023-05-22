const WebSocket = require('ws');

class BinanceSocket {
  constructor(endPoint, path, tickers, redisClient, socketEmiiter) {
    this.endPoint = endPoint;
    this.path = path.join('/');
    this.tickers = tickers;
    this.redisClient = redisClient;
    this.socketEmiiter = socketEmiiter;
    this.ws = new WebSocket(`${this.endPoint}?streams=${this.path}`);
  }

  processWebSocket() {
    this.ws.onopen = () => {
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
      this.ws = new WebSocket(`${this.endPoint}?streams=${this.path}`);
      setTimeout(() => {
        this.processWebSocket();
      }, 1000);

      clearInterval(interval);
    };

    this.ws.onmessage = (event) => {
      this.processPriceEventCallback(event.data);
    };

    const interval = setInterval(() => {
      if (this.ws.isAlive === false) return this.ws.terminate();
      this.ws.isAlive = false;
      this.ws.ping();
    }, 30000);
  }

  processPriceEventCallback(message) {
    try {
      if (message) {
        let key = JSON.parse(message)['stream'].split('@')[0].toUpperCase();
        const value = JSON.parse(message)['data']['p'];
        this.socketEmiiter.emit(key, value);
      }
    } catch (error) {
      console.error(`[Binance-Socket] ${error.message} (${moment().format()}`);
    }
  }

  processSocketEmitterCallback() {
    try {
      for (let ticker of this.tickers) {
        this.socketEmiiter.on(ticker, (data) => {
          let key = ticker.replace('USDT', '');
          if (key === 'ETH') {
            key = 'WETH';
          } else if (key === 'BTC') {
            key = 'WBTC';
          }
          this.redisClient.setValue(key, data).then(() => {
            return this.redisClient.setExpirationTime(key, 600);
          });
        });
      }
    } catch (error) {
      console.error(`[SOCKET EMIT CALLBACK] ${error}`);
    }
  }
}

module.exports = { BinanceSocket };
