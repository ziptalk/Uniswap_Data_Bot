const { RedisClient } = require('../../common/redis-client');
const { CoinGeckoApiHandler } = require('../coin-gecko-api-handler');
const { UniswapV3ApiHandler } = require('../v3/uniswap-v3-api-handler');

const dotenv = require('dotenv');
dotenv.config();

const MODE = process.env.MODE;

async function main(MODE) {
  switch (MODE) {
    case 'V2': {
      console.log('START COIN-GECKO V2');
      return getTokenPriceOfV2Pairs();
    }
    case 'V3': {
      console.log('START COIN-GECKO V3');
      return getTokenPriceOfV3Pools();
    }
    default: {
      console.log('START COIN-GECKO V3');
      return getTokenPriceOfV3Pools();
    }
  }
}

async function getTokenPriceOfV3Pools() {
  try {
    const redisClient = new RedisClient('127.0.0.1', 6380);
    const top100Pools = await UniswapV3ApiHandler.getTopPoolsOrderedByTvl(100);
    const shuffledTop100Pools = shuffleArray(top100Pools);

    for (let pool of shuffledTop100Pools) {
      const { token0Symbol, token1Symbol } = pool;
      let token0Price = await redisClient.getValue(token0Symbol);
      let token1Price = await redisClient.getValue(token1Symbol);

      if (!token0Price) {
        token0Price = await CoinGeckoApiHandler.getPriceOfTokenInUsdt(
          token0Symbol,
        );
        await redisClient.setValue(token0Symbol, token0Price).then(() => {
          return redisClient.setExpirationTime(token0Symbol, 600);
        });
      }
      if (!token1Price) {
        token1Price = await CoinGeckoApiHandler.getPriceOfTokenInUsdt(
          token1Symbol,
        );
        await redisClient.setValue(token1Symbol, token1Price).then(() => {
          return redisClient.setExpirationTime(token1Symbol, 600);
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        getTokenPriceOfV3Pools();
        resolve();
      }, 5000);
    });
  } catch (error) {
    console.error(`[Coin-Gecko-V3] ${error}`);
    return new Promise((resolve) => {
      setTimeout(() => {
        getTokenPriceOfV3Pools();
        resolve();
      }, 5000);
    });
  }
}

async function getTokenPriceOfV2Pairs() {}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

main(MODE);
