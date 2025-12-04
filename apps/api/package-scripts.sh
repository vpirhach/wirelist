#!/bin/bash

# Wirelist API Node.js - Quick Start Script

echo "🚀 Wirelist API - NestJS Setup"
echo "================================"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npm run prisma:generate

# Build the application
echo "🏗️  Building application..."
npm run build

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "  npm run start:dev    # Development mode with hot-reload"
echo "  npm run start:prod   # Production mode"
echo ""
echo "API Documentation:"
echo "  http://localhost:3002/api-docs"
echo ""
