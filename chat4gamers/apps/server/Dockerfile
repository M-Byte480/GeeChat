FROM node:20
LABEL authors="REDACTED_USERNAME"

WORKDIR /app
COPY package.json yarn.lock* ./
RUN yarn install
COPY . .
EXPOSE 4000
CMD ["yarn", "start"]

