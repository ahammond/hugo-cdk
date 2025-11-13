# GitHub Actions Setup Guide

This guide explains how to configure GitHub Actions for deploying Hugo sites to AWS using the infrastructure created by this CDK application with Projen Pipelines.

## Architecture Overview

**This CDK Repo (`ahammond/hugo-cdk`):**
- Deploys infrastructure via GitHub Actions + Projen Pipelines
- Creates CloudFront distributions, S3 buckets, IAM roles
- Stack: `HugoCDK-prod` (contains Blog and Food as nested stacks)

**Your Hugo Content Repos (`ahammond/blog`, `ahammond/food`):**
- Deploy Hugo content via GitHub Actions
- Sync content to S3 buckets
- Invalidate CloudFront cache
- Use roles created by this CDK app

## Setup Instructions

### 1. Deploy the CDK Infrastructure

Deploy via Projen Pipelines (after bootstrap):

```bash
# Deploy bootstrap stack first (one-time)
DEPLOY_STAGE=bootstrap cdk deploy GitHubOIDCBootstrap

# Deploy infrastructure (or push to main for auto-deploy)
pnpm run deploy:prod
```

After deployment, note the CloudFormation exports from the nested stacks:
- **For Blog**: Exports prefixed with `Blog-`
- **For Food**: Exports prefixed with `Food-`

### 2. Get CloudFormation Exports

Get the values from CloudFormation exports:

```bash
# For Blog site
aws cloudformation list-exports --region us-east-1 \
  --query 'Exports[?Name==`Blog-GitHubActionsRoleArn`].Value' --output text

aws cloudformation list-exports --region us-east-1 \
  --query 'Exports[?Name==`Blog-S3BucketName`].Value' --output text

aws cloudformation list-exports --region us-east-1 \
  --query 'Exports[?Name==`Blog-CloudFrontDistributionId`].Value' --output text
```

Or get directly from stack outputs:
```bash
aws cloudformation describe-stacks --stack-name HugoCDK-prod --region us-east-1 \
  --query 'Stacks[0].Outputs' --output table
```

### 3. Configure GitHub Repository Variables

In your **Hugo site repository** (e.g., `ahammond/blog`), go to:
**Settings → Secrets and variables → Actions → Variables → New repository variable**

Add these variables:

**For Blog repo (`ahammond/blog`):**
- `AWS_ROLE_ARN`: Value from `Blog-GitHubActionsRoleArn` export
  - Example: `arn:aws:iam::263869919117:role/github-actions-blog-deploy`
- `AWS_S3_BUCKET`: Value from `Blog-S3BucketName` export
  - Example: `blog.agh1973.com`
- `AWS_CLOUDFRONT_ID`: Value from `Blog-CloudFrontDistributionId` export
  - Example: `E1XO7DGEFLUJQX`
- `AWS_REGION`: `us-east-1`

**For Food repo (`ahammond/food`):**
- `AWS_ROLE_ARN`: Value from `Food-GitHubActionsRoleArn` export
- `AWS_S3_BUCKET`: Value from `Food-S3BucketName` export
- `AWS_CLOUDFRONT_ID`: Value from `Food-CloudFrontDistributionId` export
- `AWS_REGION`: `us-east-1`

**Via GitHub CLI:**

```bash
cd ../blog
gh variable set AWS_ROLE_ARN --body "arn:aws:iam::263869919117:role/github-actions-blog-deploy"
gh variable set AWS_S3_BUCKET --body "blog.agh1973.com"
gh variable set AWS_CLOUDFRONT_ID --body "E1XO7DGEFLUJQX"
gh variable set AWS_REGION --body "us-east-1"
```

### 4. Copy Workflow to Hugo Repository

Copy `deploy.yml.example` to your Hugo repository:

```bash
# In your Hugo repository
mkdir -p .github/workflows
cp /path/to/hugo-cdk/docs/deploy.yml.example .github/workflows/deploy.yml
```

Edit the workflow file if needed (e.g., change branch names, Hugo version).

### 5. Push and Deploy

Push changes to the `main` branch:

```bash
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions deployment workflow"
git push origin main
```

The workflow will:
1. Build your Hugo site
2. Authenticate to AWS using OIDC
3. Sync content to S3
4. Invalidate CloudFront cache

## Workflow Features

- **Free for public repos** (unlimited minutes)
- **2,000 free minutes/month** for private repos
- **No AWS credentials stored** in GitHub (uses OIDC)
- **Build logs visible** in GitHub PR checks
- **Automatic Hugo installation** (configurable version)
- **Submodule support** for Hugo themes
- **CloudFront cache invalidation** after deployment

## Troubleshooting

### "Error: Not authorized to perform sts:AssumeRoleWithWebIdentity"

The IAM role's trust policy restricts which GitHub repos can assume it. Check:
1. The `githubOrg` and `githubRepo` in your CDK configuration match your repository
2. The `allowedBranches` setting allows your branch name
3. The role exists (check CDK outputs)

### "Error: The specified bucket does not exist"

Ensure the `AWS_S3_BUCKET` secret matches the bucket name from CDK outputs.

### Hugo version mismatch

Update the `hugo-version` in the workflow to match your local Hugo version:

```yaml
- uses: peaceiris/actions-hugo@v3
  with:
    hugo-version: '0.139.3'  # Change this
```

## Security Notes

- Variables are visible in logs but don't contain secrets (only resource IDs)
- OIDC tokens are short-lived (15 minutes by default)
- Role permissions are scoped to specific S3 bucket and CloudFront distribution
- Only specified GitHub repos and branches can assume the role
- No AWS credentials stored - authentication via OIDC
