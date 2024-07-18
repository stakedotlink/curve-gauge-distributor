// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/ICurveGauge.sol";
import "./interfaces/IWrappedLST.sol";

contract LSTGaugeDistributor is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public token;
    IWrappedLST public wrappedToken;

    ICurveGauge public gauge;

    uint64 public updateThreshold;
    uint64 public lastUpdated;

    event SetUpdateThreshold(uint64 updateThreshold);

    error InvalidLastUpdated();
    error InvalidUpdateThreshold();
    error UpdateConditionsNotMet();
    error SenderNotAuthorized();

    constructor(address _token, address _wrappedToken, address _gauge, uint64 _updateThreshold, uint64 _lastUpdated) {
        if (_lastUpdated > block.timestamp) revert InvalidLastUpdated();
        lastUpdated = _lastUpdated;
        setUpdateThreshold(_updateThreshold);
        token = IERC20(_token);
        token.approve(_wrappedToken, type(uint256).max);
        wrappedToken = IWrappedLST(_wrappedToken);
        IERC20(_wrappedToken).safeApprove(_gauge, type(uint256).max);
        gauge = ICurveGauge(_gauge);
    }

    /**
     * @notice ERC677 implementation to receive tokens
     **/
    function onTokenTransfer(address, uint256, bytes calldata) external {
        if (msg.sender != address(token)) revert SenderNotAuthorized();
    }

    /**
     * @notice Returns whether gauge needs updating
     * @return whether gauge needs updating
     */
    function checkUpkeep(bytes calldata) external view returns (bool, bytes memory) {
        if ((block.timestamp - lastUpdated < updateThreshold) || (token.balanceOf(address(this)) == 0)) {
            return (false, bytes(""));
        }

        return (true, bytes(""));
    }

    /**
     * @notice Updates gauge rewards
     */
    function performUpkeep(bytes calldata) external {
        if ((block.timestamp - lastUpdated < updateThreshold) || (token.balanceOf(address(this)) == 0)) {
            revert UpdateConditionsNotMet();
        }

        wrappedToken.wrap(token.balanceOf(address(this)));
        gauge.deposit_reward_token(address(wrappedToken), wrappedToken.balanceOf(address(this)));
        lastUpdated = uint64(block.timestamp);
    }

    /**
     * @notice Executes an arbitrary function from this contract
     * @param _target target address of the call
     * @param _data encoded function call
     */
    function execute(address _target, bytes memory _data) external onlyOwner returns (bytes memory) {
        return Address.functionCall(_target, _data);
    }

    /**
     * @notice Sets the minimum amount of time between gauge updates
     * @param _updateThreshold min amount of time in seconds
     */
    function setUpdateThreshold(uint64 _updateThreshold) public onlyOwner {
        if (_updateThreshold > 7 days) revert InvalidUpdateThreshold();
        updateThreshold = _updateThreshold;
        emit SetUpdateThreshold(_updateThreshold);
    }
}
