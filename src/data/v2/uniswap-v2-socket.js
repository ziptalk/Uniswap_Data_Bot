const moment = require('moment');
const { CoinGeckoApiHandler } = require('../coin-gecko-api-handler');
const UniswapV2PairAbi = require('./uniswap-v2-pair-abi');

class UniswapV2Socket {
  constructor(
    pair,
    socketEmitter,
    binanceRedisClient,
    uniswapRedisClient,
    web3,
    INFURA_API_KEY,
  ) {
    this.pair = pair;
    this.socketEmitter = socketEmitter;
    this.binanceRedisClient = binanceRedisClient;
    this.uniswapRedisClient = uniswapRedisClient;
    this.web3 = web3;
    this.INFURA_API_KEY = INFURA_API_KEY;
  }

  async initializeContract() {
    this.contract = new this.web3.eth.Contract(
      UniswapV2PairAbi,
      this.pair.address,
    );
  }

  subscribeToSwapEvents() {
    this.contract.events
      .Swap({})
      .on('data', (event) => {
        this.processSwapEventCallback(
          new SwapInfo(
            this.pair.token0,
            this.pair.token1,
            event.returnValues.amount0In,
            event.returnValues.amount1In,
            event.returnValues.amount0Out,
            event.returnValues.amount1Out,
            moment().utc().valueOf(),
          ),
        );
      })
      .on('error', (error) => {
        console.log(
          `[Socket Error (pair:${this.pair.address})] ${error} (${moment()
            .utc()
            .format('YYYY-MM-DD HH:mm:ss')})`,
        );
      })
      .on('end', (error) => {
        const provider = new Web3.providers.WebsocketProvider(
          `wss://mainnet.infura.io/ws/v3/${this.INFURA_API_KEY}`,
        );
        this.web3.setProvider(provider);
        return setTimeout(() => this.subscribeToSwapEvents(), 3000);
      });
  }

  processSwapEventCallback(swapInfo) {
    try {
      if (swapInfo) {
        this.socketEmitter.emit(this.pair.address, swapInfo);
      }
    } catch (error) {
      console.error(error);
    }
  }

  processSocketEmitterCallback() {
    try {
      this.socketEmitter.on(this.pair.address, (swapInfo) => {
        const date = moment(swapInfo.timestamp)
          .utc()
          .format('YYYY-MM-DD-HH-mm');
        let token0Price, token1Price;
        Promise.all([
          this.binanceRedisClient.getValue(`${swapInfo.token0.symbol}`),
          this.binanceRedisClient.getValue(`${swapInfo.token1.symbol}`),
        ]).then(([price0, price1]) => {
          token0Price = price0;
          token1Price = price1;

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
                  CoinGeckoApiHandler.getPriceOfTokenInUsdt(
                    swapInfo.token1,
                  ).then((price) => {
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
                  });
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

  setReserve(reserve) {
    this.reserve = reserve;
  }
}

class Pair {
  constructor(address, token0, token1) {
    this.address = address;
    this.token0 = token0;
    this.token1 = token1;
  }

  getToken0TOToken1Rate() {
    const reserve0 = BigInt(this.token0.reserve);
    const reserve1 = BigInt(this.token1.reserve);
    const decimals0 = BigInt(this.token0.decimals);
    const decimals1 = BigInt(this.token1.decimals);
    return reserve1 / decimals1 / (reserve0 / decimals0);
  }

  getToken1TOToken0Rate() {
    const reserve0 = BigInt(this.token0.reserve);
    const reserve1 = BigInt(this.token1.reserve);
    const decimals0 = BigInt(this.token0.decimals);
    const decimals1 = BigInt(this.token1.decimals);
    return reserve0 / decimals0 / (reserve1 / decimals1);
  }
}

class SwapInfo {
  constructor(
    token0,
    token1,
    amount0In,
    amount1In,
    amount0Out,
    amount1Out,
    timestamp,
  ) {
    this.token0 = token0;
    this.token1 = token1;
    this.amount0In = amount0In / 10 ** token0.decimals;
    this.amount1In = amount1In / 10 ** token1.decimals;
    this.amount0Out = amount0Out / 10 ** token0.decimals;
    this.amount1Out = amount1Out / 10 ** token1.decimals;
    this.timestamp = timestamp;
  }

  setToken0Price(token0Price) {
    this.token0Price = parseFloat(token0Price);
  }

  setToken1Price(token1Price) {
    this.token1Price = parseFloat(token1Price);
  }
}

module.exports = { UniswapV2Socket, Token, Pair };
