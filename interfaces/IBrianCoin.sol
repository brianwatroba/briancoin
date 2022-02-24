// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IBrianCoin is IERC20 {
  function toggleFeeEnabled() external;

  function transfer(address _recipient, uint256 _amount) external override returns (bool);

  function transferFrom(
    address _sender,
    address _recipient,
    uint256 _amount
  ) external override returns (bool);

  function calculateFee(uint256 _amount, address _recipient) external view returns (uint256);
}
