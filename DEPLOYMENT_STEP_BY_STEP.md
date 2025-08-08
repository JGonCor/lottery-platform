# 🚀 GUÍA PASO A PASO - DEPLOYMENT COMPLETO

## 📋 **RESUMEN EJECUTIVO**

### **👑 DIRECCIÓN DEL OWNER ACTUAL**
```
Owner Address: 0x207C68E76392e70C8Efa79617D0ccBddd6b25a4C
```

**⚠️ IMPORTANTE**: Esta dirección recibirá:
- ✅ **10% de comisión** de cada sorteo automáticamente
- ✅ **50% de premios no reclamados** después de 90 días
- ✅ **Control total** del contrato (pausar/despausar)

### **💰 COSTOS TOTALES DE DEPLOYMENT**
```
🧪 TESTNET (Pruebas): $0 USD (Todo gratis)
💎 MAINNET (Producción): ~$315 USD
├── BNB para gas: ~$90 USD
└── LINK tokens: ~$225 USD
```

---

## 🛠️ **PASO 1: CONFIGURACIÓN INICIAL (10 minutos)**

### **1.1 Crear tu billetera MetaMask**
```bash
# 1. Instalar MetaMask: https://metamask.io/
# 2. Crear nueva billetera o importar existente
# 3. ⚠️ GUARDAR seed phrase de forma SEGURA
# 4. Copiar tu dirección (ejemplo: 0x742d35Cc6634C0532925a3b8D404d32a3f6C6B1c)
```

### **1.2 Agregar BSC Networks a MetaMask**
```javascript
// BSC Mainnet
Network Name: Smart Chain
RPC URL: https://bsc-dataseed.binance.org/
Chain ID: 56
Symbol: BNB
Explorer: https://bscscan.com

// BSC Testnet  
Network Name: Smart Chain Testnet
RPC URL: https://data-seed-prebsc-1-s1.binance.org:8545/
Chain ID: 97
Symbol: BNB
Explorer: https://testnet.bscscan.com
```

### **1.3 Configurar archivo .env**
```bash
# Copiar archivo de ejemplo
cp env.example .env

# Editar .env con tus datos:
PRIVATE_KEY=tu_private_key_sin_0x
BSCSCAN_API_KEY=tu_api_key_de_bscscan
OWNER_ADDRESS=0x207C68E76392e70C8Efa79617D0ccBddd6b25a4C  # O tu dirección
```

**🔑 Cómo obtener tu Private Key:**
1. Abrir MetaMask
2. Click en los 3 puntos → Account details
3. Click "Export private key"
4. Introducir contraseña
5. Copiar (SIN el 0x del inicio)

**🔑 Cómo obtener BSCScan API Key:**
1. Ir a: https://bscscan.com/apis
2. Crear cuenta gratuita
3. Crear API Key
4. Copiar la clave

---

## 🧪 **PASO 2: DEPLOYMENT EN TESTNET (30 minutos)**

### **2.1 Obtener BNB Testnet (GRATIS)**
```bash
# 1. Ir a: https://testnet.binance.org/faucet-smart
# 2. Pegar tu dirección de MetaMask
# 3. Resolver captcha y recibir BNB testnet
# 4. Cambiar MetaMask a "Smart Chain Testnet"
# 5. Verificar que tienes ~0.1 BNB
```

### **2.2 Obtener LINK Testnet (GRATIS)**
```bash
# 1. Ir a: https://faucets.chain.link/
# 2. Seleccionar "Binance Smart Chain Testnet"
# 3. Pegar tu dirección
# 4. Recibir 20 LINK tokens gratis
```

### **2.3 Crear VRF Subscription Testnet**
```bash
# 1. Ir a: https://vrf.chain.link/bsc-testnet
# 2. Conectar MetaMask (BSC Testnet)
# 3. Click "Create Subscription"
# 4. Confirmar transacción
# 5. COPIAR el Subscription ID (ejemplo: 123)
# 6. Click "Add Funds"
# 7. Agregar 5 LINK tokens
```

### **2.4 Configurar Subscription ID**
```bash
# Editar .env:
VRF_SUBSCRIPTION_ID_TESTNET=123  # Tu ID real
```

### **2.5 Deploy en Testnet**
```bash
# Verificar configuración
npm run check:deployment

# Deploy en testnet
npm run deploy:testnet

# Resultado esperado:
# ✅ MultiTierLottery deployed to: 0x...
# 👑 Contract owner: 0x207C68E76392e70C8Efa79617D0ccBddd6b25a4C
```

