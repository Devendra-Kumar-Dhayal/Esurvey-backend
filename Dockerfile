FROM node:20-alpine

WORKDIR /app

COPY --chown=node:node package*.json ./

RUN npm ci --omit=dev

COPY --chown=node:node src ./src

# Create images directory with proper permissions
RUN mkdir -p /app/images/unloading_point && chown -R node:node /app/images

USER node

EXPOSE 3000

CMD ["node", "src/index.js"]
