#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { HugoCdkStack } from '../lib/hugo-cdk-stack';

const app = new cdk.App();
new HugoCdkStack(app, 'HugoCdkStack');
