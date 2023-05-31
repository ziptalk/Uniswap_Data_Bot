const axios = require('axios');
const { BinanceApiHandler } = require('../data/binance-api-handler');

// 1분에 한번씩 API를 호출해서 증감량을 확인함
// API를 지속적으로 호출해서 증감량을 확인해서

async function main() {
  // 모니터링 할 토큰과 각종 파라미터들을 설정함
  // const tokens = ['WETH', 'PEPE'];
  const tokens = ['PEPE'];
  const interval = '1h';
  const limit = 10000;
  const url = 'http://43.206.103.223:3000';
  const path = 'swap';
  const params = tokens.join('/');
  const query = `interval=${interval}&limit=${limit}`;

  try {
    const response = await axios.get(`${url}/${path}/${params}?${query}`);
    const data = response.data.data;
    for (let datum of data) {
      console.log('datum', datum);
    }
  } catch (error) {
    console.error(
      `[Axios Error] ${error.response.data.message} (status : ${error.response.status})))`,
    );
    process.exit(0);
  }

  //   const data = response.data;
  //   console.log('data.message', data.message);
  //   //   console.log('response.status', response.status);
  //   if (!response.status === 200) {
  //     console.log('hello');
  //     // console.error(
  //     //   `[Axios Error] ${data.message} (status : ${response.status})))`,
  //     // );
  //     process.exit(0);
  //   }
  //   //   console.log(response);
}

main();
