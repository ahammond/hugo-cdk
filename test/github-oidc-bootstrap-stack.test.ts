import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as CuT from '../src';

describe('GitHubOIDCBootstrapStack', () => {
  let app: App;
  let template: Template;

  beforeEach(() => {
    app = new App();
  });

  describe('OIDC Provider', () => {
    beforeEach(() => {
      const stack = new CuT.GitHubOIDCBootstrapStack(app, 'TestStack', {
        githubOrg: 'testOrg',
        githubRepo: 'testRepo',
      });
      template = Template.fromStack(stack);
    });

    test('creates OpenID Connect provider', () => {
      template.hasResourceProperties('Custom::AWSCDKOpenIdConnectProvider', {
        Url: 'https://token.actions.githubusercontent.com',
        ClientIDList: ['sts.amazonaws.com'],
      });
    });

    test('sets correct GitHub Actions OIDC thumbprint', () => {
      template.hasResourceProperties('Custom::AWSCDKOpenIdConnectProvider', {
        ThumbprintList: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
      });
    });
  });

  describe('IAM Role - Trust Policy', () => {
    test('creates IAM role with correct trust policy', () => {
      const stack = new CuT.GitHubOIDCBootstrapStack(app, 'TestStack', {
        githubOrg: 'myOrg',
        githubRepo: 'myRepo',
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Principal: {
                Federated: Match.anyValue(),
              },
              Condition: {
                StringEquals: {
                  'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
                },
                StringLike: {
                  'token.actions.githubusercontent.com:sub': 'repo:myOrg/myRepo:*',
                },
              },
            }),
          ]),
        },
      });
    });

    test('restricts to specific branches when provided', () => {
      const stack = new CuT.GitHubOIDCBootstrapStack(app, 'TestStack', {
        githubOrg: 'myOrg',
        githubRepo: 'myRepo',
        allowedBranches: 'ref:refs/heads/main',
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Condition: {
                StringLike: {
                  'token.actions.githubusercontent.com:sub': 'repo:myOrg/myRepo:ref:refs/heads/main',
                },
              },
            }),
          ]),
        },
      });
    });

    test('uses wildcard for all branches when not specified', () => {
      const stack = new CuT.GitHubOIDCBootstrapStack(app, 'TestStack', {
        githubOrg: 'myOrg',
        githubRepo: 'myRepo',
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Condition: {
                StringLike: {
                  'token.actions.githubusercontent.com:sub': 'repo:myOrg/myRepo:*',
                },
              },
            }),
          ]),
        },
      });
    });

    test('role name is GithubDeploymentRole', () => {
      const stack = new CuT.GitHubOIDCBootstrapStack(app, 'TestStack', {
        githubOrg: 'testOrg',
        githubRepo: 'testRepo',
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'GithubDeploymentRole',
      });
    });

    test('role description includes org and repo', () => {
      const stack = new CuT.GitHubOIDCBootstrapStack(app, 'TestStack', {
        githubOrg: 'acme',
        githubRepo: 'deploy-me',
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: Match.anyValue(),
        RoleName: 'GithubDeploymentRole',
        Description: 'GitHub Actions deployment role for acme/deploy-me',
      });
    });
  });

  describe('IAM Permissions', () => {
    beforeEach(() => {
      const stack = new CuT.GitHubOIDCBootstrapStack(app, 'TestStack', {
        env: { account: '123456789012', region: 'us-east-1' },
        githubOrg: 'testOrg',
        githubRepo: 'testRepo',
      });
      template = Template.fromStack(stack);
    });

    test('grants STS assume role permission for cdk-* roles', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: 'sts:AssumeRole',
              Resource: 'arn:aws:iam::123456789012:role/cdk-*',
            }),
          ]),
        },
      });
    });

    test('grants S3 and ECR permissions', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: Match.arrayWith([
                's3:*',
                'ecr:GetAuthorizationToken',
                'ecr:BatchCheckLayerAvailability',
                'ecr:GetDownloadUrlForLayer',
                'ecr:BatchGetImage',
                'ecr:PutImage',
                'ecr:InitiateLayerUpload',
                'ecr:UploadLayerPart',
                'ecr:CompleteLayerUpload',
              ]),
              Resource: '*',
            }),
          ]),
        },
      });
    });

    test('contains both S3 wildcard and ECR permissions in one statement', () => {
      const policies = template.findResources('AWS::IAM::Policy');
      const policyDocuments = Object.values(policies).map((p: any) => p.Properties.PolicyDocument);

      const hasEcrPermissions = policyDocuments.some((doc: any) =>
        doc.Statement.some((stmt: any) => {
          const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
          return stmt.Effect === 'Allow' && actions.includes('s3:*') && actions.includes('ecr:GetAuthorizationToken');
        }),
      );

      expect(hasEcrPermissions).toBe(true);
    });
  });

  describe('Session Duration', () => {
    test('sets max session duration to 1 hour', () => {
      const stack = new CuT.GitHubOIDCBootstrapStack(app, 'TestStack', {
        githubOrg: 'testOrg',
        githubRepo: 'testRepo',
      });
      template = Template.fromStack(stack);

      // MaxSessionDuration is in seconds (1 hour = 3600 seconds)
      template.hasResourceProperties('AWS::IAM::Role', {
        MaxSessionDuration: 3600,
      });
    });
  });

  describe('CloudFormation Outputs', () => {
    test('exports DeploymentRoleArn output', () => {
      const stack = new CuT.GitHubOIDCBootstrapStack(app, 'TestStack', {
        githubOrg: 'testOrg',
        githubRepo: 'testRepo',
      });
      template = Template.fromStack(stack);

      template.hasOutput('DeploymentRoleArn', {
        Description: 'ARN of the GitHub Actions deployment role',
        Export: {
          Name: 'GitHubDeploymentRoleArn',
        },
      });
    });

    test('exports OIDCProviderArn output', () => {
      const stack = new CuT.GitHubOIDCBootstrapStack(app, 'TestStack', {
        githubOrg: 'testOrg',
        githubRepo: 'testRepo',
      });
      template = Template.fromStack(stack);

      template.hasOutput('OIDCProviderArn', {
        Description: 'ARN of the GitHub OIDC provider',
        Export: {
          Name: 'GitHubOIDCProviderArn',
        },
      });
    });

    test('DeploymentRoleArn output references the role', () => {
      const stack = new CuT.GitHubOIDCBootstrapStack(app, 'TestStack', {
        githubOrg: 'testOrg',
        githubRepo: 'testRepo',
      });
      template = Template.fromStack(stack);

      const outputs = template.toJSON().Outputs;
      expect(outputs).toBeDefined();
      expect(outputs.DeploymentRoleArn).toBeDefined();
      expect(outputs.DeploymentRoleArn.Value['Fn::GetAtt']).toBeDefined();
    });

    test('OIDCProviderArn output references the provider', () => {
      const stack = new CuT.GitHubOIDCBootstrapStack(app, 'TestStack', {
        githubOrg: 'testOrg',
        githubRepo: 'testRepo',
      });
      template = Template.fromStack(stack);

      const outputs = template.toJSON().Outputs;
      expect(outputs).toBeDefined();
      expect(outputs.OIDCProviderArn).toBeDefined();
      expect(outputs.OIDCProviderArn.Value).toBeDefined();
    });
  });

  describe('Different Branch Configurations', () => {
    test('supports multiple branches pattern', () => {
      const stack = new CuT.GitHubOIDCBootstrapStack(app, 'TestStack', {
        githubOrg: 'myOrg',
        githubRepo: 'myRepo',
        allowedBranches: 'ref:refs/heads/main,ref:refs/heads/develop',
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Condition: {
                StringLike: {
                  'token.actions.githubusercontent.com:sub':
                    'repo:myOrg/myRepo:ref:refs/heads/main,ref:refs/heads/develop',
                },
              },
            }),
          ]),
        },
      });
    });

    test('supports tag pattern', () => {
      const stack = new CuT.GitHubOIDCBootstrapStack(app, 'TestStack', {
        githubOrg: 'myOrg',
        githubRepo: 'myRepo',
        allowedBranches: 'ref:refs/tags/*',
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Condition: {
                StringLike: {
                  'token.actions.githubusercontent.com:sub': 'repo:myOrg/myRepo:ref:refs/tags/*',
                },
              },
            }),
          ]),
        },
      });
    });

    test('supports environment pattern', () => {
      const stack = new CuT.GitHubOIDCBootstrapStack(app, 'TestStack', {
        githubOrg: 'myOrg',
        githubRepo: 'myRepo',
        allowedBranches: 'environment:production',
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Condition: {
                StringLike: {
                  'token.actions.githubusercontent.com:sub': 'repo:myOrg/myRepo:environment:production',
                },
              },
            }),
          ]),
        },
      });
    });
  });

  describe('Stack Properties', () => {
    test('respects custom stack properties', () => {
      const stack = new CuT.GitHubOIDCBootstrapStack(app, 'MyBootstrap', {
        githubOrg: 'testOrg',
        githubRepo: 'testRepo',
        env: {
          account: '999888777666',
          region: 'us-west-2',
        },
      });

      expect(stack.account).toBe('999888777666');
      expect(stack.region).toBe('us-west-2');
    });

    test('deploymentRole is accessible as public property', () => {
      const stack = new CuT.GitHubOIDCBootstrapStack(app, 'TestStack', {
        githubOrg: 'testOrg',
        githubRepo: 'testRepo',
      });

      expect(stack.deploymentRole).toBeDefined();
      expect(stack.deploymentRole.roleArn).toBeDefined();
    });
  });

  describe('Multiple Stacks', () => {
    test('can create multiple bootstrap stacks for different repos', () => {
      const stack1 = new CuT.GitHubOIDCBootstrapStack(app, 'Bootstrap1', {
        githubOrg: 'org1',
        githubRepo: 'repo1',
      });

      const stack2 = new CuT.GitHubOIDCBootstrapStack(app, 'Bootstrap2', {
        githubOrg: 'org2',
        githubRepo: 'repo2',
      });

      const template1 = Template.fromStack(stack1);
      const template2 = Template.fromStack(stack2);

      template1.hasResourceProperties('AWS::IAM::Role', {
        Description: 'GitHub Actions deployment role for org1/repo1',
      });

      template2.hasResourceProperties('AWS::IAM::Role', {
        Description: 'GitHub Actions deployment role for org2/repo2',
      });
    });
  });

  describe('Snapshot Tests', () => {
    test('snapshot matches default configuration', () => {
      const stack = new CuT.GitHubOIDCBootstrapStack(app, 'TestStack', {
        githubOrg: 'testOrg',
        githubRepo: 'testRepo',
      });
      template = Template.fromStack(stack);
      expect(template.toJSON()).toMatchSnapshot();
    });

    test('snapshot matches with branch restrictions', () => {
      const stack = new CuT.GitHubOIDCBootstrapStack(app, 'TestStack', {
        githubOrg: 'testOrg',
        githubRepo: 'testRepo',
        allowedBranches: 'ref:refs/heads/main',
      });
      template = Template.fromStack(stack);
      expect(template.toJSON()).toMatchSnapshot();
    });
  });
});
