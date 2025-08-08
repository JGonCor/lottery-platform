# Lottery Platform - Smart Contracts

Este proyecto contiene los contratos inteligentes para una plataforma de lotería descentralizada que utiliza tokens USDT para la compra de boletos y la distribución de premios.

## Características principales

- Sorteos automáticos cada 12 horas (00:00 AM y 12:00 PM, hora de Colombia)
- Pagos automáticos a los ganadores según niveles de aciertos
- Implementación basada en Chainlink VRF para aleatoriedad verificable
- Chainlink Automation para automatizar los sorteos sin intervención humana
- Smart contracts seguros con protección contra reentrancia y otros vectores de ataque
- Distribución de premios por niveles con porcentajes definidos
- Sistema de jackpot acumulado cuando nadie gana el premio mayor
- Sistema de referidos con descuentos del 1% por cada referido
- Descuentos por compra masiva de boletos
- Compartición de enlaces en redes sociales

## Sistema de distribución de premios

La lotería implementa un sistema de niveles con los siguientes porcentajes de premios:

- **6 números acertados**: 40% del total del pozo + jackpot acumulado de rondas anteriores
- **5 números acertados**: 20% del total del pozo
- **4 números acertados**: 15% del total del pozo
- **3 números acertados**: 10% del total del pozo
- **2 números acertados**: 5% del total del pozo
- **Comisión de plataforma**: 10% del total del pozo

Si hay múltiples ganadores en un mismo nivel, el premio correspondiente a ese nivel se divide equitativamente entre todos los ganadores, similar al sistema implementado por PancakeSwap.

## Sistema de jackpot acumulado

Cuando nadie acierta los 6 números en un sorteo:

- El 70% del premio mayor (28% del pozo total) se acumula para el siguiente sorteo
- Este jackpot acumulado se añade al premio del siguiente sorteo para quien acierte los 6 números
- El jackpot puede seguir creciendo indefinidamente hasta que alguien acierte los 6 números
- Cuando alguien gana el premio mayor, recibe el 40% del pozo actual más todo el jackpot acumulado

Este sistema garantiza que los premios mayores crezcan con el tiempo, aumentando el atractivo de la lotería para los jugadores.

## Sistema de referidos y descuentos

La plataforma incluye un sistema de referidos y descuentos para incentivar la participación:

### Descuentos por referidos
- Cada usuario obtiene un **1% de descuento** por cada persona que refiera y compre al menos un boleto
- El descuento máximo por referidos es del **10%**
- Los referidos se registran automáticamente cuando un nuevo usuario compra su primer boleto

### Descuentos por compra masiva
- **2% de descuento** al comprar 5 o más boletos en una sola transacción
- **5% de descuento** al comprar 10 o más boletos en una sola transacción
- **10% de descuento** al comprar 20 o más boletos en una sola transacción

### Política de aplicación de descuentos
- Solo se aplica el mayor de los descuentos (referidos o compra masiva, no se acumulan)
- Los descuentos se aplican automáticamente al precio total de la compra
- El usuario paga menos USDT pero recibe el mismo número de boletos

### Compartir en redes sociales
La plataforma permite compartir enlaces de referidos en:
- WhatsApp
- Facebook
- Enlaces directos (para copiar y compartir)

## Administración del sistema

- **Dirección del administrador**: `0x207...a4C`
- **Funciones del administrador**:
  - Propietario del contrato de lotería
  - Recibe el 10% de cada premio como comisión
  - Puede pausar/reanudar la lotería en caso de emergencia
  - Puede ejecutar sorteos manualmente si la automatización falla

## Preparación para el despliegue

### 1. Configuración de Chainlink VRF

Antes de desplegar los contratos, debe configurar una suscripción de Chainlink VRF:

