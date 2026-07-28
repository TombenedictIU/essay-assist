# ---- build stage (compiles better-sqlite3 native module) ----
FROM node:20-alpine AS build
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

# ---- runtime stage ----
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
RUN mkdir -p /app/data
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000
CMD ["node", "src/server.js"]
