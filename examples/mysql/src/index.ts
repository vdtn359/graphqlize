import { createYoga } from 'graphql-yoga';
import { createServer } from 'node:http';
import { printSchema } from 'graphql';
import fs from 'fs/promises';
import { buildSchema } from './schema';

async function run() {
  const schema = await buildSchema();
  const schemaString = printSchema(schema);
  const yoga = createYoga({
    schema,
    graphiql: true,
    landingPage: false,
  });

  await fs.writeFile('schema.gql', schemaString, {
    encoding: 'utf-8',
  });

  const server = createServer(yoga);

  server.listen(3000, () => {
    // eslint-disable-next-line no-console
    console.log('Server is running on http://localhost:3000');
  });
}

run();
