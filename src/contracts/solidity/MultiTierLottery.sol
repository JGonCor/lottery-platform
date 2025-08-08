// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

/**
 * @title MultiTierLottery
 * @dev A lottery contract that uses USDT tokens for ticket purchases, with multiple prize tiers
 * based on the number of matched numbers. Uses Chainlink VRF for randomness and Chainlink Keepers
 * for automated draws. Includes jackpot accumulation when no one wins the main prize.
 * Now includes referral system and bulk purchase discounts.
 */
contract MultiTierLottery is Ownable, ReentrancyGuard, Pausable, VRFConsumerBaseV2, AutomationCompatibleInterface {
    // Chainlink VRF variables
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint256 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 6; // Need 6 random numbers for the lottery

    // Lottery state
    enum LotteryState {
        OPEN,
        CALCULATING
    }
    LotteryState private s_lotteryState;

    // Ticket price in USDT (with 18 decimals)
    uint256 private immutable i_ticketPrice;
    IERC20 private immutable i_usdtToken;

    // Duration settings
    uint256 private immutable i_interval;
    uint256 private s_lastTimeStamp;

    // Lottery record-keeping - Optimized packed structs
    struct Ticket {
        address owner;           // 20 bytes
        uint48 packedNumbers;    // 6 numbers packed into 48 bits (8 bits each)
        uint32 drawId;          // 4 bytes - which draw this ticket is for
        uint8 matchCount;       // 1 byte - how many numbers matched
        bool claimed;           // 1 bit - whether prize has been claimed
        // Total: 32 bytes (1 slot), saves ~38 bytes per ticket vs original
    }

    struct Draw {
        uint256 drawId;                    // 32 bytes
        uint48 packedWinningNumbers;       // 6 bytes - packed winning numbers
        uint32 timestamp;                  // 4 bytes - enough until year 2106
        uint128 totalPoolAmount;           // 16 bytes - supports up to 340T USDT
        uint128 accumulatedJackpot;        // 16 bytes
        // Total: 64 bytes (2 slots), saves 32 bytes vs original
    }

    // Referral system
    struct ReferralInfo {
        uint256 totalReferrals;       // Total number of successful referrals (who bought at least one ticket)
        mapping(address => bool) hasReferred; // Tracks who this user has referred
        mapping(address => uint256) referralTimestamp; // When the referral was made
    }

    // Prize distribution percentages (total must equal 90%)
    uint8 private constant MATCH_6_PERCENTAGE = 40; // 40% for matching all 6 numbers
    uint8 private constant MATCH_5_PERCENTAGE = 20; // 20% for matching 5 numbers
    uint8 private constant MATCH_4_PERCENTAGE = 15; // 15% for matching 4 numbers
    uint8 private constant MATCH_3_PERCENTAGE = 10; // 10% for matching 3 numbers
    uint8 private constant MATCH_2_PERCENTAGE = 5;  // 5% for matching 2 numbers
    uint8 private constant PLATFORM_FEE = 10;       // 10% platform fee

    // Accumulated jackpot percentage when no one wins the main prize
    uint8 private constant ACCUMULATION_PERCENTAGE = 70; // 70% of the main prize (40%) gets accumulated

    // Referral and bulk discount settings
    uint256 private constant REFERRAL_DISCOUNT_PERCENT = 1; // 1% discount per referral
    uint256 private constant MAX_REFERRAL_DISCOUNT = 10;    // Maximum 10% discount from referrals

    // Bulk purchase discount tiers
    uint256 private constant TIER1_TICKETS = 5;     // 5+ tickets
    uint256 private constant TIER2_TICKETS = 10;    // 10+ tickets
    uint256 private constant TIER3_TICKETS = 20;    // 20+ tickets

    uint256 private constant TIER1_DISCOUNT = 2;    // 2% discount
    uint256 private constant TIER2_DISCOUNT = 5;    // 5% discount
    uint256 private constant TIER3_DISCOUNT = 10;   // 10% discount

    // Minimum and maximum numbers
    uint8 private constant MIN_NUMBER = 1;
    uint8 private constant MAX_NUMBER = 49;
    uint8 private constant NUMBERS_PER_TICKET = 6;
    
    // Security limits
    uint256 private constant MAX_TICKETS_PER_DRAW = 1000;
    uint256 private constant MAX_TICKETS_PER_PURCHASE = 100;
    uint256 private constant PRIZE_CLAIM_DEADLINE = 90 days;

    // Optimized storage for winners and prizes
    struct TierInfo {
        uint128 prizeAmount;      // Prize for this tier
        uint32 winnerCount;       // Number of winners
        uint96 reserved;          // Reserved for future use
    }
    
    // Track winners by tier - optimized structure
    mapping(uint256 => mapping(uint8 => address[])) private s_drawWinners; // drawId => matchCount => winners
    mapping(uint256 => mapping(uint8 => TierInfo)) private s_tierInfo;     // drawId => matchCount => tier info
    
    Ticket[] private s_tickets;
    Draw[] private s_draws;
    mapping(address => uint256[]) private s_playerTickets; // player => ticket IDs
    
    // Referral system mappings
    mapping(address => ReferralInfo) private s_referralInfo;
    mapping(address => address) private s_referredBy; // Who referred this user
    
    uint256 private s_currentPoolAmount;
    uint256 private s_accumulatedJackpot; // Accumulated jackpot from previous rounds
    address private s_platformFeeRecipient;

    // Events
    event TicketPurchased(address indexed player, uint256 ticketId, uint8[6] numbers);
    event MultipleTicketsPurchased(address indexed player, uint256 ticketCount, uint256 discountApplied);
    event LotteryDrawCompleted(uint256 indexed drawId, uint8[6] winningNumbers, uint256 accumulatedJackpot);
    event PrizeClaimed(address indexed winner, uint256 ticketId, uint8 matchCount, uint256 amount);
    event PoolUpdated(uint256 newAmount);
    event JackpotAccumulated(uint256 amount, uint256 totalAccumulated);
    event ReferralAdded(address indexed referrer, address indexed referred);
    event ReferralDiscountApplied(address indexed player, uint256 discountPercent, uint256 amountSaved);

    /**
     * @dev Constructor initializes the lottery with configuration parameters
     * @param ticketPriceUsdt The price of one lottery ticket in USDT (in wei, 18 decimals)
     * @param usdtToken The USDT token address
     * @param vrfCoordinatorV2 Chainlink VRF Coordinator address
     * @param gasLane Chainlink VRF gas lane key hash
     * @param subscriptionId Chainlink VRF subscription ID
     * @param callbackGasLimit Chainlink VRF callback gas limit
     * @param interval Time between lottery draws in seconds
     * @param platformFeeRecipient Address to receive platform fees
     */
    constructor(
        uint256 ticketPriceUsdt,
        address usdtToken,
        address vrfCoordinatorV2,
        bytes32 gasLane,
        uint256 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval,
        address platformFeeRecipient
    ) VRFConsumerBaseV2(vrfCoordinatorV2) Ownable() {
        require(ticketPriceUsdt > 0, "Ticket price must be greater than 0");
        require(usdtToken != address(0), "USDT token cannot be zero address");
        require(platformFeeRecipient != address(0), "Fee recipient cannot be zero address");
        
        i_ticketPrice = ticketPriceUsdt;
        i_usdtToken = IERC20(usdtToken);
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        i_interval = interval;
        s_lastTimeStamp = block.timestamp;
        s_lotteryState = LotteryState.OPEN;
        s_currentPoolAmount = 0;
        s_accumulatedJackpot = 0; // Initialize accumulated jackpot
        s_platformFeeRecipient = platformFeeRecipient;
    }

    /**
     * @dev Records a new referral relationship with enhanced security
     * @param referred The address of the user being referred
     */
    function addReferral(address referred) external {
        require(referred != msg.sender, "Cannot refer yourself");
        require(referred != address(0), "Cannot refer zero address");
        require(s_referredBy[referred] == address(0), "User already has a referrer");
        require(s_playerTickets[msg.sender].length > 0, "Referrer must have purchased at least one ticket");
        require(s_playerTickets[referred].length == 0, "Referred user already purchased tickets");
        
        // Check if referrer hasn't exceeded referral limits (max 50 referrals per account)
        require(s_referralInfo[msg.sender].totalReferrals < 50, "Referral limit exceeded");
        
        // Record the referral relationship with timestamp
        s_referredBy[referred] = msg.sender;
        s_referralInfo[msg.sender].referralTimestamp[referred] = block.timestamp;
        
        emit ReferralAdded(msg.sender, referred);
    }

    /**
     * @dev Calculate the total discount percentage for a user based on referrals and bulk purchase
     * @param user The address of the user
     * @param ticketCount How many tickets the user is buying in this transaction
     * @return The total discount percentage (0-100)
     */
    function calculateDiscount(address user, uint256 ticketCount) public view returns (uint256) {
        // Calculate referral discount
        uint256 referralDiscount = 0;
        
        if (s_referralInfo[user].totalReferrals > 0) {
            referralDiscount = s_referralInfo[user].totalReferrals * REFERRAL_DISCOUNT_PERCENT;
            // Cap the referral discount
            if (referralDiscount > MAX_REFERRAL_DISCOUNT) {
                referralDiscount = MAX_REFERRAL_DISCOUNT;
            }
        }
        
        // Calculate bulk purchase discount
        uint256 bulkDiscount = 0;
        
        if (ticketCount >= TIER3_TICKETS) {
            bulkDiscount = TIER3_DISCOUNT;
        } else if (ticketCount >= TIER2_TICKETS) {
            bulkDiscount = TIER2_DISCOUNT;
        } else if (ticketCount >= TIER1_TICKETS) {
            bulkDiscount = TIER1_DISCOUNT;
        }
        
        // Take the higher of the two discounts (they don't stack)
        return referralDiscount > bulkDiscount ? referralDiscount : bulkDiscount;
    }

    /**
     * @dev Purchases a lottery ticket using USDT with specific numbers
     * @param numbers The 6 numbers selected for the ticket (between 1-49)
     * @return ticketId The ID of the purchased ticket
     */
    function buyTicket(uint8[6] calldata numbers) external nonReentrant whenNotPaused returns (uint256) {
        require(s_lotteryState == LotteryState.OPEN, "Lottery is not open");
        require(i_usdtToken.balanceOf(msg.sender) >= i_ticketPrice, "Not enough USDT balance");
        
        // Validate numbers using optimized bit mask approach
        _validateTicketNumbers(numbers);

        uint256 actualPrice = i_ticketPrice;
        
        // Apply discount for referrals (if any)
        uint256 discountPercent = calculateDiscount(msg.sender, 1);
        
        if (discountPercent > 0) {
            uint256 discountAmount = (i_ticketPrice * discountPercent) / 100;
            actualPrice = i_ticketPrice - discountAmount;
            
            emit ReferralDiscountApplied(msg.sender, discountPercent, discountAmount);
        }

        // Transfer USDT from the player to the contract
        bool success = i_usdtToken.transferFrom(msg.sender, address(this), actualPrice);
        require(success, "USDT transfer failed");

        // Create the ticket with packed structure
        uint32 currentDrawId = uint32(s_draws.length); // Assign to current or next draw
        Ticket memory newTicket = Ticket({
            owner: msg.sender,
            packedNumbers: _packNumbers(numbers),
            drawId: currentDrawId,
            matchCount: 0,
            claimed: false
        });
        
        uint256 ticketId = s_tickets.length;
        s_tickets.push(newTicket);
        s_playerTickets[msg.sender].push(ticketId);

        // Update pool amount with the actual price paid
        s_currentPoolAmount += actualPrice;
        emit PoolUpdated(s_currentPoolAmount);
        emit TicketPurchased(msg.sender, ticketId, numbers);

        // If this is the user's first purchase and they were referred, count as a successful referral
        address referrer = s_referredBy[msg.sender];
        if (s_playerTickets[msg.sender].length == 1 && referrer != address(0)) {
            if (!s_referralInfo[referrer].hasReferred[msg.sender]) {
                s_referralInfo[referrer].hasReferred[msg.sender] = true;
                s_referralInfo[referrer].totalReferrals++;
            }
        }

        return ticketId;
    }

    /**
     * @dev Purchases multiple lottery tickets in a single transaction
     * @param numbersArray Array of 6-number arrays for each ticket
     * @return Array of ticket IDs purchased
     */
    function buyMultipleTickets(uint8[6][] calldata numbersArray) external nonReentrant whenNotPaused returns (uint256[] memory) {
        require(s_lotteryState == LotteryState.OPEN, "Lottery is not open");
        require(numbersArray.length > 0, "Must buy at least one ticket");
        require(numbersArray.length <= MAX_TICKETS_PER_PURCHASE, "Exceeds maximum tickets per purchase");
        
        uint256 totalPrice = i_ticketPrice * numbersArray.length;
        require(i_usdtToken.balanceOf(msg.sender) >= totalPrice, "Not enough USDT balance");
        
        // Apply bulk purchase discount
        uint256 discountPercent = calculateDiscount(msg.sender, numbersArray.length);
        uint256 actualTotalPrice = totalPrice;
        
        if (discountPercent > 0) {
            uint256 discountAmount = (totalPrice * discountPercent) / 100;
            actualTotalPrice = totalPrice - discountAmount;
            
            emit ReferralDiscountApplied(msg.sender, discountPercent, discountAmount);
        }

        // Transfer USDT from the player to the contract
        bool success = i_usdtToken.transferFrom(msg.sender, address(this), actualTotalPrice);
        require(success, "USDT transfer failed");

        uint256[] memory ticketIds = new uint256[](numbersArray.length);
        
        for (uint256 i = 0; i < numbersArray.length; i++) {
            // Validate numbers using optimized bit mask approach
            _validateTicketNumbers(numbersArray[i]);
            
            // Create ticket with packed structure
            uint32 currentDrawId = uint32(s_draws.length);
            Ticket memory newTicket = Ticket({
                owner: msg.sender,
                packedNumbers: _packNumbers(numbersArray[i]),
                drawId: currentDrawId,
                matchCount: 0,
                claimed: false
            });
            
            uint256 ticketId = s_tickets.length;
            s_tickets.push(newTicket);
            s_playerTickets[msg.sender].push(ticketId);
            ticketIds[i] = ticketId;
            
            emit TicketPurchased(msg.sender, ticketId, numbersArray[i]);
        }
        
        // Update pool amount with the actual price paid
        s_currentPoolAmount += actualTotalPrice;
        emit PoolUpdated(s_currentPoolAmount);
        emit MultipleTicketsPurchased(msg.sender, numbersArray.length, discountPercent);

        // If this is the user's first purchase batch and they were referred, count as a successful referral
        address referrer = s_referredBy[msg.sender];
        if (s_playerTickets[msg.sender].length == numbersArray.length && referrer != address(0)) {
            if (!s_referralInfo[referrer].hasReferred[msg.sender]) {
                s_referralInfo[referrer].hasReferred[msg.sender] = true;
                s_referralInfo[referrer].totalReferrals++;
            }
        }
        
        return ticketIds;
    }

    /**
     * @dev Gets the total number of successful referrals a user has made
     * @param user The address of the user
     * @return The total number of successful referrals
     */
    function getTotalReferrals(address user) external view returns (uint256) {
        return s_referralInfo[user].totalReferrals;
    }

    /**
     * @dev Gets the referrer of a user
     * @param user The address of the user
     * @return The address of the referrer, or zero address if not referred
     */
    function getReferrer(address user) external view returns (address) {
        return s_referredBy[user];
    }

    /**
     * @dev Checks if a specific user was referred by another user
     * @param referrer The potential referrer
     * @param referred The user who might have been referred
     * @return True if referrer did refer the user
     */
    function hasReferred(address referrer, address referred) external view returns (bool) {
        return s_referralInfo[referrer].hasReferred[referred];
    }

    /**
     * @dev Gets the bulk discount tier information
     * @return tier1Tickets tier1Discount tier2Tickets tier2Discount tier3Tickets tier3Discount Tier thresholds and discount percentages
     */
    function getBulkDiscountTiers() external pure returns (
        uint256 tier1Tickets, uint256 tier1Discount,
        uint256 tier2Tickets, uint256 tier2Discount,
        uint256 tier3Tickets, uint256 tier3Discount
    ) {
        return (
            TIER1_TICKETS, TIER1_DISCOUNT,
            TIER2_TICKETS, TIER2_DISCOUNT,
            TIER3_TICKETS, TIER3_DISCOUNT
        );
    }

    /**
     * @dev Gets the referral discount information
     * @return discountPerReferral Percentage discount per referral
     * @return maxReferralDiscount Maximum possible referral discount
     */
    function getReferralDiscountInfo() external pure returns (uint256 discountPerReferral, uint256 maxReferralDiscount) {
        return (REFERRAL_DISCOUNT_PERCENT, MAX_REFERRAL_DISCOUNT);
    }

    /**
     * @dev Chainlink Keeper checks if it's time to perform an upkeep (draw the lottery)
     * @return upkeepNeeded True if upkeep is needed, false otherwise
     * @return performData Additional data for perform upkeep (unused in this implementation)
     */
    function checkUpkeep(bytes memory /* checkData */) 
        public 
        view 
        override 
        returns (bool upkeepNeeded, bytes memory /* performData */) 
    {
        bool isOpen = (s_lotteryState == LotteryState.OPEN);
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasTickets = (s_tickets.length > 0);
        bool hasPool = (s_currentPoolAmount > 0);

        upkeepNeeded = (isOpen && timePassed && hasTickets && hasPool);
        return (upkeepNeeded, "");
    }

    /**
     * @dev Chainlink Keeper performs the lottery draw if it's time
     */
    function performUpkeep(bytes calldata /* performData */) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        require(upkeepNeeded, "Upkeep not needed");

        s_lotteryState = LotteryState.CALCULATING;
        
        // Request random numbers from Chainlink VRF
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            uint64(i_subscriptionId),
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
    }

    /**
     * @dev Callback function used by Chainlink VRF to deliver random values
     * @param randomWords Array of random values from Chainlink VRF
     */
    function fulfillRandomWords(uint256 /* requestId */, uint256[] memory randomWords) internal override {
        require(s_lotteryState == LotteryState.CALCULATING, "Not in calculating state");
        
        // Generate winning numbers using Fisher-Yates shuffle algorithm (more efficient and unbiased)
        uint8[6] memory winningNumbers;
        uint8[49] memory availableNumbers;
        
        // Initialize available numbers 1-49
        for (uint8 i = 0; i < 49; i++) {
            availableNumbers[i] = i + 1;
        }
        
        // Fisher-Yates shuffle to select 6 unique random numbers
        for (uint8 i = 0; i < 6; i++) {
            uint256 randomIndex = randomWords[i] % (49 - i);
            winningNumbers[i] = availableNumbers[randomIndex];
            
            // Swap selected number with the last unselected number
            availableNumbers[randomIndex] = availableNumbers[48 - i];
        }
        
        // Sort the winning numbers for consistency
        _sortNumbers(winningNumbers);
        
        uint256 drawId = s_draws.length;
        
        // Create new draw with packed structure
        Draw memory newDraw = Draw({
            drawId: drawId,
            packedWinningNumbers: _packNumbers(winningNumbers),
            timestamp: _getCurrentTimestamp(),
            totalPoolAmount: uint128(s_currentPoolAmount),
            accumulatedJackpot: uint128(s_accumulatedJackpot)
        });
        s_draws.push(newDraw);
        
        // Process tickets with batch size limit to prevent gas issues
        _processTicketsForDraw(drawId, winningNumbers);
        
        // Calculate and distribute prizes
        _calculateAndDistributePrizes(drawId);
        
        // Reset for next round
        s_currentPoolAmount = 0;
        emit PoolUpdated(s_currentPoolAmount);
        
        s_lotteryState = LotteryState.OPEN;
        s_lastTimeStamp = block.timestamp;
        
        emit LotteryDrawCompleted(drawId, winningNumbers, s_accumulatedJackpot);
    }
    
    /**
     * @dev Sort numbers array using insertion sort (efficient for small arrays)
     * @param numbers Array of 6 numbers to sort
     */
    function _sortNumbers(uint8[6] memory numbers) private pure {
        for (uint8 i = 1; i < 6; i++) {
            uint8 key = numbers[i];
            uint8 j = i;
            
            while (j > 0 && numbers[j - 1] > key) {
                numbers[j] = numbers[j - 1];
                j--;
            }
            numbers[j] = key;
        }
    }
    
    /**
     * @dev Process tickets for a draw with gas optimization
     * @param drawId The draw ID
     * @param winningNumbers The winning numbers
     */
    function _processTicketsForDraw(uint256 drawId, uint8[6] memory winningNumbers) private {
        uint256 ticketCount = s_tickets.length;
        
        // If too many tickets, process only the most recent ones
        uint256 startIndex = ticketCount > MAX_TICKETS_PER_DRAW ? ticketCount - MAX_TICKETS_PER_DRAW : 0;
        
        for (uint256 i = startIndex; i < ticketCount; i++) {
            if (s_tickets[i].claimed) continue;
            
            // Unpack ticket numbers for comparison
            uint8[6] memory ticketNumbers = _unpackNumbers(s_tickets[i].packedNumbers);
            uint8 matchCount = countMatches(ticketNumbers, winningNumbers);
            
            if (matchCount >= 2) {
                s_tickets[i].matchCount = matchCount;
                s_drawWinners[drawId][matchCount].push(s_tickets[i].owner);
            }
        }
    }
    
    /**
     * @dev Calculate and distribute prizes for a draw
     * @param drawId The draw ID
     */
    function _calculateAndDistributePrizes(uint256 drawId) private {
        uint256 platformFeeAmount = (s_currentPoolAmount * PLATFORM_FEE) / 100;
        uint256 mainPrizePool = s_currentPoolAmount - platformFeeAmount;
        uint256 jackpotAmount = (mainPrizePool * MATCH_6_PERCENTAGE) / 100;
        
        // Add accumulated jackpot to the current jackpot amount
        if (s_accumulatedJackpot > 0) {
            jackpotAmount += s_accumulatedJackpot;
            s_accumulatedJackpot = 0;
        }
        
        // Calculate and store prize info for each tier using optimized struct
        _storeTierInfo(drawId, 6, jackpotAmount);
        _storeTierInfo(drawId, 5, (mainPrizePool * MATCH_5_PERCENTAGE) / 100);
        _storeTierInfo(drawId, 4, (mainPrizePool * MATCH_4_PERCENTAGE) / 100);
        _storeTierInfo(drawId, 3, (mainPrizePool * MATCH_3_PERCENTAGE) / 100);
        _storeTierInfo(drawId, 2, (mainPrizePool * MATCH_2_PERCENTAGE) / 100);
        
        // Transfer platform fee
        bool success = i_usdtToken.transfer(s_platformFeeRecipient, platformFeeAmount);
        require(success, "Platform fee transfer failed");
        
        // Check if anyone won the jackpot
        uint256 jackpotWinners = s_drawWinners[drawId][6].length;
        
        // If no one matched 6 numbers, accumulate part of the jackpot for the next round
        if (jackpotWinners == 0 && jackpotAmount > 0) {
            uint256 amountToAccumulate = (jackpotAmount * ACCUMULATION_PERCENTAGE) / 100;
            s_accumulatedJackpot = amountToAccumulate;
            emit JackpotAccumulated(amountToAccumulate, s_accumulatedJackpot);
        }
    }
    
    /**
     * @dev Validates ticket numbers using bit mask for efficiency
     * @param numbers The 6 numbers to validate
     */
    function _validateTicketNumbers(uint8[6] calldata numbers) private pure {
        uint256 mask = 0;
        
        for (uint8 i = 0; i < NUMBERS_PER_TICKET; i++) {
            require(numbers[i] >= MIN_NUMBER && numbers[i] <= MAX_NUMBER, "Numbers must be between 1 and 49");
            
            uint256 bit = 1 << numbers[i];
            require(mask & bit == 0, "Duplicate numbers not allowed");
            mask |= bit;
        }
    }

    /**
     * @dev Pack 6 numbers into a single uint48 for storage efficiency
     * @param numbers Array of 6 numbers to pack
     * @return packed Packed representation of the numbers
     */
    function _packNumbers(uint8[6] memory numbers) private pure returns (uint48 packed) {
        for (uint8 i = 0; i < 6; i++) {
            packed |= uint48(numbers[i]) << (i * 8);
        }
        return packed;
    }

    /**
     * @dev Unpack a uint48 back into 6 numbers
     * @param packed Packed representation of numbers
     * @return numbers Array of 6 unpacked numbers
     */
    function _unpackNumbers(uint48 packed) private pure returns (uint8[6] memory numbers) {
        for (uint8 i = 0; i < 6; i++) {
            numbers[i] = uint8((packed >> (i * 8)) & 0xFF);
        }
        return numbers;
    }

    /**
     * @dev Get current timestamp as uint32 (sufficient until 2106)
     * @return Current block timestamp as uint32
     */
    function _getCurrentTimestamp() private view returns (uint32) {
        require(block.timestamp <= type(uint32).max, "Timestamp overflow");
        return uint32(block.timestamp);
    }

    /**
     * @dev Store tier information efficiently using packed struct
     * @param drawId The draw ID
     * @param tier The tier level (2-6)
     * @param prizeAmount The prize amount for this tier
     */
    function _storeTierInfo(uint256 drawId, uint8 tier, uint256 prizeAmount) private {
        uint32 winnerCount = uint32(s_drawWinners[drawId][tier].length);
        
        s_tierInfo[drawId][tier] = TierInfo({
            prizeAmount: uint128(prizeAmount),
            winnerCount: winnerCount,
            reserved: 0
        });
    }

    /**
     * @dev Get tier prize amount efficiently
     * @param drawId The draw ID
     * @param tier The tier level
     * @return The prize amount for the tier
     */
    function _getTierPrize(uint256 drawId, uint8 tier) private view returns (uint256) {
        return uint256(s_tierInfo[drawId][tier].prizeAmount);
    }

    /**
     * @dev Get tier winner count efficiently
     * @param drawId The draw ID
     * @param tier The tier level
     * @return The number of winners in the tier
     */
    function _getTierWinnerCount(uint256 drawId, uint8 tier) private view returns (uint256) {
        return uint256(s_tierInfo[drawId][tier].winnerCount);
    }
    
    /**
     * @dev Count how many numbers in a ticket match the winning numbers using bit operations
     * @param ticketNumbers The ticket's numbers
     * @param winningNumbers The winning numbers
     * @return The count of matching numbers
     */
    function countMatches(uint8[6] memory ticketNumbers, uint8[6] memory winningNumbers) internal pure returns (uint8) {
        // Create bit masks for both sets of numbers
        uint256 ticketMask = 0;
        uint256 winningMask = 0;
        
        // Set bits for ticket numbers
        for (uint8 i = 0; i < 6; i++) {
            ticketMask |= (1 << ticketNumbers[i]);
        }
        
        // Set bits for winning numbers
        for (uint8 i = 0; i < 6; i++) {
            winningMask |= (1 << winningNumbers[i]);
        }
        
        // Count matches using bitwise AND and popcount
        uint256 matches = ticketMask & winningMask;
        
        // Count set bits (population count)
        uint8 count = 0;
        while (matches != 0) {
            count += uint8(matches & 1);
            matches >>= 1;
        }
        
        return count;
    }
    
    /**
     * @dev Claims a prize for a winning ticket with deadline enforcement
     * @param ticketId The ID of the winning ticket
     */
    function claimPrize(uint256 ticketId) external nonReentrant {
        require(ticketId < s_tickets.length, "Ticket does not exist");
        require(s_tickets[ticketId].owner == msg.sender, "Not ticket owner");
        require(!s_tickets[ticketId].claimed, "Prize already claimed");
        require(s_tickets[ticketId].matchCount >= 2, "No prize to claim");
        
        // Find the draw for this ticket
        uint256 drawId = _findDrawForTicket(ticketId);
        require(drawId < s_draws.length, "Draw not found");
        
        // Check if claim deadline has passed
        require(
            block.timestamp <= s_draws[drawId].timestamp + PRIZE_CLAIM_DEADLINE,
            "Prize claim deadline has passed"
        );
        
        uint8 matchCount = s_tickets[ticketId].matchCount;
        
        // Calculate the prize amount based on the tier and number of winners using optimized storage
        uint256 tierPrize = _getTierPrize(drawId, matchCount);
        uint256 winnerCount = _getTierWinnerCount(drawId, matchCount);
        
        require(winnerCount > 0, "No winners in this tier");
        require(tierPrize > 0, "No prize available for this tier");
        
        uint256 prizeAmount = tierPrize / winnerCount;
        require(prizeAmount > 0, "Prize amount is zero");
        
        // Mark ticket as claimed
        s_tickets[ticketId].claimed = true;
        
        // Transfer prize to winner
        bool success = i_usdtToken.transfer(msg.sender, prizeAmount);
        require(success, "Prize transfer failed");
        
        emit PrizeClaimed(msg.sender, ticketId, matchCount, prizeAmount);
    }
    
    /**
     * @dev Find which draw a ticket belongs to
     * @param ticketId The ticket ID
     * @return The draw ID
     */
    function _findDrawForTicket(uint256 ticketId) private view returns (uint256) {
        // For simplicity, we'll use the latest draw
        // In a more complex system, you'd track ticket-to-draw mapping
        require(s_draws.length > 0, "No draws available");
        return s_draws.length - 1;
    }
    
    /**
     * @dev Manually triggers the lottery draw - can only be called by the owner
     * This is a backup in case the Chainlink Keepers automation fails
     */
    function drawLottery() external onlyOwner {
        require(s_lotteryState == LotteryState.OPEN, "Lottery is not open");
        require(s_tickets.length > 0, "No tickets purchased");
        require((block.timestamp - s_lastTimeStamp) > i_interval, "Not enough time has passed");
        
        s_lotteryState = LotteryState.CALCULATING;
        
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            uint64(i_subscriptionId),
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
    }
    
    /**
     * @dev Sets a new platform fee recipient address
     * @param newRecipient The new address to receive platform fees
     */
    function setPlatformFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Cannot set zero address");
        s_platformFeeRecipient = newRecipient;
    }
    
    /**
     * @dev Returns a user's purchased tickets
     * @param player The address of the player
     * @return Array of ticket IDs owned by the player
     */
    function getPlayerTickets(address player) external view returns (uint256[] memory) {
        return s_playerTickets[player];
    }
    
    /**
     * @dev Returns a specific ticket's information with unpacked numbers
     * @param ticketId The ID of the ticket
     * @return owner The ticket owner
     * @return numbers The unpacked numbers array
     * @return drawId The draw this ticket belongs to
     * @return matchCount Number of matches found
     * @return claimed Whether the prize was claimed
     */
    function getTicket(uint256 ticketId) external view returns (
        address owner,
        uint8[6] memory numbers,
        uint32 drawId,
        uint8 matchCount,
        bool claimed
    ) {
        require(ticketId < s_tickets.length, "Ticket does not exist");
        Ticket storage ticket = s_tickets[ticketId];
        
        return (
            ticket.owner,
            _unpackNumbers(ticket.packedNumbers),
            ticket.drawId,
            ticket.matchCount,
            ticket.claimed
        );
    }
    
    /**
     * @dev Returns a specific draw's information with unpacked winning numbers
     * @param drawId The ID of the draw
     * @return drawId_ The draw ID
     * @return winningNumbers The unpacked winning numbers
     * @return timestamp The draw timestamp
     * @return totalPoolAmount The total pool amount
     * @return accumulatedJackpot The accumulated jackpot amount
     */
    function getDraw(uint256 drawId) external view returns (
        uint256 drawId_,
        uint8[6] memory winningNumbers,
        uint32 timestamp,
        uint128 totalPoolAmount,
        uint128 accumulatedJackpot
    ) {
        require(drawId < s_draws.length, "Draw does not exist");
        Draw storage draw = s_draws[drawId];
        
        return (
            draw.drawId,
            _unpackNumbers(draw.packedWinningNumbers),
            draw.timestamp,
            draw.totalPoolAmount,
            draw.accumulatedJackpot
        );
    }
    
    /**
     * @dev Returns the latest draw information
     * @return The latest draw information, or empty draw if no draws yet
     */
    function getLatestDraw() external view returns (Draw memory) {
        if (s_draws.length == 0) {
            return Draw(0, 0, 0, 0, 0);
        }
        return s_draws[s_draws.length - 1];
    }
    
    /**
     * @dev Returns the winners for a specific tier in a draw
     * @param drawId The ID of the draw
     * @param matchCount The number of matches (2-6)
     * @return Array of winner addresses for that tier
     */
    function getWinnersByTier(uint256 drawId, uint8 matchCount) external view returns (address[] memory) {
        require(drawId < s_draws.length, "Draw does not exist");
        require(matchCount >= 2 && matchCount <= 6, "Invalid match count");
        return s_drawWinners[drawId][matchCount];
    }
    
    /**
     * @dev Returns the prize amount for a specific tier in a draw
     * @param drawId The ID of the draw
     * @param matchCount The number of matches (2-6)
     * @return The prize amount for that tier
     */
    function getTierPrize(uint256 drawId, uint8 matchCount) external view returns (uint256) {
        require(drawId < s_draws.length, "Draw does not exist");
        require(matchCount >= 2 && matchCount <= 6, "Invalid match count");
        return _getTierPrize(drawId, matchCount);
    }
    
    /**
     * @dev Returns the ticket price
     * @return The price of one ticket in USDT (wei)
     */
    function getTicketPrice() external view returns (uint256) {
        return i_ticketPrice;
    }
    
    /**
     * @dev Returns the current pool amount
     * @return The current pool amount in USDT (wei)
     */
    function getCurrentPool() external view returns (uint256) {
        return s_currentPoolAmount;
    }
    
    /**
     * @dev Returns the accumulated jackpot amount
     * @return The accumulated jackpot amount in USDT (wei)
     */
    function getAccumulatedJackpot() external view returns (uint256) {
        return s_accumulatedJackpot;
    }
    
    /**
     * @dev Returns the time remaining until the next draw
     * @return The time remaining in seconds
     */
    function getTimeUntilNextDraw() external view returns (uint256) {
        uint256 deadline = s_lastTimeStamp + i_interval;
        if (block.timestamp >= deadline) {
            return 0;
        }
        return deadline - block.timestamp;
    }
    
    /**
     * @dev Returns the lottery state
     * @return The current lottery state
     */
    function getLotteryState() external view returns (LotteryState) {
        return s_lotteryState;
    }
    
    /**
     * @dev Pauses the lottery
     */
    function pauseLottery() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpauses the lottery
     */
    function unpauseLottery() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Recovers any accidentally sent ETH
     */
    function withdrawETH() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "ETH withdrawal failed");
    }
    
    /**
     * @dev Recovers any accidentally sent ERC20 tokens other than the lottery token
     * @param tokenAddress The address of the token to recover
     */
    function recoverERC20(address tokenAddress) external onlyOwner {
        require(tokenAddress != address(i_usdtToken), "Cannot withdraw lottery token");
        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens to recover");
        bool success = token.transfer(owner(), balance);
        require(success, "Token recovery failed");
    }
    
    /**
     * @dev Emergency function to recover unclaimed prizes after deadline
     * Can only be called by owner after prize claim deadline has passed
     */
    function recoverUnclaimedPrizes(uint256 drawId) external onlyOwner {
        require(drawId < s_draws.length, "Draw does not exist");
        require(
            block.timestamp > s_draws[drawId].timestamp + PRIZE_CLAIM_DEADLINE,
            "Prize claim deadline has not passed yet"
        );
        
        // Calculate total unclaimed prizes for this draw
        uint256 totalUnclaimed = 0;
        
        for (uint8 tier = 2; tier <= 6; tier++) {
            uint256 tierPrize = _getTierPrize(drawId, tier);
            uint256 winnerCount = s_drawWinners[drawId][tier].length;
            
            if (tierPrize > 0 && winnerCount > 0) {
                // Count unclaimed prizes in this tier
                uint256 claimedCount = 0;
                for (uint256 i = 0; i < winnerCount; i++) {
                    address winner = s_drawWinners[drawId][tier][i];
                    // This is simplified - in production you'd track claims more precisely
                }
                
                if (claimedCount < winnerCount) {
                    totalUnclaimed += tierPrize - (tierPrize * claimedCount / winnerCount);
                }
            }
        }
        
        if (totalUnclaimed > 0) {
            bool success = i_usdtToken.transfer(owner(), totalUnclaimed);
            require(success, "Unclaimed prize recovery failed");
        }
    }
    
    /**
     * @dev Get the maximum number of tickets that can be processed in one draw
     * @return The maximum ticket limit
     */
    function getMaxTicketsPerDraw() external pure returns (uint256) {
        return MAX_TICKETS_PER_DRAW;
    }
    
    /**
     * @dev Get the prize claim deadline in seconds
     * @return The deadline in seconds
     */
    function getPrizeClaimDeadline() external pure returns (uint256) {
        return PRIZE_CLAIM_DEADLINE;
    }
}