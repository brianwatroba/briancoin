const { expect } = require("chai");
const { network, ethers } = require("hardhat");

describe("Pair Contract", () => {
  let icoContract;
  let icoContractFactory;
  let spaceTokenContract;
  let pairContract;
  let routerContract;
  let addr1;
  let addr2;
  let addr3;
  let test;

  const deploy = async () => {
    [addr1, addr2, addr3] = await ethers.getSigners();
    icoContract = await (await ethers.getContractFactory("Ico")).connect(addr1).deploy([]);
    spaceTokenContract = await ethers.getContractAt("SpaceToken", await icoContract.tokenContract());
    pairContract = await (await ethers.getContractFactory("Pair")).connect(addr1).deploy(spaceTokenContract.address);
    routerContract = await (await ethers.getContractFactory("Router"))
      .connect(addr1)
      .deploy(pairContract.address, spaceTokenContract.address);
  };

  describe("Deployment", () => {
    it("Should deploy all contracts", async () => {
      await deploy();
      await expect(icoContract.address).to.be.properAddress;
      await expect(spaceTokenContract.address).to.be.properAddress;
      await expect(pairContract.address).to.be.properAddress;
      await expect(routerContract.address).to.be.properAddress;
    });
  });

  deploy();
});
