import { awscdk, javascript, RenovatebotScheduleInterval } from 'projen';
import { GithubCDKPipeline } from 'projen-pipelines';

const pnpmVersion = '10.18.3';

const project = new awscdk.AwsCdkTypeScriptApp({
  name: '@ahammond/hugo-cdk',
  authorName: 'Andrew Hammond',
  authorEmail: 'andrew.george.hammond@gmail.com',

  cdkVersion: '2.223.0',
  defaultReleaseBranch: 'main',
  npmRegistryUrl: 'https://npm.pkg.github.com',
  repository: 'https://github.com/ahammond/hugo-cdk.git',
  minNodeVersion: '22.19.0',
  workflowNodeVersion: '22.19.0',

  // Dependency management via Renovate
  depsUpgrade: false,
  renovatebot: true,
  renovatebotOptions: {
    // Weekly schedule - Monday mornings before 3am
    scheduleInterval: [RenovatebotScheduleInterval.EARLY_MONDAYS],

    // Ignore projen itself (managed separately via projen upgrade workflow)
    ignoreProjen: true,

    // Note: pnpm and Node.js versions are managed via regexManagers below
    // They update both .tool-versions (local dev) and .projenrc.ts (CI/CD) together
    ignore: [],

    // Label all Renovate PRs
    labels: ['renovate', 'dependencies'],

    // Override default config with battle-tested settings from ClickUp
    overrideConfig: {
      // Use recommended presets
      extends: [
        'config:recommended',
        'group:recommended',
        'group:monorepos',
        'mergeConfidence:all-badges', // Show merge confidence scores
      ],

      // Enable automatic updates of cdkVersion in .projenrc.ts
      // This allows zero-touch CDK updates with determineLatestNodeRuntime()
      regexManagers: [
        {
          fileMatch: ['^.projenrc.ts$'],
          matchStrings: ["cdkVersion: '(?<currentValue>.*?)'"],
          depNameTemplate: 'aws-cdk-lib',
          datasourceTemplate: 'npm',
        },
        // Auto-update Node.js version in .tool-versions (for mise/local dev)
        {
          fileMatch: ['^.tool-versions$'],
          matchStrings: ['^nodejs\\s+(?<currentValue>\\S+)'],
          depNameTemplate: 'node',
          datasourceTemplate: 'node-version',
        },
        // Auto-update Node.js version in .projenrc.ts (for CI/CD workflows)
        {
          fileMatch: ['^.projenrc.ts$'],
          matchStrings: ["minNodeVersion: '(?<currentValue>.*?)'", "workflowNodeVersion: '(?<currentValue>.*?)'"],
          depNameTemplate: 'node',
          datasourceTemplate: 'node-version',
        },
        // Auto-update pnpm version in .tool-versions (for mise/local dev)
        {
          fileMatch: ['^.tool-versions$'],
          matchStrings: ['^pnpm\\s+(?<currentValue>\\S+)'],
          depNameTemplate: 'pnpm',
          datasourceTemplate: 'npm',
        },
        // Auto-update pnpm version in .projenrc.ts (for CI/CD workflows)
        {
          fileMatch: ['^.projenrc.ts$'],
          matchStrings: ["const pnpmVersion = '(?<currentValue>.*?)';"],
          depNameTemplate: 'pnpm',
          datasourceTemplate: 'npm',
        },
      ],

      // After updating .projenrc.ts, regenerate projen-managed files
      postUpgradeTasks: {
        commands: ['pnpm projen'],
        fileFilters: ['**/*'],
        executionMode: 'branch',
      },

      // Package-specific rules
      packageRules: [
        {
          // Group all non-major updates together
          groupName: 'all non-major dependencies',
          groupSlug: 'all-minor-patch',
          matchPackageNames: ['*'],
          matchUpdateTypes: ['minor', 'patch'],
          // Auto-merge safe updates (requires GitHub auto-merge enabled)
          automerge: true,
        },
        {
          // Label optional dependencies
          matchDepTypes: ['optionalDependencies'],
          addLabels: ['optional'],
        },
        {
          // Jest ecosystem must update together (breaking changes between majors)
          groupName: 'Jest ecosystem',
          matchPackageNames: ['jest', 'ts-jest', '@types/jest'],
          matchUpdateTypes: ['major'],
        },
      ],

      // Update all dependencies, not just majors
      rangeStrategy: 'bump',

      // Rate limiting to avoid CI stampede and excessive rebasing
      // With weekly schedule: creates max 2 PRs per run, 1 per hour
      // As PRs merge, new ones can be created next week
      prHourlyLimit: 1,
      prConcurrentLimit: 2,

      // Use GitHub's native auto-merge feature
      automergeType: 'pr',
      platformAutomerge: true,

      // Security: wait 7 days after release before updating
      minimumReleaseAge: '7 days',
    },
  },

  context: {
    // Recommended feature flags from:
    // https://github.com/aws/aws-cdk/blob/main/packages/aws-cdk-lib/recommended-feature-flags.json
    '@aws-cdk/aws-signer:signingProfileNamePassedToCfn': true,
    '@aws-cdk/aws-ecs-patterns:secGroupsDisablesImplicitOpenListener': true,
    '@aws-cdk/aws-lambda:recognizeLayerVersion': true,
    '@aws-cdk/core:checkSecretUsage': true,
    '@aws-cdk/core:target-partitions': ['aws', 'aws-cn'],
    '@aws-cdk-containers/ecs-service-extensions:enableDefaultLogDriver': true,
    '@aws-cdk/aws-ec2:uniqueImdsv2TemplateName': true,
    '@aws-cdk/aws-ecs:arnFormatIncludesClusterName': true,
    '@aws-cdk/aws-iam:minimizePolicies': true,
    '@aws-cdk/core:validateSnapshotRemovalPolicy': true,
    '@aws-cdk/aws-codepipeline:crossAccountKeyAliasStackSafeResourceName': true,
    '@aws-cdk/aws-s3:createDefaultLoggingPolicy': true,
    '@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption': true,
    '@aws-cdk/aws-apigateway:disableCloudWatchRole': true,
    '@aws-cdk/core:enablePartitionLiterals': true,
    '@aws-cdk/aws-events:eventsTargetQueueSameAccount': true,
    '@aws-cdk/aws-ecs:disableExplicitDeploymentControllerForCircuitBreaker': true,
    '@aws-cdk/aws-iam:importedRoleStackSafeDefaultPolicyName': true,
    '@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy': true,
    '@aws-cdk/aws-route53-patters:useCertificate': true,
    '@aws-cdk/customresources:installLatestAwsSdkDefault': false,
    '@aws-cdk/aws-rds:databaseProxyUniqueResourceName': true,
    '@aws-cdk/aws-codedeploy:removeAlarmsFromDeploymentGroup': true,
    '@aws-cdk/aws-apigateway:authorizerChangeDeploymentLogicalId': true,
    '@aws-cdk/aws-ec2:launchTemplateDefaultUserData': true,
    '@aws-cdk/aws-secretsmanager:useAttachedSecretResourcePolicyForSecretTargetAttachments': true,
    '@aws-cdk/aws-redshift:columnId': true,
    '@aws-cdk/aws-stepfunctions-tasks:enableEmrServicePolicyV2': true,
    '@aws-cdk/aws-ec2:restrictDefaultSecurityGroup': true,
    '@aws-cdk/aws-apigateway:requestValidatorUniqueId': true,
    '@aws-cdk/aws-kms:aliasNameRef': true,
    '@aws-cdk/aws-kms:applyImportedAliasPermissionsToPrincipal': true,
    '@aws-cdk/aws-autoscaling:generateLaunchTemplateInsteadOfLaunchConfig': true,
    '@aws-cdk/core:includePrefixInUniqueNameGeneration': true,
    '@aws-cdk/aws-efs:denyAnonymousAccess': true,
    '@aws-cdk/aws-opensearchservice:enableOpensearchMultiAzWithStandby': true,
    '@aws-cdk/aws-lambda-nodejs:useLatestRuntimeVersion': true,
    '@aws-cdk/aws-efs:mountTargetOrderInsensitiveLogicalId': true,
    '@aws-cdk/aws-rds:auroraClusterChangeScopeOfInstanceParameterGroupWithEachParameters': true,
    '@aws-cdk/aws-appsync:useArnForSourceApiAssociationIdentifier': true,
    '@aws-cdk/aws-rds:preventRenderingDeprecatedCredentials': true,
    '@aws-cdk/aws-codepipeline-actions:useNewDefaultBranchForCodeCommitSource': true,
    '@aws-cdk/aws-cloudwatch-actions:changeLambdaPermissionLogicalIdForLambdaAction': true,
    '@aws-cdk/aws-codepipeline:crossAccountKeysDefaultValueToFalse': true,
    '@aws-cdk/aws-codepipeline:defaultPipelineTypeToV2': true,
    '@aws-cdk/aws-kms:reduceCrossAccountRegionPolicyScope': true,
    '@aws-cdk/aws-eks:nodegroupNameAttribute': true,
    '@aws-cdk/aws-ec2:ebsDefaultGp3Volume': true,
    '@aws-cdk/aws-ecs:removeDefaultDeploymentAlarm': true,
    '@aws-cdk/custom-resources:logApiResponseDataPropertyTrueDefault': false,
    '@aws-cdk/aws-s3:keepNotificationInImportedBucket': false,
    '@aws-cdk/core:explicitStackTags': true,
    '@aws-cdk/aws-ecs:enableImdsBlockingDeprecatedFeature': false,
    '@aws-cdk/aws-ecs:disableEcsImdsBlocking': true,
    '@aws-cdk/aws-ecs:reduceEc2FargateCloudWatchPermissions': true,
    '@aws-cdk/aws-dynamodb:resourcePolicyPerReplica': true,
    '@aws-cdk/aws-ec2:ec2SumTImeoutEnabled': true,
    '@aws-cdk/aws-appsync:appSyncGraphQLAPIScopeLambdaPermission': true,
    '@aws-cdk/aws-rds:setCorrectValueForDatabaseInstanceReadReplicaInstanceResourceId': true,
    '@aws-cdk/core:cfnIncludeRejectComplexResourceUpdateCreatePolicyIntrinsics': true,
    '@aws-cdk/aws-lambda-nodejs:sdkV3ExcludeSmithyPackages': true,
    '@aws-cdk/aws-stepfunctions-tasks:fixRunEcsTaskPolicy': true,
    '@aws-cdk/aws-ec2:bastionHostUseAmazonLinux2023ByDefault': true,
    '@aws-cdk/aws-route53-targets:userPoolDomainNameMethodWithoutCustomResource': true,
    '@aws-cdk/aws-elasticloadbalancingV2:albDualstackWithoutPublicIpv4SecurityGroupRulesDefault': true,
    '@aws-cdk/aws-iam:oidcRejectUnauthorizedConnections': true,
    '@aws-cdk/core:enableAdditionalMetadataCollection': true,
    '@aws-cdk/aws-lambda:createNewPoliciesWithAddToRolePolicy': false,
    '@aws-cdk/aws-s3:setUniqueReplicationRoleName': true,
    '@aws-cdk/aws-events:requireEventBusPolicySid': true,
    '@aws-cdk/core:aspectPrioritiesMutating': true,
    '@aws-cdk/aws-dynamodb:retainTableReplica': true,
    '@aws-cdk/aws-stepfunctions:useDistributedMapResultWriterV2': true,
    '@aws-cdk/s3-notifications:addS3TrustKeyPolicyForSnsSubscriptions': true,
    '@aws-cdk/aws-ec2:requirePrivateSubnetsForEgressOnlyInternetGateway': true,
    '@aws-cdk/aws-s3:publicAccessBlockedByDefault': true,
    '@aws-cdk/aws-lambda:useCdkManagedLogGroup': true,
    '@aws-cdk/aws-elasticloadbalancingv2:networkLoadBalancerWithSecurityGroupByDefault': true,
    '@aws-cdk/aws-ecs-patterns:uniqueTargetGroupId': true,
  },

  deps: ['aws-lambda', 'source-map-support'],
  devDeps: [
    '@types/aws-lambda',
    'esbuild',
    'eslint-config-prettier',
    'eslint-plugin-prettier',
    'codecov',
    'jsii-release',
    'prettier',
    'projen-pipelines',
  ],
  // jsiiVersion: '~5.3.0',
  typescriptVersion: '~5.3.0',

  prettier: true,
  prettierOptions: {
    settings: {
      printWidth: 120,
      singleQuote: true,
      trailingComma: javascript.TrailingComma.ALL,
    },
  },

  jestOptions: {
    jestConfig: {
      collectCoverageFrom: ['src/**/*.ts'],
    },
  },

  codeCov: true,

  packageManager: javascript.NodePackageManager.PNPM,
  pnpmVersion,
  projenrcTs: true,
});

