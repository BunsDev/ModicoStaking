import { expect, use } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments } from '@nomiclabs/buidler';
import { parseUnits } from 'ethers/lib/utils';
import { BigNumber } from '@ethersproject/bignumber';

import { MockErc20 } from '../build/types/ethers/MockErc20';
import { MockErc20Factory } from '../build/types/ethers/MockErc20Factory';
import { MockStakedRewardsPool } from '../build/types/ethers/MockStakedRewardsPool';
import { MockStakedRewardsPoolFactory } from '../build/types/ethers/MockStakedRewardsPoolFactory';
import { hasOneOfTitles } from './helpers/hasTitle';

use(solidity);

// Define useful variables
const contractName = 'StakedRewardsPool';
const rewardsDecimals = 18;
const stakingDecimals = 18;
const unsupportedDecimals = 18;
function parseRewardsToken(value: string): BigNumber {
	return parseUnits(value, rewardsDecimals);
}
function parseStakingToken(value: string): BigNumber {
	return parseUnits(value, stakingDecimals);
}
function parseUnsupportedToken(value: string): BigNumber {
	return parseUnits(value, unsupportedDecimals);
}
const initRewardsBalance = parseRewardsToken('10000');
const initStakingBalance = parseStakingToken('10000');
const initUnsupportedBalance = parseRewardsToken('10000');

// Define fixture for snapshots
const setupTest = deployments.createFixture(
	async ({ getNamedAccounts, ethers }) => {
		// Ensure fresh deployments
		// await deployments.fixture();

		// Get accounts
		const { deployer, tester } = await getNamedAccounts();
		const deployerSigner = ethers.provider.getSigner(deployer);
		const testerSigner = ethers.provider.getSigner(tester);

		// Deploy mock ERC20's
		const decimals = 18;
		const rewardsToken = await new MockErc20Factory(deployerSigner).deploy(
			'Rewards Token',
			'RERC20',
			rewardsDecimals,
			initRewardsBalance,
		);
		const stakingToken = await new MockErc20Factory(deployerSigner).deploy(
			'Staking Token',
			'SERC20',
			stakingDecimals,
			initStakingBalance,
		);
		const unsupportedToken = await new MockErc20Factory(deployerSigner).deploy(
			'Unsupported Token',
			'UERC20',
			unsupportedDecimals,
			initUnsupportedBalance,
		);

		// Get handles for contract
		const contract = await new MockStakedRewardsPoolFactory(
			deployerSigner,
		).deploy(rewardsToken.address, stakingToken.address, decimals);

		const testerContract = contract.connect(testerSigner);

		return {
			deployer,
			tester,
			contract,
			testerContract,
			rewardsToken,
			stakingToken,
			unsupportedToken,
		};
	},
);

