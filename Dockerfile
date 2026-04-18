FROM node:20-slim

# Install Playwright system dependencies and Chromium
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
      libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
      libxdamage1 libxfixes3 libxrandr2 libgbm1 \
      libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 \
      fonts-liberation && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Install Chromium browser for Playwright
RUN npx playwright install chromium

COPY tsconfig.json ./
COPY src/ ./src/

# Headless by default in Docker
ENV HEADLESS=true

CMD ["npx", "tsx", "src/scrapers/scrape.ts"]
