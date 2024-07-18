// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./ERC677.sol";

contract StakingPoolMock is ERC677 {
    using SafeERC20 for IERC20;

    IERC20 public token;
    uint256 public multiplier;

    constructor(address _token, uint256 _multiplier) ERC677("test", "test", 0) {
        token = IERC20(_token);
        multiplier = _multiplier;
    }

    function deposit(uint256 _amount) external {
        token.safeTransferFrom(msg.sender, address(this), _amount);
        _mint(msg.sender, _amount);
    }

    function getStakeByShares(uint256 _sharesAmount) public view returns (uint256) {
        return _sharesAmount * multiplier;
    }

    function getSharesByStake(uint256 _amount) public view returns (uint256) {
        return _amount / multiplier;
    }
}
