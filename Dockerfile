FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Set environment variables for gitlab
# These should be provided at runtime for security purposes
ENV MR_MCP_GITLAB_TOKEN your_gitlab_token

# Command will be provided by smithery.yaml
CMD ["node", "index.js"]
