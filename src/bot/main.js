const axios = require('axios');
const { BinanceApiHandler } = require('../data/binance-api-handler');
const {
  UniswapV3SubgraphHandler,
} = require('./api/uniswap-v3-subgraph-handler');
const { DateHandler } = require('../common/date-handler');

async function main() {
  const url = 'http://43.206.103.223:3000/swap/quantity';

  try {
    const binanceExchangeInfo = await BinanceApiHandler.getExchangeInfo();

    const endTimestamp = DateHandler.getCurrentTimestamp();
    const startTimestamp = endTimestamp - 86400000;
    const tokens = await UniswapV3SubgraphHandler.getAllTokensInfo(
      startTimestamp,
      endTimestamp,
    );

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
            (Number(tokenInfo[swap.symbol].volume) + Number(swap.quantity))) *
          100;
      }
    }
    delta = Object.entries(delta).sort((a, b) => {
      return a[1] - b[1];
    });
    // delta 값이 제일 큰 놈을 long, 제일 작은 놈을 short => BUSD 해보고, LDO BUSD 해보고
    // 전체 목록을 가져오자 -> 바이낸스 FUTURE에 있는 모든 종목

    for (let i = 0; i < delta.length; i++) {
      if (binanceExchangeInfo.hasOwnProperty(`${delta[i][0]}BUSD`)) {
        console.log(`${delta[i][0]}BUSD`, 'short 들어간다 !');
        break;
      } else if (binanceExchangeInfo.hasOwnProperty(`${delta[i][0]}USDT`)) {
        console.log(`${delta[i][0]}USDT`, 'short 들어간다 !');
        break;
      }
    }

    for (let i = delta.length - 1; i > 0; i--) {
      if (binanceExchangeInfo.hasOwnProperty(`${delta[i][0]}BUSD`)) {
        console.log(`${delta[i][0]}BUSD`, 'long 들어간다 !');
        break;
      } else if (binanceExchangeInfo.hasOwnProperty(`${delta[i][0]}USDT`)) {
        console.log(`${delta[i][0]}USDT`, 'long 들어간다 !');
        break;
      }
    }
  } catch (error) {
    process.exit(0);
  }

  //   const data = response.data;
  //   console.log('data.message', data.message);
  //   //   console.log('response.status', response.status);
  //   if (!response.status === 200) {
  //     console.log('hello');
  //     // console.error(
  //     //   `[Axios Error] ${data.message} (status : ${response.status})))`,
  //     // );
  //     process.exit(0);
  //   }
  //   //   console.log(response);
}

main();
