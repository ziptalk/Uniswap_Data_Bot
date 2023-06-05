const axios = require('axios');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

class BinanceFutureApiHandler {
  static BINANCE_FUTURE_ENDPOINT = 'https://fapi.binance.com';
  static BINANCE_API_KEY = process.env.BINANCE_API_KEY;
  static BINANCE_SECRET_KEY = process.env.BINANCE_SECRET_KEY;

  static async generateListenKey() {
    try {
      const url = `${this.BINANCE_FUTURE_ENDPOINT}/fapi/v1/listenKey`;
      const headers = {
        'Content-Type': 'application/json',
        'X-MBX-APIKEY': this.BINANCE_API_KEY,
      };
      const response = await axios.post(url, null, { headers });
      return response.data.listenKey;
    } catch (error) {
      if (error.response.data) {
        console.error(`[Axios Error-Binance] ${error.response.data.msg}`);
      } else {
        console.error(`[Axios Error-Binance] ${error.message}`);
      }
    }
  }

  static async sendAxiosRequest(options) {
    try {
      const response = await axios(options);
      return response.data;
    } catch (error) {
      console.error(error.response.data);
      throw new Error('Binance request Error');
    }
  }

  static async getAccountInfo(isAsset, tokens = undefined) {
    try {
      const params = {
        timestamp: Date.now(),
      };
      const queryString = this.#makeQueryString(params);
      const signature = this.#getSignature(queryString);
      const url = `${this.BINANCE_FUTURE_ENDPOINT}/fapi/v2/account?${queryString}&signature=${signature}`;
      const headers = {
        'X-MBX-APIKEY': this.BINANCE_API_KEY,
      };
      const response = await axios.get(url, { headers });

      if (isAsset) {
        if (!tokens) {
          return response.data['assets'];
        }
        const balances = response.data['assets']
          .map((balance) => {
            if (tokens.includes(balance['asset'])) {
              return balance;
            }
          })
          .filter((balance) => {
            return balance !== undefined;
          });
        return balances;
      } else {
        if (!tokens) {
          return response.data['positions'];
        }
        const balances = response.data['positions']
          .map((balance) => {
            if (tokens.includes(balance['symbol'])) {
              return balance;
            }
          })
          .filter((balance) => {
            return balance !== undefined;
          });
        return balances;
      }
    } catch (error) {
      if (error.response.data) {
        console.error(`[Axios Error-Binance] ${error.response.data.msg}`);
      } else {
        console.error(`[Axios Error-Binance] ${error.message}`);
      }
    }
  }

  static async getExchangeInfo(tokens = undefined) {
    try {
      const response = await axios.get(
        `${this.BINANCE_FUTURE_ENDPOINT}/fapi/v1/exchangeInfo`,
      );
      let orderInfo = {};

      for (let symbol of response.data['symbols']) {
        if (tokens !== undefined && !tokens.includes(symbol['symbol'])) {
          continue;
        }
        if (symbol['contractType'] !== 'PERPETUAL') {
          continue;
        }
        orderInfo[symbol['symbol']] = {};

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
    } catch (error) {
      if (error.response.data) {
        console.error(`[Axios Error-Binance] ${error.response.data.msg}`);
      } else {
        console.error(`[Axios Error-Binance] ${error.message}`);
      }
    }
  }

  // cross x5
  static async openPosition(symbol, position, quantity) {
    const path = 'fapi/v1/order';
    const params = {
      symbol,
      side: position,
      type: 'MARKET',
      quantity,
      timestamp: new Date().getTime(),
    };

    const queryString = this.#makeQueryString(params);
    const signature = this.#getSignature(queryString);

    const url = `${this.BINANCE_FUTURE_ENDPOINT}/${path}?${queryString}&signature=${signature}`;
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-MBX-APIKEY': this.BINANCE_API_KEY,
    };

    return this.sendAxiosRequest({
      url,
      method: 'POST',
      data: null,
      headers,
    });
  }

  static async closePosition(symbol, position, quantity) {
    const path = 'fapi/v1/order';
    const params = {
      symbol,
      side: position,
      type: 'MARKET',
      quantity,
      timestamp: new Date().getTime(),
      reduceOnly: true,
    };

    const queryString = this.#makeQueryString(params);
    const signature = this.#getSignature(queryString);

    const url = `${this.BINANCE_FUTURE_ENDPOINT}/${path}?${queryString}&signature=${signature}`;
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-MBX-APIKEY': this.BINANCE_API_KEY,
    };

    return this.sendAxiosRequest({
      url,
      method: 'POST',
      data: null,
      headers,
    });
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

module.exports = { BinanceFutureApiHandler };