describe(contractName, function () {
	let deployer: string;
	let tester: string;
	let contract: MockStakedRewardsPool;
	let testerContract: MockStakedRewardsPool;
	let rewardsToken: MockErc20;
	let stakingToken: MockErc20;
	let unsupportedToken: MockErc20;

	beforeEach(async function () {
		// Snapshot deployments
		({
			deployer,
			tester,
			contract,
			testerContract,
			rewardsToken,
			stakingToken,
			unsupportedToken,
		} = await setupTest());
	});

	it('State is correct', async function () {
		// Log addresses
		// console.log({ deployer });
		// console.log({ tester });
		// console.log(`contract: ${contract.address}`);

		// Check tokens
		expect(await contract.rewardsToken()).to.eq(
			rewardsToken.address,
			'rewards token address mismatch',
		);
		expect(await contract.stakingToken()).to.eq(
			stakingToken.address,
			'staking token address mismatch',
		);
		expect(await contract.stakingTokenDecimals()).to.eq(
			stakingDecimals,
			'staking token decimals mismatch',
		);

		// Check token balances
		expect(await rewardsToken.balanceOf(deployer)).to.eq(
			initRewardsBalance,
			'rewards token balance mismatch',
		);
		expect(await stakingToken.balanceOf(deployer)).to.eq(
			initStakingBalance,
			'staking token balance mismatch',
		);

		// Check owner address
		expect(await contract.owner()).to.eq(deployer, 'owner address mismatch');

		// Check pause state
		expect(await contract.paused()).to.eq(false, 'paused mismatch');
	});

	describe('stake', function () {
		const amount = parseStakingToken('100');

		beforeEach(async function () {
			await stakingToken.approve(contract.address, amount);
			if (hasOneOfTitles(this, 'should emit Staked event')) return;
			await contract.stake(amount);
		});

		it('should update totalSupply', async function () {
			expect(await contract.totalSupply()).to.eq(amount);
		});

		it('should update balanceOf', async function () {
			expect(await contract.balanceOf(deployer)).to.eq(amount);
		});

		it('should update stakingToken.balanceOf', async function () {
			expect(await stakingToken.balanceOf(deployer)).to.eq(
				initStakingBalance.sub(amount),
			);
		});

		it('should emit Staked event', async function () {
			await expect(contract.stake(amount))
				.to.emit(contract, 'Staked')
				.withArgs(deployer, amount);
		});
	});

	describe('withdraw', function () {
		const amount = parseStakingToken('100');

		beforeEach(async function () {
			await stakingToken.approve(contract.address, amount);
			await contract.stake(amount);
			if (hasOneOfTitles(this, 'should emit Withdrawn event')) return;
			await contract.withdraw(amount);
		});

		it('should update totalSupply', async function () {
			expect(await contract.totalSupply()).to.eq(0);
		});

		it('should update balanceOf', async function () {
			expect(await contract.balanceOf(deployer)).to.eq(0);
		});

		it('should update stakingToken.balanceOf', async function () {
			expect(await stakingToken.balanceOf(deployer)).to.eq(initStakingBalance);
		});

		it('should emit Withdrawn event', async function () {
			await expect(contract.withdraw(amount))
				.to.emit(contract, 'Withdrawn')
				.withArgs(deployer, amount);
		});
	});

	describe('pause', function () {
		beforeEach(async function () {
			if (hasOneOfTitles(this, 'can only be called by owner')) return;
			await contract.pause();
		});

		it('should update paused', async function () {
			expect(await contract.paused()).to.eq(true);
		});

		it('should pause staking', async function () {
			const amount = parseStakingToken('100');
			await stakingToken.approve(contract.address, amount);
			await expect(contract.stake(amount)).to.be.revertedWith('paused');
		});

		it('can only be called by owner', async function () {
			await expect(testerContract.pause()).to.be.revertedWith(
				'caller is not the owner',
			);
		});
	});

	describe('unpause', function () {
		beforeEach(async function () {
			await contract.pause();
			if (hasOneOfTitles(this, 'can only be called by owner')) return;
			await contract.unpause();
		});

		it('should update paused', async function () {
			expect(await contract.paused()).to.eq(false);
		});

		it('should unpause staking', async function () {
			const amount = parseStakingToken('100');
			await stakingToken.approve(contract.address, amount);
			await contract.stake(amount);
			expect(await contract.balanceOf(deployer)).to.eq(amount);
		});

		it('can only be called by owner', async function () {
			await expect(testerContract.unpause()).to.be.revertedWith(
				'caller is not the owner',
			);
		});
	});

	describe('recoverUnsupportedERC20', function () {
		it('should fail to recover nonexistent token', async function () {
			const amount = parseUnsupportedToken('100');
			await expect(
				contract.recoverUnsupportedERC20(
					unsupportedToken.address,
					deployer,
					amount,
				),
			).to.be.revertedWith('transfer amount exceeds balance');
		});

		it('should fail to recover rewards token', async function () {
			const amount = parseRewardsToken('100');
			await rewardsToken.transfer(contract.address, amount);
			await expect(
				contract.recoverUnsupportedERC20(
					rewardsToken.address,
					deployer,
					amount,
				),
			).to.be.revertedWith('cannot withdraw the rewards token');
		});

		it('should fail to recover staking token', async function () {
			const amount = parseStakingToken('100');
			await stakingToken.transfer(contract.address, amount);
			await expect(
				contract.recoverUnsupportedERC20(
					stakingToken.address,
					deployer,
					amount,
				),
			).to.be.revertedWith('cannot withdraw the staking token');
		});

		it('should recover unsupported tokens', async function () {
			const amount = parseUnsupportedToken('100');
			await unsupportedToken.transfer(contract.address, amount);
			await contract.recoverUnsupportedERC20(
				unsupportedToken.address,
				deployer,
				amount,
			);
			expect(await unsupportedToken.balanceOf(contract.address)).to.eq(0);
			expect(await unsupportedToken.balanceOf(deployer)).to.eq(
				initUnsupportedBalance,
			);
		});

		it('should emit Recovered event', async function () {
			const amount = parseUnsupportedToken('100');
			await unsupportedToken.transfer(contract.address, amount);
			await expect(
				contract.recoverUnsupportedERC20(
					unsupportedToken.address,
					deployer,
					amount,
				),
			)
				.to.emit(contract, 'Recovered')
				.withArgs(unsupportedToken.address, deployer, amount);
		});

		it('can only be called by owner', async function () {
			const amount = parseUnsupportedToken('100');
			await unsupportedToken.transfer(contract.address, amount);
			await expect(
				testerContract.recoverUnsupportedERC20(
					unsupportedToken.address,
					tester,
					amount,
				),
			).to.be.revertedWith('caller is not the owner');
		});
	});
});
