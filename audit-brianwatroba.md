## General Comments

There is a lot of great work and I could not find any issue on your contract.

## Code Quality

[1]

```
require(paused == false, "ICO must be active");
```

You don't need to express `== false` clearly.

```
require(!paused, "ICO must be active");
```

[2]

```
uint256 private tokenReserves;
uint256 private ethReserves;
```

You might consider the gas optimization to pack the uint like the below.

```
uint128 private tokenReserves;
uint128 private ethReserves;
```
