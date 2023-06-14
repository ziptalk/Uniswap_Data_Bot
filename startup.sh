#!/bin/sh

echo "Initial Script has been executed." >> startup.log 2>&1
pm2 start ecosystem.config.js --only uniswap-v3-socket
pm2 start ecosystem.config.js --only uniswap-v3-schedule
pm2 list >> startup.log 2>&1
