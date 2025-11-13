import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Distribution } from 'aws-cdk-lib/aws-cloudfront';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import * as CuT from '../src';

describe('HugoContentDeploymentRole', () => {
  let app: App;
  let stack: Stack;
  let template: Template;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    new CuT.HugoContentDeploymentRole(stack, 'TestRole', {
      githubOrg: 'testOrg',
      githubRepo: 'testRepo',
      staticSite: {
        bucket: Bucket.fromBucketAttributes(stack, 'Bucket', {
          bucketName: 'test-bucket',
          bucketArn: 'arn:aws:s3:::test-bucket',
        }),
        distribution: Distribution.fromDistributionAttributes(stack, 'Distribution', {
          distributionId: 'testDistributionId',
          domainName: 'testDomainName',
        }),
      },
      allowedBranches: ['main'],
    });

    template = Template.fromStack(stack);
  });

  test('imports existing OIDC provider (not created)', () => {
    // The OIDC provider is imported, not created, so it should NOT appear in the template
    const resources = template.findResources('Custom::AWSCDKOpenIdConnectProvider');
    expect(Object.keys(resources).length).toBe(0);
  });

  test('creates IAM role with correct trust policy', () => {
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
                'token.actions.githubusercontent.com:sub': 'repo:testOrg/testRepo:ref:refs/heads/main',
              },
            },
          }),
        ]),
      },
    });
  });

  test('grants S3 read/write permissions', () => {
    const policies = template.findResources('AWS::IAM::Policy');
    const policyStatements = Object.values(policies)[0].Properties.PolicyDocument.Statement;
    const s3Statement = policyStatements.find(
      (stmt: any) =>
        stmt.Resource && Array.isArray(stmt.Resource) && stmt.Resource.some((r: string) => r.includes('test-bucket')),
    );

    expect(s3Statement).toBeDefined();
    expect(s3Statement.Effect).toBe('Allow');
    expect(s3Statement.Action).toEqual(expect.arrayContaining(['s3:GetObject*', 's3:PutObject', 's3:DeleteObject*']));
    expect(s3Statement.Resource).toEqual(['arn:aws:s3:::test-bucket', 'arn:aws:s3:::test-bucket/*']);
  });

  test('grants CloudFront invalidation permissions', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: ['cloudfront:CreateInvalidation', 'cloudfront:GetInvalidation'],
            Effect: 'Allow',
            Resource: 'arn:aws:cloudfront::123456789012:distribution/testDistributionId',
          }),
        ]),
      },
    });
  });

  test('snapshot matches', () => {
    expect(template.toJSON()).toMatchSnapshot();
  });
});
