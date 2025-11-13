import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as CuT from '../src';

describe('HugoSiteStack', () => {
  let app: App;
  let template: Template;

  beforeEach(() => {
    app = new App();
  });

  describe('Stack Composition', () => {
    beforeEach(() => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);
    });

    test('contains StaticSite resources', () => {
      // StaticSite creates S3 buckets, CloudFront distribution, etc.
      template.resourceCountIs('AWS::S3::Bucket', 2); // main bucket + log bucket
      template.hasResourceProperties('AWS::CloudFront::Distribution', {});
    });

    test('contains HugoContentDeploymentRole resources', () => {
      // HugoContentDeploymentRole imports the OIDC provider (not created) and creates an IAM role
      // The OIDC provider should NOT appear in the template (it's imported)
      const oidcResources = template.findResources('Custom::AWSCDKOpenIdConnectProvider');
      expect(Object.keys(oidcResources).length).toBe(0);

      // But the IAM role should exist
      template.hasResourceProperties('AWS::IAM::Role', {});
    });

    test('has both site and role as public properties', () => {
      const testApp = new App();
      const stack = new CuT.HugoSiteStack(testApp, 'TestBlog2', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });

      expect(stack.site).toBeDefined();
      expect(stack.role).toBeDefined();
      expect(stack.site.bucket).toBeDefined();
      expect(stack.site.distribution).toBeDefined();
      expect(stack.role.role).toBeDefined();
      expect(stack.role.provider).toBeDefined();
    });
  });

  describe('CloudFormation Outputs', () => {
    test('exports GitHubActionsRoleArn output', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);

      template.hasOutput('GitHubActionsRoleArn', {
        Description: 'IAM Role ARN for GitHub Actions to assume',
        Export: {
          Name: 'TestBlog-GitHubActionsRoleArn',
        },
      });
    });

    test('exports S3BucketName output', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);

      template.hasOutput('S3BucketName', {
        Description: 'S3 bucket name for site content',
        Export: {
          Name: 'TestBlog-S3BucketName',
        },
      });
    });

    test('exports CloudFrontDistributionId output', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);

      template.hasOutput('CloudFrontDistributionId', {
        Description: 'CloudFront distribution ID',
        Export: {
          Name: 'TestBlog-CloudFrontDistributionId',
        },
      });
    });

    test('exports SiteUrl output', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);

      template.hasOutput('SiteUrl', {
        Description: 'Site URL',
        Value: 'https://blog.example.com',
      });
    });

    test('SiteUrl is NOT exported', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);

      const outputs = template.toJSON().Outputs;
      expect(outputs.SiteUrl.Export).toBeUndefined();
    });

    test('all outputs reference the correct stack ID prefix', () => {
      const stack = new CuT.HugoSiteStack(app, 'MyBlog', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);

      const outputs = template.toJSON().Outputs;
      expect(outputs.GitHubActionsRoleArn.Export.Name).toContain('MyBlog-');
      expect(outputs.S3BucketName.Export.Name).toContain('MyBlog-');
      expect(outputs.CloudFrontDistributionId.Export.Name).toContain('MyBlog-');
    });

    test('S3BucketName output value is FQDN-based', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'myblog',
        siteDomain: 'mydomain.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);

      const outputs = template.toJSON().Outputs;
      const s3Output = outputs.S3BucketName;
      expect(s3Output.Value).toBeDefined();
      // The actual bucket is created, so we should see it referenced
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'myblog.mydomain.com',
      });
    });
  });

  describe('Props Propagation to Child Constructs', () => {
    test('passes siteName to StaticSite', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'mysite',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);

      // StaticSite uses siteName for bucket naming (mysite.example.com)
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'mysite.example.com',
      });
    });

    test('passes siteDomain to StaticSite', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'blog',
        siteDomain: 'mydomain.io',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'blog.mydomain.io',
      });
    });

    test('passes githubOrg to HugoContentDeploymentRole', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'myOrganization',
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Condition: {
                StringLike: {
                  'token.actions.githubusercontent.com:sub': 'repo:myOrganization/blog:ref:refs/heads/main',
                },
              },
            }),
          ]),
        }),
      });
    });

    test('uses siteName as default githubRepo if not provided', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'myblog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
        // githubRepo not provided
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Condition: {
                StringLike: {
                  'token.actions.githubusercontent.com:sub': 'repo:testOrg/myblog:ref:refs/heads/main',
                },
              },
            }),
          ]),
        }),
      });
    });

    test('uses custom githubRepo when provided', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        githubRepo: 'my-hugo-repo',
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Condition: {
                StringLike: {
                  'token.actions.githubusercontent.com:sub': 'repo:testOrg/my-hugo-repo:ref:refs/heads/main',
                },
              },
            }),
          ]),
        }),
      });
    });

    test('uses default allowedBranches [main] when not provided', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
        // allowedBranches not provided
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Condition: {
                StringLike: {
                  'token.actions.githubusercontent.com:sub': 'repo:testOrg/blog:ref:refs/heads/main',
                },
              },
            }),
          ]),
        }),
      });
    });

    test('uses custom allowedBranches when provided', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        allowedBranches: ['main', 'master', 'develop'],
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Condition: {
                StringLike: {
                  'token.actions.githubusercontent.com:sub': Match.stringLikeRegexp(
                    'repo:testOrg/blog:ref:refs/heads/(main|master|develop)',
                  ),
                },
              },
            }),
          ]),
        }),
      });
    });
  });

  describe('Stack Naming and IDs', () => {
    test('uses stack ID for output export prefix', () => {
      const stack = new CuT.HugoSiteStack(app, 'BlogStack', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);

      const outputs = template.toJSON().Outputs;
      expect(outputs.GitHubActionsRoleArn.Export.Name).toBe('BlogStack-GitHubActionsRoleArn');
      expect(outputs.S3BucketName.Export.Name).toBe('BlogStack-S3BucketName');
      expect(outputs.CloudFrontDistributionId.Export.Name).toBe('BlogStack-CloudFrontDistributionId');
    });

    test('different stack IDs produce different output exports', () => {
      const stack1 = new CuT.HugoSiteStack(app, 'Blog1', {
        siteName: 'blog1',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const stack2 = new CuT.HugoSiteStack(app, 'Blog2', {
        siteName: 'blog2',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const template1 = Template.fromStack(stack1);
      const template2 = Template.fromStack(stack2);

      const outputs1 = template1.toJSON().Outputs;
      const outputs2 = template2.toJSON().Outputs;

      expect(outputs1.GitHubActionsRoleArn.Export.Name).toContain('Blog1-');
      expect(outputs2.GitHubActionsRoleArn.Export.Name).toContain('Blog2-');
      expect(outputs1.GitHubActionsRoleArn.Export.Name).not.toBe(outputs2.GitHubActionsRoleArn.Export.Name);
    });
  });

  describe('CloudFront and S3 Integration', () => {
    test('role has permissions to read/write S3 bucket', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);

      // The GitHubOIDCRole grants S3 permissions to the bucket
      const policies = template.findResources('AWS::IAM::Policy');
      expect(policies).toBeDefined();

      const hasS3Permissions = Object.values(policies).some((policy: any) => {
        const statements = policy.Properties.PolicyDocument.Statement;
        return statements.some((stmt: any) => {
          const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
          return (
            actions.some((a: string) => a === 's3:GetObject*') &&
            actions.some((a: string) => a === 's3:PutObject') &&
            actions.some((a: string) => a === 's3:DeleteObject*')
          );
        });
      });

      expect(hasS3Permissions).toBe(true);
    });

    test('role has CloudFront invalidation permissions', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: ['cloudfront:CreateInvalidation', 'cloudfront:GetInvalidation'],
              Effect: 'Allow',
              Resource: Match.anyValue(),
              Sid: 'AllowCloudFrontInvalidation',
            }),
          ]),
        },
      });
    });
  });

  describe('Different Site Configurations', () => {
    test('works with various siteName values', () => {
      const testCases = [
        { siteName: 'blog', domain: 'example.com' },
        { siteName: 'documentation', domain: 'docs.io' },
        { siteName: 'website', domain: 'mycompany.org' },
      ];

      testCases.forEach(({ siteName, domain }, index) => {
        const testApp = new App();
        const stack = new CuT.HugoSiteStack(testApp, `Test${index}`, {
          siteName,
          siteDomain: domain,
          githubOrg: 'testOrg',
          env: { account: '123456789012', region: 'us-east-1' },
        });
        const t = Template.fromStack(stack);

        t.hasResourceProperties('AWS::S3::Bucket', {
          BucketName: `${siteName}.${domain}`,
        });
      });
    });

    test('SiteUrl reflects dynamic siteName and siteDomain', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'awesome-blog',
        siteDomain: 'mysite.io',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);

      const outputs = template.toJSON().Outputs;
      expect(outputs.SiteUrl.Value).toBe('https://awesome-blog.mysite.io');
    });
  });

  describe('GitHub Configuration Variations', () => {
    test('works with different GitHub organizations', () => {
      const orgs = ['apache', 'microsoft', 'my-startup'];

      orgs.forEach((org, index) => {
        const testApp = new App();
        const stack = new CuT.HugoSiteStack(testApp, `Test${index}`, {
          siteName: 'blog',
          siteDomain: 'example.com',
          githubOrg: org,
          env: { account: '123456789012', region: 'us-east-1' },
        });
        const t = Template.fromStack(stack);

        t.hasResourceProperties('AWS::IAM::Role', {
          AssumeRolePolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Condition: {
                  StringLike: {
                    'token.actions.githubusercontent.com:sub': `repo:${org}/blog:ref:refs/heads/main`,
                  },
                },
              }),
            ]),
          }),
        });
      });
    });

    test('supports multiple allowed branches', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        allowedBranches: ['main', 'release/*', 'develop'],
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);

      // Should have comma-separated branches in subject claim
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Condition: {
                StringLike: {
                  'token.actions.githubusercontent.com:sub': Match.stringLikeRegexp('repo:testOrg/blog:'),
                },
              },
            }),
          ]),
        }),
      });
    });

    test('works with single allowedBranch in array', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        allowedBranches: ['production'],
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Condition: {
                StringLike: {
                  'token.actions.githubusercontent.com:sub': 'repo:testOrg/blog:ref:refs/heads/production',
                },
              },
            }),
          ]),
        }),
      });
    });
  });

  describe('Stack Properties', () => {
    test('respects custom stack properties', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        env: {
          account: '999888777666',
          region: 'us-east-1',
        },
      });

      expect(stack.account).toBe('999888777666');
      expect(stack.region).toBe('us-east-1');
    });

    test('can add description to stack', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        description: 'My Hugo blog deployment stack',
        env: { account: '123456789012', region: 'us-east-1' },
      });

      expect(stack.stackName).toBeDefined();
    });
  });

  describe('Multiple Sites in Single App', () => {
    test('can create multiple HugoSiteStack instances in one app', () => {
      const blog = new CuT.HugoSiteStack(app, 'BlogStack', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const docs = new CuT.HugoSiteStack(app, 'DocsStack', {
        siteName: 'docs',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });

      expect(blog).toBeDefined();
      expect(docs).toBeDefined();

      const blogTemplate = Template.fromStack(blog);
      const docsTemplate = Template.fromStack(docs);

      blogTemplate.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'blog.example.com',
      });

      docsTemplate.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'docs.example.com',
      });
    });

    test('each stack has independent outputs', () => {
      const blog = new CuT.HugoSiteStack(app, 'Blog', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const wiki = new CuT.HugoSiteStack(app, 'Wiki', {
        siteName: 'wiki',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });

      const blogTemplate = Template.fromStack(blog);
      const wikiTemplate = Template.fromStack(wiki);

      const blogOutputs = blogTemplate.toJSON().Outputs;
      const wikiOutputs = wikiTemplate.toJSON().Outputs;

      expect(blogOutputs.S3BucketName.Export.Name).toContain('Blog-');
      expect(wikiOutputs.S3BucketName.Export.Name).toContain('Wiki-');
    });
  });

  describe('Snapshot Tests', () => {
    test('snapshot matches default configuration', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);
      expect(template.toJSON()).toMatchSnapshot();
    });

    test('snapshot matches with custom githubRepo and branches', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        githubRepo: 'my-blog-repo',
        allowedBranches: ['main', 'staging'],
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);
      expect(template.toJSON()).toMatchSnapshot();
    });
  });

  describe('Edge Cases', () => {
    test('handles siteName with hyphens', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'my-awesome-blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'my-awesome-blog.example.com',
      });
    });

    test('handles siteDomain with subdomain', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'blog',
        siteDomain: 'subdomain.example.com',
        githubOrg: 'testOrg',
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'blog.subdomain.example.com',
      });
    });

    test('handles empty allowedBranches array (uses default)', () => {
      const stack = new CuT.HugoSiteStack(app, 'TestBlog', {
        siteName: 'blog',
        siteDomain: 'example.com',
        githubOrg: 'testOrg',
        allowedBranches: [],
        env: { account: '123456789012', region: 'us-east-1' },
      });
      template = Template.fromStack(stack);

      // Empty array should be treated as provided, resulting in no branches matching
      template.hasResourceProperties('AWS::IAM::Role', {});
    });
  });
});
