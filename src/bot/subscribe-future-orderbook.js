const {
  BinanceFutureOrderbookSocket,
} = require('./socket/binance-future-orderbook-socket');
const { RedisClient } = require('../common/redis-client');

const moment = require('moment');
const EventEmitter = require('events');
const dotenv = require('dotenv');
dotenv.config();

const BINANCE_WS_ENDPOINT = 'wss://fstream.binance.com/stream';

async function main() {
  try {
    const redisClient = new RedisClient('127.0.0.1', 6379);
    const ticker = 'BTCBUSD';
    const path = ticker.toLowerCase() + '@depth20@100ms';
    const msg = JSON.stringify({
      method: 'SUBSCRIBE',
      params: path,
      id: parseInt(Math.random() * 999),
    });

    const binanceFutureOrderbookSocket = new BinanceFutureOrderbookSocket(
      BINANCE_WS_ENDPOINT,
      path,
      msg,
      redisClient,
      new EventEmitter(),
    );
    await Promise.all([binanceFutureOrderbookSocket.processWebSocket()]);
    binanceFutureOrderbookSocket.processSocketEmitterCallback(ticker);
  } catch (error) {
    console.error(
      `[Binance-Socket] ${error.message} (${moment().utc().format()})`,
    );
  }
}

main();
