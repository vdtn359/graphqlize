import type {
  Pagination,
  SortDirection,
  TableMapper,
  TableMetadata,
} from '@vdtn359/graphqlize-mapper';
import { Knex } from 'knex';
import { flatten } from 'lodash';
import { SelectBuilder } from './builders/select-builder';
import type { SchemaMapper } from './schema-mapper';

export class SqlTableMapper<T = any> implements TableMapper<T> {
  constructor(
    private readonly knex: Knex,
    private readonly tableMetadata: TableMetadata,
    private readonly schemaMapper: SchemaMapper,
    private readonly allowWindowFunctions?: boolean
  ) {}

  async findByFilter({
    filter,
    pagination,
    sort,
    partitions,
  }: {
    filter?: Record<string, any>;
    pagination?: Pagination;
    sort: Record<string, SortDirection>[];
    partitions: Record<string, any>[];
  }): Promise<T[]> {
    const queryBuilder = new SelectBuilder({
      filter,
      pagination,
      partitions,
      sort,
      knex: this.knex,
      metadata: this.tableMetadata,
      useWindowFunctions: this.allowWindowFunctions,
      schemaMapper: this.schemaMapper,
    });
    const queries = queryBuilder.list();
    if (Array.isArray(queries)) {
      return flatten(await Promise.all(queries));
    }
    return queries;
  }

  countByFilter({ filter }: { filter?: Record<string, any> }) {
    const queryBuilder = new SelectBuilder({
      filter,
      knex: this.knex,
      metadata: this.tableMetadata,
      schemaMapper: this.schemaMapper,
    });
    return queryBuilder.count();
  }

  aggregateByFilter({
    filter,
    fields,
    groupBy,
    having,
    pagination,
    partitions,
    sort,
  }: {
    filter?: Record<string, any>;
    having?: Record<string, any>;
    groupBy?: Record<string, any>;
    partitions?: Record<string, any>[];
    pagination?: Pagination;
    sort?: Record<string, any>[];
    fields: Record<string, any>;
  }): Promise<any> {
    const queryBuilder = new SelectBuilder({
      filter,
      fields,
      groupBy,
      having,
      pagination,
      partitions,
      sort,
      knex: this.knex,
      metadata: this.tableMetadata,
      schemaMapper: this.schemaMapper,
    });
    return queryBuilder.aggregate();
  }
}
