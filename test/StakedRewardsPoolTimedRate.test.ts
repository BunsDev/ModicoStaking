import { expect, use } from 'chai';
import { solidity } from 'ethereum-waffle';
import { deployments } from '@nomiclabs/buidler';
import { parseUnits } from 'ethers/lib/utils';
import { BigNumber } from '@ethersproject/bignumber';
import { JsonRpcProvider } from '@ethersproject/providers';
import FakeTimers from '@sinonjs/fake-timers';

import { MockErc20 } from '../build/types/ethers/MockErc20';
import { MockErc20Factory } from '../build/types/ethers/MockErc20Factory';
import { StakedRewardsPoolTimedRate } from '../build/types/ethers/StakedRewardsPoolTimedRate';
import { StakedRewardsPoolTimedRateFactory } from '../build/types/ethers/StakedRewardsPoolTimedRateFactory';
import { hasOneOfTitles } from './helpers/hasTitle';
import { mineBlock } from './helpers/timeTravel';

use(solidity);

// Define useful variables
const contractName = 'StakedRewardsPoolTimedRate';
const rewardsDecimals = 18;
const stakingDecimals = 18;
function parseRewardsToken(value: string): BigNumber {
	return parseUnits(value, rewardsDecimals);
}
function parseStakingToken(value: string): BigNumber {
	return parseUnits(value, stakingDecimals);
}
const initRewardsBalance = parseRewardsToken('10000');
const initStakingBalance = parseStakingToken('10000');

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

		// Get handles for contract
		const contract = await new StakedRewardsPoolTimedRateFactory(
			deployerSigner,
		).deploy(rewardsToken.address, stakingToken.address, decimals, 0, 10);

		const testerContract = contract.connect(testerSigner);

		return {
			deployer,
			tester,
			contract,
			testerContract,
			rewardsToken,
			stakingToken,
		};
	},
);

