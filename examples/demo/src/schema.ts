import { SchemaMapper } from '@vdtn359/graphqlize-sql-mapper';
import path from 'path';
import { SchemaBuilder } from '@vdtn359/graphqlize-schema';

export async function buildSchema() {
  const mapper = await SchemaMapper.create(
    {
      client: 'sqlite3',
      connection: {
        filename: path.resolve(process.cwd(), 'sakila.db'),
      },
    },
    {
      version: '1.0.0',
      allowWindowFunctions: true,
    }
  );

  const builder = await SchemaBuilder.init(mapper);
  return builder.toSchema();
}