### **2.6 Agregar Contrato a VRF Subscription**
```bash
# 1. Volver a: https://vrf.chain.link/bsc-testnet
# 2. Click en tu subscription
# 3. Click "Add Consumer"
# 4. Pegar dirección del contrato desplegado
# 5. Confirmar transacción
```

### **2.7 Probar Sistema Testnet**
```bash
# Iniciar frontend
npm start

# En el navegador:
# 1. Conectar MetaMask a BSC Testnet
# 2. Ir a http://localhost:3000
# 3. Comprar 1 ticket de prueba
# 4. Verificar transacción en BSCScan Testnet
```

---

## 💎 **PASO 3: DEPLOYMENT EN MAINNET (45 minutos)**

### **3.1 Obtener BNB Mainnet**
```bash
# COMPRAR 0.2 BNB (~$120):
# 1. Binance/Coinbase/exchange de tu preferencia
# 2. Comprar BNB
# 3. Enviar a tu MetaMask (BSC Mainnet)
# 4. Verificar recepción
```

### **3.2 Obtener LINK Tokens Mainnet**
```bash
# COMPRAR 15 LINK (~$225):
# 1. Binance/Coinbase/exchange
# 2. Comprar LINK tokens
# 3. Enviar a tu MetaMask (BSC Mainnet)
# 4. Verificar recepción
```

### **3.3 Crear VRF Subscription Mainnet**
```bash
# 1. Ir a: https://vrf.chain.link/bsc
# 2. Conectar MetaMask (BSC Mainnet)
# 3. Click "Create Subscription"
# 4. Confirmar transacción (cuesta ~$3)
# 5. COPIAR Subscription ID
# 6. Click "Add Funds"
# 7. Agregar 10 LINK tokens
```

### **3.4 Configurar Mainnet**
```bash
# Editar .env:
VRF_SUBSCRIPTION_ID_MAINNET=456  # Tu ID real de mainnet
REACT_APP_ENVIRONMENT=production
REACT_APP_NETWORK=mainnet
```

### **3.5 Deploy en Mainnet**
```bash
# ⚠️ VERIFICAR TODO ANTES DE EJECUTAR
# Esto costará BNB real (~$50-80)

# Verificar configuración final
npm run check:deployment

# Deploy en mainnet
npm run deploy:mainnet

# Resultado esperado:
# ✅ MultiTierLottery deployed to: 0x...
# 👑 Owner address: 0x207C68E76392e70C8Efa79617D0ccBddd6b25a4C
# 💰 Gas used: ~2,500,000
# 💸 Total cost: ~0.08 BNB
```

### **3.6 Agregar Contrato a VRF Mainnet**
```bash
# 1. Ir a tu VRF subscription: https://vrf.chain.link/bsc
# 2. Click "Add Consumer"
# 3. Pegar dirección del contrato mainnet
# 4. Confirmar transacción
```

### **3.7 Verificar Contrato en BSCScan**
```bash
# Automático (si tienes BSCSCAN_API_KEY):
npx hardhat verify --network bscMainnet DIRECCION_CONTRATO

# Manual:
# 1. Ir a: https://bscscan.com/address/DIRECCION_CONTRATO
# 2. Click "Contract" > "Verify and Publish"
# 3. Subir código fuente del contrato
```

---

## 🌐 **PASO 4: DEPLOY FRONTEND (20 minutos)**

### **4.1 Build para Producción**
```bash
# Crear build optimizado
npm run build

# Verificar que no hay errores
# Build debe crear carpeta 'build' con archivos
```

### **4.2 Deploy Frontend - Opción A: Netlify (Recomendado)**
```bash
# 1. Ir a: https://netlify.com
# 2. Crear cuenta gratuita
# 3. Arrastrar carpeta 'build' a Netlify
# 4. Configurar dominio personalizado (opcional)
# 5. Configurar variables de entorno en Netlify:
#    - REACT_APP_LOTTERY_CONTRACT_ADDRESS
#    - REACT_APP_ENVIRONMENT=production
```

### **4.3 Deploy Frontend - Opción B: Vercel**
```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Deploy
vercel --prod

# 3. Configurar variables de entorno
vercel env add REACT_APP_LOTTERY_CONTRACT_ADDRESS
vercel env add REACT_APP_ENVIRONMENT production
```

---

## 🧪 **PASO 5: TESTING FINAL (30 minutos)**