describe(contractName, function () {
	let deployer: string;
	let tester: string;
	let contract: StakedRewardsPoolTimedRate;
	let testerContract: StakedRewardsPoolTimedRate;
	let rewardsToken: MockErc20;
	let stakingToken: MockErc20;

	beforeEach(async function () {
		// Snapshot deployments
		({
			deployer,
			tester,
			contract,
			testerContract,
			rewardsToken,
			stakingToken,
		} = await setupTest());
	});

	it('State is correct', async function () {
		// Log addresses
		// console.log({ deployer });
		// console.log({ tester });
		// console.log(`contract: ${contract.address}`);

		// Check period
		expect(await contract.periodStartTime()).to.eq(
			0,
			'period start time mismatch',
		);
		expect(await contract.periodEndTime()).to.eq(
			10,
			'period end time mismatch',
		);
		expect(await contract.periodDuration()).to.eq(
			10,
			'period duration mismatch',
		);
		expect(await contract.hasStarted()).to.eq(
			true,
			'period hasStarted mismatch',
		);
		expect(await contract.hasEnded()).to.eq(true, 'period hasEnded mismatch');
		expect(await contract.timeRemainingInPeriod()).to.eq(
			0,
			'time remaining in period mismatch',
		);
	});

	/* StakedRewardsPoolTimedRate-specific */

	describe('staking period', function () {
		let unixTime: number;
		let startTime: number;
		let endTime: number;
		let clock: FakeTimers.InstalledClock;
		const offset = 60;
		const duration = 1800;
		// const duration = 60 * 24 * 60 * 60;

		beforeEach(function () {
			const now = Date.now();
			unixTime = Math.floor(now / 1000);
			startTime = unixTime + offset;
			endTime = startTime + duration;
			clock = FakeTimers.install({ now, shouldAdvanceTime: true });
		});

		afterEach(function () {
			clock.reset();
		});

		after(function () {
			clock.uninstall();
		});

		describe('setNewPeriod', function () {
			it('should emit NewPeriodSet', async function () {
				await expect(contract.setNewPeriod(startTime, endTime))
					.to.emit(contract, 'NewPeriodSet')
					.withArgs(startTime, endTime);
			});

			it('should update periodStartTime', async function () {
				await contract.setNewPeriod(startTime, endTime);
				expect(await contract.periodStartTime()).to.eq(startTime);
			});

			it('should update periodEndTime', async function () {
				await contract.setNewPeriod(startTime, endTime);
				expect(await contract.periodEndTime()).to.eq(endTime);
			});

			it('should update periodDuration', async function () {
				await contract.setNewPeriod(startTime, endTime);
				expect(await contract.periodDuration()).to.eq(duration);
			});

			it('should fail when startTime < currentTime', async function () {
				const startTime = unixTime - 5;
				await expect(
					contract.setNewPeriod(startTime, endTime),
				).to.be.revertedWith(
					'startTime must be greater than the current block time',
				);
			});

			it('should fail when endTime < startTime', async function () {
				await expect(
					contract.setNewPeriod(startTime, unixTime),
				).to.be.revertedWith('endTime must be greater than startTime');
			});

			it('should fail when called during ongoing period', async function () {
				await contract.setNewPeriod(startTime, endTime);
				clock.setSystemTime((startTime + 1) * 1000);
				await expect(
					contract.setNewPeriod(startTime, endTime),
				).to.be.revertedWith('cannot change an ongoing staking period');
			});

			it('should succeed when called after periodEndTime', async function () {
				await contract.setNewPeriod(startTime, endTime);
				clock.setSystemTime((endTime + 1) * 1000);
				const newStartTime = endTime + offset;
				const newEndTime = newStartTime + duration;
				await contract.setNewPeriod(newStartTime, newEndTime);
				expect(await contract.periodStartTime()).to.eq(newStartTime);
			});

			it('should updateAccrual');

			it('can only be called by owner', async function () {
				await expect(
					testerContract.setNewPeriod(startTime, endTime),
				).to.be.revertedWith('caller is not the owner');
			});
		});

		describe('hasStarted', function () {
			it('should be false before startTime', async function () {
				await contract.setNewPeriod(startTime, endTime);
				expect(await contract.hasStarted()).to.eq(false);
			});

			it('should be true after startTime', async function () {
				await contract.setNewPeriod(startTime, endTime);
				clock.setSystemTime((startTime + 1) * 1000);
				// mine a block to update block.timestamp for views
				await mineBlock(contract.provider as JsonRpcProvider);
				expect(await contract.hasStarted()).to.eq(true);
			});

			it('should be true after startTime and before endTime', async function () {
				await contract.setNewPeriod(startTime, endTime);
				clock.setSystemTime((startTime + 1) * 1000);
				// mine a block to update block.timestamp for views
				await mineBlock(contract.provider as JsonRpcProvider);
				expect(await contract.hasStarted()).to.eq(true);
			});

			it('should toggle to false after setting a new period', async function () {
				await contract.setNewPeriod(startTime, endTime);

				clock.setSystemTime((endTime + 1) * 1000);

				// mine a block to update block.timestamp for views
				await mineBlock(contract.provider as JsonRpcProvider);

				expect(await contract.hasStarted()).to.eq(true);

				const newStartTime = endTime + offset;
				const newEndTime = newStartTime + duration;
				await contract.setNewPeriod(newStartTime, newEndTime);

				expect(await contract.hasStarted()).to.eq(false);
			});
		});

		describe('hasEnded', function () {
			it('should be false before startTime', async function () {
				await contract.setNewPeriod(startTime, endTime);
				expect(await contract.hasEnded()).to.eq(false);
			});

			it('should be false after startTime and before endTime', async function () {
				await contract.setNewPeriod(startTime, endTime);
				clock.setSystemTime((startTime + 1) * 1000);
				expect(await contract.hasEnded()).to.eq(false);
			});

			it('should be true after endTime', async function () {
				await contract.setNewPeriod(startTime, endTime);
				clock.setSystemTime((endTime + 1) * 1000);
				// mine a block to update block.timestamp for views
				await mineBlock(contract.provider as JsonRpcProvider);
				expect(await contract.periodEndTime()).to.eq(endTime);
				expect(await contract.hasEnded()).to.eq(true);
			});

			it('should toggle to false after setting a new period', async function () {
				await contract.setNewPeriod(startTime, endTime);

				clock.setSystemTime((endTime + 1) * 1000);
				// mine a block to update block.timestamp for views
				await mineBlock(contract.provider as JsonRpcProvider);
				expect(await contract.hasEnded()).to.eq(true);

				const newStartTime = endTime + offset;
				const newEndTime = newStartTime + duration;
				await contract.setNewPeriod(newStartTime, newEndTime);
				expect(await contract.hasEnded()).to.eq(false);
			});
		});

		describe('timeRemainingInPeriod', function () {
			it('should be zero after endTime', async function () {
				await contract.setNewPeriod(startTime, endTime);
				clock.setSystemTime((endTime + 1) * 1000);
				// mine a block to update block.timestamp for views
				await mineBlock(contract.provider as JsonRpcProvider);
				expect(await contract.timeRemainingInPeriod()).to.eq(0);
			});

			it('should revert before startTime', async function () {
				await contract.setNewPeriod(startTime, endTime);
				await expect(contract.timeRemainingInPeriod()).to.be.revertedWith(
					'current rewards distribution period has not yet begun',
				);
			});

			it('should be greater than zero during period', async function () {
				await contract.setNewPeriod(startTime, endTime);
				clock.setSystemTime((startTime + 1) * 1000);
				// mine a block to update block.timestamp for views
				await mineBlock(contract.provider as JsonRpcProvider);
				expect(await contract.timeRemainingInPeriod()).to.be.gt(0);
			});

			describe('should be close', async function () {
				it('when time remaining is 10s', async function () {
					await contract.setNewPeriod(startTime, endTime);
					clock.setSystemTime((endTime - 10) * 1000);
					// mine a block to update block.timestamp for views
					await mineBlock(contract.provider as JsonRpcProvider);
					expect(
						(await contract.timeRemainingInPeriod()).toNumber(),
					).to.be.within(1, 10);
				});

				it('when time is startTime + duration / 2', async function () {
					const timeLeft = duration / 2;
					await contract.setNewPeriod(startTime, endTime);
					clock.setSystemTime((startTime + timeLeft) * 1000);
					// mine a block to update block.timestamp for views
					await mineBlock(contract.provider as JsonRpcProvider);
					expect(
						(await contract.timeRemainingInPeriod()).toNumber(),
					).to.be.within(timeLeft - 10, timeLeft);
				});

				it('when time is startTime', async function () {
					await contract.setNewPeriod(startTime, endTime);
					clock.setSystemTime(startTime * 1000);
					// mine a block to update block.timestamp for views
					await mineBlock(contract.provider as JsonRpcProvider);
					expect(
						(await contract.timeRemainingInPeriod()).toNumber(),
					).to.be.within(duration - 10, duration);
				});
			});
		});

		describe('lastTimeRewardApplicable', function () {
			it('should return zero before the first staking period', async function () {
				// Deploy a new contract that hasn't begun
				const newContract = await new StakedRewardsPoolTimedRateFactory(
					contract.signer,
				).deploy(
					rewardsToken.address,
					stakingToken.address,
					stakingDecimals,
					startTime,
					endTime,
				);
				expect(await newContract.lastTimeRewardApplicable()).to.eq(0);
			});

			it('should return endTime after any staking period', async function () {
				const endTime = await contract.periodEndTime();
				expect(await contract.lastTimeRewardApplicable()).to.eq(endTime);
			});

			it('should return endTime after a period and before a new period', async function () {
				const lastEndTime = await contract.periodEndTime();
				await contract.setNewPeriod(startTime, endTime);
				expect(await contract.lastTimeRewardApplicable()).to.eq(lastEndTime);
			});

			it('should be close to current timestamp during period', async function () {
				const currentTime = startTime + 1;
				await contract.setNewPeriod(startTime, endTime);
				clock.setSystemTime(currentTime * 1000);
				// mine a block to update block.timestamp for views
				await mineBlock(contract.provider as JsonRpcProvider);
				expect(
					(await contract.lastTimeRewardApplicable()).toNumber(),
				).to.be.within(currentTime, currentTime + 15);
			});
		});

		describe('addToRewardsAllocation', function () {
			const amount = parseRewardsToken('100');

			it('should emit RewardAdded event', async function () {
				await expect(contract.addToRewardsAllocation(amount))
					.to.emit(contract, 'RewardAdded')
					.withArgs(amount);
			});

			it('should adjust rewardRate', async function () {
				const rewardRate = amount.div(duration);
				await contract.setNewPeriod(startTime, endTime);
				await contract.addToRewardsAllocation(amount);
				expect(await contract.rewardRate()).to.eq(rewardRate);
			});

			it('can only be called by owner', async function () {
				await expect(
					testerContract.addToRewardsAllocation(amount),
				).to.be.revertedWith('caller is not the owner');
			});
		});

		describe('rewardRate', function () {
			const amount = parseRewardsToken('100');
			const rewardRate = amount.div(duration);

			describe('should return zero', function () {
				it('when creating a new period', async function () {
					await contract.setNewPeriod(startTime, endTime);
					expect(await contract.rewardRate()).to.eq(0);
				});

				it('when adding rewards before creating the next period', async function () {
					await contract.addToRewardsAllocation(amount);
					await contract.setNewPeriod(startTime, endTime);
					expect(await contract.rewardRate()).to.eq(0);
				});
			});

			describe('should be correct', function () {
				describe('when adding rewards', function () {
					beforeEach(async function () {
						await contract.setNewPeriod(startTime, endTime);
					});

					it('during period', async function () {
						// Add rewards during period
						clock.setSystemTime((startTime + duration / 2) * 1000);
						await contract.addToRewardsAllocation(amount);
						// Expect adjusted reward rate
						const newRewardRate = amount.div(duration / 2);
						// Allow 3% slippage due to time
						const tolerance = newRewardRate.mul(3).div(100);
						expect(await contract.rewardRate())
							.to.be.gt(newRewardRate)
							.and.lt(newRewardRate.add(tolerance));
					});

					describe('before first period', function () {
						beforeEach(async function () {
							await contract.addToRewardsAllocation(amount);
						});

						it('before period', async function () {
							expect(await contract.rewardRate()).to.eq(rewardRate);
						});

						it('during period', async function () {
							clock.setSystemTime((startTime + duration / 2) * 1000);
							// mine a block to update block.timestamp for views
							await mineBlock(contract.provider as JsonRpcProvider);
							expect(await contract.rewardRate()).to.eq(rewardRate);
						});

						it('after period', async function () {
							clock.setSystemTime((endTime + 1) * 1000);
							// mine a block to update block.timestamp for views
							await mineBlock(contract.provider as JsonRpcProvider);
							expect(await contract.rewardRate()).to.eq(rewardRate);
						});

						it('and adding during period', async function () {
							// Add rewards during period
							clock.setSystemTime((startTime + duration / 2) * 1000);
							await contract.addToRewardsAllocation(amount);
							// Expect adjusted reward rate
							const newRewardRate = rewardRate.add(amount.div(duration / 2));
							// Allow 3% slippage due to time
							const tolerance = newRewardRate.mul(3).div(100);
							expect(await contract.rewardRate())
								.to.be.gt(newRewardRate)
								.and.lt(newRewardRate.add(tolerance));
						});
					});

					describe('while creating next period', function () {
						let newDuration: number;
						let newStartTime: number;
						let newEndTime: number;

						beforeEach(async function () {
							clock.setSystemTime((endTime + 1) * 1000);
							// Set new period
							newStartTime = endTime + offset;
							newDuration = duration + offset;
							newEndTime = newStartTime + newDuration;
						});

						it('before changing next period', async function () {
							await contract.addToRewardsAllocation(amount);
							await contract.setNewPeriod(newStartTime, newEndTime);
							expect(await contract.rewardRate()).to.eq(0);
						});

						it('after changing next period', async function () {
							await contract.setNewPeriod(newStartTime, newEndTime);
							await contract.addToRewardsAllocation(amount);
							const newRewardRate = amount.div(newDuration);
							expect(await contract.rewardRate()).to.eq(newRewardRate);
						});
					});
				});
			});
		});

		describe('accruedRewardPerToken', function () {
			const amount = parseRewardsToken('100');

			function shouldReturnZero(): void {
				it('before first period with rewards', async function () {
					await contract.addToRewardsAllocation(amount);
					expect(await contract.accruedRewardPerToken()).to.eq(0);
				});

				it('during first period without rewards', async function () {
					clock.setSystemTime((startTime + duration / 2) * 1000);
					// mine a block to update block.timestamp for views
					await mineBlock(contract.provider as JsonRpcProvider);
					expect(await contract.accruedRewardPerToken()).to.eq(0);
				});

				it('after first period without rewards', async function () {
					clock.setSystemTime((endTime + 1) * 1000);
					// mine a block to update block.timestamp for views
					await mineBlock(contract.provider as JsonRpcProvider);
					expect(await contract.accruedRewardPerToken()).to.eq(0);
				});
			}

			describe('with stakers', function () {
				let testStakingToken: MockErc20;
				const amountStaked = parseStakingToken('10');
				const rewardRate = amount.div(duration);

				// TODO test w/ staking before setting period
				// TODO test w/ staking after adding rewards

				beforeEach(async function () {
					await contract.setNewPeriod(startTime, endTime);
					if (hasOneOfTitles(this, 'when stakers come late')) return;
					// Stake deployer
					await stakingToken.approve(contract.address, amountStaked);
					await contract.stake(amountStaked);
					// Stake tester
					testStakingToken = stakingToken.connect(testerContract.signer);
					await stakingToken.transfer(tester, amountStaked);
					await testStakingToken.approve(contract.address, amountStaked);
					await testerContract.stake(amountStaked);
				});

				describe('should return zero', shouldReturnZero);

				describe('should be constant', async function () {
					const expected = rewardRate
						.mul(duration)
						.mul(parseStakingToken('1'))
						.div(amountStaked.mul(2));

					beforeEach(async function () {
						await contract.addToRewardsAllocation(amount);
					});

					it('after all stakers have withdrawn', async function () {
						// fast-forward
						const currentTime = startTime + duration / 2;
						clock.setSystemTime(currentTime * 1000);

						// Withdraw
						await contract.withdraw(amountStaked);
						await testerContract.withdraw(amountStaked);

						// Estimate expected value
						const expected = rewardRate
							.mul(currentTime - startTime)
							.mul(parseStakingToken('1'))
							.div(amountStaked.mul(2));
						// 3% tolerance needed for 10 minute duration
						const tolerance = expected.mul(3).div(100);

						// Expect current value
						const actual = await contract.accruedRewardPerToken();
						expect(actual).to.be.gt(expected).and.lt(expected.add(tolerance));

						// fast-forward to end
						clock.setSystemTime((endTime + 1) * 1000);
						// mine a block to update block.timestamp for views
						await mineBlock(contract.provider as JsonRpcProvider);

						// Expect same value
						expect(await contract.accruedRewardPerToken()).to.eq(actual);
					});

					it('after period has ended', async function () {
						clock.setSystemTime((endTime + 1) * 1000);
						// mine a block to update block.timestamp for views
						await mineBlock(contract.provider as JsonRpcProvider);
						expect(await contract.accruedRewardPerToken()).to.eq(expected);

						// Fast forward some more
						clock.setSystemTime((endTime + duration) * 1000);
						// mine a block to update block.timestamp for views
						await mineBlock(contract.provider as JsonRpcProvider);
						expect(await contract.accruedRewardPerToken()).to.eq(expected);
					});

					it('before new period starts', async function () {
						clock.setSystemTime((endTime + 1) * 1000);

						// Add some more
						await contract.addToRewardsAllocation(amount);

						// Create new period
						const newStartTime = endTime + offset;
						const newDuration = duration + offset;
						const newEndTime = newStartTime + newDuration;
						await contract.setNewPeriod(newStartTime, newEndTime);

						// Add even more for good measure
						await contract.addToRewardsAllocation(amount);

						expect(await contract.accruedRewardPerToken()).to.eq(expected);

						// Fast forward some more
						clock.setSystemTime((endTime + offset / 2) * 1000);
						// mine a block to update block.timestamp for views
						await mineBlock(contract.provider as JsonRpcProvider);
						expect(await contract.accruedRewardPerToken()).to.eq(expected);
					});

					it('while changing totalSupply outside of period', async function () {
						clock.setSystemTime((endTime + 1) * 1000);

						await stakingToken.approve(contract.address, amountStaked);
						await contract.stake(amountStaked);

						expect(await contract.accruedRewardPerToken()).to.eq(expected);

						// Fast forward some more
						clock.setSystemTime((endTime + duration) * 1000);
						// mine a block to update block.timestamp for views
						await mineBlock(contract.provider as JsonRpcProvider);
						expect(await contract.accruedRewardPerToken()).to.eq(expected);
					});
				});

				describe('should be close during period', async function () {
					beforeEach(async function () {
						await contract.addToRewardsAllocation(amount);
					});

					it('with constant total supply', async function () {
						// Estimate expected value
						const currentTime = startTime + duration / 2;
						const expected = rewardRate
							.mul(currentTime - startTime)
							.mul(parseStakingToken('1'))
							.div(amountStaked.mul(2));
						// 3% tolerance needed for 10 minute duration
						const tolerance = expected.mul(3).div(100);

						// fast-forward
						clock.setSystemTime(currentTime * 1000);
						// mine a block to update block.timestamp for views
						await mineBlock(contract.provider as JsonRpcProvider);

						// Expect current value
						expect(await contract.accruedRewardPerToken())
							.to.be.gt(expected)
							.and.lt(expected.add(tolerance));
					});

					it('when total supply increases', async function () {
						const firstTime = startTime + duration / 2;
						// fast-forward
						clock.setSystemTime(firstTime * 1000);

						// Estimate expected value
						let expected = rewardRate
							.mul(firstTime - startTime)
							.mul(parseStakingToken('1'))
							.div(amountStaked.mul(2));

						await stakingToken.approve(contract.address, amountStaked);
						await contract.stake(amountStaked);

						// Estimate next expected value
						const secondTime = firstTime + duration / 4;
						expected = expected.add(
							rewardRate
								.mul(secondTime - firstTime)
								.mul(parseStakingToken('1'))
								.div(amountStaked.mul(3)),
						);
						// 3% tolerance needed for 10 minute duration
						const tolerance = expected.mul(3).div(100);

						// fast-forward
						clock.setSystemTime(secondTime * 1000);
						// mine a block to update block.timestamp for views
						await mineBlock(contract.provider as JsonRpcProvider);

						// Expect current value
						expect(await contract.accruedRewardPerToken())
							.to.be.gt(expected)
							.and.lt(expected.add(tolerance));
					});

					it('when total supply decreases', async function () {
						const firstTime = startTime + duration / 2;
						// fast-forward
						clock.setSystemTime(firstTime * 1000);

						// Estimate expected value
						let expected = rewardRate
							.mul(firstTime - startTime)
							.mul(parseStakingToken('1'))
							.div(amountStaked.mul(2));

						await testerContract.withdraw(amountStaked);

						// Estimate next expected value
						const secondTime = firstTime + duration / 4;
						expected = expected.add(
							rewardRate
								.mul(secondTime - firstTime)
								.mul(parseStakingToken('1'))
								.div(amountStaked),
						);
						// 3% tolerance needed for 10 minute duration
						const tolerance = expected.mul(3).div(100);

						// fast-forward
						clock.setSystemTime(secondTime * 1000);
						// mine a block to update block.timestamp for views
						await mineBlock(contract.provider as JsonRpcProvider);

						// Expect current value
						expect(await contract.accruedRewardPerToken())
							.to.be.gt(expected)
							.and.lt(expected.add(tolerance));
					});

					it('when stakers come late', async function () {
						// Setup for staking
						// Setup deployer
						await stakingToken.approve(contract.address, amountStaked);
						// Setup tester
						testStakingToken = stakingToken.connect(testerContract.signer);
						await stakingToken.transfer(tester, amountStaked);
						await testStakingToken.approve(contract.address, amountStaked);

						// fast-forward
						const firstTime = startTime + duration / 2;
						clock.setSystemTime(firstTime * 1000);

						// Stake deployer
						await contract.stake(amountStaked);
						// Stake tester
						await testerContract.stake(amountStaked);

						// Estimate next expected value
						const secondTime = firstTime + duration / 4;
						const expected = rewardRate
							.mul(secondTime - firstTime)
							.mul(parseStakingToken('1'))
							.div(amountStaked.mul(2));
						// 3% tolerance needed for 10 minute duration
						const tolerance = expected.mul(3).div(100);

						// fast-forward
						clock.setSystemTime(secondTime * 1000);
						// mine a block to update block.timestamp for views
						await mineBlock(contract.provider as JsonRpcProvider);

						// Expect current value
						expect(await contract.accruedRewardPerToken())
							.to.be.gt(expected)
							.and.lt(expected.add(tolerance));
					});

					it('when rewards are added', async function () {
						const firstTime = startTime + duration / 2;
						// fast-forward
						clock.setSystemTime(firstTime * 1000);

						// Estimate expected value
						let expected = rewardRate
							.mul(firstTime - startTime)
							.mul(parseStakingToken('1'))
							.div(amountStaked.mul(2));

						await contract.addToRewardsAllocation(amount);

						// Estimate next expected value
						const secondTime = firstTime + duration / 4;
						const newRewardRate = rewardRate.add(
							amount.div(endTime - firstTime),
						);
						expected = expected.add(
							newRewardRate
								.mul(secondTime - firstTime)
								.mul(parseStakingToken('1'))
								.div(amountStaked.mul(2)),
						);
						// 3% tolerance needed for 10 minute duration
						const tolerance = expected.mul(3).div(100);

						// fast-forward
						clock.setSystemTime(secondTime * 1000);
						// mine a block to update block.timestamp for views
						await mineBlock(contract.provider as JsonRpcProvider);

						// Expect current value
						expect(await contract.accruedRewardPerToken())
							.to.be.gt(expected)
							.and.lt(expected.add(tolerance));
					});
				});
			});

			describe('without stakers', function () {
				beforeEach(async function () {
					await contract.setNewPeriod(startTime, endTime);
				});

				describe('should return zero', function () {
					shouldReturnZero();

					it('during first period with rewards', async function () {
						await contract.addToRewardsAllocation(amount);
						clock.setSystemTime((endTime + 1) * 1000);
						// mine a block to update block.timestamp for views
						await mineBlock(contract.provider as JsonRpcProvider);
						expect(await contract.accruedRewardPerToken()).to.eq(0);
					});
				});
			});
		});

		describe('updateReward', function () {
			it('updates earned');
		});

		describe('updateRewardFor', function () {
			it('updates earned');
		});

		describe('getReward', function () {
			const amount = parseRewardsToken('100');
			const newBalance = initRewardsBalance.sub(amount);
			const amountStaked = parseStakingToken('100');

			beforeEach(async function () {
				await rewardsToken.transfer(contract.address, amount);
			});

			it('should emit RewardPaid event', async function () {
				// Stake deployer
				await stakingToken.approve(contract.address, amountStaked);
				await contract.stake(amountStaked);
				// Set period
				await contract.setNewPeriod(startTime, endTime);
				await contract.addToRewardsAllocation(amount);

				// fast-forward
				clock.setSystemTime((endTime + 1) * 1000);
				// mine a block to update block.timestamp for views
				await mineBlock(contract.provider as JsonRpcProvider);

				// Estimate reward
				const expected = amount.sub(1000);

				await expect(contract.getReward())
					.to.emit(contract, 'RewardPaid')
					.withArgs(deployer, expected);
			});

			describe('should transfer zero with no rewards balance', function () {
				it('before period when not staking', async function () {
					await contract.addToRewardsAllocation(amount);
					await contract.getReward();
					expect(await rewardsToken.balanceOf(deployer)).to.eq(newBalance);
				});

				it('after period when not staking', async function () {
					await contract.addToRewardsAllocation(amount);
					await contract.setNewPeriod(startTime, endTime);

					clock.setSystemTime((endTime + 1) * 1000);
					// mine a block to update block.timestamp for views
					await mineBlock(contract.provider as JsonRpcProvider);

					await contract.getReward();
					expect(await rewardsToken.balanceOf(deployer)).to.eq(newBalance);
				});

				it('when staking before setting first period', async function () {
					await contract.addToRewardsAllocation(amount);
					// Stake deployer
					await stakingToken.approve(contract.address, amountStaked);
					await contract.stake(amountStaked);

					await contract.setNewPeriod(startTime, endTime);

					await contract.getReward();
					expect(await rewardsToken.balanceOf(deployer)).to.eq(newBalance);
				});

				it('when staking before setting period and adding rewards', async function () {
					// Stake deployer
					await stakingToken.approve(contract.address, amountStaked);
					await contract.stake(amountStaked);

					await contract.setNewPeriod(startTime, endTime);
					await contract.addToRewardsAllocation(amount);

					await contract.getReward();
					expect(await rewardsToken.balanceOf(deployer)).to.eq(newBalance);
				});

				it('when staking early', async function () {
					await contract.setNewPeriod(startTime, endTime);
					await contract.addToRewardsAllocation(amount);
					// Stake deployer
					await stakingToken.approve(contract.address, amountStaked);
					await contract.stake(amountStaked);

					await contract.getReward();
					expect(await rewardsToken.balanceOf(deployer)).to.eq(newBalance);

					// fast-forward
					clock.setSystemTime((unixTime + offset / 2) * 1000);

					await contract.getReward();
					expect(await rewardsToken.balanceOf(deployer)).to.eq(newBalance);
				});

				it('when staking after', async function () {
					await contract.setNewPeriod(startTime, endTime);

					// fast-forward
					clock.setSystemTime((unixTime + offset / 2) * 1000);

					// Stake deployer
					await stakingToken.approve(contract.address, amountStaked);
					await contract.stake(amountStaked);

					await contract.getReward();
					expect(await rewardsToken.balanceOf(deployer)).to.eq(newBalance);

					// fast-forward
					clock.setSystemTime((unixTime + offset / 2) * 1000);

					await contract.getReward();
					expect(await rewardsToken.balanceOf(deployer)).to.eq(newBalance);
				});

				it('after staking period when already called', async function () {
					await contract.setNewPeriod(startTime, endTime);
					await contract.addToRewardsAllocation(amount);
					// Stake deployer
					await stakingToken.approve(contract.address, amountStaked);
					await contract.stake(amountStaked);

					// fast-forward
					clock.setSystemTime((endTime + 1) * 1000);

					await contract.getReward();
					// Some loss due to rounding
					const expected = initRewardsBalance.sub(1000);
					expect(await rewardsToken.balanceOf(deployer)).to.eq(expected);

					// fast-forward
					clock.setSystemTime((endTime + duration) * 1000);

					await contract.getReward();
					expect(await rewardsToken.balanceOf(deployer)).to.eq(expected);
				});

				it('when new period is created', async function () {
					await contract.setNewPeriod(startTime, endTime);
					await contract.addToRewardsAllocation(amount);
					// Stake deployer
					await stakingToken.approve(contract.address, amountStaked);
					await contract.stake(amountStaked);

					// fast-forward
					clock.setSystemTime((endTime + 1) * 1000);

					// Create new period
					const newStartTime = endTime + offset;
					const newDuration = duration + offset;
					const newEndTime = newStartTime + newDuration;
					await contract.setNewPeriod(newStartTime, newEndTime);

					await contract.getReward();
					// Some loss due to rounding
					const expected = initRewardsBalance.sub(1000);
					expect(await rewardsToken.balanceOf(deployer)).to.eq(expected);
				});

				it('when next period changes', async function () {
					await contract.setNewPeriod(startTime, endTime);
					await contract.addToRewardsAllocation(amount);
					// Stake deployer
					await stakingToken.approve(contract.address, amountStaked);
					await contract.stake(amountStaked);

					// fast-forward
					clock.setSystemTime((endTime + 1) * 1000);

					// Create new period
					const newStartTime = endTime + offset;
					const newDuration = duration + offset;
					const newEndTime = newStartTime + newDuration;
					await contract.setNewPeriod(newStartTime, newEndTime);

					// Change period
					await contract.setNewPeriod(
						newStartTime + offset * 2,
						newEndTime + offset,
					);
					await contract.setNewPeriod(
						newStartTime + offset,
						newEndTime + offset,
					);

					await contract.getReward();
					// Some loss due to rounding
					const expected = initRewardsBalance.sub(1000);
					expect(await rewardsToken.balanceOf(deployer)).to.eq(expected);
				});
			});

			describe('should transfer correct reward', function () {
				let testStakingToken: MockErc20;

				describe('when staking early', function () {
					beforeEach(async function () {
						// Stake deployer
						await stakingToken.approve(contract.address, amountStaked);
						await contract.stake(amountStaked);
						// Stake tester
						testStakingToken = stakingToken.connect(testerContract.signer);
						await stakingToken.transfer(tester, amountStaked);
						await testStakingToken.approve(contract.address, amountStaked);
						await testerContract.stake(amountStaked);
						// Set period
						await contract.setNewPeriod(startTime, endTime);
						await contract.addToRewardsAllocation(amount);
					});

					describe('getRewardExact', function () {
						it('after period', async function () {
							// fast-forward
							clock.setSystemTime((endTime + 1) * 1000);

							// Estimate reward
							const deployerExpected = amount.div(2).div(2);
							const testerExpected = amount.div(2).sub(500);

							// Get deployer reward
							await contract.getRewardExact(deployerExpected);
							const balance = await rewardsToken.balanceOf(deployer);
							// Account for rounding error
							const rewards = balance.sub(newBalance);
							expect(rewards).to.eq(deployerExpected);

							// Get tester reward
							await testerContract.getReward();
							const testerBalance = await rewardsToken.balanceOf(tester);
							expect(testerBalance).to.eq(testerExpected);
						});

						it('should emit reward paid', async function () {
							// fast-forward
							clock.setSystemTime((endTime + 1) * 1000);

							// Estimate reward
							const deployerExpected = amount.div(2).div(2);

							// Get deployer reward
							await expect(contract.getRewardExact(deployerExpected))
								.to.emit(contract, 'RewardPaid')
								.withArgs(deployer, deployerExpected);
						});
					});

					it('during period', async function () {
						const time = startTime + duration / 2;

						// fast-forward
						clock.setSystemTime(time * 1000);
						// mine a block to update block.timestamp for views
						await mineBlock(contract.provider as JsonRpcProvider);

						// Estimate reward
						const rewardPerToken = await contract.accruedRewardPerToken();
						const expected = amountStaked
							.mul(rewardPerToken)
							.div(parseStakingToken('1'));
						// 3% tolerance for 10 minute duration
						const tolerance = expected.mul(3).div(100);

						await contract.getReward();
						const balance = await rewardsToken.balanceOf(deployer);
						const rewards = balance.sub(newBalance.sub(1000));
						expect(rewards).to.be.gt(expected).and.lt(expected.add(tolerance));
					});

					it('and unstaking early, then staking, then during period', async function () {
						// unstake
						await contract.withdraw(amountStaked);

						// stake
						await stakingToken.approve(contract.address, amountStaked);
						await contract.stake(amountStaked);

						const time = startTime + duration / 2;

						// fast-forward
						clock.setSystemTime(time * 1000);
						// mine a block to update block.timestamp for views
						await mineBlock(contract.provider as JsonRpcProvider);

						// Estimate reward
						const rewardPerToken = await contract.accruedRewardPerToken();
						const expected = amountStaked
							.mul(rewardPerToken)
							.div(parseStakingToken('1'));
						// 3% tolerance for 10 minute duration
						const tolerance = expected.mul(3).div(100);

						await contract.getReward();
						const balance = await rewardsToken.balanceOf(deployer);
						const rewards = balance.sub(newBalance.sub(1000));
						expect(rewards).to.be.gt(expected).and.lt(expected.add(tolerance));
					});

					it('after period', async function () {
						// fast-forward
						clock.setSystemTime((endTime + 1) * 1000);

						// Estimate reward
						const deployerExpected = amount.div(2).add(500);
						const testerExpected = amount.div(2).sub(500);

						// Get deployer reward
						await contract.getReward();
						const balance = await rewardsToken.balanceOf(deployer);
						// Account for rounding error
						const rewards = balance.sub(newBalance.sub(1000));
						expect(rewards).to.eq(deployerExpected);

						// Get tester reward
						await testerContract.getReward();
						const testerBalance = await rewardsToken.balanceOf(tester);
						expect(testerBalance).to.eq(testerExpected);
					});

					it('after next period is created', async function () {
						// fast-forward
						clock.setSystemTime((endTime + 1) * 1000);

						// Estimate reward
						const deployerExpected = amount.div(2).add(500);
						const testerExpected = amount.div(2).sub(500);

						// Create new period
						const newStartTime = endTime + offset;
						const newDuration = duration + offset;
						const newEndTime = newStartTime + newDuration;
						await contract.setNewPeriod(newStartTime, newEndTime);

						// fast-forward
						clock.setSystemTime((endTime + offset / 2) * 1000);

						// Get deployer reward
						await contract.getReward();
						const balance = await rewardsToken.balanceOf(deployer);
						// Account for rounding error
						const rewards = balance.sub(newBalance.sub(1000));
						expect(rewards).to.eq(deployerExpected);

						// Get tester reward
						await testerContract.getReward();
						const testerBalance = await rewardsToken.balanceOf(tester);
						expect(testerBalance).to.eq(testerExpected);
					});

					it('after next period changed', async function () {
						// fast-forward
						clock.setSystemTime((endTime + 1) * 1000);

						// Estimate reward
						const deployerExpected = amount.div(2).add(500);
						const testerExpected = amount.div(2).sub(500);

						// Create new period
						const newStartTime = endTime + offset;
						const newDuration = duration + offset;
						const newEndTime = newStartTime + newDuration;
						await contract.setNewPeriod(newStartTime, newEndTime);

						// fast-forward
						clock.setSystemTime((endTime + offset / 2) * 1000);

						await contract.setNewPeriod(
							newStartTime + offset,
							newEndTime + offset,
						);

						clock.setSystemTime((endTime + offset) * 1000);

						// Get deployer reward
						await contract.getReward();
						const balance = await rewardsToken.balanceOf(deployer);
						// Account for rounding error
						const rewards = balance.sub(newBalance.sub(1000));
						expect(rewards).to.eq(deployerExpected);

						// Get tester reward
						await testerContract.getReward();
						const testerBalance = await rewardsToken.balanceOf(tester);
						expect(testerBalance).to.eq(testerExpected);
					});

					it('after second period', async function () {
						// fast-forward
						clock.setSystemTime((endTime + 1) * 1000);

						// Create new period
						const newStartTime = endTime + offset;
						const newDuration = duration + offset;
						const newEndTime = newStartTime + newDuration;
						await contract.setNewPeriod(newStartTime, newEndTime);

						// Send more rewards
						await rewardsToken.transfer(contract.address, amount.mul(2));
						await contract.addToRewardsAllocation(amount.mul(2));

						// fast-forward
						clock.setSystemTime((newEndTime + 1) * 1000);

						// Estimate reward
						const expected = amount.mul(3).div(2);

						// Get deployer reward
						await contract.getReward();
						const balance = await rewardsToken.balanceOf(deployer);
						// Account for rounding error
						const rewards = balance.sub(
							newBalance.sub(amount.mul(2)).sub(1000),
						);
						expect(rewards).to.eq(expected);

						// Get tester reward
						await testerContract.getReward();
						const testerBalance = await rewardsToken.balanceOf(tester);
						expect(testerBalance).to.eq(expected.sub(1000));
					});

					it('after first period, changing stake, and next period', async function () {
						// fast-forward
						clock.setSystemTime((endTime + 1) * 1000);

						// Estimate expected
						let deployerExpected = amount.div(2);
						let testerExpected = amount.div(2);

						// Create new period
						const newStartTime = endTime + offset;
						const newDuration = duration + offset;
						const newEndTime = newStartTime + newDuration;
						await contract.setNewPeriod(newStartTime, newEndTime);

						// Send more rewards
						await rewardsToken.transfer(contract.address, amount.mul(2));
						await contract.addToRewardsAllocation(amount.mul(2));

						// Change stake
						await contract.withdraw(amountStaked.div(2));

						// fast-forward
						clock.setSystemTime((newEndTime + 1) * 1000);

						// Estimate reward
						deployerExpected = deployerExpected.add(amount.mul(2).div(3));
						testerExpected = testerExpected.add(amount.mul(2).mul(2).div(3));

						// Get deployer reward
						await contract.getReward();
						const balance = await rewardsToken.balanceOf(deployer);
						// Account for rounding error
						const rewards = balance.sub(
							newBalance.sub(amount.mul(2)).sub(1000),
						);
						expect(rewards).to.eq(deployerExpected.add(134));

						// Get tester reward
						await testerContract.getReward();
						const testerBalance = await rewardsToken.balanceOf(tester);
						expect(testerBalance).to.eq(testerExpected.sub(1233));
					});

					it('after first period and staking late to next period', async function () {
						// fast-forward
						clock.setSystemTime((endTime + 1) * 1000);

						// Estimate expected
						let deployerExpected = amount.div(2);
						let testerExpected = amount.div(2);

						// Create new period
						const newStartTime = endTime + offset;
						const newDuration = duration + offset;
						const newEndTime = newStartTime + newDuration;
						await contract.setNewPeriod(newStartTime, newEndTime);

						// Send more rewards
						await rewardsToken.transfer(contract.address, amount.mul(2));
						await contract.addToRewardsAllocation(amount.mul(2));

						// Withdraw stake
						await contract.withdraw(amountStaked);

						// fast-forward
						clock.setSystemTime((newStartTime + newDuration / 2) * 1000);

						// Stake late
						await stakingToken.approve(contract.address, amountStaked);
						await contract.stake(amountStaked);

						// Estimate reward
						deployerExpected = deployerExpected.add(amount.div(2));
						testerExpected = testerExpected.add(amount).add(amount.div(2));

						// fast-forward
						clock.setSystemTime((newEndTime + 1) * 1000);

						// Get deployer reward
						await contract.getReward();
						const balance = await rewardsToken.balanceOf(deployer);
						// Account for rounding error
						const rewards = balance.sub(
							newBalance.sub(amount.mul(2)).sub(1000),
						);
						// 3% tolerance
						let tolerance = deployerExpected.mul(3).div(100);
						expect(rewards)
							.to.be.lt(deployerExpected)
							.and.gt(deployerExpected.sub(tolerance));

						// Get tester reward
						await testerContract.getReward();
						const testerBalance = await rewardsToken.balanceOf(tester);
						// 3% tolerance
						tolerance = testerExpected.mul(3).div(100);
						expect(testerBalance)
							.to.be.gt(testerExpected)
							.and.lt(testerExpected.add(tolerance));
					});

					it('and staking more during period');

					it('after first period and during next period');

					it('after first period, unstaking, and staking during next period');
				});

				it('when staking late', async function () {
					// Set period
					await contract.setNewPeriod(startTime, endTime);
					await contract.addToRewardsAllocation(amount);

					const time = startTime + duration / 2;

					// fast-forward
					clock.setSystemTime(time * 1000);
					// mine a block to update block.timestamp for views
					await mineBlock(contract.provider as JsonRpcProvider);

					// Stake deployer
					await stakingToken.approve(contract.address, amountStaked);
					await contract.stake(amountStaked);

					// Estimate reward
					const expected = amountStaked.div(2);
					// 3% tolerance for 10 minute duration
					const tolerance = expected.mul(3).div(100);

					// fast-forward
					clock.setSystemTime((endTime + 1) * 1000);

					await contract.getReward();
					const balance = await rewardsToken.balanceOf(deployer);
					const rewards = balance.sub(newBalance.sub(1000));
					expect(rewards).to.be.lt(expected).and.gt(expected.sub(tolerance));
				});

				it('when staking after first period');
			});
		});

		describe('exit', function () {
			it('should withdraw and transfer reward');

			it('should revert with zero staking balance');

			it('should emit RewardPaid event');

			it('should emit Withdrawn event');
		});

		describe('earned', function () {
			describe('should be constant', function () {
				it('after full withdraw during rewards period');
				it('after rewards period');
				it('before next rewards period');
			});

			describe('should be close', function () {
				it('with constant stake during rewards period');

				it('with variable stake during rewards period');

				it('after getRewards with stake during rewards period');

				it('after first rewards period and during second rewards period');
			});

			describe('should return zero', function () {
				it('before first rewards period');

				it('after exit');
			});
		});
	});
});
