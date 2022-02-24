// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRouter {
  function addLiquidity(uint256 _amountToken, address _to) external payable returns (uint256 liquidity);

  function removeLiquidity(uint256 _liquidity, address payable _to) external returns (uint256 tokenOut, uint256 ethOut);

  function swapETHforBRI(uint256 _tokenOutMin) external payable returns (uint256 tokenOut);

  function swapBRIforETH(uint256 _ethOutMin, uint256 _tokenIn) external returns (uint256 ethOut);

  function getAmountOut(
    uint256 _amountIn,
    uint256 _reserveIn,
    uint256 _reserveOut
  ) external pure returns (uint256 amountOut);
}