// include prettier
// project.eslint.config.extends = [...project.eslint.config.extends, 'plugin:prettier/recommended'];
// const prettierrc = new TextFile(project, '.prettierrc.js', {
//   lines: [
//     `// ${FileBase.PROJEN_MARKER}`,
//     'module.exports =  {',
//     '  semi:  true,',
//     "  trailingComma:  'all',",
//     '  singleQuote:  true,',
//     '  printWidth:  120,',
//     '  tabWidth:  2,',
//     '};',
//   ],
// });

// Enforce conventional commits https://www.conventionalcommits.org/
// https://github.com/marketplace/actions/semantic-pull-request
// If you add a new directory under src, you should also add it here in the scopes.
// Note deps and meta are for dependencies and metadata related stuff respectively
// For the 'uses', please look up the latest version from
// https://github.com/amannn/action-semantic-pull-request/releases
// const prLinter = new YamlFile(project, '.github/workflows/pr-linter.yml', {
//   obj: {
//     name: 'Lint PR',
//     on: {
//       pull_request_target: {
//         types: ['opened', 'edited', 'synchronize'],
//       },
//     },
//     jobs: {
//       main: {
//         'runs-on': 'ubuntu-latest',
//         // eslint-disable-next-line quote-props
//         steps: [
//           {
//             uses: 'amannn/action-semantic-pull-request@v3.4.2',
//             env: {
//               GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}',
//             },
//             with: {
//               scopes: 'deps doc meta core s3 static-site waf',
//               validateSingleCommit: true,
//             },
//           },
//         ],
//       },
//     },
//   },
// });

