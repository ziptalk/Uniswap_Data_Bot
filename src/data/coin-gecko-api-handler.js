const axios = require('axios');

class CoinGeckoApiHandler {
  static COIN_GECKO_API_ENDPOINT = 'https://api.coingecko.com/api/v3';

  static async getPriceOfTokenInUsdt(token) {
    try {
      let priceInUsd;
      priceInUsd = await this.getPriceOfTokenInUsdtWithSymbol(token.symbol);

      if (!priceInUsd) {
        let fullName;
        if (token.symbol.charAt(0) === '$') {
          fullName = await this.getFullNameOfToken(token.symbol.slice(1));
        } else {
          fullName = await this.getFullNameOfToken(token.symbol);
        }
        if (fullName) {
          priceInUsd = await this.getPriceOfTokenInUsdtWithSymbol(fullName);
        }
      }
      return priceInUsd;
    } catch (error) {
      console.error(
        `[Axios Error-Coin-gecko] ${error.message} (token : ${token.symbol})`,
      );
      return null;
    }
  }

  static async getPriceOfTokenInUsdtWithSymbol(symbol) {
    try {
      const response = await axios.get(
        `${this.COIN_GECKO_API_ENDPOINT}/simple/price?ids=${symbol}&vs_currencies=usd`,
      );
      return response.data[symbol.toLowerCase()].usd;
    } catch (error) {
      return null;
    }
  }

  static async getPriceOfTokenInUsdtWithName(name) {
    try {
      const tmp = name.toLowerCase().replace(/ /g, '-');
      const response = await axios.get(
        `${this.COIN_GECKO_API_ENDPOINT}/simple/price?ids=${tmp}&vs_currencies=usd`,
      );
      const priceInUsd = response.data[tmp.toLowerCase()].usd;
      return priceInUsd;
    } catch (error) {
      if (error.response && error.response.status === 429) {
        return this.handle429Error(
          error,
          this.getPriceOfTokenInUsdtWithName(name),
        );
      } else {
        console.error(
          `[Axios Error-Coin-gecko] ${error.message} (token : ${name})`,
        );
        return null;
      }
    }
  }

  static async handle429Error(error, callback) {
    const retryAfterInterval =
      error.response.headers['retry-after'] * 1000 || 5000;
    return new Promise((resolve) => {
      setTimeout(resolve, retryAfterInterval, callback);
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
      return null;
    }
  }
}

module.exports = { CoinGeckoApiHandler };
