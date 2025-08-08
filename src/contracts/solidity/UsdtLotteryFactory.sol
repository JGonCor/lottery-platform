// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./UsdtLotteryImplementation.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

/**
 * @title UsdtLotteryFactory
 * @dev Factory contract to create new UsdtLottery instances using the clone pattern.
 * This allows for gas-efficient deployment of multiple lottery contracts.
 */
contract UsdtLotteryFactory is Ownable {
    address public implementationContract;
    address[] public lotteries;
    mapping(address => bool) public isLottery;
    
    // Chainlink configurations
    address public vrfCoordinator;
    bytes32 public gasLane;
    uint256 public subscriptionId;
    uint32 public callbackGasLimit;

    event LotteryCreated(address indexed lotteryAddress, address indexed creator, uint256 ticketPrice);
    event ImplementationUpdated(address indexed newImplementation);
    event VRFConfigUpdated(address vrfCoordinator, bytes32 gasLane, uint256 subscriptionId, uint32 callbackGasLimit);

    /**
     * @dev Constructor initializes the factory with an implementation contract and Chainlink configurations
     * @param _implementation The address of the implementation contract
     * @param _vrfCoordinator Chainlink VRF Coordinator address
     * @param _gasLane Chainlink VRF gas lane key hash
     * @param _subscriptionId Chainlink VRF subscription ID
     * @param _callbackGasLimit Chainlink VRF callback gas limit
     */
    constructor(
        address _implementation,
        address _vrfCoordinator,
        bytes32 _gasLane,
        uint256 _subscriptionId,
        uint32 _callbackGasLimit
    ) Ownable() {
        require(_implementation != address(0), "Implementation cannot be zero address");
        implementationContract = _implementation;
        
        vrfCoordinator = _vrfCoordinator;
        gasLane = _gasLane;
        subscriptionId = _subscriptionId;
        callbackGasLimit = _callbackGasLimit;
    }

    /**
     * @dev Creates a new UsdtLottery contract
     * @param ticketPriceUsdt The price of one lottery ticket in USDT (in wei, 18 decimals)
     * @param usdtToken The USDT token address
     * @param interval Time between lottery draws in seconds
     * @param lotteryOwner The owner address for the lottery (receives fees)
     * @return The address of the newly created lottery contract
     */
    function createLottery(
        uint256 ticketPriceUsdt,
        address usdtToken,
        uint256 interval,
        address lotteryOwner
    ) external returns (address) {
        require(ticketPriceUsdt > 0, "Ticket price must be greater than 0");
        require(usdtToken != address(0), "USDT token cannot be zero address");
        require(interval > 0, "Interval must be greater than 0");
        require(lotteryOwner != address(0), "Lottery owner cannot be zero address");

        // Clone the implementation contract
        address payable clone = payable(Clones.clone(implementationContract));
        
        // Initialize the lottery with parameters
        UsdtLotteryImplementation(clone).initialize(
            ticketPriceUsdt,
            usdtToken,
            vrfCoordinator,
            gasLane,
            subscriptionId,
            callbackGasLimit,
            interval,
            lotteryOwner
        );
        
        // Update internal records
        lotteries.push(clone);
        isLottery[clone] = true;
        
        emit LotteryCreated(clone, msg.sender, ticketPriceUsdt);
        
        return clone;
    }

    /**
     * @dev Updates the implementation contract - only owner can call
     * @param newImplementation The address of the new implementation contract
     */
    function updateImplementation(address newImplementation) external onlyOwner {
        require(newImplementation != address(0), "Implementation cannot be zero address");
        implementationContract = newImplementation;
        emit ImplementationUpdated(newImplementation);
    }

    /**
     * @dev Updates the Chainlink VRF configuration - only owner can call
     * @param _vrfCoordinator Chainlink VRF Coordinator address
     * @param _gasLane Chainlink VRF gas lane key hash
     * @param _subscriptionId Chainlink VRF subscription ID
     * @param _callbackGasLimit Chainlink VRF callback gas limit
     */
    function updateVRFConfig(
        address _vrfCoordinator,
        bytes32 _gasLane,
        uint256 _subscriptionId,
        uint32 _callbackGasLimit
    ) external onlyOwner {
        vrfCoordinator = _vrfCoordinator;
        gasLane = _gasLane;
        subscriptionId = _subscriptionId;
        callbackGasLimit = _callbackGasLimit;
        
        emit VRFConfigUpdated(_vrfCoordinator, _gasLane, _subscriptionId, _callbackGasLimit);
    }

    /**
     * @dev Gets all lotteries created by this factory
     * @return Array of lottery addresses
     */
    function getAllLotteries() external view returns (address[] memory) {
        return lotteries;
    }

    /**
     * @dev Gets the total number of lotteries created by this factory
     * @return The number of lotteries
     */
    function getLotteryCount() external view returns (uint256) {
        return lotteries.length;
    }
}