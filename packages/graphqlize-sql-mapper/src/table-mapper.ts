import type { TableMapper, TableMetadata } from '@vdtn359/graphqlize-mapper';
import { Knex } from 'knex';

export class SqlTableMapper<T = any> implements TableMapper<T> {
  constructor(
    private readonly knex: Knex,
    private readonly tableMetadata: TableMetadata
  ) {}

  async findByKeys(keys: readonly Record<string, any>[]) {
    if (!keys.length) {
      return [];
    }
    const queryBuilder = this.knex(this.tableMetadata.name)
      .select()
      .limit(keys.length);

    const columns = Object.keys(keys[0]);

    if (columns.length === 1) {
      queryBuilder.whereIn(
        columns[0],
        keys.map((key) => key[columns[0]])
      );
    } else {
      for (const key of keys) {
        queryBuilder.orWhere((qb) => {
          for (const column of columns) {
            qb.where(column, key[column]);
          }
        });
      }
    }

    return queryBuilder;
  }
}
