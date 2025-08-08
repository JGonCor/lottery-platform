// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

/**
 * @title UsdtLottery
 * @dev A lottery contract that uses USDT tokens for ticket purchases, Chainlink VRF for randomness, and
 * Chainlink Keepers for automated draws. This implementation supports the proxy pattern.
 */
contract UsdtLotteryImplementation is Initializable, Ownable2Step, ReentrancyGuard, Pausable, VRFConsumerBaseV2, AutomationCompatibleInterface {
    // Chainlink VRF variables
    VRFCoordinatorV2Interface private i_vrfCoordinator;
    bytes32 private i_gasLane;
    uint256 private i_subscriptionId;
    uint32 private i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // Lottery state
    enum LotteryState {
        OPEN,
        CALCULATING
    }
    LotteryState private s_lotteryState;

    // Ticket price in USDT (with 18 decimals)
    uint256 private i_ticketPrice;
    IERC20 private i_usdtToken;

    // Duration settings
    uint256 private i_interval;
    uint256 private s_lastTimeStamp;

    // Lottery record-keeping
    address[] private s_players;
    address[] private s_winners;
    mapping(address => uint256[]) private s_playerTickets;
    mapping(uint256 => address) private s_ticketOwner;
    uint256 private s_ticketCounter;
    uint256 private s_currentJackpot;
    uint256 private s_lastWinnerAmount;
    address private s_lastWinner;

    // Constants
    uint256 private constant JACKPOT_PERCENTAGE = 90; // 90% of total pot
    uint256 private constant OWNER_FEE = 10; // 10% of total pot
    uint256 private constant NEXT_JACKPOT_SEED = 0; // 0% seeds next jackpot

    // Events
    event TicketPurchased(address indexed player, uint256 ticketId);
    event LotteryWinner(address indexed winner, uint256 amount);
    event JackpotUpdated(uint256 newJackpot);
    event RequestedLotteryWinner(uint256 indexed requestId);
    event LotteryStarted(uint256 timestamp);
    event LotteryEnded(uint256 timestamp);

    /**
     * @dev Constructor for implementation contract
     * @param vrfCoordinatorV2 Chainlink VRF Coordinator address
     */
    constructor(address vrfCoordinatorV2) VRFConsumerBaseV2(vrfCoordinatorV2) {
        // This disables initialization of the implementation contract itself
        _disableInitializers();
    }

    /**
     * @dev Initializes the lottery with configuration parameters. Used by proxy pattern.
     * @param ticketPriceUsdt The price of one lottery ticket in USDT (in wei, 18 decimals)
     * @param usdtToken The USDT token address
     * @param vrfCoordinatorV2 Chainlink VRF Coordinator address
     * @param gasLane Chainlink VRF gas lane key hash
     * @param subscriptionId Chainlink VRF subscription ID
     * @param callbackGasLimit Chainlink VRF callback gas limit
     * @param interval Time between lottery draws in seconds
     * @param initialOwner The initial owner of the lottery
     */
    function initialize(
        uint256 ticketPriceUsdt,
        address usdtToken,
        address vrfCoordinatorV2,
        bytes32 gasLane,
        uint256 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval,
        address initialOwner
    ) external initializer {
        require(ticketPriceUsdt > 0, "Ticket price must be greater than 0");
        require(usdtToken != address(0), "USDT token cannot be zero address");
        require(initialOwner != address(0), "Initial owner cannot be zero address");
        
        // Initialize Ownable
        _transferOwnership(initialOwner);
        
        // Set contract variables
        i_ticketPrice = ticketPriceUsdt;
        i_usdtToken = IERC20(usdtToken);
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        i_interval = interval;
        
        // Initialize state variables
        s_lastTimeStamp = block.timestamp;
        s_lotteryState = LotteryState.OPEN;
        s_ticketCounter = 0;
        s_currentJackpot = 0;

        emit LotteryStarted(block.timestamp);
    }

    /**
     * @dev Purchases a lottery ticket using USDT
     * @return ticketId The ID of the purchased ticket
     */
    function buyTicket() external nonReentrant whenNotPaused returns (uint256 ticketId) {
        require(s_lotteryState == LotteryState.OPEN, "Lottery is not open");
        require(i_usdtToken.balanceOf(msg.sender) >= i_ticketPrice, "Not enough USDT balance");

        // Transfer USDT from the player to the contract
        bool success = i_usdtToken.transferFrom(msg.sender, address(this), i_ticketPrice);
        require(success, "USDT transfer failed");

        // Add player to array if they haven't played before
        if (s_playerTickets[msg.sender].length == 0) {
            s_players.push(msg.sender);
        }

        // Generate a ticket ID and keep track of ownership
        ticketId = s_ticketCounter;
        s_ticketCounter++;
        s_playerTickets[msg.sender].push(ticketId);
        s_ticketOwner[ticketId] = msg.sender;

        // Update jackpot
        s_currentJackpot += (i_ticketPrice * JACKPOT_PERCENTAGE) / 100;
        emit JackpotUpdated(s_currentJackpot);
        emit TicketPurchased(msg.sender, ticketId);

        return ticketId;
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
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = (s_currentJackpot > 0);

        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
        return (upkeepNeeded, "");
    }

    /**
     * @dev Chainlink Keeper performs the lottery draw if it's time
     */
    function performUpkeep(bytes calldata /* performData */) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        require(upkeepNeeded, "Upkeep not needed");

        s_lotteryState = LotteryState.CALCULATING;
        
        // Request random number from Chainlink VRF
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            uint64(i_subscriptionId),
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        
        emit RequestedLotteryWinner(requestId);
    }

    /**
     * @dev Callback function used by Chainlink VRF to deliver random values
     * @param randomWords Array of random values from Chainlink VRF
     */
    function fulfillRandomWords(uint256 /* requestId */, uint256[] memory randomWords) internal override {
        // Make sure there are players
        require(s_players.length > 0, "No players in the lottery");

        // Get the random winner
        uint256 winnerIndex = randomWords[0] % s_players.length;
        address winner = s_players[winnerIndex];
        s_lastWinner = winner;
        s_winners.push(winner);

        // Calculate prizes
        uint256 totalPot = s_currentJackpot;
        uint256 ownerFeeAmount = (totalPot * OWNER_FEE) / 100;
        uint256 winnerAmount = totalPot - ownerFeeAmount;
        
        // Store the winner amount for reference
        s_lastWinnerAmount = winnerAmount;

        // Reset jackpot for next round
        s_currentJackpot = 0;
        emit JackpotUpdated(s_currentJackpot);
        
        // Reset for next round
        s_players = new address[](0);
        s_lotteryState = LotteryState.OPEN;
        s_lastTimeStamp = block.timestamp;
        
        // Check contract solvency before transfers
        uint256 contractBalance = i_usdtToken.balanceOf(address(this));
        require(contractBalance >= winnerAmount + ownerFeeAmount, "Insufficient contract balance");
        
        // Transfer winnings
        bool success = i_usdtToken.transfer(winner, winnerAmount);
        require(success, "Winner transfer failed");
        
        // Transfer fee to contract owner
        bool ownerTransferSuccess = i_usdtToken.transfer(owner(), ownerFeeAmount);
        require(ownerTransferSuccess, "Owner fee transfer failed");
        
        emit LotteryWinner(winner, winnerAmount);
        emit LotteryEnded(block.timestamp);
    }

    /**
     * @dev Manually triggers the lottery draw - can only be called by the owner
     * This is a backup in case the Chainlink Keepers automation fails
     */
    function drawLottery() external onlyOwner {
        require(s_lotteryState == LotteryState.OPEN, "Lottery is not open");
        require(s_players.length > 0, "No players in the lottery");
        require((block.timestamp - s_lastTimeStamp) > i_interval, "Not enough time has passed");
        
        s_lotteryState = LotteryState.CALCULATING;
        
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            uint64(i_subscriptionId),
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        
        emit RequestedLotteryWinner(requestId);
    }

    /**
     * @dev Returns a user's purchased tickets
     * @param user The address of the user
     * @return Array of ticket IDs owned by the user
     */
    function getUserTickets(address user) external view returns (uint256[] memory) {
        return s_playerTickets[user];
    }

    /**
     * @dev Returns the owner of a specific ticket
     * @param ticketId The ID of the ticket
     * @return The address of the ticket owner
     */
    function getTicketOwner(uint256 ticketId) external view returns (address) {
        return s_ticketOwner[ticketId];
    }

    /**
     * @dev Returns the current jackpot amount
     * @return The current jackpot in USDT (wei)
     */
    function getCurrentJackpot() external view returns (uint256) {
        return s_currentJackpot;
    }

    /**
     * @dev Returns all previous lottery winners
     * @return Array of winner addresses
     */
    function getWinners() external view returns (address[] memory) {
        return s_winners;
    }

    /**
     * @dev Returns the most recent winner
     * @return Address of the last winner
     */
    function getLastWinner() external view returns (address) {
        return s_lastWinner;
    }

    /**
     * @dev Returns the most recent winning amount
     * @return Amount won by the last winner in USDT (wei)
     */
    function getLastWinnerAmount() external view returns (uint256) {
        return s_lastWinnerAmount;
    }

    /**
     * @dev Returns the ticket price
     * @return The price of one ticket in USDT (wei)
     */
    function getTicketPrice() external view returns (uint256) {
        return i_ticketPrice;
    }

    /**
     * @dev Withdraws any accidentally sent ETH to the contract owner
     * Only owner can call this function
     */
    function withdrawETH() external onlyOwner {
        uint256 ethBalance = address(this).balance;
        require(ethBalance > 0, "No ETH to withdraw");
        (bool success, ) = payable(owner()).call{value: ethBalance}("");
        require(success, "ETH withdrawal failed");
    }

    /**
     * @dev Recovers any accidentally sent ERC20 tokens other than the lottery token
     * Only owner can call this function
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
     * @dev Pauses the lottery, preventing new ticket purchases
     * Only owner can call this function
     */
    function pauseLottery() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses the lottery, allowing ticket purchases again
     * Only owner can call this function
     */
    function unpauseLottery() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Returns the current state of the lottery
     * @return The current lottery state (OPEN or CALCULATING)
     */
    function getLotteryState() external view returns (LotteryState) {
        return s_lotteryState;
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
     * @dev Returns the number of unique players in the current lottery round
     * @return The number of players
     */
    function getNumberOfPlayers() external view returns (uint256) {
        return s_players.length;
    }

    /**
     * @dev Returns the total number of tickets sold in the current lottery round
     * @return The total number of tickets
     */
    function getTotalTicketsSold() external view returns (uint256) {
        return s_ticketCounter;
    }
}