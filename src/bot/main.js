const axios = require('axios');
const cron = require('node-cron');
const moment = require('moment');
const { BinanceFutureApiHandler } = require('./api/binance-future-api-handler');
const {
  UniswapV3SubgraphHandler,
} = require('./api/uniswap-v3-subgraph-handler');
const { RedisClient } = require('../common/redis-client');
const {
  BinanceFutureOrderbookSocket,
} = require('./socket/binance-future-orderbook-socket');

const EventEmitter = require('events');
const dotenv = require('dotenv');
dotenv.config();

let POSITION_INFO;
const BINANCE_WS_ENDPOINT = 'wss://fstream.binance.com/stream';
const REDIS_CLIENT = new RedisClient('127.0.0.1', 6379);

function setBinanceBalance(assetInfo) {
  BINANCE_USDT_BALANCE = assetInfo.find((asset) => asset.asset === 'USDT')
    ? Number(assetInfo.find((asset) => asset.asset === 'USDT').availableBalance)
    : 0;
  BINANCE_BALANCE_TIMESTAMP = moment().utc().valueOf();
}

async function subscribeBinanceBalance() {
  try {
    const assetInfo = await BinanceFutureApiHandler.getAccountInfo(true, [
      'USDT',
    ]);
    POSITION_INFO = await BinanceFutureApiHandler.getAccountInfo(false);
    setBinanceBalance(assetInfo);
  } catch (error) {
    throw new Error(error.message);
  }
}

async function openPosition() {
  try {
    console.log('OPEN POSITION');
    const binanceFutureExchangeInfo =
      await BinanceFutureApiHandler.getExchangeInfo();
    const tokens = await UniswapV3SubgraphHandler.getAllTokensInfo();
    const url = 'http://43.206.103.223:3000/swap/quantity';
    const response = await axios.get(url);
    const swaps = response.data.data.swaps;
    const tokenInfo = new Map();
    for (let token of tokens) {
      tokenInfo[`${token.symbol}`] = token;
    }

    let delta = new Map();
    for (let swap of swaps) {
      if (tokenInfo.hasOwnProperty(swap.symbol)) {
        delta[swap.symbol] =
          (Number(swap.quantity) /
            Number(tokenInfo[swap.symbol].totalValueLocked)) *
          150;
      }
    }
    delta = Object.entries(delta).sort((a, b) => {
      return a[1] - b[1];
    });

    console.log('delta', delta);

    let isShort = false;
    for (let i = 0; i < delta.length; i++) {
      if (
        `${delta[i][0]}` === 'USDT' ||
        `${delta[i][0]}` === 'BUSD' ||
        `${delta[i][0]}` === 'USDC'
      ) {
        continue;
      }

      if (delta[i][1] > 0) {
        break;
      }
      if (binanceFutureExchangeInfo.hasOwnProperty(`${delta[i][0]}USDT`)) {
        const shortSymbol = `${delta[i][0]}USDT`;
        const accountInfo = await BinanceFutureApiHandler.getAccountInfo(true, [
          'USDT',
        ]);
        const usdtQuantity = Number(accountInfo[0]['availableBalance']) * 0.2;

        if (usdtQuantity === 0) {
          return;
        }
        const symbolPrice = JSON.parse(
          await REDIS_CLIENT.getValue(shortSymbol),
        );
        if (!symbolPrice) {
          continue;
        }
        let quantity = usdtQuantity / Number(symbolPrice.best_ask);
        quantity = quantity.toFixed(
          binanceFutureExchangeInfo[`${shortSymbol}`]['decimalNum'],
        );
        if (
          quantity > 0 &&
          quantity >= binanceFutureExchangeInfo[`${shortSymbol}`]['minQty']
        ) {
          const data = await BinanceFutureApiHandler.openPosition(
            shortSymbol,
            'SELL',
            quantity,
          );
          const openPrice = Number(
            JSON.parse(await REDIS_CLIENT.getValue(shortSymbol))['best_bid'],
          );

          isShort = true;
          console.log(
            `${shortSymbol} open short position (price : ${openPrice})`,
          );
          break;
        }
      }
    }
    if (!isShort) {
      console.log('No symbol to short.');
    }
  } catch (error) {
    throw new Error(error.message);
  }
}

