#!/bin/bash

# Simple 2-Environment GitHub Setup Script
# This script helps setup GitHub environments and secrets for development and production

echo "🚀 Simple 2-Environment GitHub Setup Helper"
echo "==========================================="

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not found. Please install it first:"
    echo "   https://cli.github.com/manual/installation"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub. Please run:"
    echo "   gh auth login"
    exit 1
fi

REPO="Vietphu1211/goodseed-app"

echo "Setting up simple 2-environment deployment for repository: $REPO"
echo ""

# Function to create environment
create_environment() {
    local env_name=$1
    local protection_rules=$2
    
    echo "Creating environment: $env_name"
    
    # Note: GitHub CLI doesn't support environment creation yet
    # This would need to be done manually or via GitHub API
    echo "⚠️  Please manually create environment '$env_name' in GitHub repository settings"
    echo "   → Go to: https://github.com/$REPO/settings/environments"
    echo "   → Click 'New environment'"
    echo "   → Name: $env_name"
    echo "   → Configure protection rules: $protection_rules"
    echo ""
}

# Function to set environment secrets
set_environment_secrets() {
    local env_name=$1
    
    echo "📝 Setting up secrets for environment: $env_name"
    echo "Please enter the values for each secret (press Enter to skip):"
    echo ""
    
    # AWS Secrets
    read -p "AWS_ACCESS_KEY_ID ($env_name): " aws_access_key
    if [[ ! -z "$aws_access_key" ]]; then
        echo "Setting AWS_ACCESS_KEY_ID..."
        # gh secret set AWS_ACCESS_KEY_ID --env $env_name --body "$aws_access_key" --repo $REPO
        echo "⚠️  Manual setup required - GitHub CLI doesn't support environment secrets yet"
    fi
    
    read -s -p "AWS_SECRET_ACCESS_KEY ($env_name): " aws_secret_key
    echo ""
    if [[ ! -z "$aws_secret_key" ]]; then
        echo "Setting AWS_SECRET_ACCESS_KEY..."
        # gh secret set AWS_SECRET_ACCESS_KEY --env $env_name --body "$aws_secret_key" --repo $REPO
        echo "⚠️  Manual setup required"
    fi
    
    # Database URL
    read -s -p "DATABASE_URL ($env_name): " database_url
    echo ""
    if [[ ! -z "$database_url" ]]; then
        echo "Setting DATABASE_URL..."
        # gh secret set DATABASE_URL --env $env_name --body "$database_url" --repo $REPO
        echo "⚠️  Manual setup required"
    fi
    
    # Redis URL
    read -s -p "REDIS_URL ($env_name): " redis_url
    echo ""
    if [[ ! -z "$redis_url" ]]; then
        echo "Setting REDIS_URL..."
        # gh secret set REDIS_URL --env $env_name --body "$redis_url" --repo $REPO
        echo "⚠️  Manual setup required"
    fi
    
    # Cron Secret
    read -s -p "CRON_SECRET ($env_name): " cron_secret
    echo ""
    if [[ ! -z "$cron_secret" ]]; then
        echo "Setting CRON_SECRET..."
        # gh secret set CRON_SECRET --env $env_name --body "$cron_secret" --repo $REPO
        echo "⚠️  Manual setup required"
    fi
    
    echo ""
}

# Setup Development Environment
echo "1. Development Environment Setup"
create_environment "development" "No protection rules (auto-deploy)"

echo "2. Production Environment Setup"
create_environment "production" "Required reviewers: @Vietphu1211"

echo ""
echo "🔧 Manual Setup Instructions:"
echo "============================="
echo ""
echo "Since GitHub CLI doesn't fully support environment secrets yet,"
echo "please follow these manual steps:"
echo ""
echo "1. Go to: https://github.com/$REPO/settings/environments"
echo ""
echo "2. Create 2 environments:"
echo "   - development (no protection)"
echo "   - production (required reviewers: @Vietphu1211)"
echo ""
echo "3. For each environment, add these secrets:"
echo "   - AWS_ACCESS_KEY_ID"
echo "   - AWS_SECRET_ACCESS_KEY" 
echo "   - DATABASE_URL"
echo "   - REDIS_URL"
echo "   - CRON_SECRET"
echo ""
echo "4. Use the .env.*.example files as reference for values"
echo ""

# Offer to guide through secret setup
read -p "Would you like to be guided through secret entry? (y/N): " setup_secrets

if [[ "$setup_secrets" =~ ^[Yy]$ ]]; then
    echo ""
    echo "📋 Secret Setup Guide"
    echo "===================="
    echo ""
    
    set_environment_secrets "development"
    set_environment_secrets "production"
    
    echo "✅ Secret setup guide completed!"
    echo "Remember to manually add these secrets to GitHub environments."
fi

echo ""
echo "🎉 Simple 2-environment setup guide completed!"
echo ""
echo "Next steps:"
echo "1. Complete manual GitHub environment setup"
echo "2. Verify AWS infrastructure exists for production environment"
echo "3. Test deployment by pushing to different branches:"
echo "   - develop → deploys to development"
echo "   - main → deploys to production (with approval)"
echo ""
echo "📚 For detailed instructions, see: .github/ENVIRONMENT_SETUP.md"