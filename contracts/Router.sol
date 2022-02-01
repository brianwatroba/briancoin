//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./SpaceToken.sol";
import "./Pair.sol";

contract Router {
  SpaceToken public spaceTokenContract;
  Pair public pairContract;
  uint256 public constant FEE_PERCENTAGE = 1;

  constructor(address payable _pairContractAddr, address payable _spaceTokenContractAddr) {
    pairContract = Pair(_pairContractAddr);
    spaceTokenContract = SpaceToken(_spaceTokenContractAddr);
  }

  function addLiquidity(uint256 _amountToken, address _to) external payable returns (uint256 liquidity) {
    spaceTokenContract.transferFrom(msg.sender, address(pairContract), _amountToken);
    (bool success, ) = address(pairContract).call{ value: msg.value }("");
    require(success, "Router: FAILED_TO_SEND_ETH");
    liquidity = pairContract.mint(_to);
    // emit event
  }

  function removeLiquidity(uint256 _liquidity, address payable _to)
    external
    returns (uint256 tokenOut, uint256 ethOut)
  {
    pairContract.transferFrom(_to, address(pairContract), _liquidity);
    (tokenOut, ethOut) = pairContract.burn(_to);
    // spaceTokenContract.transfer(_to, tokenOut);
    // (bool success, ) = _to.call{ value: ethOut }("");
    // require(success, "Router: FAILED_TO_SEND_ETH");
    // emit event
  }

  function swapETHforSPC(uint256 _tokenOutMin) external payable returns (uint256 tokenOut) {
    (uint256 tokenReserves, uint256 ethReserves) = pairContract.getReserves();
    tokenOut = getAmountOut(msg.value, ethReserves, tokenReserves);
    require(tokenOut >= _tokenOutMin, "Router: MAX_SLIPPAGE_REACHED");
    (bool success, ) = address(pairContract).call{ value: msg.value }("");
    require(success, "Router: FAILED_TO_SEND_ETH");
    pairContract.swap(tokenOut, 0, msg.sender);
    // emit event?
  }

  function swapSPCforETH(uint256 _ethOutMin, uint256 _tokenIn) external returns (uint256 ethOut) {
    (uint256 tokenReserves, uint256 ethReserves) = pairContract.getReserves();
    ethOut = getAmountOut(_tokenIn, tokenReserves, ethReserves);
    require(ethOut >= _ethOutMin, "Router: MAX_SLIPPAGE_REACHED");
    spaceTokenContract.transferFrom(msg.sender, address(pairContract), _tokenIn);
    pairContract.swap(0, ethOut, msg.sender);
    // emit event?
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
