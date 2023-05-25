const { SwapService } = require('./swap.service');
const { Router } = require('express');
const { ResponseHandler } = require('../http/response-handler');
const { HttpException } = require('../http/http-exception');
const { INTERVAL } = require('./interval');

class SwapController {
  /**
   * @param { SwapService } swapService
   */

  constructor(swapService) {
    this.router = Router();
    this.swapService = swapService;
    this.path = '/swap';
    this.#initializeRoutes();
  }

  #initializeRoutes() {
    this.router
      .get('/test', ResponseHandler(this.getTest.bind(this)))
      .get('/', ResponseHandler(this.getSwaps.bind(this)));
  }

  async getTest(req, res) {
    const data = await this.swapService.getTest();
    return { data };
  }

  async getSwaps(req, res) {
    const { symbol, interval, limit = 1000 } = req.query;
    if (!symbol || !interval) {
      throw new HttpException(
        400,
        'Missing required parameters (symbol, interval)',
      );
    }
    if (!INTERVAL[interval]) {
      throw new HttpException(
        400,
        'Invalid interval (1m, 3m, 5m, 10m, 30m, 1h, 4h, 12h, 1d)',
      );
    }

    const data = await this.swapService.getSwaps(symbol, interval, limit);
    return { data };
  }
}

module.exports = { SwapController };
