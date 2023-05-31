const { BinanceApiHandler } = require('../data/binance-api-handler');
const { RedisClient } = require('../../common/redis-client');

// 최초 1회 시 api로 받아서 Redis에 저장하고 그 뒤로는 Socket을 통해 이벤트로 받는다.
async function main() {
  const accountInfo = await BinanceApiHandler.getAccountInfo(['USDT']);
  console.log('accountInfo', accountInfo);
  // 여기서 redis에 저장
}

main();
