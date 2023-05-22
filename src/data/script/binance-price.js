const { RedisClient } = require('../../common/redis-client');
const { BinanceSocket } = require('../binance-socket');
const { BinanceApiHandler } = require('../binance-api-handler');

const moment = require('moment');
const EventEmitter = require('events');
const dotenv = require('dotenv');
dotenv.config();

const BINANCE_WS_ENDPOINT = 'wss://stream.binance.com:9443/stream';

async function main() {
  try {
    const redisClient = new RedisClient('127.0.0.1', 6379);
    redisClient.setValue('USDT', 1);
    const tickers = await BinanceApiHandler.getTickerListsInUsdt();
    const first100Tickers = tickers.slice(0, 100);
    const second100Tickers = tickers.slice(100, 200);
    const first100Path = first100Tickers.map((ticker) => {
      return ticker.toLowerCase() + '@trade';
    });
    const second100Path = second100Tickers.map((ticker) => {
      return ticker.toLowerCase() + '@trade';
    });

    const firstSocket = new BinanceSocket(
      BINANCE_WS_ENDPOINT,
      first100Path,
      first100Tickers,
      redisClient,
      new EventEmitter(),
    );
    const secondSocket = new BinanceSocket(
      BINANCE_WS_ENDPOINT,
      second100Path,
      second100Tickers,
      redisClient,
      new EventEmitter(),
    );
    await Promise.all([
      firstSocket.processWebSocket(),
      secondSocket.processWebSocket(),
    ]);

    firstSocket.processSocketEmitterCallback();
    secondSocket.processSocketEmitterCallback();
  } catch (error) {
    console.error(
      `[Binance-Socket] ${error.message} (${moment().utc().format()})`,
    );
  }
}

main();
