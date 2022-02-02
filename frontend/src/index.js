import { ethers } from "ethers";
import RouterJSON from "../../artifacts/contracts/Router.sol/Router.json";
import PairJSON from "../../artifacts/contracts/Pair.sol/Pair.json";
import IcoJSON from "../../artifacts/contracts/Ico.sol/Ico.json";
import SpaceTokenJSON from "../../artifacts/contracts/SpaceToken.sol/SpaceToken.json";

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const routerAddr = "0xa030f2c2b84812DB0e08634EcbB0C45C50f465AC";
const contract = new ethers.Contract(routerAddr, RouterJSON.abi, provider);

const pairAddr = "0x293C4c780c4C6952279721ff676BEDc4595e9f64";
const pairContract = new ethers.Contract(pairAddr, PairJSON.abi, provider);

const IcoAddr = "0x8d36FB0C359e17a1a5449eb76424747895b5f637";
const icoContract = new ethers.Contract(IcoAddr, IcoJSON.abi, provider);

const SpaceTokenAddr = "0x797bef1f37d098EEc3A8084e9AD3612894998cB8";
const spaceTokenContract = new ethers.Contract(SpaceTokenAddr, SpaceTokenJSON.abi, provider);

window.ethers = ethers;
window.provider = provider;
window.signer = signer;
window.contract = contract;
window.pairContract = pairContract;
window.icoContract = icoContract;

const ethToWei = (eth) => {
  return ethers.utils.parseUnits(eth.toString(), "ether");
};
const weiToEth = (wei) => {
  return ethers.utils.formatUnits(wei.toString(), "ether");
};

// add initial liquidity

async function connectToMetamask() {
  try {
    console.log("Signed in as", await signer.getAddress());
  } catch (err) {
    console.log("Not signed in");
    await provider.send("eth_requestAccounts", []);
  }
}

//
// ICO
//
ico_spc_buy.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const eth = ethers.utils.parseEther(form.eth.value);
  console.log("Buying", eth, "eth");

  await icoContract.connect(signer).contribute({
    value: eth,
  });

  await icoContract.connect(signer).claimTokens();

  await connectToMetamask();
});

//
// LP
//
let currentSpcToEthPrice = 5;

provider.on("block", async (n) => {
  console.log("New block", n);
  const spcLeftInICO = await spaceTokenContract.balanceOf(icoContract.address);
  ico_spc_left.innerText = weiToEth(spcLeftInICO);
  const [tokenReserves, ethReserves] = await pairContract.getReserves();
  if (tokenReserves && ethReserves) currentSpcToEthPrice = tokenReserves / ethReserves;
  const liquidity = await pairContract.balanceOf(signer.getAddress());
});

lp_deposit.eth.addEventListener("input", (e) => {
  lp_deposit.spc.value = +e.target.value * currentSpcToEthPrice;
});

lp_deposit.spc.addEventListener("input", (e) => {
  lp_deposit.eth.value = +e.target.value / currentSpcToEthPrice;
});

lp_deposit.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const eth = ethers.utils.parseEther(form.eth.value);
  const spc = ethers.utils.parseEther(form.spc.value);
  await connectToMetamask();
  await spaceTokenContract.connect(signer).approve(contract.address, spc);
  await contract.connect(signer).addLiquidity(spc, await signer.getAddress(), {
    value: eth,
  });
  console.log("Depositing", eth, "eth and", spc, "spc");
});

lp_withdraw.addEventListener("submit", async (e) => {
  e.preventDefault();

  await connectToMetamask();
  const liquidity = await pairContract.balanceOf(await signer.getAddress());
  await pairContract.connect(signer).approve(contract.address, liquidity);
  await contract.connect(signer).removeLiquidity(liquidity, await signer.getAddress());
  console.log("Withdrawing 100% of LP");
});

//
// Swap
//
let swapIn = { type: "eth", value: 0 };
let swapOut = { type: "spc", value: 0 };
switcher.addEventListener("click", () => {
  [swapIn, swapOut] = [swapOut, swapIn];
  swap_in_label.innerText = swapIn.type.toUpperCase();
  swap.amount_in.value = swapIn.value;
  updateSwapOutLabel();
});

swap.amount_in.addEventListener("input", updateSwapOutLabel);

async function updateSwapOutLabel() {
  const [tokenReserves, ethReserves] = await pairContract.getReserves();
  console.log(swap.amount_in.value);
  // if (swap.amount_in.value > 0) {
  if (swap.amount_in.value !== "") {
    swapOut.value =
      // swapIn.type === "eth" ? +swap.amount_in.value * currentSpcToEthPrice : +swap.amount_in.value / currentSpcToEthPrice;

      swapIn.type === "eth"
        ? await contract.getAmountOut(swap.amount_in.value, ethReserves, tokenReserves)
        : await contract.getAmountOut(swap.amount_in.value, tokenReserves, ethReserves);
  } else {
    swapOut.value = 0;
  }

  swap_out_label.innerText = `to receive: ${swapOut.value} ${swapOut.type.toUpperCase()}`;
  // } else {
  //   swapOut.value = 0;
  // }
}

swap.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const amountIn = ethers.utils.parseEther(form.amount_in.value);

  console.log("Swapping", amountIn, swapIn.type, "for", swapOut.type);

  if (swapIn.type === "eth") {
    await contract.connect(signer).swapETHforSPC(0, { value: amountIn });
  } else if (swapIn.type === "spc") {
    await contract.connect(signer).swapSPCforETH(0, amountIn);
  }

  await connectToMetamask();
});
