# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY public/ ./public/
COPY src/ ./src/

ARG REACT_APP_API_URL=""
ARG REACT_APP_SHOW_ID="a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_SHOW_ID=$REACT_APP_SHOW_ID

RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
