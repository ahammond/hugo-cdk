import { Stack, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import {
  OpenIdConnectProvider,
  Role,
  WebIdentityPrincipal,
  ManagedPolicy,
  PolicyStatement,
  Effect,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface GitHubOIDCBootstrapStackProps extends StackProps {
  /**
   * GitHub organization (e.g., 'ahammond')
   */
  readonly githubOrg: string;

  /**
   * GitHub repository name (e.g., 'hugo-cdk')
   */
  readonly githubRepo: string;

  /**
   * Optional: Restrict to specific branches
   * Use '*' to allow all branches
   * Use 'ref:refs/heads/main' to allow only main branch
   * @default '*' (all branches)
   */
  readonly allowedBranches?: string;
}

/**
 * Bootstrap stack that creates GitHub OIDC provider and deployment role.
 *
 * This stack must be deployed manually first (using your local AWS credentials):
 *   cdk deploy GitHubOIDCBootstrap
 *
 * After that, GitHub Actions can use the created role to deploy other stacks.
 */
export class GitHubOIDCBootstrapStack extends Stack {
  public readonly deploymentRole: Role;

  constructor(scope: Construct, id: string, props: GitHubOIDCBootstrapStackProps) {
    super(scope, id, props);

    const allowedBranches = props.allowedBranches ?? '*';

    // Create GitHub OIDC Provider
    // This allows GitHub Actions to authenticate to AWS without storing credentials
    const githubOidcProvider = new OpenIdConnectProvider(this, 'GitHubOIDCProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
      // Current GitHub Actions OIDC thumbprint as of 2023
      // Verify latest at: https://github.blog/changelog/2023-06-27-github-actions-update-on-oidc-integration-with-aws/
      thumbprints: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
    });

    // Create IAM role that GitHub Actions can assume
    this.deploymentRole = new Role(this, 'GitHubDeploymentRole', {
      assumedBy: new WebIdentityPrincipal(githubOidcProvider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
        StringLike: {
          'token.actions.githubusercontent.com:sub': `repo:${props.githubOrg}/${props.githubRepo}:${allowedBranches}`,
        },
      }),
      roleName: 'GithubDeploymentRole',
      description: `GitHub Actions deployment role for ${props.githubOrg}/${props.githubRepo}`,
      maxSessionDuration: Duration.hours(1),
    });

    // Grant permissions to assume CDK bootstrap roles
    this.deploymentRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [`arn:aws:iam::${this.account}:role/cdk-*`],
      }),
    );

    // Grant S3 and ECR permissions for asset publishing
    // CDK needs to upload assets (Lambda code, Docker images, files) to S3 and ECR
    this.deploymentRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          's3:*',
          'ecr:GetAuthorizationToken',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage',
          'ecr:PutImage',
          'ecr:InitiateLayerUpload',
          'ecr:UploadLayerPart',
          'ecr:CompleteLayerUpload',
        ],
        resources: ['*'],
      }),
    );

    // Output the role ARN for use in GitHub Actions
    new CfnOutput(this, 'DeploymentRoleArn', {
      value: this.deploymentRole.roleArn,
      description: 'ARN of the GitHub Actions deployment role',
      exportName: 'GitHubDeploymentRoleArn',
    });

    // Output the OIDC Provider ARN
    new CfnOutput(this, 'OIDCProviderArn', {
      value: githubOidcProvider.openIdConnectProviderArn,
      description: 'ARN of the GitHub OIDC provider',
      exportName: 'GitHubOIDCProviderArn',
    });
  }
}
