# ⚡ QUICK START - Deploy en 10 minutos

## 🎯 **RESUMEN EJECUTIVO**

**Tu plataforma de lotería generará ingresos pasivos automáticos 24/7**

### **💰 Ganancias Automáticas:**
- **10% de cada sorteo** → Directo a tu wallet
- **50% de premios no reclamados** → Después de 90 días
- **$750-3000 USDT/mes** → Ingresos estimados

### **💸 Inversión Inicial:**
- **Testnet:** $0 USD (todo gratis para pruebas)
- **Mainnet:** ~$315 USD (ROI en 1-5 meses)

---

## 🚀 **PASOS RÁPIDOS**

### **1. Configurar Entorno (2 minutos)**
```bash
# Configuración interactiva
npm run setup:env
```
**Te pedirá:**
- Private Key de MetaMask (sin 0x)
- BSCScan API Key (opcional)
- Tu dirección como owner (opcional)

### **2. Verificar Estado (30 segundos)**
```bash
# Ver estado actual
npm run check:deployment
npm run summary
```

### **3. Deploy en Testnet - GRATIS (5 minutos)**
```bash
# 1. Obtener BNB testnet: https://testnet.binance.org/faucet-smart
# 2. Obtener LINK testnet: https://faucets.chain.link/
# 3. Deploy gratis
npm run deploy:testnet
```

### **4. Probar Sistema (2 minutos)**
```bash
# Iniciar frontend
npm start

# Ir a http://localhost:3000
# Conectar MetaMask (BSC Testnet)
# Comprar 1 ticket de prueba
```

### **5. Deploy en Mainnet - PRODUCCIÓN (cuando estés listo)**
```bash
# 1. Comprar 0.2 BNB (~$120)
# 2. Comprar 15 LINK (~$225)
# 3. Deploy en producción
npm run deploy:mainnet
```

---

## 👑 **INFORMACIÓN DEL OWNER**

### **Dirección Actual:**
```
0x207C68E76392e70C8Efa79617D0ccBddd6b25a4C
```

### **Cambiar Owner:**
**Opción 1 - Antes del deploy:**
```bash
# En npm run setup:env, elegir "usar tu propia dirección"
```

**Opción 2 - Después del deploy:**
```bash
LOTTERY_CONTRACT_ADDRESS=0x... NEW_OWNER_ADDRESS=0x... npm run change:owner
```

---

## 📊 **MONITOREO DE GANANCIAS**

```bash
# Ver ganancias en tiempo real
npm run monitor:earnings
```

**Esto mostrará:**
- Balance actual del owner
- Comisiones acumuladas  
- Tickets vendidos
- Próximo sorteo

---

## 🔧 **COMANDOS ESENCIALES**

```bash
npm run setup:env        # Configurar .env
npm run summary          # Ver estado completo
npm run deploy:testnet   # Deploy gratis
npm run deploy:mainnet   # Deploy producción
npm run monitor:earnings # Ver ganancias
npm start               # Iniciar frontend
npm run build           # Build producción
```

---

## 🔗 **ENLACES IMPORTANTES**

### **Para Testnet (GRATIS):**
- [Obtener BNB Testnet](https://testnet.binance.org/faucet-smart)
- [Obtener LINK Testnet](https://faucets.chain.link/)
- [Configurar VRF Testnet](https://vrf.chain.link/bsc-testnet)

### **Para Mainnet (PRODUCCIÓN):**
- [Configurar VRF Mainnet](https://vrf.chain.link/bsc)
- [BSCScan Explorer](https://bscscan.com/)

---

## ⚠️ **IMPORTANTE**

### **Antes de Mainnet:**
1. ✅ Probar TODO en testnet primero
2. ✅ Verificar que tienes suficiente BNB (~0.2)
3. ✅ Verificar que tienes suficiente LINK (~15)
4. ✅ Configurar VRF subscription
5. ✅ Hacer backup de tu private key

### **Después del Deploy:**
1. ✅ Verificar contrato en BSCScan
2. ✅ Probar compra de tickets
3. ✅ Configurar monitoreo
4. ✅ Deploy del frontend
5. ✅ Empezar marketing

---

## 🎉 **¡LISTO!**

Una vez completado el deployment:

✅ **Tu plataforma funcionará 24/7 automáticamente**  
✅ **Recibirás comisiones de cada sorteo**  
✅ **Los usuarios podrán comprar tickets y ganar premios**  
✅ **Todo será transparente en la blockchain**  

**¡Tu negocio DeFi estará generando ingresos pasivos!**

---

## 🆘 **¿PROBLEMAS?**

```bash
# Si algo falla, siempre puedes verificar:
npm run check:deployment
npm run summary

# O revisar la documentación completa:
# - COMPLETE_DEPLOYMENT_GUIDE.md
# - DEPLOYMENT_STEP_BY_STEP.md
```

**¡Empecemos a generar ingresos pasivos con DeFi! 🚀**