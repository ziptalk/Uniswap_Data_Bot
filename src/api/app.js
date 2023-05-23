const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { ErrorHandler } = require('./http/error-handler');

dotenv.config();

const PORT = 3000;

class App {
  constructor(controllers) {
    this.app = express();
    this.#initializeCors();
    this.#initializeMiddlewares();
    this.#intializeHealthCheck();
    this.#initialzeControllers(controllers);
    this.#initializeErrorHandling();
  }

  listen() {
    this.app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`App listening on ${PORT} (mode : ${process.env.NODE_ENV})`);
    });
  }

  #initializeCors() {
    const domains = JSON.parse(process.env.CORS_LIST);
    this.app.use(
      cors({
        origin(origin, callback) {
          const isTrue = domains.indexOf(origin) !== -1;
          callback(null, isTrue);
        },
        allowHeaders: 'Origin, Content-Type, X-Requested-With, Accept',
        methods: 'GET, HEAD, PUT, PATCH, POST, DELETE',
        preflightContinue: false,
        credentials: true,
        optionsSuccessStatus: 200,
      }),
    );
  }

  #intializeHealthCheck() {
    this.app.get('/', (req, res) => {
      res.status(200).send('ok');
    });
  }

  #initialzeControllers(controllers) {
    controllers.forEach((controller) => {
      this.app.use(controller.path, controller.router);
    });
  }

  #initializeMiddlewares() {
    this.app.use(morgan('common'));
    this.app.use(express.json({ extended: true, limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  }

  #initializeErrorHandling() {
    this.app.use(ErrorHandler);
  }
}

module.exports = { App };
