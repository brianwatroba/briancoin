const { expect } = require("chai");
const { network, ethers } = require("hardhat");

describe("Pair Contract", () => {
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

  const toETH = (number) => {
    return ethers.utils.parseEther(number.toString());
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
    await spaceTokenContract.connect(icoContractSigner).approve(routerContract.address, toETH(initialSPC));

    // Call addLiquidity with initialEth and intialSPC amounts
    await routerContract.connect(icoContractSigner).addLiquidity(toETH(initialSPC), icoContract.address, {
      value: toETH(initialEth),
    });
  };

  const deploy = async () => {
    [icoOwner, addr1, addr2, addr3, contributor1, contributor2, contributor3] = await ethers.getSigners();
    icoContract = await (await ethers.getContractFactory("Ico")).connect(icoOwner).deploy([]);
    spaceTokenContract = await ethers.getContractAt("SpaceToken", await icoContract.tokenContract());
    pairContract = await (await ethers.getContractFactory("Pair")).deploy(spaceTokenContract.address);
    routerContract = await (
      await ethers.getContractFactory("Router")
    ).deploy(pairContract.address, spaceTokenContract.address);

    await addInitialLiquidity();
  };

  describe("Deployment", () => {
    it("Should deploy all contracts", async () => {
      await deploy();
      expect(icoContract.address, spaceTokenContract.address, pairContract.address, routerContract.address).to.be
        .properAddress;
    });
    it("Should deposit intitial liquidity into Pair contract", async () => {
      await deploy();
      const pairSPCBalance = await spaceTokenContract.balanceOf(pairContract.address);
      const pairEthBalance = await getETHBalance(pairContract.address);
      expect(pairSPCBalance).to.deep.equal(toETH(initialSPC));
      expect(pairEthBalance).to.deep.equal(toETH(initialEth));
    });
  });
});
