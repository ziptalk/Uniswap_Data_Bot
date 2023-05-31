const { BinanceApiHandler } = require('../data/binance-api-handler');

async function main(symbol, side, quantity) {
  const data = await BinanceApiHandler.createSpotOrder(symbol, side, quantity);
  console.log('data', data);
}

main('BTCBUSD', 'BUY', 0.0999);
