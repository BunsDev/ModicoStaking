import {
	BuidlerRuntimeEnvironment,
	DeployFunction,
} from '@nomiclabs/buidler/types';
import { hexZeroPad } from 'ethers/lib/utils';

const contractName = 'yLandWETHUNIV2Pool';

const func: DeployFunction = async function (bre: BuidlerRuntimeEnvironment) {
	const { deployments, getNamedAccounts, getChainId } = bre;
	const { deploy } = deployments;

	const { deployer } = await getNamedAccounts();

	const chainId = await getChainId();
	let rewardsTokenAddress: string | undefined;
	let stakingTokenAddress: string | undefined;
	switch (chainId) {
		// buidlerevm
		case '31337': {
			rewardsTokenAddress = hexZeroPad('0x0', 20);
			stakingTokenAddress = hexZeroPad('0x0', 20);
			break;
		}
		// ganache
		case '1337': {
			rewardsTokenAddress = hexZeroPad('0x0', 20);
			stakingTokenAddress = hexZeroPad('0x0', 20);
			break;
		}
		// kovan
		case '42': {
			rewardsTokenAddress = undefined;
			stakingTokenAddress = undefined;
			break;
		}
		// rinkeby
		case '4': {
			rewardsTokenAddress = undefined;
			stakingTokenAddress = undefined;
			break;
		}
		// ropsten
		case '3': {
			rewardsTokenAddress = '0x42F319E7c1cc0638722a524B0351E6E7DD451f87';
			stakingTokenAddress = '0x835cA352b658500eAe43e76021E1f8dbb01D0acA';
			break;
		}
		// mainnet
		case '1': {
			rewardsTokenAddress = undefined;
			stakingTokenAddress = undefined;
			break;
		}
	}

	if (!rewardsTokenAddress || !stakingTokenAddress) {
		throw new Error('Token addresses undefined for current network');
	}

	await deploy(contractName, {
		contract: 'StakedRewardsPoolTimedRate',
		from: deployer,
		log: true,
		args: [rewardsTokenAddress, stakingTokenAddress, 18, 0, 10],
	});
};

export default func;
func.tags = [contractName];
