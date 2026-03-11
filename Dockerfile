FROM node:22-slim

# Install Bun
RUN npm install -g bun

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

WORKDIR /app

# Install dependencies (cached layer)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy project files
COPY . .

# Install frontend dependencies and build static output
RUN cd src/web && bun install --frozen-lockfile && bun run build

# Entrypoint: configures Claude auth on startup
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["bun", "run", "src/index.ts"]
