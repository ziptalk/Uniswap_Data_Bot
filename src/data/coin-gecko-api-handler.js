const axios = require('axios');

class CoinGeckoApiHandler {
  static COIN_GECKO_API_ENDPOINT = 'https://api.coingecko.com/api/v3';

  static async getPriceOfTokenInUsdt(symbol) {
    try {
      let fullName;
      if (symbol.charAt(0) === '$') {
        fullName = await this.getFullNameOfToken(symbol.slice(1));
      } else {
        fullName = await this.getFullNameOfToken(symbol);
      }
      if (fullName) {
        return this.getPriceOfTokenInUsdtWithFullName(fullName);
      }
    } catch (error) {
      console.error(
        `[Axios Error-Coin-gecko] ${error.message} (token : ${symbol})`,
      );
      return null;
    }
  }

  static async getPriceOfTokenInUsdtWithFullName(fullName) {
    try {
      const response = await axios.get(
        `${this.COIN_GECKO_API_ENDPOINT}/simple/price?ids=${fullName}&vs_currencies=usd`,
      );
      return response.data[fullName.toLowerCase()].usd;
    } catch (error) {
      if (error.response && error.response.status === 429) {
        return this.handle429Error(error, () =>
          this.getPriceOfTokenInUsdtWithFullName(fullName),
        );
      }
      return null;
    }
  }

  static async handle429Error(error, callbackFunction) {
    const retryAfterInterval =
      error.response.headers['retry-after'] * 1000 || 50000;
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const result = await callbackFunction();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      }, retryAfterInterval + 10000);
    });
  }

  static async getFullNameOfToken(symbol) {
    try {
      const response = await axios.get(
        `${this.COIN_GECKO_API_ENDPOINT}/coins/list`,
      );
      const coins = response.data;
      const coin = coins.find((coin) => coin.symbol === symbol.toLowerCase());
      return coin.name.toLowerCase().replace(/ /g, '-');
    } catch (error) {
      if (error.response && error.response.status === 429) {
        return this.handle429Error(error, () =>
          this.getFullNameOfToken(symbol),
        );
      }
      return null;
    }
  }
}

module.exports = { CoinGeckoApiHandler };
