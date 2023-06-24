import { createYoga } from 'graphql-yoga';
import { createServer } from 'node:http';
import { SchemaBuilder } from '@vdtn359/graphqlize-schema';
import { SqlMapper } from '@vdtn359/graphqlize-sql-mapper';

async function run() {
  const builder = await SchemaBuilder.init(
    await SqlMapper.create({
      client: 'mysql2',
      connection: {
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'stackla',
        charset: 'utf8',
      },
    })
  );
  const yoga = createYoga({
    schema: builder.toSchema(),
    graphiql: true,
    landingPage: false,
  });

  const server = createServer(yoga);

  server.listen(3000, () => {
    // eslint-disable-next-line no-console
    console.log('Server is running on http://localhost:3000');
  });
}

run();
