/* eslint-disable no-template-curly-in-string, import/no-import-module-exports */
import type { AWS } from '@serverless/typescript';
import main from './src/functions/main';

const serverlessConfiguration: AWS = {
  service: 'graphqlize-demo',
  frameworkVersion: '3',
  plugins: ['serverless-esbuild', 'serverless-offline'],
  provider: {
    name: 'aws',
    runtime: 'nodejs18.x',
    architecture: 'arm64',
    logRetentionInDays: 14,
    stage: '${opt:stage, self:custom.defaultStage}',
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
      NODE_ENV: process.env.NODE_ENV ?? 'production',
      STAGE_ENV: '${self:provider.stage}',
      NO_COLOR: process.env.NODE_ENV !== 'development' ? 'true' : '',
      CACHE_VERSION: process.env.CACHE_VERSION || 'v6.1.5',
    },
    timeout: 60,
  },
  // import the function via paths
  functions: { main },
  package: {
    individually: true,
    patterns: ['sakila.db', 'schema.json', 'package-lock.json'],
  },
  custom: {
    defaultStage: 'development',
    esbuild: {
      ...(process.env.NODE_ENV === 'production' && {
        installExtraArgs: [
          '--target_arch=arm64',
          '--target_platform=linux',
          '--target_libc=glibc',
        ],
      }),
      external: [
        'better-sqlite3',
        'sqlite3',
        'mysql',
        'tedious',
        'pg-query-stream',
        'oracledb',
        'mock-aws-s3',
        'nock',
      ],
    },
  },
};

module.exports = serverlessConfiguration;
