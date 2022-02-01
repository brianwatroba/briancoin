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

  const weiToETH = (number) => {
    return ethers.utils.parseEther(number.toString());
  };
  const ETHToWei = (number) => {
    return ethers.utils.parseUnits(number.toString(), "wei");
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

    // Impersonate the icoContract address to make it a signer, for calling other contracts

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [icoContract.address],
    });

    icoContractSigner = await ethers.getSigner(icoContract.address);

    // Give allownace from ICO to Router to move intialSPC amount
    await spaceTokenContract.connect(icoContractSigner).approve(routerContract.address, weiToETH(initialSPC));

    // Call addLiquidity with initialEth and intialSPC amounts
    await routerContract.connect(icoContractSigner).addLiquidity(weiToETH(initialSPC), icoContract.address, {
      value: weiToETH(initialEth),
    });
  };

  const addAdditionalLiquidity = async () => {
    await icoContract.connect(addr1).contribute({
      value: weiToETH(500),
    });

    await icoContract.connect(icoOwner).changePhase();

    await icoContract.connect(addr1).claimTokens();

    // const addr1SPC = await spaceTokenContract.balanceOf(addr1.address);
    // const addr1ETH = await getETHBalance(addr1.address);

    await spaceTokenContract.connect(addr1).approve(routerContract.address, weiToETH(additionalSPC));
    await routerContract.connect(addr1).addLiquidity(weiToETH(1800), addr1.address, {
      value: weiToETH(additionalEth),
    });
  };

  const addUnbalancedLiquidity = async () => {
    await icoContract.connect(addr2).contribute({
      value: weiToETH(500),
    });
    await icoContract.connect(addr2).claimTokens();
    await spaceTokenContract.connect(addr2).approve(routerContract.address, weiToETH(additionalSPC));
    await routerContract.connect(addr2).addLiquidity(weiToETH(1800), addr2.address, {
      value: weiToETH(100),
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
    it("Should deploy all contracts", async () => {
      await deploy();
      await addInitialLiquidity();
      expect(icoContract.address, spaceTokenContract.address, pairContract.address, routerContract.address).to.be
        .properAddress;
    });
    it("Should deposit intitial liquidity into Pair contract", async () => {
      await deploy();
      await addInitialLiquidity();
      const pairSPCBalance = await spaceTokenContract.balanceOf(pairContract.address);
      const pairEthBalance = await getETHBalance(pairContract.address);
      expect(pairSPCBalance).to.deep.equal(weiToETH(initialSPC));
      expect(pairEthBalance).to.deep.equal(weiToETH(initialEth));
    });
  });

  describe("Pair Contract", async () => {
    describe("mint()", () => {
      beforeEach(async () => {
        await deploy();
      });
      it("Gives share of liquidity tokens proportional to input", async () => {
        await addInitialLiquidity();
        await addAdditionalLiquidity();
        const addr1Liq = await pairContract.balanceOf(addr1.address);
        const totalLiq = await pairContract.totalSupply();
        const totalSPCPooled = await spaceTokenContract.balanceOf(pairContract.address);
        const addr1SPCPooledProportion = weiToETH(additionalSPC) / totalSPCPooled;
        const addr1LiqProportion = addr1Liq / totalLiq;
        expect(addr1SPCPooledProportion).to.deep.equal(addr1LiqProportion);
      });
      it("Sum of liquidity tokens minus initial burn equals total liquidity", async () => {
        await addInitialLiquidity();
        await addAdditionalLiquidity();
        const minLiquidity = await pairContract.MINIMUM_LIQUIDITY();
        const addr1Liq = await pairContract.balanceOf(addr1.address);
        const icoLiq = await pairContract.balanceOf(icoContract.address);
        const totalLiq = await pairContract.totalSupply();
        expect(addr1Liq.add(icoLiq)).to.deep.equal(totalLiq.sub(minLiquidity));
      });
      it("Burns minimum liquidity if pool is new", async () => {
        const minLiquidity = await pairContract.MINIMUM_LIQUIDITY();
        expect(await pairContract.balanceOf(spaceTokenContract.address)).to.deep.equal(0);
        await addInitialLiquidity();
        expect(await pairContract.balanceOf(spaceTokenContract.address)).to.deep.equal(minLiquidity);
      });
      it("Grants liquidity equal to whichever amount is lesser (ETH or SPC)", async () => {
        await addInitialLiquidity();
        await addAdditionalLiquidity();
        // addUnbalancedLiquidity() gives less ETH, same SPC as addAdditionalLiquidity
        await addUnbalancedLiquidity();
        const addr2Liq = await pairContract.balanceOf(addr2.address);
        const totalLiq = await pairContract.totalSupply();
        const totalSPCPooled = await spaceTokenContract.balanceOf(pairContract.address);
        const addr2SPCPooledProportion = weiToETH(additionalSPC) / totalSPCPooled;
        const addr2LiqProportion = addr2Liq / totalLiq;
        expect(addr2SPCPooledProportion).to.not.equal(addr2LiqProportion);
      });
    });
    describe("burn()", () => {
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
    describe("burn()", () => {
      beforeEach(async () => {
        await deploy();
        await addInitialLiquidity();
        await addAdditionalLiquidity();
      });
      it("Correctly returns share of pool", async () => {});
    });
  });
});
