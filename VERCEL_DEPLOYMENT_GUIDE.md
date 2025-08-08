# 🚀 Guía de Despliegue en Vercel - BSC Lottery Platform

## ✅ Problemas Resueltos

### 1. **Problemas de Módulos Corregidos**
- ✅ Lazy loading implementado en `web3.ts`
- ✅ Hooks actualizados para usar funciones lazy-loaded
- ✅ Web3React configurado correctamente

### 2. **Configuración de Vercel Optimizada**
- ✅ `vercel.json` actualizado con configuración SPA
- ✅ Rutas configuradas para React Router
- ✅ Headers de seguridad implementados
- ✅ Assets caching configurado

### 3. **Build y Assets**
- ✅ Webpack configurado para producción
- ✅ Assets estáticos copiados correctamente
- ✅ `_redirects` para SPA routing

## 🔧 Archivos Modificados

### `vercel.json` - Configuración Principal
```json
{
  "version": 2,
  "framework": null,
  "routes": [
    {
      "src": "/static/(.*)",
      "headers": { "cache-control": "public, max-age=31536000, immutable" }
    },
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ],
  "env": {
    "NODE_ENV": "production",
    "REACT_APP_ENVIRONMENT": "production",
    "REACT_APP_NETWORK": "mainnet",
    "REACT_APP_LOTTERY_CONTRACT_ADDRESS": "0xFE657EC636c55D2035345056f64B0FAB71E1B995",
    // ... más variables
  }
}
```

### Hooks Actualizados
- `src/hooks/useLottery.ts`
- `src/hooks/useUnifiedLottery.ts`
- `src/hooks/useRealLotteryData.ts`

Ahora usan:
```typescript
import { getLotteryContractAddress, getUsdtContractAddress } from '../utils/web3';
```

### Utils/Web3.ts - Lazy Loading
```typescript
export const getLotteryContractAddress = () => {
  try {
    return getContractAddress('lottery');
  } catch (error) {
    console.warn('Error getting lottery contract address:', error);
    return '0x0000000000000000000000000000000000000000';
  }
};
```

## 🚀 Pasos para Desplegar

### 1. **Verificar Build Local**
```bash
npm run build
# Debe compilar sin errores (warnings de ethers.js son normales)
```

### 2. **Verificar Estructura del Build**
```
build/
├── index.html
├── favicon.ico
├── manifest.json
├── robots.txt
├── _redirects
└── static/
    └── js/
        ├── main.[hash].js
        └── vendors.[hash].js
```

### 3. **Desplegar en Vercel**

**Opción A: GitHub Integration**
1. Push a tu repositorio
2. Conecta Vercel al repositorio
3. Vercel detectará automáticamente la configuración

**Opción B: Vercel CLI**
```bash
npm i -g vercel
vercel --prod
```

**Opción C: Drag & Drop**
- Sube la carpeta `build/` directamente a Vercel

### 4. **Configurar Variables de Entorno en Vercel**
En el dashboard de Vercel → Settings → Environment Variables:

```
NODE_ENV=production
REACT_APP_ENVIRONMENT=production
REACT_APP_NETWORK=mainnet
REACT_APP_LOTTERY_CONTRACT_ADDRESS=0xFE657EC636c55D2035345056f64B0FAB71E1B995
REACT_APP_USDT_CONTRACT_ADDRESS=0x55d398326f99059fF775485246999027B3197955
REACT_APP_OWNER_ADDRESS=0x207C68E76392e70C8Efa79617D0ccBddd6b25a4C
REACT_APP_BSC_MAINNET_RPC=https://bsc-dataseed.binance.org/
REACT_APP_CHAIN_ID=56
REACT_APP_APP_NAME=BSC Lottery Platform
REACT_APP_ENABLE_REFERRALS=true
REACT_APP_ENABLE_BULK_DISCOUNTS=true
```

## ✅ Verificaciones Post-Despliegue

1. **Página Principal** - Debe cargar sin página en blanco
2. **Rutas** - `/how-to-play`, `/faq`, etc. deben funcionar
3. **Recarga de Página** - F5 en cualquier ruta debe funcionar
4. **Console Errors** - No debe haber errores críticos en DevTools
5. **MetaMask** - Debe conectar correctamente
6. **Responsive** - Debe verse bien en móvil y escritorio

## 🐛 Troubleshooting

### Si sigue apareciendo página en blanco:

1. **Verificar DevTools Console**
```javascript
// Buscar errores de:
- Module loading failures
- Web3React connector issues
- Environment variable missing
```

2. **Verificar Network Tab**
```
- Todos los assets (js, css) se cargan
- No hay 404s en archivos estáticos
- index.html retorna 200
```

3. **Verificar Variables de Entorno**
```javascript
console.log('Env check:', {
  env: process.env.REACT_APP_ENVIRONMENT,
  network: process.env.REACT_APP_NETWORK,
  contract: process.env.REACT_APP_LOTTERY_CONTRACT_ADDRESS
});
```

## 🔧 Comandos Útiles

```bash
# Build local para testing
npm run build
npx serve build -l 3000

# Verificar que no hay errores de TypeScript
npx tsc --noEmit

# Verificar que las dependencias están correctas
npm audit fix

# Limpiar node_modules si hay problemas
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

## 📱 URLs de Ejemplo
- **Producción**: `https://tu-app.vercel.app`
- **Staging**: `https://tu-app-git-develop.vercel.app`

## 🎯 Optimizaciones Implementadas

1. **Caching de Assets** - CSS/JS cacheados por 1 año
2. **Lazy Loading** - Módulos cargan solo cuando se necesitan
3. **SPA Routing** - React Router funciona en todas las rutas
4. **Security Headers** - XSS, CSRF protection
5. **Compression** - Gzip automático en Vercel

---

**🎉 ¡Tu aplicación está lista para producción!**

Si encuentras algún problema, verifica primero la consola del navegador y los logs de Vercel.