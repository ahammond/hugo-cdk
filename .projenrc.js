const { AwsCdkTypeScriptApp, FileBase, TextFile, YamlFile } = require('projen');
const project = new AwsCdkTypeScriptApp({
  name: '@ahammond/hugo-cdk',
  authorName: 'Andrew Hammond',
  authorEmail: 'andrew.george.hammond@gmail.com',

  cdkVersion: '2.0.0-rc.24',
  defaultReleaseBranch: 'main',
  npmRegistryUrl: 'https://npm.pkg.github.com',
  repositoryUrl: 'https://github.com/ahammond/hugo-cdk.git',

  cdkDependencies: ['aws-cdk-lib'], // Kinda obsolete in a cdk v2 world.
  cdkVersionPinning: true,
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

// Codecov config support
new YamlFile(project, 'codecov.yml', {
  obj: {
    codecov: {
      require_ci_to_pass: 'yes',
      coverage: {
        precision: 2,
        round: 'down',
        range: '70...100',
        status: {
          project: {
            // Controls for the entire project
            default: {
              target: 'auto',
              threshold: '10%', // Allow total coverage to drop by this much while still succeeding.
              paths: ['src'],
              if_ci_failed: 'error',
              only_pulls: true,
            },
            // Controls for just the code changed by the PR
            patch: {
              default: {
                base: 'auto',
                target: 'auto',
                threshold: '10%', // Code in src that is changed by PR must have at least this much coverage.
                paths: ['src'],
                if_ci_failed: 'error',
                only_pulls: true,
              },
            },
          },
        },
      },
      parsers: {
        gcov: {
          branch_detection: {
            conditional: 'yes',
            loop: 'yes',
            method: 'no',
            macro: 'no',
          },
        },
      },
      comment: {
        layout: 'reach,diff,flags,files,footer',
        behavior: 'default',
        require_changes: 'no',
      },
    },
  },
});

// Codecov build support
const buildSteps = project.buildWorkflow.jobs.build.steps;
let projenBuildIdx = buildSteps.findIndex((obj, idx) => {
  return obj.name == 'build';
});
if (projenBuildIdx < 0) {
  throw new Error('Did not find build step');
}
buildSteps.splice(projenBuildIdx + 1, 0, {
  name: 'Codecov',
  uses: 'codecov/codecov-action@v2',
  with: {
    token: '${{ secrets.CODECOV_TOKEN }}',
    // directory: 'coverage',
    // files: ./coverage1.xml,./coverage2.xml # optional
    flags: 'unittests',
    // name: codecov-umbrella
    fail_ci_if_error: true,
    verbose: true,
  },
});

project.synth();
