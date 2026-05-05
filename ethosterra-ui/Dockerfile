ARG WS_URL=ws://localhost:8000/wpsViewer
ARG API_URL=http://localhost:8001

FROM node:20-alpine AS builder

ARG WS_URL
ARG API_URL
ENV NEXT_PUBLIC_WS_URL=${WS_URL}
ENV NEXT_PUBLIC_API_URL=${API_URL}

WORKDIR /app

COPY package.json ./

RUN npm install --no-audit --no-fund --prefer-offline 2>&1 || \
    npm install --no-audit --no-fund 2>&1

COPY next.config.js tsconfig.json tailwind.config.js postcss.config.js ./
COPY src/ ./src/

RUN npm run build

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN mkdir -p public

EXPOSE 3000

ENTRYPOINT ["node", "server.js"]
