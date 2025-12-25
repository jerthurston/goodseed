#!/bin/bash

echo "Testing permissions for goodseed-deploy user..."

echo "1. Testing STS access..."
aws sts get-caller-identity

echo -e "\n2. Testing IAM access..."
aws iam get-user --user-name goodseed-deploy

echo -e "\n3. Testing EC2 VPC access..."
aws ec2 describe-vpcs --max-items 1

echo -e "\n4. Testing ECS access..."
aws ecs list-clusters

echo -e "\n5. Testing ECR access..."
aws ecr describe-repositories --max-items 1

echo -e "\n6. Testing RDS access..."
aws rds describe-db-instances --max-items 1

echo -e "\n✅ All tests completed!"
echo "If no errors above, permissions are working correctly."