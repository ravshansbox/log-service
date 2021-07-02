FROM node:14 as base
WORKDIR /app
COPY ./package.json ./package-lock.json ./

FROM base as deps
RUN npm install --production

FROM base
COPY --from=deps /app/node_modules/ ./node_modules/
COPY ./src/ ./src/
CMD node src
