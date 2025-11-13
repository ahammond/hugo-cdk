import { Stack } from 'aws-cdk-lib';
import {
  IOpenIdConnectProvider,
  OpenIdConnectProvider,
  PolicyStatement,
  Role,
  WebIdentityPrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as staticSite from './static-site';

export interface HugoContentDeploymentRoleProps {
  /**
   * The GitHub organization or user that owns the repository
   */
  readonly githubOrg: string;
  /**
   * The name of the GitHub repository
   */
  readonly githubRepo: string;
  /**
   * The static site that this role will deploy to
   */
  readonly staticSite: staticSite.IStaticSite;
  /**
   * Optional: Restrict to specific branches (e.g., ['main', 'master'])
   * @default - Allow all branches
   */
  readonly allowedBranches?: string[];
  /**
   * Optional: ARN of existing GitHub OIDC provider to use
   * If not provided, imports the provider from the GitHubOIDCBootstrap stack export
   * @default - Imports from GitHubOIDCProviderArn CloudFormation export
   */
  readonly oidcProviderArn?: string;
}

/**
 * Creates an IAM role that GitHub Actions can assume via OIDC
 * to deploy Hugo site content to S3 and invalidate CloudFront.
 *
 * This is for CONTENT deployment from Hugo repos (e.g., ahammond/blog, ahammond/food).
 * For INFRASTRUCTURE deployment (CDK stacks), see GitHubOIDCBootstrapStack.
 *
 * The GitHub Actions workflow must use the aws-actions/configure-aws-credentials action
 * with the role ARN and proper permissions.
 */
export class HugoContentDeploymentRole extends Construct {
  public readonly role: Role;
  public readonly provider: IOpenIdConnectProvider;

  constructor(scope: Construct, id: string, props: HugoContentDeploymentRoleProps) {
    super(scope, id);

    // Import the existing GitHub OIDC provider from the bootstrap stack
    // The GitHubOIDCBootstrap stack exports this as 'GitHubOIDCProviderArn'
    const providerArn =
      props.oidcProviderArn ||
      `arn:aws:iam::${Stack.of(this).account}:oidc-provider/token.actions.githubusercontent.com`;

    this.provider = OpenIdConnectProvider.fromOpenIdConnectProviderArn(this, 'GitHubOIDCProvider', providerArn);

    // Build the subject claim based on allowed branches
    let subjectClaim: string;
    if (props.allowedBranches && props.allowedBranches.length > 0) {
      // Restrict to specific branches
      const branchPatterns = props.allowedBranches
        .map((branch) => `repo:${props.githubOrg}/${props.githubRepo}:ref:refs/heads/${branch}`)
        .join(',');
      subjectClaim = branchPatterns;
    } else {
      // Allow all branches and tags
      subjectClaim = `repo:${props.githubOrg}/${props.githubRepo}:*`;
    }

    // Create the IAM role that GitHub Actions will assume
    this.role = new Role(this, 'GitHubActionsDeployRole', {
      roleName: `github-actions-${props.githubRepo}-deploy`,
      description: `Allows GitHub Actions in ${props.githubOrg}/${props.githubRepo} to deploy Hugo sites`,
      assumedBy: new WebIdentityPrincipal(this.provider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
        StringLike: {
          'token.actions.githubusercontent.com:sub': subjectClaim,
        },
      }),
      maxSessionDuration: Stack.of(this).node.tryGetContext('github-actions-max-session-duration') || undefined,
    });

    // Grant S3 permissions for deployment
    props.staticSite.bucket.grantReadWrite(this.role);

    // Grant CloudFront invalidation permissions
    this.role.addToPolicy(
      new PolicyStatement({
        sid: 'AllowCloudFrontInvalidation',
        actions: ['cloudfront:CreateInvalidation', 'cloudfront:GetInvalidation'],
        resources: [
          `arn:aws:cloudfront::${Stack.of(this).account}:distribution/${props.staticSite.distribution.distributionId}`,
        ],
      }),
    );
  }
}
