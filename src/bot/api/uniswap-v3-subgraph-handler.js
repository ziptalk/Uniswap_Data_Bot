const axios = require('axios');
const moment = require('moment');

class UniswapV3SubgraphHandler {
  static UNISWAP_V3_SUBGRAPH_ENDPOINT =
    'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';

  static async findTokenWithLargestChange() {
    const query = `
      query {
        tokens(first: 10, orderBy: changeRatio, orderDirection: asc) {
          id
          symbol
          name
        }
      }
    `;
    try {
      const response = await axios.post(this.UNISWAP_V3_SUBGRAPH_ENDPOINT, {
        query,
      });
      // console.log('response', response);
      console.log('response.data.errors', response.data.errors);
      return response.data;
    } catch (error) {
      console.error(`[Axios Error-Uniswap-V3] ${error.message}`);
    }
  }
}

module.exports = { UniswapV3SubgraphHandler };
