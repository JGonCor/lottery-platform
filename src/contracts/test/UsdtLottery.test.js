const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("UsdtLottery", function () {
  let lotteryToken;
  let lotteryImplementation;
  let lotteryFactory;
  let lottery;
  let owner;
  let player1;
  let player2;
  let vrfCoordinatorMock;
  let ticketPrice;
  let lotteryAddress;

  beforeEach(async function () {
    // Get signers
    [owner, player1, player2] = await ethers.getSigners();

    // Deploy a mock USDT token
    const initialSupply = ethers.utils.parseEther("1000000");
    const LotteryToken = await ethers.getContractFactory("LotteryToken");
    lotteryToken = await LotteryToken.deploy(initialSupply);
    await lotteryToken.deployed();

    // Deploy VRF Coordinator Mock
    const VRFCoordinatorMock = await ethers.getContractFactory("VRFCoordinatorV2Mock");
    vrfCoordinatorMock = await VRFCoordinatorMock.deploy(0, 0);
    await vrfCoordinatorMock.deployed();

    // Create a subscription
    await vrfCoordinatorMock.createSubscription();
    await vrfCoordinatorMock.fundSubscription(1, ethers.utils.parseEther("10"));

    // Deploy implementation contract
    const UsdtLotteryImplementation = await ethers.getContractFactory("UsdtLotteryImplementation");
    lotteryImplementation = await UsdtLotteryImplementation.deploy(vrfCoordinatorMock.address);
    await lotteryImplementation.deployed();

    // Deploy factory
    const UsdtLotteryFactory = await ethers.getContractFactory("UsdtLotteryFactory");
    lotteryFactory = await UsdtLotteryFactory.deploy(
      lotteryImplementation.address,
      vrfCoordinatorMock.address,
      ethers.utils.formatBytes32String("keyHash"),
      1, // subscription ID
      500000 // callback gas limit
    );
    await lotteryFactory.deployed();

    // Create lottery
    ticketPrice = ethers.utils.parseEther("10");
    const interval = 60 * 60 * 24 * 7; // 1 week
    const tx = await lotteryFactory.createLottery(
      ticketPrice,
      lotteryToken.address,
      interval
    );
    const receipt = await tx.wait();

    // Get lottery address from event
    const event = receipt.events.find(e => e.event === 'LotteryCreated');
    lotteryAddress = event.args.lotteryAddress;

    // Get lottery contract instance
    lottery = await ethers.getContractAt("UsdtLotteryImplementation", lotteryAddress);

    // Transfer USDT to players for testing
    await lotteryToken.transfer(player1.address, ethers.utils.parseEther("100"));
    await lotteryToken.transfer(player2.address, ethers.utils.parseEther("100"));
  });

  describe("Initialization", function () {
    it("Should initialize the lottery with correct parameters", async function () {
      expect(await lottery.getTicketPrice()).to.equal(ticketPrice);
      expect(await lottery.getCurrentJackpot()).to.equal(0);
      expect(await lottery.getNumberOfPlayers()).to.equal(0);
      expect(await lottery.getLotteryState()).to.equal(0); // OPEN
    });
  });

  describe("Buying Tickets", function () {
    it("Should allow a player to buy a ticket", async function () {
      // Approve USDT spending
      await lotteryToken.connect(player1).approve(lottery.address, ticketPrice);

      // Buy a ticket
      await lottery.connect(player1).buyTicket();

      // Check player's tickets
      const tickets = await lottery.getUserTickets(player1.address);
      expect(tickets.length).to.equal(1);
      expect(tickets[0]).to.equal(0); // First ticket has ID 0

      // Check player count
      expect(await lottery.getNumberOfPlayers()).to.equal(1);

      // Check jackpot amount (80% of ticket price)
      const expectedJackpot = ticketPrice.mul(80).div(100);
      expect(await lottery.getCurrentJackpot()).to.equal(expectedJackpot);
    });

    it("Should fail to buy a ticket without enough USDT", async function () {
      // No approval, try to buy
      await expect(lottery.connect(player1).buyTicket()).to.be.revertedWith("USDT transfer failed");
    });

    it("Should correctly handle multiple tickets from same player", async function () {
      // Approve USDT spending for multiple tickets
      await lotteryToken.connect(player1).approve(lottery.address, ticketPrice.mul(3));

      // Buy 3 tickets
      for (let i = 0; i < 3; i++) {
        await lottery.connect(player1).buyTicket();
      }

      // Check player's tickets
      const tickets = await lottery.getUserTickets(player1.address);
      expect(tickets.length).to.equal(3);

      // Player count should still be 1
      expect(await lottery.getNumberOfPlayers()).to.equal(1);
    });

    it("Should correctly handle tickets from multiple players", async function () {
      // Player 1 buys a ticket
      await lotteryToken.connect(player1).approve(lottery.address, ticketPrice);
      await lottery.connect(player1).buyTicket();

      // Player 2 buys a ticket
      await lotteryToken.connect(player2).approve(lottery.address, ticketPrice);
      await lottery.connect(player2).buyTicket();

      // Check player counts
      expect(await lottery.getNumberOfPlayers()).to.equal(2);
      
      // Check ticket ownership
      expect(await lottery.getTicketOwner(0)).to.equal(player1.address);
      expect(await lottery.getTicketOwner(1)).to.equal(player2.address);
    });
  });

  describe("Lottery Drawing", function () {
    beforeEach(async function () {
      // Fund players and approve USDT
      await lotteryToken.connect(player1).approve(lottery.address, ticketPrice.mul(5));
      await lotteryToken.connect(player2).approve(lottery.address, ticketPrice.mul(5));

      // Players buy tickets
      await lottery.connect(player1).buyTicket();
      await lottery.connect(player2).buyTicket();
      await lottery.connect(player1).buyTicket();
    });

    it("Should not allow draw before interval has passed", async function () {
      await expect(lottery.connect(owner).drawLottery()).to.be.revertedWith("Not enough time has passed");
    });

    it("Should correctly perform a lottery draw", async function () {
      // Fast forward time
      await time.increase(7 * 24 * 60 * 60 + 1); // 1 week + 1 second

      // Perform lottery draw
      const drawTx = await lottery.connect(owner).drawLottery();
      const receipt = await drawTx.wait();

      // Get requestId from event
      const requestEvent = receipt.events.find(e => e.event === 'RequestedLotteryWinner');
      const requestId = requestEvent.args.requestId;

      // Check lottery state
      expect(await lottery.getLotteryState()).to.equal(1); // CALCULATING

      // Simulate Chainlink VRF callback
      await vrfCoordinatorMock.fulfillRandomWords(
        requestId,
        lottery.address
      );

      // After drawing, lottery should be open again
      expect(await lottery.getLotteryState()).to.equal(0); // OPEN

      // Should have a winner
      const winners = await lottery.getWinners();
      expect(winners.length).to.equal(1);
      
      // Player count should be reset
      expect(await lottery.getNumberOfPlayers()).to.equal(0);
      
      // Jackpot should be reduced (10% seed for next round)
      const oldJackpot = ticketPrice.mul(3).mul(80).div(100);
      const expectedNewJackpot = oldJackpot.mul(10).div(100);
      expect(await lottery.getCurrentJackpot()).to.be.closeTo(
        expectedNewJackpot,
        ethers.utils.parseEther("0.1") // Allow small rounding differences
      );
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to pause and unpause the lottery", async function () {
      // Pause the lottery
      await lottery.connect(owner).pauseLottery();
      
      // Try to buy a ticket
      await lotteryToken.connect(player1).approve(lottery.address, ticketPrice);
      await expect(lottery.connect(player1).buyTicket()).to.be.revertedWith("Pausable: paused");
      
      // Unpause
      await lottery.connect(owner).unpauseLottery();
      
      // Now should be able to buy
      await lottery.connect(player1).buyTicket();
      expect(await lottery.getUserTickets(player1.address)).to.have.length(1);
    });

    it("Should not allow non-owners to call admin functions", async function () {
      await expect(lottery.connect(player1).pauseLottery()).to.be.reverted;
      await expect(lottery.connect(player1).unpauseLottery()).to.be.reverted;
      await expect(lottery.connect(player1).withdrawETH()).to.be.reverted;
      await expect(lottery.connect(player1).recoverERC20(lotteryToken.address)).to.be.reverted;
    });
  });

  describe("Chainlink Keeper", function () {
    beforeEach(async function () {
      // Fund players and approve USDT
      await lotteryToken.connect(player1).approve(lottery.address, ticketPrice.mul(5));
      
      // Players buy tickets
      await lottery.connect(player1).buyTicket();
    });

    it("Should correctly identify when upkeep is needed", async function () {
      // Initially, upkeep should not be needed (time hasn't passed)
      let [upkeepNeeded] = await lottery.checkUpkeep("0x");
      expect(upkeepNeeded).to.equal(false);
      
      // Fast forward time
      await time.increase(7 * 24 * 60 * 60 + 1); // 1 week + 1 second
      
      // Now upkeep should be needed
      [upkeepNeeded] = await lottery.checkUpkeep("0x");
      expect(upkeepNeeded).to.equal(true);
    });

    it("Should perform upkeep when conditions are met", async function () {
      // Fast forward time
      await time.increase(7 * 24 * 60 * 60 + 1); // 1 week + 1 second
      
      // Perform upkeep
      await lottery.performUpkeep("0x");
      
      // Lottery should be in CALCULATING state
      expect(await lottery.getLotteryState()).to.equal(1); // CALCULATING
    });
  });
});