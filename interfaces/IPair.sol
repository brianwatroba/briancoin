// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPair is IERC20 {
  function mint(address _to) external returns (uint256 liquidity);

  function burn(address payable _to) external returns (uint256 tokenOut, uint256 ethOut);

  function swap(
    uint256 _tokenOut,
    uint256 _ethOut,
    address _to
  ) external;

  function getReserves() external view returns (uint256 _tokenReserves, uint256 _ethReserves);
}
