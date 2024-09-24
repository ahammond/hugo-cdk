#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { HugoSiteStack } from '.';

const commonProps = {
  env: {
    account: '263869919117', // ahammond's AWS account ID. Use your own.
    region: 'us-east-1', // Not sure what other regions will support all this.
  },
  githubOrg: 'ahammond',
  siteDomain: 'agh1973.com',
};

const app = new App();

// You can just add stanza after stanza to implement more sites.
new HugoSiteStack(app, 'Blog', {
  ...commonProps,
  siteName: 'blog',
});

new HugoSiteStack(app, 'Food', {
  ...commonProps,
  siteName: 'food',
});
