# Week 4 Project: Liquidity Pool

#### _Brian Watroba, Block 3_

**Rinkeby deployed contract addresses:**

- _Pair.sol:_ `0x293C4c780c4C6952279721ff676BEDc4595e9f64`
- _Router.sol:_ `0xa030f2c2b84812DB0e08634EcbB0C45C50f465AC`
- _Ico.sol:_ `0x8d36FB0C359e17a1a5449eb76424747895b5f637`
- _SpaceToken.sol:_ `0x797bef1f37d098EEc3A8084e9AD3612894998cB8`

**How to run this project**

- Clone
- Run `npm install` at root, and again in frontend directory
- To run front end dev server: `cd frontend` and run `npm start` script

### NOTES ON PROJECT CODE:

- **SPC token tax - onus on user:** if SPC's tax/fee is enabled, this changes the amount the Pair contract receives relative to what the user believes they're sending. This has implications for "minimum out" values in swapping, as well as adding/removing liquidity. In my opinion, the onus should be on the user or front end to ensure amounts sent are adjusted to account for any token taxes. Uniswap appears to be designed the same way.

### DESIGN EXERCISE:

**_Prompt:_** _How would you extend your LP contract to award additional rewards – say, a separate ERC-20 token – to further incentivize liquidity providers to deposit into your pool?_

**Answer:**

- Utilize ERC-1155 to combine different ERC-20 standards within same LP contract
- Have two ERC-20s within ERC-1155: standard LP token (current implementation), and a second ERC-20 to represent voting rights for fees and other features (similar to Uniswap).
- My second ERC-20 would be attributed based on contract usage/contributions. For instance: historical trading volume, current liquidity provision percentage, etc.
- I Would add DAO elements to allow voting/changes to aspects of the pool, like additional developer fee
