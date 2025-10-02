# ------------ BUILDER ------------
FROM node:20-alpine AS builder
WORKDIR /app

# Dependências para compilações nativas (se necessário). Pode remover se não precisar.
RUN apk add --no-cache python3 make g++

# Cache de deps
COPY package*.json ./
# Instala TUDO (inclui dev) para conseguir rodar "npm run build"
RUN if [ -f package-lock.json ]; then \
      npm ci --legacy-peer-deps; \
    else \
      npm install --legacy-peer-deps; \
    fi

# Copia o código e builda
COPY . .
RUN npm run build

# ------------ RUNTIME ------------
FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache dumb-init curl

ENV NODE_ENV=production
# Porta em runtime (será sobrescrita pelo .env copiado pelo seu script)
ENV PORT=3003
EXPOSE 3003

# Instala apenas dependências de runtime
COPY package*.json ./
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev --legacy-peer-deps; \
    else \
      npm install --omit=dev --legacy-peer-deps; \
    fi

# Copia apenas artefatos necessários do build
COPY --from=builder /app/dist ./dist
# Se existir alguma pasta de assets necessários em runtime, descomente:
# COPY --from=builder /app/public ./public
# COPY --from=builder /app/prisma ./prisma

# Inicia a app Nest compilada
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
