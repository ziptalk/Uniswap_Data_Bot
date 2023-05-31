const axios = require('axios');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

class BinanceApiHandler {
  static BINANCE_API_KEY = process.env.BINANCE_API_KEY;
  static BINANCE_SECRET_KEY = process.env.BINANCE_SECRET_KEY;

  static async getAccountInfo(tokens = undefined) {
    try {
      const params = {
        timestamp: Date.now(),
      };
      const queryString = this.#makeQueryString(params);
      const signature = this.#getSignature(queryString);
      const url = `https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`;
      const headers = {
        'X-MBX-APIKEY': this.BINANCE_API_KEY,
      };
      const response = await axios.get(url, { headers });
      if (!tokens) {
        return response.data;
      }
      const balances = response.data['balances']
        .map((balance) => {
          if (tokens.includes(balance['asset'])) {
            return balance;
          }
        })
        .filter((balance) => {
          return balance !== undefined;
        });
      return balances;
    } catch (error) {
      console.error(`[Axios Error-Binance] ${error.message}`);
    }
  }

  static async getExchangeInfo() {
    const response = await axios.get(
      `https://api.binance.com/api/v3/exchangeInfo`,
    );

    let orderInfo = new Map();

    for (let symbol of response.data['symbols']) {
      orderInfo[symbol['symbol']] = new Map();

      for (let info of symbol['filters']) {
        if (info['filterType'] === 'LOT_SIZE') {
          orderInfo[symbol['symbol']]['minQty'] = parseFloat(info['minQty']);
          orderInfo[symbol['symbol']]['maxQty'] = parseFloat(info['maxQty']);
          orderInfo[symbol['symbol']]['stepSize'] = parseFloat(
            info['stepSize'],
          );

          let [integer, decimal] = orderInfo[symbol['symbol']]['stepSize']
            .toString()
            .split('.');
          orderInfo[symbol['symbol']]['decimalNum'] = decimal?.length
            ? decimal.length
            : 0;
          orderInfo[symbol['symbol']]['integerNum'] = integer.length;
        } else if (info['filterType'] === 'PRICE_FILTER') {
          orderInfo[symbol['symbol']]['minPrice'] = parseFloat(
            info['minPrice'],
          );
          orderInfo[symbol['symbol']]['maxPrice'] = parseFloat(
            info['maxPrice'],
          );
          orderInfo[symbol['symbol']]['tickSize'] = parseFloat(
            info['tickSize'],
          );
        }
      }
    }
    return orderInfo;
  }

  static async getTickerListsInUsdt() {
    try {
      const response = await axios.get(
        'https://api.binance.com/api/v3/ticker/24hr',
      );
      const tickers = response.data
        .map((one) => {
          return one.symbol;
        })
        .filter((ticker) => {
          return ticker.endsWith('USDT');
        });
      return tickers;
    } catch (error) {
      console.error(`[Axios Error-Binance] ${error.message}`);
    }
  }

  static async getPriceOfTokenInUsdt(symbol) {
    try {
      const response = await axios.get(
        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`,
      );
      const price = response.data.price;
      return price;
    } catch (error) {
      console.error(
        `[Axios Error-Binance] ${error.message} (sybmol : ${symbol}))`,
      );
      return null;
    }
  }

  static async createSpotOrder(symbol, side, quantity) {
    try {
      const parmas = {
        symbol,
        side,
        type: 'MARKET',
        quantity,
        timestamp: Date.now(),
      };

      const queryString = this.#makeQueryString(parmas);
      const signature = this.#getSignature(queryString);
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-MBX-APIKEY': this.BINANCE_API_KEY,
      };
      const url = `https://api.binance.com/api/v3/order?${queryString}&signature=${signature}`;
      const response = await axios.post(url, null, { headers });
      return response.data;
    } catch (error) {
      console.error(
        `[Axios Error-Binance] ${error.response.data.msg} (sybmol : ${symbol}))`,
      );
      return null;
    }
  }

  static #makeQueryString(params) {
    return Object.keys(params)
      .reduce((a, k) => {
        if (params[k] !== undefined) {
          a.push(k + '=' + encodeURIComponent(params[k]));
        }
        return a;
      }, [])
      .join('&');
  }

  static #getSignature(queryString) {
    return crypto
      .createHmac('sha256', this.BINANCE_SECRET_KEY)
      .update(queryString)
      .digest('hex');
  }
}

module.exports = { BinanceApiHandler };
