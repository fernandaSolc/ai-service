FROM node:20-alpine

# utilitários necessários p/ healthcheck e possíveis builds
RUN apk add --no-cache curl

WORKDIR /app

# Copia manifests primeiro p/ cache
COPY package*.json ./

# Se houver package-lock.json use npm ci, senão use npm install
# Ambas com --omit=dev e --legacy-peer-deps para contornar ERESOLVE
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev --legacy-peer-deps; \
    else \
      npm install --omit=dev --legacy-peer-deps; \
    fi

# Copia código
COPY . .

ENV NODE_ENV=production
ENV PORT=3003
EXPOSE 3003

CMD ["npm", "start"]
