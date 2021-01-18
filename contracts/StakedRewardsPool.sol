// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "./interfaces/IStakedRewardsPool.sol";

abstract contract StakedRewardsPool is
	Context,
	ReentrancyGuard,
	Ownable,
	Pausable,
	IStakedRewardsPool
{
	using SafeERC20 for IERC20;
	using SafeMath for uint256;

	/* Mutable Internal State */

	mapping(address => uint256) internal _rewards;

	/* Immutable Private State */

	uint8 private _stakingTokenDecimals;
	IERC20 private _rewardsToken;
	IERC20 private _stakingToken;
	uint256 private _stakingTokenBase;

	/* Mutable Private State */

	mapping(address => uint256) private _balances;
	uint256 private _totalSupply;

	/* Constructor */

	constructor(
		IERC20 rewardsToken,
		IERC20 stakingToken,
		uint8 stakingTokenDecimals
	) Ownable() {
		// Prevent overflow, though 76 would create a safe but unusable contract
		require(
			stakingTokenDecimals < 77,
			"StakedRewardsPool: staking token has far too many decimals"
		);

		_rewardsToken = rewardsToken;

		_stakingToken = stakingToken;
		_stakingTokenDecimals = stakingTokenDecimals;
		_stakingTokenBase = 10**stakingTokenDecimals;
	}

	/* Public Views */

	function balanceOf(address account) public view override returns (uint256) {
		return _balances[account];
	}

	function earned(address account)
		public
		view
		virtual
		override
		returns (uint256);

	function rewardsToken() public view override returns (IERC20) {
		return _rewardsToken;
	}

	function stakingToken() public view override returns (IERC20) {
		return _stakingToken;
	}

	function stakingTokenDecimals() public view override returns (uint8) {
		return _stakingTokenDecimals;
	}

	function totalSupply() public view override returns (uint256) {
		return _totalSupply;
	}

	/* Public Mutators */

	function exit() public override nonReentrant {
		_exit();
	}

	function getReward() public override nonReentrant {
		_getReward();
	}

	function getRewardExact(uint256 amount) public override nonReentrant {
		_getRewardExact(amount);
	}

	function pause() public override onlyOwner {
		_pause();
	}

	// In the unlikely event that unsupported tokens are successfully sent to the
	// contract. This will also allow for removal of airdropped tokens.
	function recoverUnsupportedERC20(
		IERC20 token,
		address to,
		uint256 amount
	) public override onlyOwner {
		_recoverUnsupportedERC20(token, to, amount);
	}

	function stake(uint256 amount) public override nonReentrant whenNotPaused {
		_stakeFrom(_msgSender(), amount);
	}

	function unpause() public override onlyOwner {
		_unpause();
	}

	function updateReward() public override nonReentrant {
		_updateRewardFor(_msgSender());
	}

	function updateRewardFor(address account) public override nonReentrant {
		_updateRewardFor(account);
	}

	function withdraw(uint256 amount) public override nonReentrant {
		_withdraw(amount);
	}

	/* Internal Views */

	function _getStakingTokenBase() internal view returns (uint256) {
		return _stakingTokenBase;
	}

	/* Internal Mutators */

	function _exit() internal virtual {
		_withdraw(_balances[_msgSender()]);
		_getReward();
	}

	function _getReward() internal virtual {
		_updateRewardFor(_msgSender());
		uint256 reward = _rewards[_msgSender()];
		if (reward > 0) {
			_rewards[_msgSender()] = 0;
			_rewardsToken.safeTransfer(_msgSender(), reward);
			emit RewardPaid(_msgSender(), reward);
		}
	}

	function _getRewardExact(uint256 amount) internal virtual {
		_updateRewardFor(_msgSender());
		uint256 reward = _rewards[_msgSender()];
		require(
			amount <= reward,
			"StakedRewardsPool: can not redeem more rewards than you have earned"
		);
		_rewards[_msgSender()] = reward.sub(amount);
		_rewardsToken.safeTransfer(_msgSender(), amount);
		emit RewardPaid(_msgSender(), amount);
	}

	function _recoverUnsupportedERC20(
		IERC20 token,
		address to,
		uint256 amount
	) internal virtual {
		require(
			token != _stakingToken,
			"StakedRewardsPool: cannot withdraw the staking token"
		);
		require(
			token != _rewardsToken,
			"StakedRewardsPool: cannot withdraw the rewards token"
		);
		token.safeTransfer(to, amount);
		emit Recovered(token, to, amount);
	}

	function _stakeFrom(address account, uint256 amount) internal virtual {
		require(
			account != address(0),
			"StakedRewardsPool: cannot stake from the zero address"
		);
		require(amount > 0, "StakedRewardsPool: cannot stake zero");
		_updateRewardFor(account);
		_totalSupply = _totalSupply.add(amount);
		_balances[account] = _balances[account].add(amount);
		_stakingToken.safeTransferFrom(account, address(this), amount);
		emit Staked(account, amount);
	}

	function _updateRewardFor(address account) internal virtual;

	function _withdraw(uint256 amount) internal virtual {
		require(amount > 0, "StakedRewardsPool: cannot withdraw zero");
		_updateRewardFor(_msgSender());
		_totalSupply = _totalSupply.sub(amount);
		_balances[_msgSender()] = _balances[_msgSender()].sub(amount);
		_stakingToken.safeTransfer(_msgSender(), amount);
		emit Withdrawn(_msgSender(), amount);
	}
}
