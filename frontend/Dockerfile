FROM node:20-slim AS build
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
RUN npm run build

FROM node:20-slim
RUN npm install -g serve
COPY --from=build /app/dist /app
WORKDIR /app
CMD ["sh", "-c", "serve -s . -l ${PORT:-5173}"]
