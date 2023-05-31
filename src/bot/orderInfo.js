const { BinanceApiHandler } = require('../data/binance-api-handler');

// 최초 1회시 api로 받아서 Redis에 구매 관련 정보들을 저장. 그 이후로는 필요 없음
async function main() {
  const orderInfo = await BinanceApiHandler.getExchangeInfo();
  console.log('orderInfo', orderInfo);
}

main();
