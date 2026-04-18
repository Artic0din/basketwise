FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY src/ ./src/

CMD ["npx", "tsx", "src/scrapers/scrape.ts"]