// // Codecov config support
// new YamlFile(project, 'codecov.yml', {
//   obj: {
//     codecov: {
//       require_ci_to_pass: 'yes',
//       coverage: {
//         precision: 2,
//         round: 'down',
//         range: '70...100',
//         status: {
//           project: {
//             // Controls for the entire project
//             default: {
//               target: 'auto',
//               threshold: '10%', // Allow total coverage to drop by this much while still succeeding.
//               paths: ['src'],
//               if_ci_failed: 'error',
//               only_pulls: true,
//             },
//             // Controls for just the code changed by the PR
//             patch: {
//               default: {
//                 base: 'auto',
//                 target: 'auto',
//                 threshold: '10%', // Code in src that is changed by PR must have at least this much coverage.
//                 paths: ['src'],
//                 if_ci_failed: 'error',
//                 only_pulls: true,
//               },
//             },
//           },
//         },
//       },
//       parsers: {
//         gcov: {
//           branch_detection: {
//             conditional: 'yes',
//             loop: 'yes',
//             method: 'no',
//             macro: 'no',
//           },
//         },
//       },
//       comment: {
//         layout: 'reach,diff,flags,files,footer',
//         behavior: 'default',
//         require_changes: 'no',
//       },
//     },
//   },
// });

// Codecov build support
// We don't have working releases yet.
// To run codecov manually, grab the CODECOV_TOKEN from
// https://app.codecov.io/gh/ahammond/hugo-cdk/settings
// and then `npx codecov`
// const buildSteps = project.buildWorkflow.jobs.build.steps;
// let projenBuildIdx = buildSteps.findIndex((obj, _idx) => {
//   return obj.name == 'build';
// });
// if (projenBuildIdx < 0) {
//   throw new Error('Did not find build step');
// }
// buildSteps.splice(projenBuildIdx + 1, 0, {
//   name: 'Codecov',
//   uses: 'codecov/codecov-action@v2',
//   with: {
//     token: '${{ secrets.CODECOV_TOKEN }}',
//     // directory: 'coverage',
//     // files: ./coverage1.xml,./coverage2.xml # optional
//     flags: 'unittests',
//     // name: codecov-umbrella
//     fail_ci_if_error: true,
//     verbose: true,
//   },
// });

