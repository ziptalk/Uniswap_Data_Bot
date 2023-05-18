const axios = require('axios');

class BinanceApiHandler {
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
}

module.exports = { BinanceApiHandler };
