import { SchemaMapper } from '@vdtn359/graphqlize-sql-mapper';
import { SchemaBuilder } from '@vdtn359/graphqlize-schema';

export async function buildSchema() {
  const mapper = await SchemaMapper.create(
    {
      client: 'mysql2',
      connection: {
        host: '127.0.0.1',
        user: 'root',
        port: 30306,
        password: 'password',
        database: 'graphqlize',
        charset: 'utf8',
      },
    },
    {
      version: '1.0.0',
    }
  );
  const builder = await SchemaBuilder.init(mapper);
  return builder.toSchema();
}
