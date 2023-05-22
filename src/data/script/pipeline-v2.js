const { Database } = require('../../common/database');
const { RedisClient } = require('../../common/redis-client');
const { UniswapV2Socket, Pair, Token } = require('../v2/uniswap-v2-socket');
const { UniswapV2ApiHandler } = require('../v2/uniswap-v2-api-handler');
const { DateHandler } = require('../../common/date-handler');
const { StringHandler } = require('../../common/string-handler');

const moment = require('moment');
const cron = require('node-cron');
const EventEmitter = require('events');
const dotenv = require('dotenv');
dotenv.config();
const MODE = process.env.MODE;

const Web3 = require('web3');
const INFURA_API_KEY = process.env.INFURA_API_KEY;
const web3 = new Web3();
const provider = new Web3.providers.WebsocketProvider(
  `wss://mainnet.infura.io/ws/v3/${INFURA_API_KEY}`,
);
web3.setProvider(provider);

async function main(MODE) {
  switch (MODE) {
    case 'SOCKET': {
      console.log('START UNISWAP-V2 SOCKET');
      return startUniswapV2Socket();
    }
    case 'SCHEDULE': {
      console.log('START UNISWAP-V2 SCHEDULE');
      await Database.initialize('uniswap_v2_tx');
      return cron.schedule('0 * * * * *', () => {
        return executeCronSchedule();
      });
    }
    default: {
      return startUniswapV2Socket();
    }
  }
}

async function startUniswapV2Socket() {
  try {
    const uniswapRedisClient = new RedisClient('127.0.0.1', 6379);
    const binanceRedisClient = new RedisClient('43.206.110.223', 6379);
    const top100Pairs = await UniswapV2ApiHandler.getTopActivePairs(100);

    for (let pair of top100Pairs) {
      const uniswapV2Socket = new UniswapV2Socket(
        new Pair(
          pair.id,
          new Token(pair.token0.symbol, pair.token0.name, pair.token0.decimals),
          new Token(pair.token1.symbol, pair.token1.name, pair.token1.decimals),
        ),
        new EventEmitter(),
        binanceRedisClient,
        uniswapRedisClient,
        web3,
        INFURA_API_KEY,
      );
      await uniswapV2Socket.initializeContract();
      uniswapV2Socket.subscribeToSwapEvents();
      uniswapV2Socket.processSocketEmitterCallback();
    }
  } catch (error) {
    console.error(
      `[Uniswap-Socket-V2] ${error.message} (${moment().utc().format()})`,
    );
    return setTimeout(() => {
      return startUniswapV2Socket();
    }, 3000);
  }
}

async function executeCronSchedule() {
  try {
    const uniswapRedisClient = new RedisClient('127.0.0.1', 6379);
    const expression = DateHandler.getDateOfOneMinuteAgo();
    const table = await uniswapRedisClient.getKeys(expression);
    if (table.length === 0) {
      return;
    }
    const values = JSON.parse(await uniswapRedisClient.getValue(table));
    for (let value of values) {
      const {
        token0,
        token1,
        amount0In,
        amount1In,
        amount0Out,
        amount1Out,
        timestamp,
        token0Price,
        token1Price,
      } = value;
      const token0Value = [
        timestamp,
        token1.symbol,
        amount0In > 0 ? amount0In : -amount0Out,
        token0Price,
        3000,
      ];
      const token1Value = [
        timestamp,
        token0.symbol,
        amount1In > 0 ? amount1In : -amount1Out,
        token1Price,
        3000,
      ];
      const token0TableQuery = Database.getCreateUniswapTxTableQuery(
        token0.symbol,
      );
      const token1TableQuery = Database.getCreateUniswapTxTableQuery(
        token1.symbol,
      );

      await Promise.all([
        await Database.execQuery(token0TableQuery),
        await Database.execQuery(token1TableQuery),
      ]);

      const table0 = StringHandler.makeValidTableName(token0.symbol);
      const table1 = StringHandler.makeValidTableName(token1.symbol);
      const token0Query = `INSERT INTO ${table0} (timestamp, exchange_token, quantity, price, feeTier) VALUES (?,?,?,?,?)`;
      const token1Query = `INSERT INTO ${table1} (timestamp, exchange_token, quantity, price, feeTier) VALUES (?,?,?,?,?)`;

      await Promise.all([
        await Database.execQuery(token0Query, token0Value),
        await Database.execQuery(token1Query, token1Value),
      ]);
    }
    uniswapRedisClient.deleteKey(table);
  } catch (error) {
    console.error(
      `[Uniswap-V2-Schedule] ${error.message} (${moment().utc().format()})`,
    );
    return setTimeout(() => {
      return executeCronSchedule();
    }, 3000);
  }
}

main(MODE);
