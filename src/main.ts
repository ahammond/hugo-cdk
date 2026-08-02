#!/usr/bin/env node
import 'source-map-support/register';
import { App, Stack } from 'aws-cdk-lib';
import { HugoSiteStack } from '.';

const commonProps = {
  githubOrg: process.env.GITHUB_ORG || 'ahammond',
  siteDomain: process.env.SITE_DOMAIN || 'agh1973.com',
};

const account = process.env.CDK_DEFAULT_ACCOUNT || '263869919117';
const region = 'us-east-1'; // CloudFront requires us-east-1

const app = new App();

// The GitHub OIDC provider and the GithubDeploymentRole this repo's CD
// assumes are managed in github.com/ahammond/users-cdk (stack GithubInfra-prod).

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
  githubAccountId: 445764,
  githubRepoId: 1318918137,
});

app.synth();
