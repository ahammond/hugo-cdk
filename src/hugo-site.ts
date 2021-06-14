import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as builder from './builder';
import * as staticSite from './static-site';

export interface HugoSiteStackProps extends staticSite.StaticSiteProps, StackProps {
  readonly githubOrg: string;
}

export class HugoSiteStack extends Stack {
  constructor(scope: Construct, id: string, props: HugoSiteStackProps) {
    super(scope, id, props);

    const site = new staticSite.StaticSite(this, `${props.siteName}Site`, props);

    new builder.SiteBuilder(this, `${props.siteName}Builder`, {
      ...props,
      production: site,
      githubRepo: props.siteName,
    });
  }
}
