// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/ICurveGauge.sol";

contract SDLGaugeDistributor is Ownable {
    using SafeERC20 for IERC20;

    uint256 constant WEEK = 7 days;

    struct Gauge {
        address gauge;
        uint256 weeklyReward;
    }

    Gauge[] private gauges;
    IERC20 public sdlToken;

    uint256 public updateThreshold;
    uint256 public lastUpdated;

    event SetWeeklyRewardAmount(address indexed gauge, uint256 weeklyRewardAmount);
    event GaugeAdded(address indexed gauge, uint256 weeklyRewardAmount);
    event GaugeRemoved(address indexed gauge);
    event SetUpdateThreshold(uint256 updateThreshold);

    error GaugeNotFound(uint256 gaugeIndex);
    error GaugeAlreadyAdded(address gauge);
    error NoRewardsToAdd(uint256 gaugeIndex);
    error InvalidUpdateThreshold(uint256 updateThreshold);
    error UpdateThresholdNotMet();
    error InvalidLastUpdated();

    constructor(
        address[] memory _gauges,
        uint256[] memory _weeklyRewards,
        uint256 _updateThreshold,
        uint256 _lastUpdated,
        address _sdlToken
    ) {
        if (_lastUpdated > block.timestamp) revert InvalidLastUpdated();
        lastUpdated = _lastUpdated;
        setUpdateThreshold(_updateThreshold);
        sdlToken = IERC20(_sdlToken);
        for (uint256 i = 0; i < _gauges.length; i++) {
            addGauge(_gauges[i], _weeklyRewards[i]);
        }
    }

    /**
     * @notice Returns a list of all gauges
     * @return list of gauges
     */
    function getGauges() external view returns (Gauge[] memory) {
        return gauges;
    }

    /**
     * @notice Returns whether gauges need updating
     * @return whether gauges need updating
     */
    function checkUpkeep(bytes calldata) external view returns (bool, bytes memory) {
        if (block.timestamp - lastUpdated < updateThreshold) {
            return (false, bytes(""));
        }

        uint256 totalRewards;
        for (uint256 i = 0; i < gauges.length; i++) {
            totalRewards += gauges[i].weeklyReward;
        }
        if (sdlToken.balanceOf(address(this)) < totalRewards) {
            return (false, bytes(""));
        }

        return (true, bytes(""));
    }

    /**
     * @notice Updates all gauge rewards
     */
    function performUpkeep(bytes calldata) external {
        uint256 period = block.timestamp - lastUpdated > WEEK ? WEEK : block.timestamp - lastUpdated;
        if (period < updateThreshold) revert UpdateThresholdNotMet();

        for (uint256 i = 0; i < gauges.length; i++) {
            _refreshGaugeReward(i, period);
        }

        lastUpdated = block.timestamp;
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
     * @notice Sets the weekly reward amount for a gauge
     * @param _gaugeIndex index of gauge
     * @param _weeklyReward weekly reward amount
     */
    function setWeeklyRewardAmount(uint256 _gaugeIndex, uint256 _weeklyReward) external onlyOwner {
        if (_gaugeIndex >= gauges.length) revert GaugeNotFound(_gaugeIndex);
        gauges[_gaugeIndex].weeklyReward = _weeklyReward;
        emit SetWeeklyRewardAmount(gauges[_gaugeIndex].gauge, _weeklyReward);
    }

    /**
     * @notice Sets the minimum amount of time between gauge updates
     * @param _updateThreshold min amount of time
     */
    function setUpdateThreshold(uint256 _updateThreshold) public onlyOwner {
        if (_updateThreshold > WEEK) revert InvalidUpdateThreshold(_updateThreshold);
        updateThreshold = _updateThreshold;
        emit SetUpdateThreshold(_updateThreshold);
    }

    /**
     * @notice Adds a new gauge
     * @param _gauge gauge contract
     * @param _weeklyReward weekly reward amount
     */
    function addGauge(address _gauge, uint256 _weeklyReward) public onlyOwner {
        for (uint256 i = 0; i < gauges.length; i++) {
            if (gauges[i].gauge == _gauge) revert GaugeAlreadyAdded(_gauge);
        }
        gauges.push(Gauge(_gauge, _weeklyReward));
        sdlToken.safeApprove(_gauge, type(uint256).max);
        emit GaugeAdded(_gauge, _weeklyReward);
    }

    /**
     * @notice Removes an existing gauge
     * @param _gaugeIndex index of gauge
     */
    function removeGauge(uint256 _gaugeIndex) external onlyOwner {
        if (_gaugeIndex >= gauges.length) revert GaugeNotFound(_gaugeIndex);
        address gauge = address(gauges[_gaugeIndex].gauge);
        sdlToken.safeApprove(gauge, 0);
        gauges[_gaugeIndex] = gauges[gauges.length - 1];
        gauges.pop();
        emit GaugeRemoved(gauge);
    }

    /**
     * @notice Updates the rewards for a gauge
     * @param _gaugeIndex index of gauge
     * @param _period time period to add rewards for
     */
    function _refreshGaugeReward(uint256 _gaugeIndex, uint256 _period) private {
        Gauge memory gauge = gauges[_gaugeIndex];
        uint256 rewardsToAdd = (gauge.weeklyReward * _period) / WEEK;

        if (rewardsToAdd == 0) revert NoRewardsToAdd(_gaugeIndex);

        ICurveGauge(gauge.gauge).deposit_reward_token(address(sdlToken), rewardsToAdd);
    }
}
