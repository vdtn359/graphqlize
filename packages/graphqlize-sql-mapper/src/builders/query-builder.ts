import type { TableMetadata } from '@vdtn359/graphqlize-mapper';
import { Knex } from 'knex';
import { FilterBuilder } from './filter-builder';
import type { SqlMapper } from '../schema-mapper';

export class QueryBuilder {
  private metadata: TableMetadata;

  private pagination: Record<string, any>;

  private filter: Record<string, any>;

  private knex: Knex;

  private schemaMapper: SqlMapper;

  constructor({
    filter,
    pagination,
    metadata,
    knex,
    schemaMapper,
  }: {
    filter: Record<string, any>;
    pagination: Record<string, any>;
    metadata: TableMetadata;
    schemaMapper: SqlMapper;
    knex: Knex;
  }) {
    this.schemaMapper = schemaMapper;
    this.pagination = pagination;
    this.metadata = metadata;
    this.knex = knex;
    this.filter = filter;
  }

  private applyFilter(
    queryBuilder: Knex.QueryBuilder,
    aliasMap: Record<string, number>
  ) {
    const filterBuilder = new FilterBuilder({
      filter: this.filter,
      metadata: this.metadata,
      aliasMap,
      queryBuilder,
      schemaMapper: this.schemaMapper,
    });
    queryBuilder.from({
      [filterBuilder.getAlias()]: this.metadata.name,
    });

    filterBuilder.where();
  }

  select() {
    const aliasMap: Record<string, number> = {};
    const queryBuilder = this.knex.select();
    this.applyFilter(queryBuilder, aliasMap);
    return queryBuilder;
  }
}
