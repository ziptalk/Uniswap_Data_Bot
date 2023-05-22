const { SwapService } = require('./swap.service');
const { Router } = require('express');
const { ResponseHandler } = require('../http/response-handler');

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
    this.router.get('/test', ResponseHandler(this.getTest.bind(this)));
  }

  async getTest(req, res) {
    const data = await this.swapService.getTest();
    return { data };
  }
}

module.exports = { SwapController };
