#!/bin/sh

echo "Initial Script has been executed."
pm2 start ecosystem.config.js --only uniswap-v3-socket >> startup.log 2>&1
pm2 start ecosystem.config.js --only uniswap-v3-schedule >> startup.log 2>&1
