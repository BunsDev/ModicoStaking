// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../StakedRewardsPool.sol";

contract MockStakedRewardsPool is StakedRewardsPool {
	constructor(
		IERC20 rewardsToken,
		IERC20 stakingToken,
		uint8 stakingTokenDecimals
	) StakedRewardsPool(rewardsToken, stakingToken, stakingTokenDecimals) {
		return;
	}

	function earned(address) public pure override returns (uint256) {
		return 0;
	}

	function _updateRewardFor(address) internal pure override {
		return;
	}
}
