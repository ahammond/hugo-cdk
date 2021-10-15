const { AwsCdkTypeScriptApp, FileBase, TextFile, YamlFile } = require('projen');
const project = new AwsCdkTypeScriptApp({
  name: '@ahammond/hugo-cdk',
  authorName: 'Andrew Hammond',
  authorEmail: 'andrew.george.hammond@gmail.com',

  cdkVersion: '2.0.0-rc.24',
  defaultReleaseBranch: 'main',
  name: 'hugo-cdk',

  cdkDependencies: ['aws-cdk-lib'], // Kinda obsolete in a cdk v2 world.
  cdkVersionPinning: true,
  deps: ['aws-lambda', 'source-map-support'],
  devDeps: ['@types/aws-lambda'],
  projectType: AwsCdkTypeScriptApp.projectType,

  defaultReleaseBranch: 'main',
});

// include prettier
project.eslint.config.extends = [...project.eslint.config.extends, 'plugin:prettier/recommended'];
const prettierrc = new TextFile(project, '.prettierrc.js', {
  lines: [
    `// ${FileBase.PROJEN_MARKER}`,
    'module.exports =  {',
    '  semi:  true,',
    "  trailingComma:  'all',",
    '  singleQuote:  true,',
    '  printWidth:  120,',
    '  tabWidth:  2,',
    '};',
  ],
});

// Enforce conventional commits https://www.conventionalcommits.org/
// https://github.com/marketplace/actions/semantic-pull-request
// If you add a new directory under src, you should also add it here in the scopes.
// Note deps and meta are for dependencies and metadata related stuff respectively
// For the 'uses', please look up the latest version from
// https://github.com/amannn/action-semantic-pull-request/releases
const prLinter = new YamlFile(project, '.github/workflows/pr-linter.yml', {
  obj: {
    name: 'Lint PR',
    on: {
      pull_request_target: {
        types: ['opened', 'edited', 'synchronize'],
      },
    },
    jobs: {
      main: {
        'runs-on': 'ubuntu-latest',
        // eslint-disable-next-line quote-props
        steps: [
          {
            uses: 'amannn/action-semantic-pull-request@v3.4.2',
            env: {
              GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}',
            },
            with: {
              scopes: 'deps doc meta core s3 static-site waf',
              validateSingleCommit: true,
            },
          },
        ],
      },
    },
  },
});

project.synth();
