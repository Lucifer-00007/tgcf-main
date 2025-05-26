# ---- Base Node ----
FROM node:18-slim AS base
WORKDIR /usr/src/app
ENV NODE_ENV=production

# ---- Dependencies ----
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --production

# ---- Build ----
FROM node:18 AS build
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# ---- Release ----
FROM base AS release
# Install runtime OS dependencies (FFmpeg, Tesseract OCR)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    tesseract-ocr \
    # Add any other essential runtime libraries here, e.g., for language data for tesseract if not bundled
    && apt-get autoclean && rm -rf /var/lib/apt/lists/*

# Copy production dependencies from 'deps' stage
COPY --from=deps /usr/src/app/node_modules ./node_modules
# Copy compiled application code from 'build' stage
COPY --from=build /usr/src/app/dist ./dist
# Copy package.json might be useful for some runtime tools or if CMD uses npm script
COPY package.json .

# Set the command to run the application
# Default to 'live' mode. Users can override this when running the container.
# e.g., docker run <image_name> node dist/src/main.js past
CMD ["node", "dist/src/main.js", "live"]
