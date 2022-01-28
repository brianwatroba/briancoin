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

  const getETHBalance = async (address) => {
    return ethers.utils.formatEther(await provider.getBalance(address));
  };

  const addInitialLiquidity = async () => {
    // move ICO to GENERAL phase
    await icoContract.connect(icoOwner).changePhase();

    // put ETH into ICO via contributions
    await icoContract.connect(contributor1).contribute({
      value: ethers.utils.parseUnits("900", "ether"),
    });
    await icoContract.connect(contributor2).contribute({
      value: ethers.utils.parseUnits("900", "ether"),
    });
    await icoContract.connect(contributor3).contribute({
      value: ethers.utils.parseUnits("900", "ether"),
    });

    icoContractSigner = await ethers.getSigner(icoContract.address);

    // give allownace from ICO to Router to move 40000 tokens
    await spaceTokenContract
      .connect(icoContractSigner)
      .approve(routerContract.address, ethers.utils.parseUnits("15000", "ether"));

    // impersonate the icoContract address to make it a signer, for calling other contracts
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [icoContract.address],
    });

    // call addLiquidity with 2500 ETH and 15000 tokens
    await routerContract
      .connect(icoContractSigner)
      .addLiquidity(ethers.utils.parseUnits("15000", "ether"), icoContract.address, {
        value: ethers.utils.parseEther("2500"),
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
      await expect(icoContract.address).to.be.properAddress;
      await expect(spaceTokenContract.address).to.be.properAddress;
      await expect(pairContract.address).to.be.properAddress;
      await expect(routerContract.address).to.be.properAddress;
    });
    it.only("Should deposit intitial liquidity into Pair contract", async () => {
      await deploy();
    });
  });
});
