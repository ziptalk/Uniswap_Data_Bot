const axios = require('axios');
const moment = require('moment');

class UniswapV2ApiHandler {
  static UNISWAP_V2_SUBGRAPH_ENDPOINT =
    'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2';

  static async getTopPairsOrderedByTvl(top) {
    const query = `
    {
      pairs(first: ${top}, orderBy: reserveUSD, orderDirection: desc) {
        id
        token0 {
          symbol
          name
          decimals
        }
        token1 {
          symbol
          name
          decimals
        }
        reserveUSD
      }
    }`;
    try {
      const response = await axios.post(this.UNISWAP_V2_SUBGRAPH_ENDPOINT, {
        query,
      });
      return response.data.data.pairs;
    } catch (error) {
      console.error(`[Axios Error-Uniswap-V2] ${error.message}`);
    }
  }

  static async checkIfPairIsActive(pairAddress) {
    const oneMonthAgoTimestamp = moment().utc().subtract(1, 'months').unix();
    const query = `
    {
      swaps(orderBy: timestamp, orderDirection: desc, where: { pair: "${pairAddress}", timestamp_gte: ${oneMonthAgoTimestamp} }, first: 1) {
        timestamp
      }
    }`;
    try {
      const response = await axios.post(this.UNISWAP_V2_SUBGRAPH_ENDPOINT, {
        query,
      });
      return response.data.data.swaps.length > 0;
    } catch (error) {
      console.error(`[Axios Error-Uniswap-V2] ${error.message}`);
    }
  }

  static async getTopActivePairs(top) {
    const pairs = await this.getTopPairsOrderedByTvl(top);
    const activePairs = [];

    for (let pair of pairs) {
      const isActive = await this.checkIfPairIsActive(pair.id);
      if (isActive) {
        activePairs.push(pair);
      }
    }
    return activePairs;
  }
}

module.exports = { UniswapV2ApiHandler };
