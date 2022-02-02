//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../interfaces/ISpaceToken.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Pair is ERC20 {
  using SafeERC20 for IERC20;

  uint256 public constant MINIMUM_LIQUIDITY = 10**3; // pack this with unlocked?
  address public spaceToken;
  uint256 private tokenReserves;
  uint256 private ethReserves;
  uint256 private unlocked = 1;

  modifier lock() {
    require(unlocked == 1, "Pair: LOCKED");
    unlocked = 0;
    _;
    unlocked = 1;
  }

  constructor(address _spaceTokenAddr) ERC20("LPToken", "LPT") {
    spaceToken = _spaceTokenAddr;
  }

  function mint(address _to) external lock returns (uint256 liquidity) {
    (uint256 tokenBalance, uint256 ethBalance) = _getBalances();
    uint256 tokenIn = tokenBalance - tokenReserves;
    uint256 ethIn = ethBalance - ethReserves;
    uint256 lpTokenSupply = totalSupply();
    if (lpTokenSupply == 0) {
      liquidity = _sqrt((tokenIn * ethIn) - MINIMUM_LIQUIDITY);
      _mint(address(spaceToken), MINIMUM_LIQUIDITY);
    } else {
      liquidity = _min((tokenIn * lpTokenSupply) / tokenReserves, (ethIn * lpTokenSupply) / ethReserves);
    }
    require(liquidity > 0, "Pair: INSUFFICIENT_LIQUIDITY");
    _mint(_to, liquidity);
    _updateReserves();
    // emit event
  }

  function burn(address payable _to) external lock returns (uint256 tokenOut, uint256 ethOut) {
    (uint256 tokenBalance, uint256 ethBalance) = _getBalances();
    uint256 lpTokenSupply = totalSupply();
    uint256 liquidity = balanceOf(address(this));
    tokenOut = (liquidity * tokenBalance) / lpTokenSupply;
    ethOut = (liquidity * ethBalance) / lpTokenSupply;
    _burn(address(this), liquidity);
    require(tokenOut > 0 && ethOut > 0, "Pair: INSUFFICIENT_OUTPUT");
    ISpaceToken(spaceToken).transfer(_to, tokenOut);
    (bool success, ) = _to.call{ value: ethOut }("");
    require(success, "Pair: FAILED_TO_SEND_ETH");
    _updateReserves();
    // emit event
  }

  function swap(
    uint256 _tokenOut,
    uint256 _ethOut,
    address _to
  ) external lock {
    require(_tokenOut > 0 || _ethOut > 0, "Pair: INSUFFICIENT_OUTPUT_AMOUNT");
    require(_tokenOut < tokenReserves && _ethOut < ethReserves, "Pair: INSUFFICIENT_RESERVES");
    if (_tokenOut > 0) ISpaceToken(spaceToken).transfer(_to, _tokenOut); // optimistically transfer
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
    // emit event
  }

  function getReserves() public view returns (uint256 _tokenReserves, uint256 _ethReserves) {
    _tokenReserves = tokenReserves;
    _ethReserves = ethReserves;
  }

  function _getBalances() private view returns (uint256 tokenBalance, uint256 ethBalance) {
    tokenBalance = ISpaceToken(spaceToken).balanceOf(address(this));
    ethBalance = address(this).balance;
  }

  function _updateReserves() private {
    (uint256 tokenBalance, uint256 ethBalance) = _getBalances();
    tokenReserves = tokenBalance;
    ethReserves = ethBalance;
    //emit event
  }

  // taken from UNI
  function _min(uint256 x, uint256 y) internal pure returns (uint256 z) {
    z = x < y ? x : y;
  }

  // taken from UNI
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

  receive() external payable {}
}
