// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title LotteryToken
 * @dev A mock USDT token for testing the lottery contract on testnet.
 * This is NOT for production use and is only for development and testing purposes.
 */
contract LotteryToken is ERC20, ERC20Burnable, Ownable, Pausable {
    uint8 private _decimals;

    /**
     * @dev Constructor sets the name, symbol, and decimals of the token
     * @param initialSupply Initial token supply to mint to the deployer
     */
    constructor(uint256 initialSupply) 
        ERC20("Lottery USDT", "LUSDT") 
        Ownable() 
    {
        _decimals = 18;
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Allows the owner to mint new tokens
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Returns the number of decimals used for token amounts
     * @return The number of decimals
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Pauses all token transfers
     * Only callable by the owner
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers
     * Only callable by the owner
     */
    function unpause() public onlyOwner {
        _unpause();
    }

    /**
     * @dev Hook that is called before any transfer of tokens
     * Enforces the paused state and validates transfers
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        override
        whenNotPaused
    {
        super._beforeTokenTransfer(from, to, amount);
    }
}