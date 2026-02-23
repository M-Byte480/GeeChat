FROM node:20
LABEL authors="kmila"

WORKDIR /app
COPY package.json yarn.lock* ./
RUN yarn install
COPY . .
EXPOSE 4000
CMD ["yarn", "start"]

