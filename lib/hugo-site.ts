import cdk = require('@aws-cdk/core');
import staticSite = require('./static-site');
import builder = require('./builder');

export interface HugoSiteStackProps extends staticSite.StaticSiteProps, cdk.StackProps {
  readonly githubOrg: string;
}

export class HugoSiteStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: HugoSiteStackProps) {
    super(scope, id, props);

    const site = new staticSite.StaticSite(this, `${props.siteName}Site`, props);

    new builder.SiteBuilder(this, `${props.siteName}Builder`, {
      ...props,
      production: site,
      githubRepo: props.siteName,
    });
  }
}
