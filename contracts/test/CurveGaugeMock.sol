// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract CurveGaugeMock {
    using SafeERC20 for IERC20;

    address public rewardToken;

    constructor(address _rewardToken) {
        rewardToken = _rewardToken;
    }

    function deposit_reward_token(address _rewardToken, uint256 _amount) external {
        require(_rewardToken == rewardToken, "Incorrect rewardToken");
        IERC20(_rewardToken).safeTransferFrom(msg.sender, address(this), _amount);
    }

    function setRewardToken(address _rewardToken) external {
        rewardToken = _rewardToken;
    }
}
