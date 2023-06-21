<h1 align="center"> Uniswap_Data_Bot </h1>

##### 혹시 Uniswap 관련 작업을 하실 분을 위해서 정리해둡니다.

### ⚙️ 커맨드

- Binance 가격 정보

  ```shell
  npm run start:binance
  ```

- Coingecko 가격 정보(V3 종목)

  ```shell
  npm run start:coingecko-v3
  ```

- Coingecko 가격 정보(V2 종목)

  ```shell
  npm run start:coingecko-v2
  ```

- Uniswap V3 파이프라인(소켓 -> Redis)

  ```shell
  npm run start:socket-v3
  ```

- Uniswap V2 파이프라인(소켓 -> Redis)

  ```shell
  npm run start:socket-v2
  ```

- Uniswap V3 파이프라인(Redis -> RDS)

  ```shell
  npm run start:schedule-v3
  ```

- Uniswap V2 파이프라인(Redis -> RDS)

  ```shell
  npm run start:schedule-v2
  ```

- 자체 API 구동

  ```shell
  npm run start:api
  ```

- 봇 구동

  ```shell
  npm run start:bot
  ```

### 🚀 인프라

- 컴퓨팅

  - AWS EC2 인스턴스 (도쿄)
    - token-price-data : Binacnce, Coingecko에서 각 토큰의 가격 정보를 가져오는 노드
    - uniswap-v3-data : Uniswap V3 거래 데이터 파이프라인
    - uniswap-v2-data : Uniswap V2 거래 데이터 파이프라인 (현재 가동 X)
    - uniswap-api-bot : 자체 API와 봇 (봇은 현재 가동 X)
    - pm2를 통한 무중단 배포 (ecosystem.config.js)
    - ec2 user data와 스크립트 파일을 통해 리부팅 시 자동으로 프로그램 실행 (V3 파이프라인)

- 데이터베이스
  - AWS RDS
    - investment > uniswap_v2_tx
    - investment > uniswap_v3_tx

### ⚡️ 데이터 (src/data/)

> 유니스왑 V2, V3 거래 데이터를 모으기 위한 데이터 파이프라인

- 거래소 (Binance, Coingecko, Uniswap) <-> Redis (local) <-> RDS (AWS)
- Binance 웹소켓과 Coingecko API를 통해서 특정 종목들의 가격 정보를 Redis에 지속적으로 저장
- Uniswap 웹소켓을 통해 여러 풀들의 Swap 이벤트를 받아 Redis에 지속적으로 저장
- cron을 통해 1분에 한번씩 Redis에 있는 값들을 읽어 파싱한 뒤 RDS 내 각 종목 테이블에 저장

### 🔮 API (src/api/)

> 원하는 기간, 종목에 맞는 유니스왑 거래 데이터를 조회하는 API

- Host : 43.206.103.223
- Port : 3000
- 향후 Uniswap 기반 봇에서 포지션 진입 여부를 판단하는 용도로 사용
- [GET] /swap/quantity

  - 하루동안 종목별 거래량을 조회하는 API
  - Uniswap 기반 봇에서 포지션 진입 여부를 판단하는 용도로 사용
  - http://43.206.103.223:3000/swap/quantity

  ```shell
  {
    "success": true,
    "message": "success.",
    "data": {
        "startMoment": 1687238649349,
        "endMoment": 1687325049349,
        "swaps": [
            {
                "symbol": "USDC",
                "quantity": 84385797.31848934
            },
            {
                "symbol": "GRAI",
                "quantity": 87612.08870091086
            },
            {
                "symbol": "PEPE",
                "quantity": -906190972976.5077
            },
        ...
        ]
    }
  }
  ```

- [GET] /swap/tx/\*

  - 특정 기간(ex. 1m, 1h, 1d)동안 특정 종목의 평균 가격, 총 거래량, 순감소량, 순증가량 등을 확인하는 API
  - params : 종목명 (ex. /WETH/WBTC/PEPE)
  - query : 주기(몇분 주기로 거래량을 확인할 것인지, 1m, 3m, 5m, 10m, 30m, 1h, 4h, 12h, 1d)
  - example : http://43.206.103.223:3000/swap/tx/WBTC/PEPE?interval=12h

### 🔥 봇 (src/bot/)

> Uniswap 내 토큰 순유입, 순유출양을 토대로 Binance 선물에서 포지션을 잡는 봇

- 웹소켓을 통해 Binance 선물거래 호가창을 지속적으로 모니터링하고, Redis에 best ask, best bid값을 지속적으로 업데이트
- 특정 시간(ex. 24시간, 3일) 내의 종목 유입, 유출을 토대로 포지션을 잡는 봇 (현재 레버리지: 5배)
- 일정 기간동안 유니스왑 거래소에서 유출량이 제일 많은 토큰에 대해 short 포지션을 잡음
  - 유니스왑 V3 API를 통해 volumeUSD 기준 상위 토큰들의 TVL 정보를 수집
  - 자체 API를 통해 종목들의 순유출, 유입량을 확인
  - 위 정보들을 토대로 각 종목별 델타값을 계산한 뒤에 순감소량이 제일 큰 종목에 대해서 Binace 선물에서 short 포지션을 잡음
- 10초에 한번씩 잔고 조회를 진행하고, 가격 변화를 확인한 뒤 조건에 맞으면 자동 청산
  - API를 통해 확인한 entry price와 Redis에서 가져온 current price를 비교하여 포지션 청산 여부를 결정
  - 30퍼 이상 수익 발생 시 즉시 포지션 종료, 10퍼 이상 손실 발생 시 즉시 포지션 종료
  - 진입 가격 기준 현재 가격 6퍼 감소 시 익절, 2퍼 증가 시 손절
- 포지션 진입 후 일정 시간(ex. 24시간, 3일) 뒤 포지션 자동 청산

<img width="239" alt="redis 예시" src="https://github.com/ziptalk/Uniswap_Data_Bot/assets/46603634/c005d3f3-7679-41ff-b422-17d3c848f518">
