const { clickupCdk } = require('@time-loop/clickup-projen');
const project = new clickupCdk.ClickUpCdkTypeScriptApp({
  name: '@ahammond/hugo-cdk',
  authorName: 'Andrew Hammond',
  authorEmail: 'andrew.george.hammond@gmail.com',
  licensed: true,

  defaultReleaseBranch: 'main',
  repositoryUrl: 'https://github.com/ahammond/hugo-cdk.git',

  cdkVersion: '2.20.0',
  deps: ['aws-lambda', 'source-map-support'],
  devDeps: [
    '@types/aws-lambda',
    '@aws-cdk/assert',
    'esbuild',
    'eslint-config-prettier',
    'eslint-plugin-prettier',
    'codecov',
    'jsii-release',
    'prettier',
  ],
});

project.synth();