async function closePositionAfterCertainMoment() {
  try {
    console.log('CLOSE POSITION after certain moment');
    for (let position of POSITION_INFO) {
      if (Number(position.positionAmt) !== 0) {
        const quantity =
          Number(position.positionAmt) < 0
            ? Number(position.positionAmt) * -1
            : Number(position.positionAmt);

        const side = Number(position.positionAmt) < 0 ? 'BUY' : 'SELL';
        const data = await BinanceFutureApiHandler.closePosition(
          position.symbol,
          side,
          quantity,
        );
        const entryPrice = Number(position.entryPrice);
        const closePrice = Number(
          JSON.parse(await REDIS_CLIENT.getValue(position.symbol))['best_ask'],
        );
        console.log(
          `${position.symbol} close short position (open price : ${entryPrice}, close price : ${closePrice})`,
        );
      }
    }
  } catch (error) {
    throw new Error(error.message);
  }
}

async function closePositionAfterPriceChange() {
  try {
    for (let position of POSITION_INFO) {
      if (Number(position.positionAmt) !== 0) {
        const currentPrice = Number(
          JSON.parse(await REDIS_CLIENT.getValue(position.symbol))['best_ask'],
        );
        const entryPrice = Number(position.entryPrice);
        const priceDelta = ((currentPrice - entryPrice) / entryPrice) * 100;
        if (-6 < priceDelta && priceDelta < 2) {
          return;
        }
        console.log(`${position.symbol} priceDelta : ${priceDelta}`);
        const side = Number(position.positionAmt) < 0 ? 'BUY' : 'SELL';
        const quantity =
          Number(position.positionAmt) < 0
            ? Number(position.positionAmt) * -1
            : Number(position.positionAmt);
        const data = await BinanceFutureApiHandler.closePosition(
          position.symbol,
          'side',
          quantity,
        );
        console.log(
          `${position.symbol} close short position (open price : ${entryPrice}, close price : ${currentPrice})`,
        );
      }
    }
  } catch (error) {
    throw new Error(error.message);
  }
}

async function subscribeOrderbook() {
  try {
    const tickers = await BinanceFutureApiHandler.getTopFutureSymbols(300);
    const first150Tickers = tickers.slice(0, 150);
    const second150Tickers = tickers.slice(150, 300);
    const first150Path = first150Tickers.map((ticker) => {
      return ticker.toLowerCase() + '@depth20@100ms';
    });
    const second150Path = second150Tickers.map((ticker) => {
      return ticker.toLowerCase() + '@depth20@100ms';
    });
    const firstMsg = JSON.stringify({
      method: 'SUBSCRIBE',
      params: first150Path,
      id: parseInt(Math.random() * 999),
    });
    const secondMsg = JSON.stringify({
      method: 'SUBSCRIBE',
      params: second150Path,
      id: parseInt(Math.random() * 999),
    });

    const firstSocket = new BinanceFutureOrderbookSocket(
      BINANCE_WS_ENDPOINT,
      first150Path,
      firstMsg,
      REDIS_CLIENT,
      new EventEmitter(),
    );
    const secondSocket = new BinanceFutureOrderbookSocket(
      BINANCE_WS_ENDPOINT,
      second150Path,
      secondMsg,
      REDIS_CLIENT,
      new EventEmitter(),
    );
    await Promise.all([
      firstSocket.processWebSocket(),
      secondSocket.processWebSocket(),
    ]);
    firstSocket.processSocketEmitterCallback(first150Tickers);
    secondSocket.processSocketEmitterCallback(second150Tickers);
  } catch (error) {
    console.error(
      `[Binance-Socket] ${error.message} (${moment().utc().format()})`,
    );
  }
}

async function main() {
  try {
    // 오더북 구독
    await subscribeOrderbook();

    // 잔고 업데이트 및 가격 변화 시 청산
    setInterval(async () => {
      await subscribeBinanceBalance();
      return closePositionAfterPriceChange();
    }, 1000 * 10);

    const startTime = moment().utc();
    // 매일 한번 포지션 진입, 24시간 뒤 청산 => cron 안의 값을 수정해야함
    cron.schedule('0 54 * * * *', async () => {
      openPosition().then(() => {
        setTimeout(() => {
          closePositionAfterCertainMoment();
        }, 1000 * 60 * 60 * 24);
      });
    });
  } catch (error) {
    console.error(`[Error] ${error.message}`);
    process.exit(1);
  }
}

main();
