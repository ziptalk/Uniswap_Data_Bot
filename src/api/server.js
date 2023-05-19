const { App } = require('./app.js');

async function main() {
  //   await Database.initialize(process.env.NODE_ENV);
  const app = new App([]);
  app.listen();
}

main();
