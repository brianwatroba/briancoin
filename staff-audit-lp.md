https://github.com/Hacker-DAO/student.brianwatroba/tree/1686f9336c999fca44e78608b8488a7c636f4b9e/lp

The following is a micro audit by Gilbert.


# General Comments

- SpaceToken's constructor should probably take treasury and owner as parameters. It's fine for this project, but in a real project you'll probably need the flexibility.
- Nice job on letting the treasury skip transfer fees.
- There's no need for the `private` keyword in Pair. This is a Solidity-specific feature that's only useful if another contract inherits from this one.
- Excellent job overall.

# Design Exercise

👍

# Issues

## [Q-1] Redundant code

SpaceToken's codesize can be reduced by overriding OpenZeppelin's internal `_transfer` function instead of overriding both `transfer` and `transferFrom`.


## [Q-2] Lock gas optimization

Pair's `lock` modifier can be gas optimized by setting `unlocked` to a non-zero value. See OpenZeppelin's [ReentrancyGuard implementation](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/security/ReentrancyGuard.sol) for more details.


# Nitpicks

- You have two `Pair: INSUFFICIENT_OUTPUT_AMOUNT` require messages, and the latter is inaccurate.


# Score

| Reason | Score |
|-|-|
| Late                       | - |
| Unfinished features        | - |
| Extra features             | - |
| Vulnerability              | - |
| Unanswered design exercise | - |
| Insufficient tests         | - |
| Technical mistake          | - |

Total: 0
Great job!
