#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack } from 'aws-cdk-lib';
import { HugoSiteStack, GitHubOIDCBootstrapStack } from '.';

const commonProps = {
  githubOrg: process.env.GITHUB_ORG || 'ahammond',
  siteDomain: process.env.SITE_DOMAIN || 'agh1973.com',
};

const account = process.env.CDK_DEFAULT_ACCOUNT || '263869919117';
const region = 'us-east-1'; // CloudFront requires us-east-1

const app = new App();

// Bootstrap stack - deploy this separately with: DEPLOY_STAGE=bootstrap cdk deploy GitHubOIDCBootstrap
// This creates the GitHub OIDC provider and IAM role needed for GitHub Actions
if (process.env.DEPLOY_STAGE === 'bootstrap') {
  new GitHubOIDCBootstrapStack(app, 'GitHubOIDCBootstrap', {
    env: { account, region },
    githubOrg: 'ahammond',
    githubRepo: 'hugo-cdk',
    allowedBranches: 'ref:refs/heads/main', // Only allow main branch to deploy
  });
} else {
  // Production Hugo site stacks
  // Deploys nested stacks: HugoCDK-prod/Blog, HugoCDK-prod/Food
  const parentStack = new Stack(app, 'HugoCDK-prod', {
    env: { account, region },
    stackName: 'HugoCDK-prod',
  });

  new HugoSiteStack(parentStack, 'Blog', {
    env: { account, region },
    ...commonProps,
    siteName: 'blog',
    allowedBranches: ['main'],
  });

  new HugoSiteStack(parentStack, 'Food', {
    env: { account, region },
    ...commonProps,
    siteName: 'food',
    allowedBranches: ['main'],
  });
}

app.synth();
