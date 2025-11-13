import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as githubOidc from './github-oidc-role';
import * as staticSite from './static-site';

export interface HugoSiteStackProps extends staticSite.StaticSiteProps, StackProps {
  readonly githubOrg: string;
  /**
   * Optional: GitHub repository name
   * @default - Uses siteName
   */
  readonly githubRepo?: string;
  /**
   * Optional: Restrict deployments to specific branches
   * @default - ['main']
   */
  readonly allowedBranches?: string[];
}

export class HugoSiteStack extends Stack {
  public readonly role: githubOidc.GitHubOIDCRole;
  public readonly site: staticSite.StaticSite;

  constructor(scope: Construct, id: string, props: HugoSiteStackProps) {
    super(scope, id, props);

    this.site = new staticSite.StaticSite(this, `${props.siteName}Site`, props);

    this.role = new githubOidc.GitHubOIDCRole(this, `${props.siteName}GitHubRole`, {
      githubOrg: props.githubOrg,
      githubRepo: props.githubRepo || props.siteName,
      staticSite: this.site,
      allowedBranches: props.allowedBranches || ['main'],
    });

    // Output values needed for GitHub Actions workflow
    new CfnOutput(this, 'GitHubActionsRoleArn', {
      value: this.role.role.roleArn,
      description: 'IAM Role ARN for GitHub Actions to assume',
      exportName: `${id}-GitHubActionsRoleArn`,
    });

    new CfnOutput(this, 'S3BucketName', {
      value: this.site.bucket.bucketName,
      description: 'S3 bucket name for site content',
      exportName: `${id}-S3BucketName`,
    });

    new CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.site.distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `${id}-CloudFrontDistributionId`,
    });

    new CfnOutput(this, 'SiteUrl', {
      value: `https://${props.siteName}.${props.siteDomain}`,
      description: 'Site URL',
    });
  }
}
