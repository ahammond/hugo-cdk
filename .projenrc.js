const { AwsCdkTypeScriptApp } = require('projen');
const project = new AwsCdkTypeScriptApp({
  cdkVersion: '2.0.0-rc.4',
  defaultReleaseBranch: 'main',
  name: 'hugo-cdk',

  cdkDependencies: ['aws-cdk-lib'] /* Which AWS CDK modules (those that start with "@aws-cdk/") this app uses. */,
  cdkVersionPinning: true,
  deps: ['aws-lambda', 'source-map-support'] /* Runtime dependencies of this module. */,
  // description: undefined,            /* The description is just a string that helps people understand the purpose of the package. */
  devDeps: ['@types/aws-lambda'] /* Build dependencies for this module. */,
  // packageName: undefined,            /* The "name" in package.json. */
  projectType: AwsCdkTypeScriptApp.projectType /* Which type of project this is (library/app). */,
  // releaseWorkflow: undefined,        /* Define a GitHub workflow for releasing from "main" when new versions are bumped. */
});
project.synth();
