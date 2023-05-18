const mysql = require('mysql2/promise.js');
const { StringHandler } = require('./string-handler');

class Database {
  static async initialize(database) {
    this.database = database;
    this.pool = mysql.createPool({
      host: process.env.AWS_RDS_HOST,
      port: process.env.AWS_RDS_PORT,
      user: process.env.AWS_RDS_USER,
      password: process.env.AWS_RDS_PASSWORD,
      database: database,
      connectionLimit: 100,
    });
    console.log(`Create Database Pool ! (db name : ${this.database})`);
  }

  static async execQuery(rawQuery, values = undefined) {
    try {
      const connection = await this.pool.getConnection(async (conn) => conn);
      try {
        await connection.beginTransaction();
        const [rows] = await connection.query(rawQuery, values);
        await connection.commit();
        connection.release();
        return rows;
      } catch (error) {
        console.log('rawQuery', rawQuery);
        await connection.rollback();
        connection.release();
        console.error(`[Query Error] ${error}`);
      }
    } catch (error) {
      console.error(`[DB Error] ${error}`);
    }
  }

  static getCreateUniswapTxTableQuery(token) {
    const table = StringHandler.makeValidTableName(token);
    return `CREATE TABLE IF NOT EXISTS ${table} (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      timestamp DOUBLE NOT NULL,
      exchange_token VARCHAR(255) NOT NULL,
      quantity DOUBLE NOT NULL,
      price DOUBLE,
      feeTier DOUBLE NOT NULL
    )`;
  }
}

module.exports = { Database };
