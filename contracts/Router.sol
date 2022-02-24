//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../interfaces/IPair.sol";
import "../interfaces/IBrianCoin.sol";

/**
 * @title Router
 * @dev Periphery contract meant to interact with core BrianCoin liquidity pool contract.
 * Functionality: safety checks before adding/removing liquidity and swapping between ETH/BRI via core LP contract.
 */

contract Router {
  address public brianCoin;
  address payable public pair;
  uint256 public constant FEE_PERCENTAGE = 1;

  constructor(address payable _pairContractAddr, address payable _brianCoinContractAddr) {
    pair = _pairContractAddr;
    brianCoin = _brianCoinContractAddr;
  }

  /// @dev Add liquidity to Core Pair BRI/ETH pool. Sends BRI/ETH optimistically. Pair contract checks proportions.
  function addLiquidity(uint256 _amountToken, address _to) external payable returns (uint256 liquidity) {
    IBrianCoin(brianCoin).transferFrom(msg.sender, pair, _amountToken);
    (bool success, ) = pair.call{ value: msg.value }("");
    require(success, "Router: FAILED_TO_SEND_ETH");
    liquidity = IPair(pair).mint(_to);
  }

  /// @dev Remove liquidity from core Pair BRI/ETH pool. Sends LP tokens optimistically.
  function removeLiquidity(uint256 _liquidity, address payable _to)
    external
    returns (uint256 tokenOut, uint256 ethOut)
  {
    IPair(pair).transferFrom(_to, address(pair), _liquidity);
    (tokenOut, ethOut) = IPair(pair).burn(_to);
  }

  /// @dev Trade ETH for BRI via Core Pair contract. Sends ETH optimistically. Performs amount safety checks via getAmountOut().
  function swapETHforBRI(uint256 _tokenOutMin) external payable returns (uint256 tokenOut) {
    (uint256 tokenReserves, uint256 ethReserves) = IPair(pair).getReserves();
    tokenOut = getAmountOut(msg.value, ethReserves, tokenReserves);
    require(tokenOut >= _tokenOutMin, "Router: MAX_SLIPPAGE_REACHED");
    (bool success, ) = pair.call{ value: msg.value }("");
    require(success, "Router: FAILED_TO_SEND_ETH");
    IPair(pair).swap(tokenOut, 0, msg.sender);
  }

  /// @dev Trade BRI for ETH via Core Pair contract. Sends BRI optimistically. Performs amount safety checks via getAmountOut().
  function swapBRIforETH(uint256 _ethOutMin, uint256 _tokenIn) external returns (uint256 ethOut) {
    (uint256 tokenReserves, uint256 ethReserves) = IPair(pair).getReserves();
    ethOut = getAmountOut(_tokenIn, tokenReserves, ethReserves);
    require(ethOut >= _ethOutMin, "Router: MAX_SLIPPAGE_REACHED");
    IBrianCoin(brianCoin).transferFrom(msg.sender, address(pair), _tokenIn);
    IPair(pair).swap(0, ethOut, msg.sender);
  }

  /// @dev Calculates correct amount out of pool given amount in and current reserves. Ensures K is contant.
  function getAmountOut(
    uint256 _amountIn,
    uint256 _reserveIn,
    uint256 _reserveOut
  ) public pure returns (uint256 amountOut) {
    require(_amountIn > 0, "Router: INSUFFICIENT_AMOUNT_IN");
    require(_reserveIn > 0 && _reserveOut > 0, "Router: INSUFFICIENT_LIQUIDITY");
    uint256 amountInWithFee = _amountIn * (100 - FEE_PERCENTAGE);
    uint256 numerator = amountInWithFee * _reserveOut;
    uint256 denominator = (_reserveIn * 100) + amountInWithFee;
    amountOut = numerator / denominator;
  }
}