### **5.1 Testing Inicial**
```bash
# 1. Abrir frontend en producción
# 2. Conectar MetaMask a BSC Mainnet
# 3. Comprar 1 ticket con cantidad pequeña (5 USDT)
# 4. Verificar transacción en BSCScan
# 5. Esperar 24h para sorteo automático
# 6. Verificar comisiones recibidas en tu wallet
```

### **5.2 Monitoreo de Ganancias**
```bash
# Script de monitoreo
npm run monitor:earnings

# Esto mostrará:
# - Balance actual del owner
# - Comisiones acumuladas
# - Número de tickets vendidos
# - Próximo sorteo
```

---

## 💰 **INFORMACIÓN DE GANANCIAS**

### **🏦 Tu Dirección de Ingresos**
```
👑 Owner: 0x207C68E76392e70C8Efa79617D0ccBddd6b25a4C

Recibirás automáticamente:
├── 10% de cada sorteo → Inmediato
├── 50% premios no reclamados → Después de 90 días
├── Control total del contrato → Pausar/despausar
└── Cambios de configuración → Solo owner
```

### **📊 Proyección de Ingresos**
```
💎 ESCENARIO CONSERVADOR:
├── 50 usuarios/día × 5 USDT × 10% = $25/día
├── Mes: ~$750 USDT
├── Año: ~$9,000 USDT
└── ROI: ~4-5 meses

🚀 ESCENARIO OPTIMISTA:
├── 200 usuarios/día × 5 USDT × 10% = $100/día
├── Mes: ~$3,000 USDT
├── Año: ~$36,000 USDT
└── ROI: ~1-2 meses
```

---

## 🔧 **CAMBIAR DIRECCIÓN DEL OWNER**

### **Opción 1: Antes del Deployment**
```bash
# Editar .env:
OWNER_ADDRESS=0xTuDireccionAqui

# Luego hacer el deployment normal
```

### **Opción 2: Después del Deployment**
```bash
# Usar script de cambio de owner:
LOTTERY_CONTRACT_ADDRESS=0x... NEW_OWNER_ADDRESS=0x... npm run change:owner
```

---

## ✅ **CHECKLIST FINAL**

### **Pre-Launch**
- [ ] Owner address configurada correctamente
- [ ] Contrato desplegado en mainnet
- [ ] VRF subscription configurada y fondeada
- [ ] Contrato verificado en BSCScan
- [ ] Frontend desplegado y funcionando
- [ ] Testing inicial completado
- [ ] Monitoreo configurado

### **Post-Launch**
- [ ] Primer sorteo ejecutado correctamente
- [ ] Comisiones recibidas en owner address
- [ ] Sistema de referidos funcionando
- [ ] Descuentos aplicándose correctamente
- [ ] Premios distribuidos automáticamente

---

## 🚨 **SOLUCIÓN DE PROBLEMAS**

### **"Insufficient funds"**
```bash
# Necesitas más BNB en tu wallet
# Mainnet: mínimo 0.1 BNB
# Testnet: usar faucet gratuito
```

### **"VRF subscription not found"**
```bash
# 1. Crear subscription en vrf.chain.link
# 2. Agregar contrato como consumer
# 3. Fondear con LINK tokens
# 4. Verificar Subscription ID en .env
```

### **"Contract verification failed"**
```bash
# Verificar parámetros del constructor
# Usar exactamente los mismos valores del deployment
```

### **"Frontend no conecta"**
```bash
# 1. Verificar REACT_APP_LOTTERY_CONTRACT_ADDRESS
# 2. Verificar que MetaMask está en BSC Mainnet
# 3. Verificar variables de entorno
```

---

## 🎉 **¡FELICIDADES!**

Una vez completados todos los pasos, tendrás:

✅ **Plataforma de lotería 100% funcional**  
✅ **Ingresos pasivos automáticos de $750-3000/mes**  
✅ **Sistema escalable y seguro**  
✅ **Control total del negocio**  

**Tu plataforma estará generando ingresos 24/7 de forma completamente automática.**

---

## 📞 **COMANDOS ÚTILES**

```bash
# Verificar estado antes de deployment
npm run check:deployment

# Deploy en testnet
npm run deploy:testnet

# Deploy en mainnet
npm run deploy:mainnet

# Cambiar owner
npm run change:owner

# Monitorear ganancias
npm run monitor:earnings

# Build frontend
npm run build

# Iniciar desarrollo
npm start
```

---

**🚀 ¿Listo para generar ingresos pasivos con DeFi? ¡Empecemos!**