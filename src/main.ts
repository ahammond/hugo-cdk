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
    githubAccountId: 445764,
    githubRepoId: 281883466,
  });

  new HugoSiteStack(parentStack, 'Food', {
    env: { account, region },
    ...commonProps,
    siteName: 'food',
    allowedBranches: ['main'],
    githubAccountId: 445764,
    githubRepoId: 347204608,
  });

  new HugoSiteStack(parentStack, 'Portfolio', {
    env: { account, region },
    githubOrg: 'asyaivanov',
    siteDomain: 'asyahammond.com',
    siteName: 'portfolio',
    allowedBranches: ['main'],
    githubAccountId: 264667898,
    githubRepoId: 1169456855,
  });

  new HugoSiteStack(parentStack, 'Westview', {
    env: { account, region },
    githubOrg: 'asyaivanov',
    siteDomain: 'asyahammond.com',
    siteName: 'westview',
    githubRepo: 'westview_website',
    allowedBranches: ['main'],
    githubAccountId: 264667898,
    githubRepoId: 1182064155,
  });

  new HugoSiteStack(parentStack, 'Chonk', {
    env: { account, region },
    ...commonProps,
    siteName: 'chonk',
    allowedBranches: ['main'],
    githubAccountId: 445764,
    githubRepoId: 1284497677,
  });

  new HugoSiteStack(parentStack, 'Politics', {
    env: { account, region },
    ...commonProps,
    siteName: 'politics',
    allowedBranches: ['main'],
    githubAccountId: 445764,
    githubRepoId: 1212984540,
  });

  new HugoSiteStack(parentStack, 'DndMinis', {
    env: { account, region },
    ...commonProps,
    siteName: 'dnd-minis',
    allowedBranches: ['main'],
    // Repo created 2026-07-31, after GitHub's immutable OIDC subject rollout.
    // IDs from: gh api repos/ahammond/dnd-minis/actions/oidc/customization/sub
    githubAccountId: 445764,
    githubRepoId: 1318918137,
  });
}

app.synth();
