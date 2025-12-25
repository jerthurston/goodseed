#!/bin/bash

# Script to set up permissions for goodseed-deploy user
# Run this with AWS credentials that have Administrator access

echo "Setting up permissions for goodseed-deploy user..."

# Create comprehensive policy for infrastructure deployment
cat > infrastructure-deploy-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VPCManagement",
            "Effect": "Allow",
            "Action": [
                "ec2:CreateVpc",
                "ec2:DeleteVpc",
                "ec2:DescribeVpcs",
                "ec2:ModifyVpcAttribute",
                "ec2:CreateSubnet",
                "ec2:DeleteSubnet",
                "ec2:DescribeSubnets",
                "ec2:ModifySubnetAttribute",
                "ec2:CreateInternetGateway",
                "ec2:DeleteInternetGateway",
                "ec2:DescribeInternetGateways",
                "ec2:AttachInternetGateway",
                "ec2:DetachInternetGateway",
                "ec2:CreateRouteTable",
                "ec2:DeleteRouteTable",
                "ec2:DescribeRouteTables",
                "ec2:CreateRoute",
                "ec2:DeleteRoute",
                "ec2:AssociateRouteTable",
                "ec2:DisassociateRouteTable",
                "ec2:CreateSecurityGroup",
                "ec2:DeleteSecurityGroup",
                "ec2:DescribeSecurityGroups",
                "ec2:AuthorizeSecurityGroupIngress",
                "ec2:AuthorizeSecurityGroupEgress",
                "ec2:RevokeSecurityGroupIngress",
                "ec2:RevokeSecurityGroupEgress",
                "ec2:DescribeAvailabilityZones",
                "ec2:DescribeAccountAttributes",
                "ec2:CreateTags",
                "ec2:DescribeTags"
            ],
            "Resource": "*"
        },
        {
            "Sid": "ECSManagement",
            "Effect": "Allow",
            "Action": [
                "ecs:*"
            ],
            "Resource": "*"
        },
        {
            "Sid": "ECRManagement",
            "Effect": "Allow",
            "Action": [
                "ecr:*"
            ],
            "Resource": "*"
        },
        {
            "Sid": "RDSManagement",
            "Effect": "Allow",
            "Action": [
                "rds:*"
            ],
            "Resource": "*"
        },
        {
            "Sid": "IAMManagement",
            "Effect": "Allow",
            "Action": [
                "iam:CreateRole",
                "iam:DeleteRole",
                "iam:GetRole",
                "iam:ListRoles",
                "iam:PassRole",
                "iam:AttachRolePolicy",
                "iam:DetachRolePolicy",
                "iam:ListAttachedRolePolicies",
                "iam:PutRolePolicy",
                "iam:DeleteRolePolicy",
                "iam:GetRolePolicy",
                "iam:ListRolePolicies",
                "iam:CreateInstanceProfile",
                "iam:DeleteInstanceProfile",
                "iam:GetInstanceProfile",
                "iam:AddRoleToInstanceProfile",
                "iam:RemoveRoleFromInstanceProfile",
                "iam:ListInstanceProfiles",
                "iam:TagRole",
                "iam:UntagRole"
            ],
            "Resource": "*"
        },
        {
            "Sid": "CloudWatchManagement",
            "Effect": "Allow",
            "Action": [
                "logs:*",
                "cloudwatch:*"
            ],
            "Resource": "*"
        },
        {
            "Sid": "LoadBalancerManagement",
            "Effect": "Allow",
            "Action": [
                "elasticloadbalancing:*"
            ],
            "Resource": "*"
        },
        {
            "Sid": "S3Management",
            "Effect": "Allow",
            "Action": [
                "s3:*"
            ],
            "Resource": "*"
        },
        {
            "Sid": "GeneralDescribeAccess",
            "Effect": "Allow",
            "Action": [
                "sts:GetCallerIdentity",
                "sts:AssumeRole"
            ],
            "Resource": "*"
        }
    ]
}
EOF

# Create the policy
echo "Creating policy GoodSeedInfrastructureDeploy..."
aws iam create-policy \
    --policy-name GoodSeedInfrastructureDeploy \
    --policy-document file://infrastructure-deploy-policy.json \
    --description "Comprehensive infrastructure deployment permissions for GoodSeed project"

# Get policy ARN
POLICY_ARN=$(aws iam list-policies --query 'Policies[?PolicyName==`GoodSeedInfrastructureDeploy`].Arn' --output text)
echo "Policy ARN: $POLICY_ARN"

# Attach policy to user
echo "Attaching policy to goodseed-deploy user..."
aws iam attach-user-policy \
    --user-name goodseed-deploy \
    --policy-arn $POLICY_ARN

# Remove permissions boundary if exists
echo "Checking for permissions boundary..."
BOUNDARY=$(aws iam get-user --user-name goodseed-deploy --query 'User.PermissionsBoundary.PermissionsBoundaryArn' --output text 2>/dev/null || echo "None")

if [[ "$BOUNDARY" != "None" && "$BOUNDARY" != "null" ]]; then
    echo "Removing permissions boundary: $BOUNDARY"
    aws iam delete-user-permissions-boundary --user-name goodseed-deploy
else
    echo "No permissions boundary found"
fi

# Verify permissions
echo "Verifying user permissions..."
aws iam list-attached-user-policies --user-name goodseed-deploy

echo "✅ Permissions setup completed!"
echo "User goodseed-deploy now has infrastructure deployment permissions."

# Clean up
rm -f infrastructure-deploy-policy.json