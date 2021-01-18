import {
	BuidlerRuntimeEnvironment,
	DeployFunction,
} from '@nomiclabs/buidler/types';
import { hexZeroPad } from 'ethers/lib/utils';

const contractName = 'StakedRewardsPoolTimedRate';

const func: DeployFunction = async function (bre: BuidlerRuntimeEnvironment) {
	const { deployments, getNamedAccounts } = bre;
	const { deploy } = deployments;

	const { deployer } = await getNamedAccounts();

	const rewardsTokenAddress = hexZeroPad('0x0', 20);
	const stakingTokenAddress = hexZeroPad('0x0', 20);
	await deploy(contractName, {
		from: deployer,
		log: true,
		args: [rewardsTokenAddress, stakingTokenAddress, 18, 0, 10],
		// deterministicDeployment: true,
	});
};

export default func;
func.tags = [contractName];
