const Redis = require('ioredis');

class RedisClient {
  constructor(host, port) {
    this.client = new Redis({ host: host || '127.0.0.1', port: port || 6379 });
  }

  async getKeys(expression) {
    return this.client.keys(expression).catch((error) => {
      console.error(`[Redis-Error] ${error}`);
    });
  }

  async deleteKey(key) {
    return this.client.del(key).catch((error) => {
      console.error(`[Redis-Error] ${error}`);
    });
  }

  async getValue(key) {
    return this.client.get(key).catch((error) => {
      console.error(`[Redis-Error] ${error}`);
    });
  }

  async setValue(key, value) {
    return this.client.set(key, value).catch((error) => {
      console.error(`[Redis-Error] ${error}`);
    });
  }

  async setKeyIfNotExists(key, value) {
    return this.client.setnx(key, value).catch((error) => {
      console.error(`[Redis-Error] ${error}`);
    });
  }

  async setExpirationTime(key, expirationTime = 240) {
    return this.client.expire(key, expirationTime).catch((error) => {
      console.error(`[Redis-Error] ${error}`);
    });
  }

  addSwapData(key, value) {
    let values = [];
    this.getValue(key).then((redisValue) => {
      if (redisValue) {
        values = JSON.parse(redisValue);
      }
      values.push(value);
      this.setValue(key, JSON.stringify(values)).then(() => {
        return this.setExpirationTime(key, 240);
      });
    });
  }
}

module.exports = { RedisClient };
