import { BuidlerConfig, usePlugin } from '@nomiclabs/buidler/config';
import { Wallet } from '@ethersproject/wallet';
import dotenv from 'dotenv';
import { HDAccountsConfig } from '@nomiclabs/buidler/types';

dotenv.config();

// No need for this line since buidler-waffle already does it
// usePlugin("@nomiclabs/buidler-ethers");
usePlugin('@nomiclabs/buidler-waffle');
usePlugin('buidler-deploy');

// Use the ganache mnemonic to generate buidlerevm accounts. We can then verify
// deterministic deployments across both networks.
const insecure_mnemonic =
	'system disease spend wreck student immune domain mind wish body same glove';
const buidlerEvmAccounts = new Array<{ privateKey: string; balance: string }>(
	10,
);
for (let i = 0; i < buidlerEvmAccounts.length; i++) {
	const wallet = Wallet.fromMnemonic(insecure_mnemonic, "m/44'/60'/0'/0/" + i);
	buidlerEvmAccounts[i] = {
		privateKey: wallet.privateKey,
		// 10_000 ETH
		balance: '0x10000000000000000000000',
	};
}

// Read environment to setup accounts for deploying
const mnemonic = process.env.MNEMONIC ?? insecure_mnemonic;
const accounts: HDAccountsConfig = { mnemonic };
const deployer = process.env.DEPLOYER_ACCOUNT_INDEX
	? parseInt(process.env.DEPLOYER_ACCOUNT_INDEX, 10)
	: 0;
const tester = process.env.TESTER_ACCOUNT_INDEX
	? parseInt(process.env.TESTER_ACCOUNT_INDEX, 10)
	: 1;

const config: BuidlerConfig = {
	defaultNetwork: 'buidlerevm',
	networks: {
		buidlerevm: {
			accounts: buidlerEvmAccounts,
		},
		localhost: {
			live: false, // default for localhost & buidlerevm
			url: 'http://127.0.0.1:8545',
		},
		ganache: {
			live: false,
			url: 'http://127.0.0.1:7545',
		},
		production: {
			url: 'http://127.0.0.1:8545',
			accounts,
		},
		goerli_infura: {
			url: `https://goerli.infura.io/v3/${process.env.INFURA_TOKEN}`,
			accounts,
		},
		kovan_infura: {
			url: `https://kovan.infura.io/v3/${process.env.INFURA_TOKEN}`,
			accounts,
		},
		rinkeby_infura: {
			url: `https://rinkeby.infura.io/v3/${process.env.INFURA_TOKEN}`,
			accounts,
		},
		ropsten_infura: {
			url: `https://ropsten.infura.io/v3/${process.env.INFURA_TOKEN}`,
			accounts,
		},
		mainnet_infura: {
			url: `https://mainnet.infura.io/v3/${process.env.INFURA_TOKEN}`,
			accounts,
		},
	},
	solc: {
		version: '0.7.3',
		optimizer: {
			enabled: true,
			runs: 200,
		},
	},
	paths: {
		sources: './contracts',
		tests: './test',
		cache: './build/cache',
		artifacts: './build/artifacts',
	},
	// buidler-deploy
	namedAccounts: {
		// deployer uses first account by default
		deployer,
		// tests use this account when the deployer is undesirable
		tester,
	},
};

export default config;
