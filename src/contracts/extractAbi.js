const fs = require('fs');
const path = require('path');

async function main() {
  try {
    // Obtener la ruta al archivo de artefacto generado por Hardhat
    const artifactPath = path.join(__dirname, 'artifacts/contracts/solidity/MultiTierLottery.sol/MultiTierLottery.json');
    
    // Leer el archivo JSON del artefacto
    const artifactContent = fs.readFileSync(artifactPath, 'utf8');
    const artifact = JSON.parse(artifactContent);
    
    // Extraer el ABI
    const abi = artifact.abi;
    
    // Guardar el ABI en un archivo separado
    const abiPath = path.join(__dirname, 'MultiTierLotteryABI.json');
    fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
    
    console.log(`ABI guardado exitosamente en ${abiPath}`);
  } catch (error) {
    console.error('Error al extraer el ABI:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 