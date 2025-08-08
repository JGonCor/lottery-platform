const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiTierLottery Optimized Tests", function () {
    let lottery;
    let usdtToken;
    let vrfCoordinator;
    let owner;
    let player1;
    let player2;

    const TICKET_PRICE = ethers.parseEther("5"); // 5 USDT
    const INTERVAL = 12 * 60 * 60; // 12 hours

    beforeEach(async function () {
        [owner, player1, player2] = await ethers.getSigners();

        // Deploy USDT mock
        const USDTMock = await ethers.getContractFactory("LotteryToken");
        usdtToken = await USDTMock.deploy("USDT Mock", "USDT");

        // Deploy VRF Coordinator mock
        const VRFMock = await ethers.getContractFactory("VRFCoordinatorV2Mock");
        vrfCoordinator = await VRFMock.deploy(0, 0);

        // Deploy MultiTierLottery
        const MultiTierLottery = await ethers.getContractFactory("MultiTierLottery");
        lottery = await MultiTierLottery.deploy(
            TICKET_PRICE,
            await usdtToken.getAddress(),
            await vrfCoordinator.getAddress(),
            "0x0000000000000000000000000000000000000000000000000000000000000001", // gasLane
            1, // subscriptionId
            2500000, // callbackGasLimit
            INTERVAL,
            owner.address // platformFeeRecipient
        );

        // Mint USDT to players
        await usdtToken.mint(player1.address, ethers.parseEther("1000"));
        await usdtToken.mint(player2.address, ethers.parseEther("1000"));

        // Approve lottery contract
        await usdtToken.connect(player1).approve(await lottery.getAddress(), ethers.parseEther("1000"));
        await usdtToken.connect(player2).approve(await lottery.getAddress(), ethers.parseEther("1000"));
    });

    describe("Optimized Number Validation", function () {
        it("Should validate numbers using bit mask efficiently", async function () {
            const validNumbers = [1, 15, 23, 35, 42, 49];
            
            // This should work without errors
            await expect(
                lottery.connect(player1).buyTicket(validNumbers)
            ).to.not.be.reverted;
        });

        it("Should reject duplicate numbers", async function () {
            const duplicateNumbers = [1, 15, 23, 15, 42, 49]; // 15 is duplicate
            
            await expect(
                lottery.connect(player1).buyTicket(duplicateNumbers)
            ).to.be.revertedWith("Duplicate numbers not allowed");
        });

        it("Should reject numbers out of range", async function () {
            const invalidNumbers = [0, 15, 23, 35, 42, 49]; // 0 is invalid
            
            await expect(
                lottery.connect(player1).buyTicket(invalidNumbers)
            ).to.be.revertedWith("Numbers must be between 1 and 49");
        });
    });

    describe("Enhanced Referral System", function () {
        it("Should allow valid referrals", async function () {
            // Player1 buys a ticket first
            await lottery.connect(player1).buyTicket([1, 2, 3, 4, 5, 6]);
            
            // Player1 can now refer player2
            await expect(
                lottery.connect(player1).addReferral(player2.address)
            ).to.emit(lottery, "ReferralAdded");
            
            // Check referral relationship
            expect(await lottery.getReferrer(player2.address)).to.equal(player1.address);
        });

        it("Should prevent self-referral", async function () {
            await lottery.connect(player1).buyTicket([1, 2, 3, 4, 5, 6]);
            
            await expect(
                lottery.connect(player1).addReferral(player1.address)
            ).to.be.revertedWith("Cannot refer yourself");
        });

        it("Should prevent referring users who already bought tickets", async function () {
            // Both players buy tickets
            await lottery.connect(player1).buyTicket([1, 2, 3, 4, 5, 6]);
            await lottery.connect(player2).buyTicket([7, 8, 9, 10, 11, 12]);
            
            // Player1 tries to refer player2 who already bought tickets
            await expect(
                lottery.connect(player1).addReferral(player2.address)
            ).to.be.revertedWith("Referred user already purchased tickets");
        });
    });

    describe("Bulk Purchase Limits", function () {
        it("Should enforce maximum tickets per purchase", async function () {
            // Try to buy more than MAX_TICKETS_PER_PURCHASE (100)
            const manyTickets = Array(101).fill([1, 2, 3, 4, 5, 6]);
            
            await expect(
                lottery.connect(player1).buyMultipleTickets(manyTickets)
            ).to.be.revertedWith("Exceeds maximum tickets per purchase");
        });

        it("Should allow buying within limits", async function () {
            const validTickets = Array(10).fill([1, 2, 3, 4, 5, 6]);
            
            await expect(
                lottery.connect(player1).buyMultipleTickets(validTickets)
            ).to.not.be.reverted;
        });
    });

    describe("Security Limits", function () {
        it("Should return correct max tickets per draw", async function () {
            expect(await lottery.getMaxTicketsPerDraw()).to.equal(1000);
        });

        it("Should return correct prize claim deadline", async function () {
            expect(await lottery.getPrizeClaimDeadline()).to.equal(90 * 24 * 60 * 60); // 90 days
        });
    });

    describe("Gas Optimization Verification", function () {
        it("Should validate numbers efficiently", async function () {
            const numbers = [1, 15, 23, 35, 42, 49];
            
            // Estimate gas for buying ticket with optimized validation
            const gasEstimate = await lottery.connect(player1).buyTicket.estimateGas(numbers);
            
            // Should be significantly less than 100,000 gas
            expect(gasEstimate).to.be.lessThan(100000);
        });
    });
}); 