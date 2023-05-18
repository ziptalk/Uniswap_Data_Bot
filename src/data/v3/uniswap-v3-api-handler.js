const axios = require('axios');
const moment = require('moment');

class UniswapV3ApiHandler {
  static UNISWAP_V3_SUBGRAPH_ENDPOINT =
    'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';
  static ETHERSCAN_ENDPOINT = 'https://api.etherscan.io/api';
  static ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

  static async getTopPoolsOrderedByTvl(top) {
    const query = `
        query {
          pools(first: ${top}, orderBy: totalValueLockedUSD, orderDirection: desc) {
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
            totalValueLockedUSD
            feeTier
            swaps(first: 1, orderBy: timestamp, orderDirection: desc) {
              timestamp
            }
          }
        }
        `;
    try {
      const response = await axios.post(this.UNISWAP_V3_SUBGRAPH_ENDPOINT, {
        query,
      });
      const pools = response.data.data.pools;
      const top100Pools = pools
        .map((pool) => {
          if (pool.swaps.length === 0) {
            return;
          }
          const mostRecentSwapTimestamp = pool.swaps[0].timestamp;
          if (
            mostRecentSwapTimestamp <
            moment().utc().subtract(1, 'months').unix()
          ) {
            return;
          }
          return {
            id: pool.id,
            token0Symbol: pool.token0.symbol,
            token1Symbol: pool.token1.symbol,
            token0Name: pool.token0.name,
            token1Name: pool.token1.name,
            token0Decimals: pool.token0.decimals,
            token1Decimals: pool.token1.decimals,
            feeTier: pool.feeTier,
            totalValueLockedUSD: pool.totalValueLockedUSD,
          };
        })
        .filter((pool) => pool !== undefined);
      return top100Pools;
    } catch (error) {
      console.error(`[Axios Error-Uniswap-V3] ${error.message}`);
    }
  }
}

module.exports = { UniswapV3ApiHandler };
