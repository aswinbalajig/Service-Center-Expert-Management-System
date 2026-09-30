# --- BASE STAGE ---
FROM node:lts-slim AS base

# FIX 1: Create the directory and give the 'node' user ownership BEFORE setting WORKDIR
RUN mkdir -p /backend/api/ && chown -R node:node /backend/api/

WORKDIR /backend/api/

# FIX 2: Ensure package files are copied with correct ownership
COPY --chown=node:node package*.json ./


# --- DEVELOPMENT STAGE ---
FROM base AS development

# FIX 3: It is much safer to run your development environment as the node user too!
USER node 

# FIX 4: Add cache mount ownership (uid=1000,gid=1000) so the node user can write to the cache
RUN --mount=type=cache,target=/backend/api/.npm,uid=1000,gid=1000 \
  npm set cache /backend/api/.npm && \
  npm install

EXPOSE 3000

CMD ["npm","run","dev"]


# --- PRODUCTION STAGE ---
FROM base AS production

# Copy the rest of the code with correct ownership
COPY --chown=node:node . .

# Safely switch to the restricted 'node' user
USER node

# FIX 5: Add cache mount ownership here as well
RUN --mount=type=cache,target=/backend/api/.npm,uid=1000,gid=1000 \
  npm set cache /backend/api/.npm && \
  npm ci --omit=dev

EXPOSE 3000

CMD ["node","server.js"]