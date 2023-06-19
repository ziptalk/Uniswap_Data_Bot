#!/bin/sh

echo "Initial Script has been executed." >> /home/ubuntu/startup.log 2>&1
sudo redis-server /etc/redis/redis.conf
cd /home/ubuntu/Uniswap_Data_Bot/

sudo pkill -f PM2
sudo pm2 reload /home/ubuntu/Uniswap_Data_Bot/ecosystem.config.js --only uniswap-v3-socket
sudo pm2 reload /home/ubuntu/Uniswap_Data_Bot/ecosystem.config.js --only uniswap-v3-schedule
sudo pm2 startup
sudo pm2 save