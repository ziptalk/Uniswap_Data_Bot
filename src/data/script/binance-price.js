const { RedisClient } = require('../../common/redis-client');
const { BinanceSocket } = require('../binance-socket');
const { BinanceApiHandler } = require('../binance-api-handler');

const moment = require('moment');
const EventEmitter = require('events');
const dotenv = require('dotenv');
dotenv.config();

const BINANCE_WS_ENDPOINT = 'wss://fstream.binance.com/stream';

async function main() {
  try {
    const redisClient = new RedisClient('127.0.0.1', 6379);
    redisClient.setValue('USDT', 1);
    const tickers = await BinanceApiHandler.getTickerListsInUsdt();
    const first100Tickers = tickers.slice(0, 100);
    const second100Tickers = tickers.slice(100, 200);
    const first100Path = first100Tickers.map((ticker) => {
      return ticker.toLowerCase() + '@aggTrade';
    });
    const second100Path = second100Tickers.map((ticker) => {
      return ticker.toLowerCase() + '@aggTrade';
    });

    const socketEmmiter = new EventEmitter();
    for (let ticker of tickers) {
      socketEmmiter.on(ticker, (data) => {
        let key = ticker.replace('USDT', '');
        if (key === 'ETH') {
          key = 'WETH';
        } else if (key === 'BTC') {
          key = 'WBTC';
        }
        redisClient.setValue(key, data).then(() => {
          return redisClient.setExpirationTime(key, 600);
        });
      });
    }

    return Promise.all([
      new BinanceSocket(
        BINANCE_WS_ENDPOINT,
        first100Path,
        socketEmmiter,
      ).processWebSocket(),
      new BinanceSocket(
        BINANCE_WS_ENDPOINT,
        second100Path,
        socketEmmiter,
      ).processWebSocket(),
    ]);
  } catch (error) {
    console.error(
      `[Binance-Socket] ${error.message} (${moment().utc().format()})`,
    );
  }
}

main();
