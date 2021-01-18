// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IStakedRewardsPool {
	/* Views */

	function balanceOf(address account) external view returns (uint256);

	function earned(address account) external view returns (uint256);

	function rewardsToken() external view returns (IERC20);

	function stakingToken() external view returns (IERC20);

	function stakingTokenDecimals() external view returns (uint8);

	function totalSupply() external view returns (uint256);

	/* Mutators */

	function exit() external;

	function getReward() external;

	function getRewardExact(uint256 amount) external;

	function pause() external;

	function recoverUnsupportedERC20(
		IERC20 token,
		address to,
		uint256 amount
	) external;

	function stake(uint256 amount) external;

	function unpause() external;

	function updateReward() external;

	function updateRewardFor(address account) external;

	function withdraw(uint256 amount) external;

	/* Events */

	event RewardPaid(address indexed account, uint256 amount);
	event Staked(address indexed account, uint256 amount);
	event Withdrawn(address indexed account, uint256 amount);
	event Recovered(IERC20 token, address indexed to, uint256 amount);
}
