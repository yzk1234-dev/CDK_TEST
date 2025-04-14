type ProjectInfo = {
  readonly projectName: string;
  readonly prefix: string;
}

type GithubInfo = {
  readonly githubOwner: string;
  readonly githubRepo: string;
  readonly githubBranch: string;
  readonly githubOAuthTokenSecretName: string;
  readonly githubConnectionArn: string;
};

export const projectInfo: ProjectInfo = {
  projectName: 'cdk-test-project',
  prefix: 'cdk-test',
};

export const githubInfo: GithubInfo = {
  githubOwner: 'yzk1234-dev',
  githubRepo: 'CDK_TEST',
  githubBranch: 'master',
  githubOAuthTokenSecretName: 'github-token',
  githubConnectionArn: 'arn:aws:codeconnections:ap-northeast-1:135957436346:connection/85cd54cb-3338-4491-9b5f-fb9a1a7cb4f2',
};