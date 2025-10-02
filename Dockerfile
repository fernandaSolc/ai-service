# ------------ BUILDER ------------
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN if [ -f package-lock.json ]; then \
      npm ci --legacy-peer-deps; \
    else \
      npm install --legacy-peer-deps; \
    fi
COPY . .
RUN npm run build

# ------------ RUNTIME ------------
FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache dumb-init curl
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
COPY package*.json ./
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev --legacy-peer-deps; \
    else \
      npm install --omit=dev --legacy-peer-deps; \
    fi
COPY --from=builder /app/dist ./dist
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
