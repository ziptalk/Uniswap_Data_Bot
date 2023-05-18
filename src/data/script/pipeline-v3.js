const { Database } = require('../../common/database');
const { RedisClient } = require('../../common/redis-client');
const { UniswapV3Socket, Pool, Token } = require('../v3/uniswap-v3-socket');
const { UniswapV3ApiHandler } = require('../v3/uniswap-v3-api-handler');
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
const web3 = new Web3(`wss://mainnet.infura.io/ws/v3/${INFURA_API_KEY}`);

async function main(MODE) {
  switch (MODE) {
    case 'SOCKET': {
      console.log('START UNISWAP-V3 SOCKET');
      return startUniswapV3Socket();
    }
    case 'SCHEDULE': {
      console.log('START UNISWAP-V3 SCHEDULE');
      await Database.initialize('uniswap_v3_tx');
      return cron.schedule('0 * * * * *', () => {
        return executeCronSchedule();
      });
    }
    default: {
      return startUniswapV3Socket();
    }
  }
}

async function startUniswapV3Socket() {
  try {
    const uniswapRedisClient = new RedisClient('127.0.0.1', 6379);
    const binanceRedisClient = new RedisClient('127.0.0.1', 6380);
    const top100Pools = await UniswapV3ApiHandler.getTopPoolsOrderedByTvl(100);

    for (let pool of top100Pools) {
      const uniswapV3Socket = new UniswapV3Socket(
        new Pool(
          pool.id,
          new Token(pool.token0Symbol, pool.token0Name, pool.token0Decimals),
          new Token(pool.token1Symbol, pool.token1Name, pool.token1Decimals),
          pool.feeTier,
        ),
        new EventEmitter(),
        binanceRedisClient,
        uniswapRedisClient,
        web3,
        INFURA_API_KEY,
      );

      await uniswapV3Socket.initializeContract();
      uniswapV3Socket.subscribeToSwapEvents();
      uniswapV3Socket.processSocketEmitterCallback();
    }
  } catch (error) {
    console.error(
      `[Uniswap-Socket-V3] ${error.message} (${moment().utc().format()})`,
    );
    return setTimeout(() => {
      return startUniswapV3Socket();
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
        token0Amount,
        token1Amount,
        feeTier,
        timestamp,
        token0Price,
        token1Price,
      } = value;
      const token0Value = [
        timestamp,
        token1.symbol,
        token0Amount,
        token0Price,
        feeTier,
      ];
      const token1Value = [
        timestamp,
        token0.symbol,
        token1Amount,
        token1Price,
        feeTier,
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
      `[Uniswap-Schedule-V3] ${error.message} (${moment().utc().format()})`,
    );
    return setTimeout(() => {
      return executeCronSchedule();
    }, 3000);
  }
}

main(MODE);
