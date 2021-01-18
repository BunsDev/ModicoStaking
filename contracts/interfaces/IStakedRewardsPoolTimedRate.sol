// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "./IStakedRewardsPool.sol";

interface IStakedRewardsPoolTimedRate is IStakedRewardsPool {
	/* Views */

	function accruedRewardPerToken() external view returns (uint256);

	function hasEnded() external view returns (bool);

	function hasStarted() external view returns (bool);

	function lastTimeRewardApplicable() external view returns (uint256);

	function periodDuration() external view returns (uint256);

	function periodEndTime() external view returns (uint256);

	function periodStartTime() external view returns (uint256);

	function rewardRate() external view returns (uint256);

	function timeRemainingInPeriod() external view returns (uint256);

	/* Mutators */

	function addToRewardsAllocation(uint256 amount) external;

	function setNewPeriod(uint256 startTime, uint256 endTime) external;

	/* Events */

	event RewardAdded(uint256 amount);
	event NewPeriodSet(uint256 startTIme, uint256 endTime);
}
