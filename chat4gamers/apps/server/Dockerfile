FROM node:22-alpine
LABEL authors="kmila"

WORKDIR /app
COPY package.json yarn.lock* ./
RUN yarn install
COPY . .
RUN yarn build
EXPOSE 4000
CMD ["node", "dist/index.js"]
