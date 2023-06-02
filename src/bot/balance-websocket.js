const WebSocket = require('ws');

const dotenv = require('dotenv');
dotenv.config();

const BINANCE_API_KEY = process.env.BINANCE_API_KEY;

const ws = new WebSocket(`wss://stream.binance.com:9443/ws/!userData@arr`, {
  headers: { 'X-MBX-APIKEY': BINANCE_API_KEY },
});

ws.on('open', () => {
  console.log('WebSocket connection is open.');
});

ws.on('message', (data) => {
  const jsonData = JSON.parse(data);

  if (jsonData.e === 'outboundAccountInfo') {
    const balances = jsonData.B.map((balance) => {
      return {
        asset: balance.a,
        free: parseFloat(balance.f),
        locked: parseFloat(balance.l),
      };
    });

    console.log('Account Balances:', balances);
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('WebSocket connection is closed.');
});
