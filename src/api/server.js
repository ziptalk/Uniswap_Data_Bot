const { Database } = require('../common/database');
const { SwapController } = require('./swap/swap.controller');
const { SwapService } = require('./swap/swap.service');

const { App } = require('./app.js');

async function main() {
  await Database.initialize('uniswap_v3_tx');
  const app = new App([new SwapController(new SwapService())]);
  app.listen();
}

main();
