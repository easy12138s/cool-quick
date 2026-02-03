# CoolQuick Development Environment
# Supports both local development and CI/CD

FROM node:18-slim as frontend-builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Rust builder stage
FROM rust:1.75-slim as rust-builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libwebkit2gtk-4.0-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    patchelf \
    && rm -rf /var/lib/apt/lists/*

# Copy Rust source
COPY src-tauri ./src-tauri
COPY --from=frontend-builder /app/dist ./dist

WORKDIR /app/src-tauri

# Build release
RUN cargo build --release

# Final stage (for running tests)
FROM node:18-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libwebkit2gtk-4.0-dev \
    libgtk-3-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

COPY . .

RUN npm ci && cd src-tauri && cargo fetch

CMD ["npm", "run", "tauri-dev"]