1. Visitar [Chainlink VRF Subscription Manager](https://vrf.chain.link/) y conectar su wallet
2. Crear una nueva suscripción para la red BSC mainnet
3. Fondear la suscripción con al menos 10-20 LINK
4. Anotar el ID de suscripción generado
5. Actualizar el `subscriptionId` en el archivo `chainlink-config.json`

### 2. Configuración de Chainlink Automation

Para asegurar que los sorteos se realicen a las 00:00 AM y 12:00 PM (hora de Colombia), debe configurar Chainlink Automation:

1. Visitar [Chainlink Automation](https://automation.chain.link/) y conectar su wallet
2. Después de desplegar el contrato de lotería, registrar una nueva Upkeep
3. Seleccionar el contrato desplegado como objetivo
4. Configurar los horarios de ejecución:
   - Time-based trigger: 2 cron jobs diarios
   - Cron Expression 1: `0 0 5 * * *` (00:00 AM hora Colombia, 05:00 UTC)
   - Cron Expression 2: `0 0 17 * * *` (12:00 PM hora Colombia, 17:00 UTC)
5. Fondear la Upkeep con suficiente LINK (al menos 20 LINK recomendados)

## Despliegue en producción

Para desplegar los contratos en BSC mainnet:

```bash
# Instalar dependencias
npm install

# Compilar contratos
npx hardhat compile

# Desplegar contratos en BSC mainnet
npx hardhat run src/contracts/deploy.js --network bsc
```

El script de despliegue hará lo siguiente:
1. Desplegar el contrato MultiTierLottery
2. Configurar un intervalo de 12 horas entre sorteos
3. Configurar la distribución de premios por niveles
4. Asignar la dirección del administrador que recibirá el 10% de comisión
5. Configurar la lotería para usar USDT real (0x55d398326f99059fF775485246999027B3197955)

## Verificación post-despliegue

Después del despliegue, complete los siguientes pasos:

1. Verificar el contrato en BSCScan para permitir la interacción directa
2. Añadir la dirección del contrato de lotería como consumidor en su suscripción VRF
3. Configurar la Upkeep de Automation con las direcciones correctas
4. Realizar una compra de prueba de boleto para verificar el funcionamiento
5. Ejecutar el sorteo de prueba para verificar que los premios se distribuyen correctamente según los niveles
6. Confirmar que el administrador recibe correctamente su comisión del 10%
7. Verificar que el jackpot se acumula correctamente cuando nadie gana el premio mayor
8. Probar el sistema de referidos y descuentos por compra masiva

## Funcionamiento de la lotería

1. **Compra de boletos**:
   - Los usuarios seleccionan 6 números entre 1 y 49 para cada boleto
   - Cada boleto cuesta 5 USDT (menos los descuentos aplicables)
   - No se permiten números duplicados en un mismo boleto
   - Posibilidad de comprar múltiples boletos con descuento

2. **Sistema de referidos**:
   - Cada usuario puede referir a otros mediante enlaces compartibles
   - El referente obtiene descuentos en futuras compras
   - El referido queda vinculado permanentemente al referente

3. **Sorteo**:
   - Se seleccionan 6 números aleatorios usando Chainlink VRF
   - Se comparan los números de cada boleto con los números ganadores
   - Se calcula el nivel de premio según la cantidad de números acertados
   - Si nadie acierta los 6 números, el 70% del premio mayor se acumula para el siguiente sorteo

4. **Reclamación de premios**:
   - Los ganadores deben reclamar sus premios llamando a la función `claimPrize`
   - El contrato calcula automáticamente el premio correspondiente según el nivel y la cantidad de ganadores
   - El premio se transfiere automáticamente a la wallet del ganador

## Estructura del proyecto

- `MultiTierLottery.sol`: Implementación principal del contrato de lotería con distribución de premios por niveles
- `UsdtLottery.sol`: Implementación alternativa (no utilizada en producción)
- `LotteryToken.sol`: Contrato de token ERC20 (solo para pruebas)
- `VRFCoordinatorV2Mock.sol`: Mock de VRF Coordinator para pruebas locales

## Parámetros de configuración importantes

- **Intervalo**: 12 horas (43,200 segundos)
- **Precio del boleto**: 5 USDT (configurable)
- **Distribución del premio**:
  - 90% para los ganadores (distribuidos por niveles)
  - 10% para el administrador (comisión)
- **Acumulación de jackpot**: 70% del premio mayor se acumula cuando nadie gana
- **Descuento por referido**: 1% por referido (máximo 10%)
- **Descuentos por compra masiva**: 2% (5+ boletos), 5% (10+ boletos), 10% (20+ boletos)
- **Chainlink VRF**:
  - Gas Lane: Configurado para BSC mainnet
  - Límite de gas de callback: 2,500,000

## Notas de seguridad

- Los contratos utilizan OpenZeppelin para seguridad (ReentrancyGuard, Pausable, etc.)
- Los fondos se mantienen de manera segura en el contrato hasta que se realiza el sorteo
- Los sorteos son totalmente automáticos mediante Chainlink Automation
- En caso de fallo en la automatización, el propietario puede activar el sorteo manualmente

## Funciones para frontend

Para implementar el sistema de referidos en el frontend, utilizar las siguientes funciones:

```javascript
// Registrar un referido
await lottery.addReferral(direccionReferido);

// Obtener el número de referidos de un usuario
const totalReferrals = await lottery.getTotalReferrals(direccionUsuario);

// Verificar quién refirió a un usuario
const referrer = await lottery.getReferrer(direccionUsuario);

// Verificar si un usuario fue referido por otro
const wasReferred = await lottery.hasReferred(direccionReferente, direccionReferido);

// Obtener información de los niveles de descuento por compra masiva
const discountTiers = await lottery.getBulkDiscountTiers();

// Obtener información de descuentos por referidos
const referralDiscountInfo = await lottery.getReferralDiscountInfo();

// Calcular el descuento aplicable a un usuario
const discountPercent = await lottery.calculateDiscount(direccionUsuario, cantidadBoletos);
```

## Mantenimiento

Para pausar la lotería en caso de emergencia:
```
await lottery.pauseLottery()
```

Para reanudar la lotería:
```
await lottery.unpauseLottery()
```

Para recuperar tokens ERC20 enviados por error (excepto USDT):
```
await lottery.recoverERC20(tokenAddress)
```

Para consultar el jackpot acumulado actual:
```
await lottery.getAccumulatedJackpot()
```