// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MediToken
 * @dev ERC-20 token for MediChain ecosystem
 * Used for: insurance claim payments, patient rewards, transaction fees
 */
contract MediToken is ERC20, Ownable {
    // Minting cap (in tokens)
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18; // 100 million tokens

    // Events
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    event RewardDistributed(address indexed patient, uint256 amount, string reason);

    constructor() ERC20("MediToken", "MEDI") Ownable(msg.sender) {
        // Mint initial supply to owner (10% of max supply for ecosystem)
        _mint(msg.sender, MAX_SUPPLY / 10);
    }

    /**
     * @dev Mint new tokens (only owner)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "MediToken: Would exceed max supply");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Burn tokens from caller's balance
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @dev Burn tokens from another address (with allowance)
     * @param account Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burnFrom(address account, uint256 amount) external {
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
        emit TokensBurned(account, amount);
    }

    /**
     * @dev Distribute rewards to patients for data sharing
     * @param patient Patient address
     * @param amount Reward amount
     * @param reason Reason for reward
     */
    function distributeReward(address patient, uint256 amount, string calldata reason) external onlyOwner {
        require(balanceOf(address(this)) >= amount, "MediToken: Insufficient token balance");
        _transfer(address(this), patient, amount);
        emit RewardDistributed(patient, amount, reason);
    }

    /**
     * @dev Transfer tokens from contract treasury
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transferFromTreasury(address to, uint256 amount) external onlyOwner {
        require(balanceOf(address(this)) >= amount, "MediToken: Insufficient treasury balance");
        _transfer(address(this), to, amount);
    }

    /**
     * @dev Get remaining mintable tokens
     * @return uint256 Remaining tokens that can be minted
     */
    function getRemainingMintable() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }

    /**
     * @dev Check if more tokens can be minted
     * @return bool True if minting is still possible
     */
    function canMint() external view returns (bool) {
        return totalSupply() < MAX_SUPPLY;
    }

    /**
     * @dev Get treasury balance
     * @return uint256 Treasury token balance
     */
    function getTreasuryBalance() external view returns (uint256) {
        return balanceOf(address(this));
    }

    /**
     * @dev Rescue ERC-20 tokens sent to contract by mistake
     * @param tokenAddress Address of the token to rescue
     * @param to Address to send tokens to
     */
    function rescueTokens(address tokenAddress, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "MediToken: Invalid address");
        IERC20(tokenAddress).transfer(to, amount);
    }

    /**
     * @dev Rescue ETH sent to contract by mistake
     * @param to Address to send ETH to
     */
    function rescueETH(address payable to) external onlyOwner {
        require(to != payable(0), "MediToken: Invalid address");
        to.transfer(address(this).balance);
    }
}
