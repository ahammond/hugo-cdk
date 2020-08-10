import cdk = require('@aws-cdk/core');
import codebuild = require('@aws-cdk/aws-codebuild');
import iam = require('@aws-cdk/aws-iam');
import staticSite = require('./static-site');

const hugoDeb = 'https://github.com/gohugoio/hugo/releases/download/v0.74.2/hugo_0.74.2_Linux-64bit.deb';

export interface SiteBuilderProps extends cdk.StackProps {
  /**
   * The name of the repo (should match the name of the blog, but you do you.)
   */
  githubRepo: string;
  /**
   * The name of the github owner / organization
   */
  githubOrg: string;
  /**
   * Where should master builds be published?
   */
  production: staticSite.IStaticSite;
  /**
   * Where should PR builds be published?
   * @default - Do not publish PR builds, just build them.
   * @todo add support for publishing PR builds.
   */
  //staging?: staticSite.StaticSiteStack;
}

export class SiteBuilder extends cdk.Construct {
  public readonly project: codebuild.Project;

  constructor(scope: cdk.Construct, id: string, props: SiteBuilderProps) {
    super(scope, id);

    const buildSpec = {
      version: '0.2',
      environment: {
        vars: {
          HUGO_ENV: 'production',
        },
      },
      phases: {
        install: {
          'runtime-versions': {
            python: 3.8,
          },
          commands: [
            // Install hugo
            `curl -L -o hugo.deb "${hugoDeb}"`,
            'dpkg -i hugo.deb',
          ],
        },
        build: {
          commands: [
            // Render the site
            'hugo -v',
          ],
        },
        post_build: {
          commands: [
            // https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-env-vars.html
            'echo "CODEBUILD_WEBHOOK_TRIGGER: $CODEBUILD_WEBHOOK_TRIGGER"',
            `if [ 'branch/master' = "$CODEBUILD_WEBHOOK_TRIGGER" ]; then
              cd public;
              aws s3 sync --delete --no-progress --sse AES256 --storage-class INTELLIGENT_TIERING . "s3://${props.production.bucket.bucketName}";
              aws cloudfront create-invalidation --distribution-id "${props.production.distribution.distributionId}" --paths '/*';
            else
              echo "not master: do not publish";
            fi`,
          ],
        },
      },
    };

    this.project = new codebuild.Project(this, 'Project', {
      projectName: props.githubRepo,
      buildSpec: codebuild.BuildSpec.fromObject(buildSpec),
      source: codebuild.Source.gitHub({
        // Credentials from CLI, search ImportSourceCredentials at https://docs.aws.amazon.com/cdk/api/latest/docs/aws-codebuild-readme.html
        owner: props.githubOrg,
        repo: props.githubRepo,
        webhookFilters: [
          // Build all the PRs to master
          codebuild.FilterGroup.inEventOf(
            codebuild.EventAction.PULL_REQUEST_CREATED,
            codebuild.EventAction.PULL_REQUEST_UPDATED,
            codebuild.EventAction.PULL_REQUEST_REOPENED,
          ).andBaseBranchIs('master'),
          // And any change to master.
          codebuild.FilterGroup.inEventOf(codebuild.EventAction.PUSH).andBranchIs('master'),
        ],
      }),
    });
    new cdk.CfnOutput(this, 'TheProject', { value: this.project.projectArn });

    // Submodules, please.
    const cfnProject = this.project.node.defaultChild as codebuild.CfnProject;
    cfnProject.addPropertyOverride('Source.GitSubmodulesConfig.FetchSubmodules', 'True');

    const bucketResources: string[] = [props.production.bucket.bucketArn, `${props.production.bucket.bucketArn}/*`];
    // if (props.staging) {
    //   bucketResources.push(props.staging.bucket.bucketArn, `${props.staging.bucket.bucketArn}/*`);
    // }

    this.project.addToRolePolicy(
      new iam.PolicyStatement({
        resources: bucketResources,
        actions: ['s3:ListBucket', 's3:GetObject', 's3:PutObject', 's3:DeleteObject'],
      }),
    );

    const distributionResources: string[] = [
      `arn:aws:cloudfront::${props.env?.account}:distribution/${props.production.distribution.distributionId}`,
    ];
    // if (props.staging) {
    //   distributionResources.push(
    //     `arn:aws:cloudfront::${props.env?.account}:distribution/${props.staging.distribution.distributionId}`,
    //   );
    // }

    this.project.addToRolePolicy(
      new iam.PolicyStatement({
        resources: distributionResources,
        actions: ['cloudfront:CreateInvalidation'],
      }),
    );
  }
}

export class SiteBuilderStack extends cdk.Stack {
  public readonly project: codebuild.Project;

  constructor(scope: cdk.Construct, id: string, props: SiteBuilderProps) {
    super(scope, id, props);
    const p = new SiteBuilder(this, id, props);
    this.project = p.project;
  }
}
