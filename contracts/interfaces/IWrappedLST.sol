// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IWrappedLST is IERC20 {
    /**
     * @notice wraps tokens
     * @param _amount amount of unwrapped tokens to wrap
     */
    function wrap(uint256 _amount) external;
}
