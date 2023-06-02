const { Database } = require('../../common/database');
const { StringHandler } = require('../../common/string-handler');
const { DateHandler } = require('../../common/date-handler');
const { HttpException } = require('../http/http-exception');
const { INTERVAL } = require('./interval');
const dfd = require('danfojs-node');

class SwapService {
  async getTest() {
    return 'test';
  }

  async getSwaps(symbols, interval, limit) {
    const data = await Promise.all(
      await symbols.map(async (symbol) => {
        return this.#getSwapsOfOneSymbol(symbol, interval, limit);
      }),
    );
    return data;
  }

  async getSwapQuantityForOneDay(symbols) {
    const endMoment = DateHandler.getCurrentTimestamp();
    const startMoment = endMoment - 86400000;
    const swaps = await Promise.all(
      await symbols.map(async (symbol) => {
        return this.#getSwapsForOneDayOfOneSymbol(
          symbol,
          startMoment,
          endMoment,
        );
      }),
    );
    const data = {
      startMoment,
      endMoment,
      swaps,
    };
    return data;
  }

  async #getSwapsForOneDayOfOneSymbol(symbol, startMomnet, endMoment) {
    const table = StringHandler.makeValidTableName(symbol);
    const selectQuery = `select * from ${table} where timestamp between ${startMomnet} and ${endMoment} order by timestamp desc;`;
    let rows = await Database.execQuery(selectQuery);
    if (!rows || !rows.length) {
      throw new HttpException(400, `No data found (symbol : ${symbol})`);
    }

    const quantity = rows.reduce((acc, cur) => {
      return acc + parseFloat(cur.quantity);
    }, 0);
    return { symbol, quantity };
  }

  async #getSwapsOfOneSymbol(symbol, interval, limit) {
    const table = StringHandler.makeValidTableName(symbol);
    const selectQuery = `select * from ${table} order by timestamp desc limit ${limit};`;
    let rows = await Database.execQuery(selectQuery);
    if (!rows || !rows.length) {
      throw new HttpException(400, `No data found (symbol : ${symbol})`);
    }
    for (let row of rows) {
      const { timestamp } = row;
      const newTimestamp = DateHandler.createMomentFromInterval(
        timestamp,
        INTERVAL[interval],
      )
        .utc()
        .valueOf();
      row.timestamp = newTimestamp;
    }

    let df = new dfd.DataFrame(rows);
    const avgPrice = df['price'].mean({ axis: 0 });
    df = df.fillNa([avgPrice], { columns: ['price'] });
    df = df.iloc({ columns: [1, 3, 4] });
    const quantityIn = df['quantity'].apply((val) => (val > 0 ? val : 0));
    const quantityOut = df['quantity'].apply((val) => (val < 0 ? val : 0));
    const quantityPrice = df.apply((row) => {
      return row[1] * row[2];
    });
    df.addColumn('quantity_in', quantityIn['$data'], { inplace: true });
    df.addColumn('quantity_out', quantityOut['$data'], { inplace: true });
    df.addColumn('quantity_price', quantityPrice['$data'], { inplace: true });

    const result = df.groupby(['timestamp']).agg({
      quantity: 'sum',
      price: 'mean',
      quantity_in: 'sum',
      quantity_out: 'sum',
      quantity_price: 'sum',
    });
    return { symbol, result: dfd.toJSON(result) };
  }
}

module.exports = { SwapService };
