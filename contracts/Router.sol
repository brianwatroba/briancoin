//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../interfaces/IPair.sol";
import "../interfaces/ISpaceToken.sol";

contract Router {
  address payable public spaceToken;
  address payable public pair;
  uint256 public constant FEE_PERCENTAGE = 1;

  constructor(address payable _pairContractAddr, address payable _spaceTokenContractAddr) {
    pair = _pairContractAddr;
    spaceToken = _spaceTokenContractAddr;
  }

  function addLiquidity(uint256 _amountToken, address _to) external payable returns (uint256 liquidity) {
    ISpaceToken(spaceToken).transferFrom(msg.sender, pair, _amountToken);
    (bool success, ) = pair.call{ value: msg.value }("");
    require(success, "Router: FAILED_TO_SEND_ETH");
    liquidity = IPair(pair).mint(_to);
  }

  function removeLiquidity(uint256 _liquidity, address payable _to)
    external
    returns (uint256 tokenOut, uint256 ethOut)
  {
    IPair(pair).transferFrom(_to, address(pair), _liquidity);
    (tokenOut, ethOut) = IPair(pair).burn(_to);
  }

  function swapETHforSPC(uint256 _tokenOutMin) external payable returns (uint256 tokenOut) {
    (uint256 tokenReserves, uint256 ethReserves) = IPair(pair).getReserves();
    tokenOut = getAmountOut(msg.value, ethReserves, tokenReserves);
    require(tokenOut >= _tokenOutMin, "Router: MAX_SLIPPAGE_REACHED");
    (bool success, ) = pair.call{ value: msg.value }("");
    require(success, "Router: FAILED_TO_SEND_ETH");
    IPair(pair).swap(tokenOut, 0, msg.sender);
  }

  function swapSPCforETH(uint256 _ethOutMin, uint256 _tokenIn) external returns (uint256 ethOut) {
    (uint256 tokenReserves, uint256 ethReserves) = IPair(pair).getReserves();
    ethOut = getAmountOut(_tokenIn, tokenReserves, ethReserves);
    require(ethOut >= _ethOutMin, "Router: MAX_SLIPPAGE_REACHED");
    ISpaceToken(spaceToken).transferFrom(msg.sender, address(pair), _tokenIn);
    IPair(pair).swap(0, ethOut, msg.sender);
  }

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
