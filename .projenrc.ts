import {
  awscdk,
  javascript, //FileBase,, TextFile, YamlFile
} from 'projen';

const project = new awscdk.AwsCdkTypeScriptApp({
  name: '@ahammond/hugo-cdk',
  authorName: 'Andrew Hammond',
  authorEmail: 'andrew.george.hammond@gmail.com',

  cdkVersion: '2.160.0',
  defaultReleaseBranch: 'main',
  npmRegistryUrl: 'https://npm.pkg.github.com',
  repository: 'https://github.com/ahammond/hugo-cdk.git',
  minNodeVersion: '20.16.0',
  workflowNodeVersion: '20.16.0',

  context: {
    // We aren't using aws-sdk v2 anywhere. Silence the warning.
    '@aws-cdk/aws-lambda-nodejs:sdkV2NotInRuntime': false,

    // https://github.com/aws/aws-cdk/blob/main/packages/aws-cdk-lib/cx-api/FEATURE_FLAGS.md#currently-recommended-cdkjson
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
    '@aws-cdk/aws-ecs:reduceEc2FargateCloudWatchPermissions': true,
    '@aws-cdk/aws-ec2:ec2SumTImeoutEnabled': true,
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
  pnpmVersion: '9',
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

project.synth();