// Ignore Claude Code local settings
project.gitignore.addPatterns('.claude/settings.local.json');

// Configure Projen Pipelines for automated CDK deployment
// This will generate GitHub Actions workflows for production deployment only
new GithubCDKPipeline(project, {
  stackPrefix: 'HugoCDK',
  branchName: 'main',

  // IAM role for GitHub Actions OIDC authentication
  // This role needs to be created in your AWS account
  // See docs/BOOTSTRAP.md for setup instructions
  iamRoleArns: {
    default: process.env.GITHUB_DEPLOYMENT_ROLE_ARN || 'arn:aws:iam::263869919117:role/GithubDeploymentRole',
  },

  // Production deployment stage
  stages: [
    {
      name: 'prod',
      env: {
        account: '263869919117',
        region: 'us-east-1',
      },
    },
  ],
});

// Fix pnpm setup in deploy workflow
// See https://github.com/open-constructs/projen-pipelines/issues/161 (fix is in, pending release)
// projen-pipelines doesn't automatically add pnpm setup steps, so we add them manually
// The 'tools' property on jobs creates setup-node during synthesis, but we need pnpm setup before that
// So we insert pnpm setup at the beginning of the steps array (after it's created but before synthesis)
const deployWorkflow = project.github?.tryFindWorkflow('deploy');
if (deployWorkflow) {
  for (const jobName of ['synth', 'assetUpload', 'deploy-prod']) {
    const job = deployWorkflow.getJob(jobName);
    // Check if job has steps property (regular Job, not JobCallingReusableWorkflow)
    if (job && 'steps' in job) {
      const steps = job.steps;
      // Insert pnpm setup at the very beginning (before all other steps)
      // During synthesis, the tools.node property will add setup-node after this
      steps.unshift({
        name: 'Setup pnpm',
        uses: 'pnpm/action-setup@v4',
        with: {
          version: pnpmVersion,
        },
      });
    }
  }
}

// Override deploy tasks to deploy all nested stacks using wildcard pattern
// projen-pipelines by default only deploys the parent stack (HugoCDK-prod)
// but we have nested stacks (Blog, Food) that need to be deployed too
// Use --concurrency to deploy stacks in parallel for faster deployments
project.tasks
  .tryFind('deploy:prod')
  ?.reset(
    'cdk --app cdk.out --outputs-file cdk-outputs-prod.json --progress events --require-approval never --concurrency 10 deploy "HugoCDK-prod/*"',
  );

project.synth();
