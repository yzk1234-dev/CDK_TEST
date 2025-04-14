#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PipelineStack } from '../lib/pipeline/pipeline-stack';
import { githubInfo, projectInfo } from '../configs/pipeline-configs';

const app = new cdk.App();
new PipelineStack(app, 'PipelineStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  stackName: 'MyPipelineStack',
  description: 'A pipeline stack for deploying a web application.',
  githubOwner: githubInfo.githubOwner,
  githubRepo: githubInfo.githubRepo,
  githubBranch: githubInfo.githubBranch,
  githubOAuthTokenSecretName: githubInfo.githubOAuthTokenSecretName,
  githubConnectionArn: githubInfo.githubConnectionArn,
  projectName: projectInfo.projectName,
  prefix: projectInfo.prefix,
});