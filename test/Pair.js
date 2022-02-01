const { expect } = require("chai");
const { network, ethers } = require("hardhat");

describe("Liquidity Pool", () => {
  let provider = ethers.provider;
  let icoContract;
  let icoContractSigner;
  let spaceTokenContract;
  let pairContract;
  let routerContract;
  let icoOwner;
  let addr1;
  let addr2;
  let addr3;
  let contributor1;
  let contributor2;
  let contributor3;
  let initialEth = 2500;
  let initialSPC = 15000;
  let additionalEth = 300;
  let additionalSPC = 1800;
  let swapFeePercentage = 1;

  const ethToWei = (eth) => {
    return ethers.utils.parseUnits(eth.toString(), "ether");
  };
  const weiToEth = (wei) => {
    return ethers.utils.formatUnits(wei.toString(), "ether");
  };

  const getETHBalance = async (address) => {
    return await provider.getBalance(address);
  };

  const addInitialLiquidity = async () => {
    // Move ICO to GENERAL phase
    await icoContract.connect(icoOwner).changePhase();

    // Put ETH into ICO via contributions
    await icoContract.connect(contributor1).contribute({
      value: ethers.utils.parseUnits("900", "ether"),
    });
    await icoContract.connect(contributor2).contribute({
      value: ethers.utils.parseUnits("900", "ether"),
    });
    await icoContract.connect(contributor3).contribute({
      value: ethers.utils.parseUnits("900", "ether"),
    });

    // Withdraw() on ICO, add liquidity to LP
    await icoContract.connect(icoOwner).withdraw(routerContract.address, ethToWei(initialSPC), ethToWei(initialEth));
  };

  const addAdditionalLiquidity = async () => {
    await icoContract.connect(addr1).contribute({
      value: ethToWei(500),
    });
    await icoContract.connect(icoOwner).changePhase();
    await icoContract.connect(addr1).claimTokens();
    await spaceTokenContract.connect(addr1).approve(routerContract.address, ethToWei(additionalSPC));
    await routerContract.connect(addr1).addLiquidity(ethToWei(1800), addr1.address, {
      value: ethToWei(additionalEth),
    });
  };

  const addUnbalancedLiquidity = async () => {
    await icoContract.connect(addr2).contribute({
      value: ethToWei(500),
    });
    await icoContract.connect(addr2).claimTokens();
    await spaceTokenContract.connect(addr2).approve(routerContract.address, ethToWei(additionalSPC));
    await routerContract.connect(addr2).addLiquidity(ethToWei(1800), addr2.address, {
      value: ethToWei(100),
    });
  };

  const removeAdditionalLiquidity = async () => {
    const liquidity = await pairContract.balanceOf(addr1.address);
    await pairContract.connect(addr1).approve(routerContract.address, liquidity);
    await routerContract.connect(addr1).removeLiquidity(liquidity, addr1.address);
  };

  const deploy = async () => {
    [icoOwner, addr1, addr2, addr3, contributor1, contributor2, contributor3] = await ethers.getSigners();
    icoContract = await (await ethers.getContractFactory("Ico")).connect(icoOwner).deploy([]);
    spaceTokenContract = await ethers.getContractAt("SpaceToken", await icoContract.tokenContract());
    pairContract = await (await ethers.getContractFactory("Pair")).deploy(spaceTokenContract.address);
    routerContract = await (
      await ethers.getContractFactory("Router")
    ).deploy(pairContract.address, spaceTokenContract.address);
  };

  describe("Deployment", () => {
    beforeEach(async () => {
      await deploy();
      await addInitialLiquidity();
    });
    it("Should deploy all contracts", async () => {
      expect(icoContract.address, spaceTokenContract.address, pairContract.address, routerContract.address).to.be
        .properAddress;
    });
    it("Should deposit intitial liquidity into Pair contract", async () => {
      const pairSPCBalance = await spaceTokenContract.balanceOf(pairContract.address);
      const pairEthBalance = await getETHBalance(pairContract.address);
      expect(pairSPCBalance).to.deep.equal(ethToWei(initialSPC));
      expect(pairEthBalance).to.deep.equal(ethToWei(initialEth));
    });
  });

  describe("addLiquidity() and mint()", () => {
    it("Burns minimum liquidity if pool is new", async () => {
      await deploy();
      const minLiquidity = await pairContract.MINIMUM_LIQUIDITY();
      expect(await pairContract.balanceOf(spaceTokenContract.address)).to.deep.equal(0);
      await addInitialLiquidity();
      expect(await pairContract.balanceOf(spaceTokenContract.address)).to.deep.equal(minLiquidity);
    });
    beforeEach(async () => {
      await deploy();
      await addInitialLiquidity();
      await addAdditionalLiquidity();
    });
    it("Gives share of liquidity tokens proportional to input", async () => {
      const addr1Liq = await pairContract.balanceOf(addr1.address);
      const totalLiq = await pairContract.totalSupply();
      const totalSPCPooled = await spaceTokenContract.balanceOf(pairContract.address);
      const addr1SPCPooledProportion = ethToWei(additionalSPC) / totalSPCPooled;
      const addr1LiqProportion = addr1Liq / totalLiq;
      expect(addr1SPCPooledProportion).to.deep.equal(addr1LiqProportion);
    });
    it("Sum of liquidity tokens minus initial burn equals total liquidity", async () => {
      const minLiquidity = await pairContract.MINIMUM_LIQUIDITY();
      const addr1Liq = await pairContract.balanceOf(addr1.address);
      const icoLiq = await pairContract.balanceOf(icoContract.address);
      const totalLiq = await pairContract.totalSupply();
      expect(addr1Liq.add(icoLiq)).to.deep.equal(totalLiq.sub(minLiquidity));
    });

    it("Grants liquidity equal to whichever amount is lesser (ETH or SPC)", async () => {
      // addUnbalancedLiquidity() gives less ETH, same SPC as addAdditionalLiquidity
      await addUnbalancedLiquidity();
      const addr2Liq = await pairContract.balanceOf(addr2.address);
      const totalLiq = await pairContract.totalSupply();
      const totalSPCPooled = await spaceTokenContract.balanceOf(pairContract.address);
      const addr2SPCPooledProportion = ethToWei(additionalSPC) / totalSPCPooled;
      const addr2LiqProportion = addr2Liq / totalLiq;
      expect(addr2SPCPooledProportion).to.not.equal(addr2LiqProportion);
    });
  });
  describe("removeLiquidity() and burn()", () => {
    beforeEach(async () => {
      await deploy();
      await addInitialLiquidity();
      await addAdditionalLiquidity();
    });
    it("Correctly returns share of pool", async () => {
      const ethBefore = await getETHBalance(addr1.address);
      const SPCBefore = await spaceTokenContract.balanceOf(addr1.address);
      await removeAdditionalLiquidity();
      const ethAfter = await getETHBalance(addr1.address);
      const SPCAfter = await spaceTokenContract.balanceOf(addr1.address);
      const SPCDifference = SPCAfter.sub(SPCBefore);
      const ethDifference = ethAfter.sub(ethBefore);
      expect(ethers.BigNumber.from(SPCDifference)).to.be.closeTo(
        ethers.utils.parseUnits(additionalSPC.toString(), "ether"),
        10
      );
      expect(ethers.BigNumber.from(ethDifference)).to.be.closeTo(
        ethers.utils.parseUnits(additionalEth.toString(), "ether"),
        10 ** 15
      );
    });
    it("Burns the given liquidity", async () => {
      await removeAdditionalLiquidity();
      const liquidityAfter = await pairContract.balanceOf(addr1.address);
      expect(liquidityAfter).to.equal(0);
    });
    it("Fails if not sent tokens/eth", async () => {
      await expect(routerContract.connect(addr1).removeLiquidity(0, addr1.address)).to.be.revertedWith(
        "Pair: INSUFFICIENT_OUTPUT"
      );
    });
  });
  describe("swapETHForSPC(), swapSPCForETH, swap()", () => {
    beforeEach(async () => {
      await deploy();
      await addInitialLiquidity();
      await addAdditionalLiquidity();
    });
    it("Correctly swaps SPC for ETH (minus fee)", async () => {
      const amountIn = ethers.utils.parseUnits("600", "ether");
      await spaceTokenContract.connect(addr1).approve(routerContract.address, amountIn);
      const before = await getETHBalance(addr1.address);
      const amountInMinusFee = amountIn.mul(100 - swapFeePercentage);
      const [tokenReserves, ethReserves] = await pairContract.getReserves();
      const numerator = amountInMinusFee.mul(ethReserves);
      const denominator = amountInMinusFee.add(tokenReserves.mul(100));
      const expectedAmountOut = numerator.div(denominator);
      await routerContract.connect(addr1).swapSPCforETH(0, amountIn);
      const after = await getETHBalance(addr1.address);
      const amountOut = after.sub(before);
      expect(parseInt(weiToEth(amountOut))).to.equal(parseInt(weiToEth(expectedAmountOut)));
    });
    it("Correctly swaps ETH for SPC (minus fee)", async () => {
      const amountIn = ethToWei("10");
      const before = await spaceTokenContract.balanceOf(addr1.address);
      const amountInMinusFee = amountIn.mul(100 - swapFeePercentage);
      const [tokenReserves, ethReserves] = await pairContract.getReserves();
      const numerator = amountInMinusFee.mul(tokenReserves);
      const denominator = amountInMinusFee.add(ethReserves.mul(100));
      const expectedAmountOut = numerator.div(denominator);
      await routerContract.connect(addr1).swapETHforSPC(0, { value: amountIn });
      const after = await spaceTokenContract.balanceOf(addr1.address);
      const amountOut = after.sub(before);
      expect(parseInt(weiToEth(amountOut))).to.equal(parseInt(weiToEth(expectedAmountOut)));
    });
    it("Fails if: swap() called directly but desired amounts violate constant product formula", async () => {
      const SPCIn = ethToWei(100);
      const desiredETHOut = ethToWei(200);
      await spaceTokenContract.connect(addr1).transfer(pairContract.address, SPCIn);
      await expect(pairContract.connect(addr1).swap(0, desiredETHOut, addr1.address)).to.be.revertedWith(
        "Pair: INCORRECT_K_VALUE"
      );
    });
    it("Fails if: slippage beyond max tolerance", async () => {
      const amountIn = ethToWei(600);
      const minOut = ethToWei(120);
      await spaceTokenContract.connect(addr1).approve(routerContract.address, amountIn);
      await expect(routerContract.connect(addr1).swapSPCforETH(minOut, amountIn)).to.be.revertedWith(
        "Router: MAX_SLIPPAGE_REACHED"
      );
    });
    it("Fails if: called with no output", async () => {
      const amountIn = ethToWei(600);
      const minOut = ethToWei(90);
      await spaceTokenContract.connect(addr1).approve(routerContract.address, amountIn);
      await expect(routerContract.connect(addr1).swapSPCforETH(minOut, 0)).to.be.revertedWith(
        "Router: INSUFFICIENT_AMOUNT_IN"
      );
    });
  });
});
