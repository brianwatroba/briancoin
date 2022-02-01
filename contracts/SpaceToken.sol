// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SpaceToken
 * @dev Standard ERC-20 token contract for SpaceToken. Differences:
 * imposes a 2% fee (paid to treasury) on all transfers if fee is enabled. Owner
 * can control if fee is enabled.
 */

contract SpaceToken is ERC20 {
  using SafeERC20 for IERC20;

  address public treasury;
  address public owner;
  bool public feeEnabled = false;

  constructor(uint256 _maxSupply) ERC20("SpaceCoin", "SPC") {
    treasury = msg.sender;
    owner = tx.origin;
    _mint(treasury, _maxSupply * 10**18);
  }

  /// @dev Owner can turn 2% transfer fee on/off (paid to treasury)
  function toggleFeeEnabled() external {
    require(msg.sender == owner, "not contract owner");
    feeEnabled = !feeEnabled;
    emit ToggleFeeEnabled(feeEnabled);
  }

  /// @dev ERC-20 transfer(), overridden to include 2% fee logic
  function transfer(address _recipient, uint256 _amount) public override returns (bool) {
    uint256 fee = calculateFee(_amount, _recipient);
    if (fee > 0) super.transfer(treasury, fee);
    return super.transfer(_recipient, _amount - fee);
  }

  /// @dev ERC-20 transferFrom(), overridden to include 2% fee logic
  function transferFrom(
    address _sender,
    address _recipient,
    uint256 _amount
  ) public override returns (bool) {
    uint256 fee = calculateFee(_amount, _recipient);
    if (fee > 0) super.transferFrom(_sender, treasury, fee);
    return super.transferFrom(_sender, _recipient, _amount - fee);
  }

  /// @dev Cacluates fee amount and returns it
  function calculateFee(uint256 _amount, address _recipient) private view returns (uint256) {
    if (!feeEnabled || msg.sender == treasury || _recipient == treasury) return 0;
    return _amount / 50;
  }

  event ToggleFeeEnabled(bool feeEnabled);
}
