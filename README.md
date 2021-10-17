[![License](https://img.shields.io/badge/License-Apache%202.0-yellowgreen.svg)](https://opensource.org/licenses/Apache-2.0)
[![codecov](https://codecov.io/gh/ahammond/hugo-cdk/branch/main/graph/badge.svg?token=A7NOP28CH7)](https://codecov.io/gh/ahammond/hugo-cdk)
![release](https://github.com/github/docs/actions/workflows/release.yml/badge.svg?branch=main)

# Hugo CDK

Connect a github repository to an AWS CodeBuild so that it does HUGO builds of that repo on every PR.
When master is updated, have it deploy that code to an AWS static site.

## Usage
Assumes you have an AWS account with a profile configured as "personal".
If you only have one AWS account in your life, cool.
[Get](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-mac.html) the CLI client
[working](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html)
and then remove the `--profile personal` from all the commands below.
Otherwise, use the appropriate profile.
Splitting things to separate CI, Staging and Prod accounts is beyond the scope of this README.

Next, edit `bin/app.ts`, and tweak the siteNames, siteDomain, and put in your own accountId and github info.

Go to AWS CodeBuild, create a project, link it to github using oauth.
Click throught the process until you have the oauth link setup.
You only need to do this one per AWS account.
You don't need to save or even complete the resulting CodeBuild project.

```bash
# install the library dependencies
npm install
# compile
npm run build
# You only need to run this once for each account you're using CDK with.
npx cdk --profile personal bootstrap
# Make sure you've already pushed the github repo that contains the site.
# Deploy all the things.
npx cdk --profile personal deploy \*
```

## Coverage

![coverage](https://codecov.io/gh/ahammond/hugo-cdk/branch/main/graphs/sunburst.svg)
