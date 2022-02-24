// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./BrianCoin.sol";
import "../interfaces/IRouter.sol";

/**
 * @title Ico
 * @dev An ICO contract that initializes a separate ERC-20 BrianCoin contract,
 * allows individuals to contribute ETH in return for an exchange of BrianCoins,
 * and eventually withdraw their BrianCoins in the final OPEN phase.
 */

contract Ico {
  enum phases {
    SEED,
    GENERAL,
    OPEN
  }
  address public owner;
  BrianCoin public tokenContract;
  phases public currentPhase;
  uint256 public contributionsTotal;
  uint256 public constant TOKEN_CONVERSION_RATE = 5;
  bool public paused = false;
  mapping(address => uint256) public contributions;
  mapping(address => uint256) public whitelist;

  modifier onlyOwner() {
    require(msg.sender == owner, "not contract owner");
    _;
  }

  modifier onlyIfNotPaused() {
    require(paused == false, "ICO must be active");
    _;
  }

  constructor(address[] memory _whitelistAddresses) {
    owner = msg.sender;
    for (uint256 i = 0; i < _whitelistAddresses.length; i++) {
      whitelist[_whitelistAddresses[i]] = 1;
    }
    tokenContract = new BrianCoin(500000);
  }

  /// @dev Owner can add liquidity to BRI LP core contract, pulling out ETH and BRI
  function withdraw(
    address payable _routerAddress,
    uint256 _tokenAmount,
    uint256 _ethAmount
  ) external onlyOwner {
    tokenContract.approve(_routerAddress, _tokenAmount);
    IRouter(_routerAddress).addLiquidity{ value: _ethAmount }(_tokenAmount, address(this));
  }

  /// @dev Owner can move ICO phase forward (but not backward)
  function changePhase() external onlyOwner {
    require(currentPhase != phases.OPEN, "ICO is already in final phase");
    if (currentPhase == phases.GENERAL) currentPhase = phases.OPEN;
    if (currentPhase == phases.SEED) currentPhase = phases.GENERAL;
    emit ChangePhase(currentPhase);
  }

  /// @dev Owner can toggle ICO paused status
  function togglePaused() external onlyOwner {
    paused = !paused;
    emit TogglePaused(paused);
  }

  /// @dev Individuals can exchange ETH for BrianCoins
  function contribute() external payable onlyIfNotPaused {
    require(msg.value + contributionsTotal <= 30000 ether, "cannot contribute more than ICO goal");
    if (currentPhase == phases.SEED) {
      require(whitelist[msg.sender] > 0, "address not on whitelist");
      require(msg.value + contributionsTotal <= 15000 ether, "cannot contribute more than total phase limit");
      require(
        msg.value + contributions[msg.sender] <= 1500 ether,
        "cannot contribute more than individual phase limit"
      );
    }
    if (currentPhase == phases.GENERAL) {
      require(
        msg.value + contributions[msg.sender] <= 1000 ether,
        "cannot contribute more than individual phase limit"
      );
    }
    contributions[msg.sender] += msg.value;
    contributionsTotal += msg.value;
    emit Contribute(msg.sender, msg.value);
  }

  /// @dev Contributors can get access to their BrianCoins
  function claimTokens() external onlyIfNotPaused {
    require(currentPhase == phases.OPEN, "ICO must be in open phase to claim tokens");
    uint256 contributed = contributions[msg.sender];
    contributions[msg.sender] -= contributed;
    tokenContract.transfer(msg.sender, contributed * TOKEN_CONVERSION_RATE);
    emit ClaimTokens(msg.sender, contributed * TOKEN_CONVERSION_RATE);
  }

  event ChangePhase(phases currentPhase);
  event TogglePaused(bool paused);
  event Contribute(address indexed contributor, uint256 amount);
  event ClaimTokens(address indexed contributor, uint256 amount);
}
