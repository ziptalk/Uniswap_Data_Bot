const Web3 = require('web3');
const moment = require('moment');
const { CoinGeckoApiHandler } = require('../coin-gecko-api-handler');
const UniswapV3PoolAbi = require('./uniswap-v3-pool-abi');

class UniswapV3Socket {
  constructor(
    pool,
    socketEmitter,
    binanceRedisClient,
    uniswapRedisClient,
    web3,
    INFURA_API_KEY,
  ) {
    this.pool = pool;
    this.socketEmitter = socketEmitter;
    this.binanceRedisClient = binanceRedisClient;
    this.uniswapRedisClient = uniswapRedisClient;
    this.web3 = web3;
    this.INFURA_API_KEY = INFURA_API_KEY;
  }

  async initializeContract() {
    this.contract = new this.web3.eth.Contract(
      UniswapV3PoolAbi,
      this.pool.address,
    );
  }

  subscribeToSwapEvents() {
    this.contract.events
      .Swap({})
      .on('data', (event) => {
        this.processSwapEventCallback(
          new SwapInfo(
            this.pool.token0,
            this.pool.token1,
            event.returnValues.amount0,
            event.returnValues.amount1,
            this.pool.feeTier,
            moment().utc().valueOf(),
          ),
        );
      })
      .on('error', (error) => {
        console.log(
          `[Socket Error (pair:${this.pool.address})] ${error} (${moment()
            .utc()
            .format('YYYY-MM-DD HH:mm:ss')})`,
        );
      })
      .on('end', (error) => {
        this.web3 = new Web3(`wss://mainnet.infura.io/ws/v3/${INFURA_API_KEY}`);
        return setTimeout(() => this.subscribeToSwapEvents(), 3000);
      });
  }

  processSwapEventCallback(swapInfo) {
    try {
      if (swapInfo) {
        this.socketEmitter.emit(this.pool.address, swapInfo);
      }
    } catch (error) {
      console.error(error);
    }
  }

  processSocketEmitterCallback() {
    try {
      this.socketEmitter.on(this.pool.address, async (swapInfo) => {
        const date = moment(swapInfo.timestamp)
          .utc()
          .format('YYYY-MM-DD-HH-mm');
        let token0Price, token1Price;

        token0Price = await this.binanceRedisClient.getValue(
          `${swapInfo.token0.symbol}`,
        );
        token1Price = await this.binanceRedisClient.getValue(
          `${swapInfo.token1.symbol}`,
        );

        if (!token0Price) {
          CoinGeckoApiHandler.getPriceOfTokenInUsdt(swapInfo.token0).then(
            (price) => {
              token0Price = price;
              swapInfo.setToken0Price(token0Price);
              this.binanceRedisClient
                .setValue(swapInfo.token0.symbol, swapInfo.token0Price)
                .then(() => {
                  return this.binanceRedisClient.setExpirationTime(
                    swapInfo.token0.symbol,
                    600,
                  );
                });
              if (!token1Price) {
                CoinGeckoApiHandler.getPriceOfTokenInUsdt(swapInfo.token1).then(
                  (price) => {
                    token1Price = price;
                    swapInfo.setToken1Price(token1Price);
                    this.binanceRedisClient
                      .setValue(swapInfo.token1.symbol, swapInfo.token1Price)
                      .then(() => {
                        return this.binanceRedisClient.setExpirationTime(
                          swapInfo.token1.symbol,
                          600,
                        );
                      });
                    this.uniswapRedisClient.addSwapData(date, swapInfo);
                  },
                );
              } else {
                swapInfo.setToken1Price(token1Price);
                this.uniswapRedisClient.addSwapData(date, swapInfo);
              }
            },
          );
        } else if (!token1Price) {
          CoinGeckoApiHandler.getPriceOfTokenInUsdt(swapInfo.token1).then(
            (price) => {
              token1Price = price;
              swapInfo.setToken0Price(token0Price);
              swapInfo.setToken1Price(token1Price);
              this.binanceRedisClient
                .setValue(swapInfo.token1.symbol, swapInfo.token1Price)
                .then(() => {
                  return this.binanceRedisClient.setExpirationTime(
                    swapInfo.token1.symbol,
                    600,
                  );
                });
              this.uniswapRedisClient.addSwapData(date, swapInfo);
            },
          );
        } else {
          swapInfo.setToken0Price(token0Price);
          swapInfo.setToken1Price(token1Price);
          this.uniswapRedisClient.addSwapData(date, swapInfo);
        }
      });
    } catch (error) {
      console.error(`[SOCKET EMIT CALLBACK] ${error}`);
    }
  }
}

class Token {
  constructor(symbol, name, decimals) {
    this.symbol = symbol;
    this.name = name;
    this.decimals = decimals;
  }
}

class Pool {
  constructor(address, token0, token1, feeTier) {
    this.address = address;
    this.token0 = token0;
    this.token1 = token1;
    this.feeTier = feeTier;
  }
}

class SwapInfo {
  constructor(token0, token1, token0Amount, token1Amount, feeTier, timestamp) {
    this.token0 = token0;
    this.token1 = token1;
    this.token0Amount = token0Amount / 10 ** token0.decimals;
    this.token1Amount = token1Amount / 10 ** token1.decimals;
    this.feeTier = feeTier;
    this.timestamp = timestamp;
  }

  setToken0Price(token0Price) {
    this.token0Price = parseFloat(token0Price);
  }

  setToken1Price(token1Price) {
    this.token1Price = parseFloat(token1Price);
  }
}

module.exports = { UniswapV3Socket, Token, Pool };
