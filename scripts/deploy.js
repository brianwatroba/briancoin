async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const IcoFactory = await ethers.getContractFactory("Ico");
  const icoContract = await IcoFactory.deploy([deployer.address]);
  const brianCoinContract = await ethers.getContractAt("BrianCoin", await icoContract.tokenContract());
  const pairContract = await (await ethers.getContractFactory("Pair")).deploy(brianCoinContract.address);
  const routerContract = await (
    await ethers.getContractFactory("Router")
  ).deploy(pairContract.address, brianCoinContract.address);

  console.log("Ico address:", icoContract.address);
  console.log("BrianCoin address:", brianCoinContract.address);
  console.log("Pair address:", pairContract.address);
  console.log("Router address:", routerContract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
