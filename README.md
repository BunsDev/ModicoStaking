# ModicoStaking

Modular Solidity Smart Contracts to Reward SAStakers.

Incorporates:

* Abstract base contract for staking one token and rewarding another.
* Timed rate contract for releasing rewards over a period of time. May be reused for multiple rewards periods.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
	- [Deploy](#deploy)
	- [.env Variables](#env-variables)
	- [Available Networks](#available-networks)
	- [Contract Tags](#contract-tags)
		- [yLandWETHUNIV2Pool](#ylandwethuniv2pool)
- [Out in the Wild](#out-in-the-wild)
- [Contributing](#contributing)
- [License](#license)

## Install

This repository requires some knowledge of:

* [Solidity](https://solidity.readthedocs.io/en/latest/)
* [npm](https://docs.npmjs.com/)
* [TypeScript](https://www.typescriptlang.org/) (for tests)
* [buidler](https://buidler.dev/)

1. Install npm and [pnpm](https://pnpm.js.org/), preferably using
[nvm](https://github.com/nvm-sh/nvm) or
[nvm-windows](https://github.com/coreybutler/nvm-windows).

	```bash
	nvm install 12.19.0
	nvm use 12.19.0
	npm i -g pnpm
	# Check installation
	node --version
	npm --version
	pnpm --version
	```

2. Install dependencies

	```bash
	pnpm install
	```

## Usage

```bash
# Lint
npm run lint
# Compile contracts
npm run compile
# Generate TypeScript contract interfaces from ABI's (required for tests)
npm run gen-types
# Run tests
npm run test
# Deploy to buidler evm
npm run deploy
# Verify on Etherscan
npm run verify -- --network mainnet
# Export ABI and addresses for deployed contracts to build/abi.json.
npm run export -- --network mainnet
# Export ABI and addresses for deployed contracts across all networks to build/abi.json.
npm run export:all
# Flatten a file
npx truffle-flattener <file> > flattened/<file>
```

### Deploy

After installing dependencies, you may deploy specific contracts by specifying tags.

Copy [.env.example](.env.example) to `.env` and replace the fields with your credentials. See the section on [.env Variables](#env-variables) for a description of each variable.

Currently, you may deploy contracts using either a local node or [Infura](https://infura.io/).

```bash
# Install dependencies
pnpm install
# Deploy all contracts to buidlerevm
npx run deploy
```

### .env Variables

| Variable | Type | Description | Default |
| --- | --- | --- | --- |
| MNEMONIC | string | The mnemonic for your wallet needed to deploy from your account. The default is always used for the buidlerevm network. Ganache does not require this either. | `system disease spend wreck student immune domain mind wish body same glove` |
| INFURA_TOKEN | string | The [Infura](https://infura.io/) Project ID needed to use Infura. | |
| ETHERSCAN_API_KEY | string | Your API key for verifying contracts on [Etherscan](https://etherscan.io/apis). | |
| DEPLOYER_ACCOUNT_INDEX | int | The index in your wallet of the account you would like to use for deploying contracts. | `0` |
| TESTER_ACCOUNT_INDEX | int | The index in your wallet of an account you would like to use when running `npm run test`. | `1` |

### Available Networks

The deploy process currently supports the following named networks. More can be added
easily in [buidler.config.ts](buidler.config.ts).

```bash
npx buidler deploy --network http://127.0.0.1:8545
```

| Network | URL | Description |
| --- | --- | --- |
| buidlerevm | N/A | The default network and EVM made by Buidler. Ideal for testing. |
| localhost | `http://127.0.0.1:8545` | A local node for testing. DO NOT use for live networks. |
| ganache | `http://127.0.0.1:7545` | The default ganache port. |
| production | `http://127.0.0.1:8545` | A local node running a live network |
| goerli_infura | `https://goerli.infura.io/v3/${INFURA_TOKEN}` | Infura project endpoint for the Görli testnet. |
| kovan_infura | `https://kovan.infura.io/v3/${INFURA_TOKEN}` | Infura project endpoint for the Kovan testnet. |
| rinkeby_infura | `https://rinkeby.infura.io/v3/${INFURA_TOKEN}` | Infura project endpoint for the Rinkeby testnet. |
| ropsten_infura | `https://ropsten.infura.io/v3/${INFURA_TOKEN}` | Infura project endpoint for the Ropsten testnet. |
| mainnet_infura | `https://mainnet.infura.io/v3/${INFURA_TOKEN}` | Infura project endpoint for the Ethereum mainnet. |

### Contract Tags

#### yLandWETHUNIV2Pool

contract: [StakedRewardsPoolTimedRate.sol](contracts/StakedRewardsPoolTimedRate.sol)

```bash
# Deploy using a local node
npx buidler deploy --network production --tags yLandWETHUNIV2Pool
# Deploy to ropsten using Infura
npx buidler deploy --network ropsten_infura --tags yLandWETHUNIV2Pool
# Deploy to mainnet using Infura
npx buidler deploy --network mainnet_infura --tags yLandWETHUNIV2Pool
```

## Out in the Wild

_Disclaimer: This document does not serve to endorse or promote any project referenced below, whether expressly, by implication, estoppel or otherwise. This document does not serve as permission to use the name of the copyright holder nor the names of its contributors to endorse or promote any projects referenced below._

### yLand Liquidity Farming
As of October 16th, 2020, Yearn Land is using `StakingRewardsPoolTimedRate` (the `yLandWETHUNIV2Pool` deployment tag) to offer farming yLand by staking a Uniswap liquidity pair. It is a rewards pool for staking yLand-WETH UNI-V2 pair tokens and earning yLand as a reward over a defined period of time. Once yLand is deposited to the contract, an administrator may update the contract to increase the reward schedule for the current or future staking period.

## Contributing

1. [Fork it](https://github.com/CryptoUnico/ModicoStaking/fork)
2. Create your feature or fix branch (`git checkout -b feature/fooBar`)
3. Commit your changes (`git commit -am 'Add some fooBar'`)
4. Push to the branch (`git push origin feature/fooBar`)
5. Create a new Pull Request (PR)

## License

`ModicoStaking` is licensed under the terms of the
[MIT License](https://opensource.org/licenses/MIT). See
[LICENSE](LICENSE) for more information.
