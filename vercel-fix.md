# SOLUCIÓN URGENTE PARA VERCEL

## 1. CONFIGURAR VARIABLES DE ENTORNO EN VERCEL

Ve a tu dashboard de Vercel → Settings → Environment Variables y agrega:

```
REACT_APP_ENVIRONMENT=production
REACT_APP_NETWORK=mainnet
REACT_APP_CHAIN_ID=56
REACT_APP_LOTTERY_CONTRACT_ADDRESS=0xFE657EC636c55D2035345056f64B0FAB71E1B995
REACT_APP_USDT_CONTRACT_ADDRESS=0x55d398326f99059fF775485246999027B3197955
REACT_APP_BSC_MAINNET_RPC=https://bsc-dataseed.binance.org/
REACT_APP_OWNER_ADDRESS=0x207C68E76392e70C8Efa79617D0ccBddd6b25a4C
REACT_APP_APP_NAME=BSC Lottery Platform
REACT_APP_MOCK_DATA=false
REACT_APP_DEBUG_MODE=false
```

## 2. SIMPLIFICAR vercel.json

El CSP está bloqueando las conexiones RPC. Usar configuración mínima.

## 3. VERIFICAR EN VERCEL

Después del despliegue, ir a:
- Función → Runtime Logs
- Network → Verificar llamadas RPC
- Console → Ver errores JavaScript

## 4. INICIAR LOTERÍA

Una vez que Vercel muestre los datos:
1. Conectar billetera como owner
2. Comprar 1 ticket de prueba
3. Ejecutar: drawLottery() manualmente