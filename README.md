# BrianCoin 🪙

Suite of Solidity smart contracts governing the creation, offering, and trading of BrianCoin (standard ERC-20 token). Deployed to Ethereum test net (Rinkeby), used as a fun learning project for building ERC-20 security and architecture.

<br>
<div style="display: flex;">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" height="20" />
  <img src="https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" height="20" />
  <img src="https://img.shields.io/badge/Amazon%20DynamoDB-4053D6?style=for-the-badge&logo=Amazon%20DynamoDB&logoColor=white" height="20" />
  <img src="https://img.shields.io/badge/Twilio-F22F46?style=for-the-badge&logo=Twilio&logoColor=white" height="20" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" height="20" />
  <img src="https://img.shields.io/badge/Amazon_AWS-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white" height="20" />
</div>

---

## Features

- **ERC-20 Token:** establishes BrianCoin (BRI), standard ERC-20 with toggled transfer fee (BrianCoin.sol)
- **Initial Coin Offering:** mints BRI through ICO contract, allows buy in through multiple phases (Ico.sol)
- **Liquidity Pool:** provides token liquidity with ETH/BRI via automated market maker pool, modeled on Uniswap V2. Provides swap functionality for BRI/ETH pair (Pair.sol/Router.sol)

## Contract adddresses (Rinkeby test)

- _BrianCoin.sol:_ `0x6f2CA1D00748cfe95c4B1cbC151ebACE8FbAEA6D`
- _Ico.sol:_ `0xDC58d35E083F28D398333670b25F28501E4f2C74`
- _Pair.sol:_ `0x2aC0DBe6fA76d959cBA5eB1F86390bEb83F3406A`
- _Router.sol:_ `0xFD6026bfbaFcA0e12f190C7aD31054408C0408cF`

## Local setup

1. Clone repository: `git clone https://github.com/brianwatroba/briancoin.git`
2. Install base project dependencies: cd into root, run `npm install`
3. Install front end dependencies: cd into `frontend`, run `npm install`
4. Add local .env file to project root. Include below env variables (replace keys with your own):

```bash
/.env

ALCHEMY_API_KEY=XXX
RINKEBY_PRIVATE_KEY=xxx
```

## Usage

1. Front end (localhost): cd into `frontend`, run `npm start` to boot server (port 1234)
2. Local testing: tests written in Chai/Mocha using Hardhat/Ethers.js. Run `npx hardhat test` for test suite.
3. Deployment to Rinkeby: ensure your .env file includes your Rinkeby private key. Then run `npx hardhat run scripts/deploy.js --network rinkeby`
4. Deployment to other test nets: add your desired network to the `networks` object in `hardhat-config.js` using the following format:

```javascript
/hardhat.config.js

rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [`${process.env.RINKEBY_PRIVATE_KEY}`],
    },
```

## Contributing

Pull requests are welcome. Feel free to use this project as reference or for learning! It helped me a lot to better understand ERC-20 creation, ICO structures, and how liquidity pools work. Thanks!

## License

[MIT](https://choosealicense.com/licenses/mit/)
