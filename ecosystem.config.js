module.exports = {
  apps: [
    {
      name: 'binance-price-socket',
      script: './src/data/script/binance-price.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        MODE: 'BINANCE',
      },
      env_production: {
        MODE: 'BINANCE',
      },
      watch: false,
    },
    {
      name: 'uniswap-v3-socket',
      script: './src/data/script/pipeline-v3.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        MODE: 'SOCKET',
      },
      env_production: {
        MODE: 'SOCKET',
      },
      watch: false,
    },
    {
      name: 'uniswap-v2-socket',
      script: './src/data/script/pipeline-v2.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        MODE: 'SOCKET',
      },
      env_production: {
        MODE: 'SOCKET',
      },
      watch: false,
    },
    {
      name: 'uniswap-v3-scheduler',
      script: './src/data/script/pipeline-v3.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        MODE: 'SCHEDULE',
      },
      env_production: {
        MODE: 'SCHEDULE',
      },
      watch: false,
    },
    {
      name: 'uniswap-v2-scheduler',
      script: './src/data/script/pipeline-v2.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        MODE: 'SCHEDULE',
      },
      env_production: {
        MODE: 'SCHEDULE',
      },
      watch: false,
    },
  ],

  deploy: {
    production: {
      user: 'SSH_USERNAME',
      host: 'SSH_HOSTMACHINE',
      ref: 'origin/master',
      repo: 'GIT_REPOSITORY',
      path: 'DESTINATION_PATH',
      'pre-deploy-local': '',
      'post-deploy':
        'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
    },
  },
};
