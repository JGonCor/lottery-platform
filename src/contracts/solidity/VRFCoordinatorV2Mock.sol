// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VRFCoordinatorV2Mock
 * @dev Mock contract for Chainlink VRF Coordinator V2 for testing purposes
 */
contract VRFCoordinatorV2Mock {
    uint96 private _baseFee;
    uint96 private _gasPriceLink;
    uint256 private _subscriptionId;
    mapping(uint256 => uint96) private _subscriptionBalances;
    mapping(uint256 => address) private _requestIdToSender;

    event RandomWordsRequested(
        bytes32 indexed keyHash,
        uint256 requestId,
        uint256 preSeed,
        uint256 indexed subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords,
        address indexed sender
    );
    
    event SubscriptionCreated(uint256 indexed subId, address owner);
    event SubscriptionFunded(uint256 indexed subId, uint256 oldBalance, uint256 newBalance);

    /**
     * @dev Constructor
     * @param baseFee_ Base fee (cost per request, in wei)
     * @param gasPriceLink_ Gas price in LINK
     */
    constructor(uint96 baseFee_, uint96 gasPriceLink_) {
        _baseFee = baseFee_;
        _gasPriceLink = gasPriceLink_;
        _subscriptionId = 0;
    }
    
    /**
     * @dev Creates a new subscription
     * @return subId The ID of the created subscription
     */
    function createSubscription() external returns (uint256 subId) {
        _subscriptionId++;
        _subscriptionBalances[_subscriptionId] = 0;
        emit SubscriptionCreated(_subscriptionId, msg.sender);
        return _subscriptionId;
    }
    
    /**
     * @dev Funds a subscription with LINK
     * @param subId The ID of the subscription
     * @param amount The amount to fund
     */
    function fundSubscription(uint256 subId, uint96 amount) external {
        uint96 oldBalance = _subscriptionBalances[subId];
        _subscriptionBalances[subId] += amount;
        emit SubscriptionFunded(subId, oldBalance, _subscriptionBalances[subId]);
    }

    /**
     * @dev Requests random words from VRF
     * @param keyHash The key hash for the VRF service
     * @param subId The subscription ID
     * @param requestConfirmations The number of confirmations to wait
     * @param callbackGasLimit The gas limit for the callback
     * @param numWords The number of random words to generate
     * @return requestId The ID of the request
     */
    function requestRandomWords(
        bytes32 keyHash,
        uint256 subId,
        uint16 requestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256 requestId) {
        require(_subscriptionBalances[subId] >= _baseFee, "Insufficient funds");
        
        requestId = uint256(keccak256(abi.encode(keyHash, msg.sender, subId, block.timestamp)));
        _requestIdToSender[requestId] = msg.sender;
        
        emit RandomWordsRequested(
            keyHash,
            requestId,
            uint256(blockhash(block.number - 1)),
            subId,
            requestConfirmations,
            callbackGasLimit,
            numWords,
            msg.sender
        );
        
        return requestId;
    }
    
    /**
     * @dev Fulfills a random words request
     * @param requestId The ID of the request
     * @param consumer The consumer contract to call
     */
    function fulfillRandomWords(uint256 requestId, address consumer) external {
        // Generate pseudo-random numbers for testing
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = uint256(keccak256(abi.encode(requestId, block.timestamp, block.prevrandao)));
        
        // Call the consumer contract with the random words
        VRFConsumerBaseV2(consumer).rawFulfillRandomWords(requestId, randomWords);
    }
}

/**
 * @title VRFConsumerBaseV2
 * @dev Interface for VRF consumer contracts
 */
interface VRFConsumerBaseV2 {
    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external;
}