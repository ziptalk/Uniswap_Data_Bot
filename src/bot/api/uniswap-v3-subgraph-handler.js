const axios = require('axios');
const moment = require('moment');

class UniswapV3SubgraphHandler {
  static UNISWAP_V3_SUBGRAPH_ENDPOINT =
    'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';

  static async getTokenInfo(symbol) {
    try {
      const query = `
          {
            tokens(where: { symbol: "${symbol}"}) {
              id
              symbol
              name
              decimals
              volumeUSD 
              totalSupply
            }
          }
        `;

      const response = await axios.post(this.UNISWAP_V3_SUBGRAPH_ENDPOINT, {
        query,
      });
      let tokens = response.data.data.tokens;
      tokens = tokens.sort((a, b) => {
        return b.volumeUSD - a.volumeUSD;
      });
      return tokens[0];
    } catch (error) {
      if (error.response.data) {
        console.error(`[Axios Error-Uniswap-V3] ${error.response.data.errors}`);
      }
      console.error(`[Axios Error-Uniswap-V3] ${error.message}`);
    }
  }

  static async getTokenDayData() {
    try {
      const query = `
          {
            tokenDayDatas {
              id
              date
              token {
                id
                symbol
                name
                decimals
              }
              volumeUSD
              totalValueLockedUSD
            }
          }
        `;

      const response = await axios.post(this.UNISWAP_V3_SUBGRAPH_ENDPOINT, {
        query,
      });
      return response.data.data.tokenDayDatas;
    } catch (error) {
      console.error(`[Axios Error-Uniswap-V3] ${error.message}`);
    }
  }

  static async getAllTokensInfo() {
    try {
      const query = `
        {
          tokens (orderBy: volumeUSD, orderDirection: desc) {
            id
            symbol
            name
            decimals
            totalValueLocked
          }
        }
      `;

      const response = await axios.post(this.UNISWAP_V3_SUBGRAPH_ENDPOINT, {
        query,
      });
      return response.data.data.tokens;
    } catch (error) {
      console.error(`[Axios Error-Uniswap-V3] ${error.message}`);
    }
  }

  static async getTransactions(poolAddress, startMoment, endMoment) {
    try {
      const query = `
      {
        transactions(first: 10, orderBy: timestamp, orderDirection: desc) {
          id
          timestamp
          blockNumber
          swaps(where: { pool: "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8" }) {
            id
            amount0
            amount1
            amountUSD
            tick
            pool {
              token0 {
                id
                symbol
              }
              token1 {
                id
                symbol
              }
            }
          }
        }
      }`;

      const response = await axios.post(this.UNISWAP_V3_SUBGRAPH_ENDPOINT, {
        query,
      });
      return response.data.data.tokens;
    } catch (error) {
      console.error(`[Axios Error-Uniswap-V3] ${error.message}`);
    }
  }
}

module.exports = { UniswapV3SubgraphHandler };
