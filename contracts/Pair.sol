//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../interfaces/IBrianCoin.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Pair
 * @dev Core liquidity pool contract for BrianCoin (BRI). Non-view functions should
 * be called via a Router or periphery contract that performs important safety checks.
 * Functionality: adding/removing liquidity and swapping between ETH/BRI.
 */

contract Pair is ERC20 {
  using SafeERC20 for IERC20;

  address public brianCoin;
  uint256 private tokenReserves;
  uint256 private ethReserves;
  uint128 public constant MINIMUM_LIQUIDITY = 10**3;
  uint128 private unlocked = 1;

  modifier lock() {
    require(unlocked == 1, "Pair: LOCKED");
    unlocked = 0;
    _;
    unlocked = 1;
  }

  constructor(address _brianCoinAddr) ERC20("LPToken", "LPT") {
    brianCoin = _brianCoinAddr;
  }

  /// @dev Add liquidity to pool, award LP tokens to provider based on contribution share
  function mint(address _to) external lock returns (uint256 liquidity) {
    (uint256 tokenBalance, uint256 ethBalance) = _getBalances();
    uint256 tokenIn = tokenBalance - tokenReserves;
    uint256 ethIn = ethBalance - ethReserves;
    uint256 lpTokenSupply = totalSupply();
    if (lpTokenSupply == 0) {
      liquidity = _sqrt((tokenIn * ethIn) - MINIMUM_LIQUIDITY);
      _mint(address(brianCoin), MINIMUM_LIQUIDITY);
    } else {
      liquidity = _min((tokenIn * lpTokenSupply) / tokenReserves, (ethIn * lpTokenSupply) / ethReserves);
    }
    require(liquidity > 0, "Pair: INSUFFICIENT_LIQUIDITY");
    _mint(_to, liquidity);
    _updateReserves();
    emit Mint(msg.sender, tokenIn, ethIn);
  }

  /// @dev Remove liquidity from pool, burn LP tokens to provider based on contribution share, return BRI/ETH
  function burn(address payable _to) external lock returns (uint256 tokenOut, uint256 ethOut) {
    (uint256 tokenBalance, uint256 ethBalance) = _getBalances();
    uint256 lpTokenSupply = totalSupply();
    uint256 liquidity = balanceOf(address(this));
    tokenOut = (liquidity * tokenBalance) / lpTokenSupply;
    ethOut = (liquidity * ethBalance) / lpTokenSupply;
    _burn(address(this), liquidity);
    require(tokenOut > 0 && ethOut > 0, "Pair: INSUFFICIENT_OUTPUT");
    IBrianCoin(brianCoin).transfer(_to, tokenOut);
    (bool success, ) = _to.call{ value: ethOut }("");
    require(success, "Pair: FAILED_TO_SEND_ETH");
    _updateReserves();
    emit Burn(msg.sender, tokenOut, ethOut, _to);
  }

  /// @dev Trade between BRI/ETH, amounts must observe constant product formula
  function swap(
    uint256 _tokenOut,
    uint256 _ethOut,
    address _to
  ) external lock {
    require(_tokenOut > 0 || _ethOut > 0, "Pair: INSUFFICIENT_OUTPUT_AMOUNT");
    require(_tokenOut < tokenReserves && _ethOut < ethReserves, "Pair: INSUFFICIENT_RESERVES");
    if (_tokenOut > 0) IBrianCoin(brianCoin).transfer(_to, _tokenOut); // optimistically transfer
    if (_ethOut > 0) {
      (bool success, ) = _to.call{ value: _ethOut }(""); // optimistically transfer
      require(success, "Pair: FAILED_TO_SEND_ETH");
    }
    (uint256 tokenBalance, uint256 ethBalance) = _getBalances();
    uint256 tokenIn = tokenBalance > tokenReserves - _tokenOut ? tokenBalance - (tokenReserves - _tokenOut) : 0;
    uint256 ethIn = ethBalance > ethReserves - _ethOut ? ethBalance - (ethReserves - _ethOut) : 0;
    require(tokenIn > 0 || ethIn > 0, "Pair: INSUFFICIENT_OUTPUT_AMOUNT");
    uint256 tokenBalanceAdjusted = (tokenBalance * 100) - (tokenIn * 1);
    uint256 ethBalanceAdjusted = (ethBalance * 100) - (ethIn * 1);
    require(
      tokenBalanceAdjusted * ethBalanceAdjusted >= tokenReserves * ethReserves * 100**2,
      "Pair: INCORRECT_K_VALUE"
    );
    _updateReserves();
    emit Swap(msg.sender, tokenIn, ethIn, _tokenOut, _ethOut, _to);
  }

  /// @dev Get contract's BRI/ETH reserves (cached values)
  function getReserves() public view returns (uint256 _tokenReserves, uint256 _ethReserves) {
    _tokenReserves = tokenReserves;
    _ethReserves = ethReserves;
  }

  /// @dev Get current BRI/ETH balances from BrianCoin contract/this contract's balances
  function _getBalances() private view returns (uint256 tokenBalance, uint256 ethBalance) {
    tokenBalance = IBrianCoin(brianCoin).balanceOf(address(this));
    ethBalance = address(this).balance;
  }

  /// @dev Update this contract's reserves (cached balances). Performed after every swap/liquidity change.
  function _updateReserves() private {
    (uint256 tokenBalance, uint256 ethBalance) = _getBalances();
    tokenReserves = tokenBalance;
    ethReserves = ethBalance;
  }

  /// @dev Return smaller (min) of two values. Taken from Uniswap V2.
  function _min(uint256 x, uint256 y) internal pure returns (uint256 z) {
    z = x < y ? x : y;
  }

  /// @dev Return square root of a number. Taken from Uniswap V2.
  function _sqrt(uint256 y) internal pure returns (uint256 z) {
    if (y > 3) {
      z = y;
      uint256 x = y / 2 + 1;
      while (x < z) {
        z = x;
        x = (y / x + x) / 2;
      }
    } else if (y != 0) {
      z = 1;
    }
  }

  event Mint(address indexed sender, uint256 tokenIn, uint256 ethOut);
  event Burn(address indexed sender, uint256 tokenOut, uint256 ethOut, address indexed to);
  event Swap(
    address indexed sender,
    uint256 tokenIn,
    uint256 ethIn,
    uint256 tokenOut,
    uint256 ethOut,
    address indexed to
  );

  receive() external payable {}
}
