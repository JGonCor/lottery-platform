const { ethers } = require("hardhat");
const chainlinkConfig = require("./chainlink-config.json");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Dirección del administrador que recibirá los fees (10% del premio)
  const adminAddress = "0x207C68E76392e70C8Efa79617D0ccBddd6b25a4C";
  console.log("Admin/Fee receiver address:", adminAddress);

  // Usar configuración testnet para pruebas
  const network = process.env.DEPLOY_NETWORK || "testnet";
  const chain = "bsc";
  const config = chainlinkConfig[network][chain];

  console.log("Chainlink Config:", config);

  // Se usa la dirección real de USDT en BSC
  const usdtTokenAddress = "0x55d398326f99059fF775485246999027B3197955"; // USDT en BSC

  // Desplegar el contrato MultiTierLottery directamente
  const MultiTierLottery = await ethers.getContractFactory("MultiTierLottery");
  
  // Configurar el precio del ticket y el intervalo de tiempo
  const ticketPrice = ethers.utils.parseEther("5"); // 5 USDT por ticket
  const twentyFourHoursInSeconds = 24 * 60 * 60; // 24 horas en segundos
  
  console.log("Deploying MultiTierLottery...");
  const multiTierLottery = await MultiTierLottery.deploy(
    ticketPrice,
    usdtTokenAddress,
    config.vrfCoordinator,
    config.gasLane,
    config.subscriptionId,
    config.callbackGasLimit,
    twentyFourHoursInSeconds,
    adminAddress // Dirección que recibirá el 10% de comisión de la plataforma
  );
  
  await multiTierLottery.deployed();
  console.log("MultiTierLottery deployed to:", multiTierLottery.address);

  // Transferir la propiedad al administrador si el deployer no es el admin
  if (deployer.address.toLowerCase() !== adminAddress.toLowerCase()) {
    console.log("Transferring lottery ownership to admin...");
    await multiTierLottery.transferOwnership(adminAddress);
    console.log("Lottery ownership transferred to:", adminAddress);
  }

  // Print deployment summary
  console.log("\nDeployment Summary:");
  console.log("--------------------");
  console.log("USDT Token Address:", usdtTokenAddress);
  console.log("MultiTierLottery:", multiTierLottery.address);
  console.log("Ticket Price:", ethers.utils.formatEther(ticketPrice), "USDT");
  console.log("Draw Interval:", twentyFourHoursInSeconds / (60 * 60), "hours");
  console.log("VRF Coordinator:", config.vrfCoordinator);
  console.log("Subscription ID:", config.subscriptionId);
  console.log("Admin/Fee Receiver:", adminAddress);
  console.log("Prize Distribution:");
  console.log("  - 6 números acertados: 40% del premio");
  console.log("  - 5 números acertados: 20% del premio");
  console.log("  - 4 números acertados: 15% del premio");
  console.log("  - 3 números acertados: 10% del premio");
  console.log("  - 2 números acertados: 5% del premio");
  console.log("  - Comisión de plataforma: 10% del premio");
  console.log("\nPara cada nivel, si hay múltiples ganadores, el premio se divide equitativamente entre ellos.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });