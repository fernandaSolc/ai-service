# Usa imagem Node LTS oficial
FROM node:20-alpine

# Define diretório de trabalho
WORKDIR /app

# Copia package.json e package-lock.json primeiro para otimizar cache
COPY package*.json ./

# Instala dependências
RUN npm install --production

# Copia o restante do código
COPY . .

# Variável de ambiente padrão
ENV PORT=3000

# Expõe porta interna
EXPOSE 3000

# Comando padrão para iniciar a aplicação
CMD ["npm", "start"]
