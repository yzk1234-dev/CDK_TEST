import * as cdk from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

type PipelineStackProps = cdk.StackProps & {
  readonly projectName: string;
  readonly prefix: string;
  readonly githubOwner: string;
  readonly githubRepo: string;
  readonly githubBranch: string;
  readonly githubOAuthTokenSecretName: string;
  readonly githubConnectionArn: string;
};

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    // GitHub接続情報
    // const githubOAuthToken = cdk.SecretValue.secretsManager('');
    const oauth = cdk.SecretValue.secretsManager('my-github-token');

    // アーティファクト定義
    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();

    const sourceAction = new codepipeline_actions.CodeStarConnectionsSourceAction({
      actionName: 'GitHub_Source',
      connectionArn: props.githubConnectionArn,
      output: sourceOutput,
      owner: props?.githubOwner,
      repo: props?.githubRepo,
      branch: props?.githubBranch,
      triggerOnPush: true,
      // triggerOnPullRequest: true,
      // triggerOnPullRequestMerged: true,
      // triggerOnPullRequestApproved: true,
    });

    // CodeBuildプロジェクト
    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: ['npm ci'],
          },
          build: {
            commands: [
              'npm run build',
              'npm run test',
              'npx cdk synth',
            ],
          },
        },
        artifacts: {
          files: ['**/*'],
        },
      }),
    });

    const deployProject = new codebuild.PipelineProject(this, 'DeployProject', {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commnads: [
              'npx cdk deploy --all --require-approval never',
            ],
          }
        },
        artifacts: {
          files: [
            '**/*',
          ],
        },
      }),
    });

    // IAMロールの設定
    buildProject.role?.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));

    // CodePipeline
    const pipeline = new codepipeline.Pipeline(this, 'MyPipeline', {
      pipelineName: `${props?.prefix}-pipeline`,
      triggers: [{
        providerType: codepipeline.ProviderType.CODE_STAR_SOURCE_CONNECTION,
        gitConfiguration: {
          sourceAction,
          pullRequestFilter: [{
            branchesIncludes: [props?.githubBranch],
          }],
        }
      }],
      stages: [
        // Stage 1: Source
        {
          stageName: 'Source',
          actions: [
            sourceAction,
          ],
        },

        // Stage 2: Build
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'CodeBuild',
              project: buildProject,
              input: sourceOutput,
              outputs: [buildOutput],
            }),
          ],
        },

        // Stage 3: Approve
        {
          stageName: 'Approve',
          actions: [
            new codepipeline_actions.ManualApprovalAction({
              actionName: 'ManualApproval',
            }),
          ],
        },

        // Stage 4: Deploy
        {
          stageName: 'Deploy',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Deploy',
              project: deployProject,
              input: buildOutput,
            }),
          ]
        }
        // {
        //   stageName: 'Deploy',
        //   actions: [
        //     new codepipeline_actions.CodeDeployServerDeployAction({
        //       actionName: 'CodeDeploy',
        //       input: buildOutput,
        //       deploymentGroup: codedeploy.ServerDeploymentGroup.fromServerDeploymentGroupAttributes(this, 'MyDeploymentGroup', {
        //         application: codedeploy.ServerApplication.fromServerApplicationName(this, 'MyApp', 'your-codedeploy-application-name'),
        //         deploymentGroupName: 'your-deployment-group-name',
        //       }),
        //     }),
        //   ],
        // },
      ],
    });

    pipeline.role?.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
  }
}
