// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.19;

interface ICurveGauge {
    function deposit_reward_token(address _reward_token, uint256 _amount) external;
}