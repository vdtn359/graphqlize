import { SchemaMapper } from '@vdtn359/graphqlize-sql-mapper';
import { SchemaBuilder } from '@vdtn359/graphqlize-schema';
import { Dialect, getSchemaOptions } from './dialect';

export async function buildSchema() {
  const mapper = await SchemaMapper.create(
    getSchemaOptions(process.env.DIALECT as Dialect),
    {
      version: '1.0.0',
      allowWindowFunctions: true,
    }
  );
  mapper.defineForeignKey({
    table: 'users',
    type: 'hasMany',
    name: 'students',
    foreignKey: {
      columns: ['id'],
      referenceColumns: ['mentor_id'],
      referenceTable: 'users',
    },
  });
  mapper.defineForeignKey({
    table: 'stats',
    type: 'hasOne',
    name: 'user',
    foreignKey: {
      columns: ['id'],
      referenceColumns: ['stats_id'],
      referenceTable: 'users',
    },
  });
  mapper.defineCandidateKeys('users', 'email__provider', ['email', 'provider']);

  const builder = await SchemaBuilder.init(mapper);
  return builder.toSchema();
}
