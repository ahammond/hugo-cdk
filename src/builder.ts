import { aws_codebuild, aws_iam, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as staticSite from './static-site';

const hugoDeb = 'https://github.com/gohugoio/hugo/releases/download/v0.74.2/hugo_0.74.2_Linux-64bit.deb';

export interface SiteBuilderProps extends StackProps {
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

export class SiteBuilder extends Construct {
  public readonly project: aws_codebuild.Project;

  constructor(scope: Construct, id: string, props: SiteBuilderProps) {
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
          'commands': [ // Install hugo
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

    this.project = new aws_codebuild.Project(this, 'Project', {
      projectName: props.githubRepo,
      buildSpec: aws_codebuild.BuildSpec.fromObject(buildSpec),
      source: aws_codebuild.Source.gitHub({
        // Credentials from CLI, search ImportSourceCredentials at https://docs.aws.amazon.com/cdk/api/latest/docs/aws-codebuild-readme.html
        owner: props.githubOrg,
        repo: props.githubRepo,
        webhookFilters: [
          // Build all the PRs to master
          aws_codebuild.FilterGroup.inEventOf(
            aws_codebuild.EventAction.PULL_REQUEST_CREATED,
            aws_codebuild.EventAction.PULL_REQUEST_UPDATED,
            aws_codebuild.EventAction.PULL_REQUEST_REOPENED,
          ).andBaseBranchIs('master'),
          // And any change to master.
          aws_codebuild.FilterGroup.inEventOf(aws_codebuild.EventAction.PUSH).andBranchIs('master'),
        ],
      }),
    });

    // Submodules, please.
    const cfnProject = this.project.node.defaultChild as aws_codebuild.CfnProject;
    cfnProject.addPropertyOverride('Source.GitSubmodulesConfig.FetchSubmodules', 'True');

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    props.production.bucket.grantReadWrite(this.project.role!);

    this.project.addToRolePolicy(
      new aws_iam.PolicyStatement({
        resources: [
          `arn:aws:cloudfront::${props.env?.account}:distribution/${props.production.distribution.distributionId}`,
        ],
        actions: ['cloudfront:CreateInvalidation'],
      }),
    );
  }
}

export class SiteBuilderStack extends Stack {
  public readonly project: aws_codebuild.Project;

  constructor(scope: Construct, id: string, props: SiteBuilderProps) {
    super(scope, id, props);
    const p = new SiteBuilder(this, id, props);
    this.project = p.project;
  }
}
