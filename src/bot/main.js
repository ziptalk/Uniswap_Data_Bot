const axios = require('axios');
const cron = require('node-cron');
const { BinanceFutureApiHandler } = require('./api/binance-future-api-handler');
const {
  UniswapV3SubgraphHandler,
} = require('./api/uniswap-v3-subgraph-handler');

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
          100;
      }
    }
    delta = Object.entries(delta).sort((a, b) => {
      return a[1] - b[1];
    });

    let isShort = false;
    // short
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
        const quantity = (
          Number(accountInfo[0]['availableBalance']) * 0.2
        ).toFixed(binanceFutureExchangeInfo[`${shortSymbol}`]['decimalNum']);
        if (
          quantity > 0 &&
          quantity >= binanceFutureExchangeInfo[`${shortSymbol}`]['minQty']
        ) {
          const data = await BinanceFutureApiHandler.openPosition(
            shortSymbol,
            'SELL',
            quantity,
          );
          isShort = true;
          console.log(`${shortSymbol} open short position`);
        }
        break;
      }
    }
    if (!isShort) {
      console.log('No symbol to short.');
    }
  } catch (error) {
    console.log(`[Error] ${error.message}`);
    process.exit(0);
  }
}

async function closePosition() {
  try {
    console.log('CLOSE POSITION');
    const accountInfo = await BinanceFutureApiHandler.getAccountInfo(false);
    for (let account of accountInfo) {
      if (Number(account.positionAmt) !== 0) {
        const quantity =
          Number(account.positionAmt) < 0
            ? Number(account.positionAmt) * -1
            : Number(account.positionAmt);

        const side = Number(account.positionAmt) < 0 ? 'BUY' : 'SELL';
        const data = await BinanceFutureApiHandler.closePosition(
          account.symbol,
          side,
          quantity,
        );
        console.log(`${account.symbol} close short position`);
      }
    }
  } catch (error) {
    console.log(`[Error] ${error.message}`);
    process.exit(0);
  }
}

async function main() {
  //   cron.schedule('0 0 0 * * *', async () => {
  //     await closePosition();
  //     await openPosition();
  //   });

  cron.schedule('0 */5 * * * *', async () => {
    await openPosition();
    setTimeout(() => {
      closePosition();
    }, 1000 * 60 * 2);
  });
}

main();
