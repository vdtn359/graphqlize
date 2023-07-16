import { createYoga } from 'graphql-yoga';
import { createServer } from 'node:http';
import type { Context, APIGatewayProxyEventV2 } from 'aws-lambda';
import serverless, { Handler } from 'serverless-http';
import { buildSchema } from '../schema';

let cachedHandler: Handler;

async function bootstrap() {
  if (cachedHandler) {
    return cachedHandler;
  }
  const schema = await buildSchema();
  const yoga = createYoga({
    schema,
    graphiql: true,
    landingPage: false,
    maskedErrors: false,
  });

  cachedHandler = serverless(createServer(yoga) as any);
  return cachedHandler;
}

export const main = async (event: APIGatewayProxyEventV2, context: Context) => {
  const handler = await bootstrap();
  return handler(event, context);
};
