import type { TableMetadata } from '@vdtn359/graphqlize-mapper';
import { Knex } from 'knex';
import { generateAlias } from '../utils';

export class FilterBuilder {
  private metadata: TableMetadata;

  private filter: Record<string, any>;

  private queryBuilder: Knex.QueryBuilder;

  private aliasMap: Record<string, number>;

  private alias: string;

  constructor({
    filter,
    metadata,
    queryBuilder,
    aliasMap,
  }: {
    filter: Record<string, any>;
    metadata: TableMetadata;
    queryBuilder: Knex.QueryBuilder;
    aliasMap: Record<string, number>;
  }) {
    this.filter = filter;
    this.metadata = metadata;
    this.queryBuilder = queryBuilder;
    this.aliasMap = aliasMap;
    const tableAlias = generateAlias(metadata.name);
    this.aliasMap[tableAlias] = (this.aliasMap[tableAlias] ?? 0) + 1;

    // ensure aliases are unique
    this.alias = `${tableAlias}_${this.aliasMap[tableAlias]}`;
  }

  getAlias() {
    return this.alias;
  }

  basicFilter({
    queryBuilder,
    column,
    expression,
    value,
  }: {
    queryBuilder: Knex.QueryBuilder;
    column: string;
    expression: string;
    value: any;
  }) {
    switch (expression) {
      case '_eq':
        return queryBuilder.where(column, value);
      case '_neq':
        return queryBuilder.whereNot(column, value);
      case '_gt':
        return queryBuilder.where(column, '>', value);
      case '_gte':
        return queryBuilder.whereNot(column, '>=', value);
      case '_lt':
        return queryBuilder.where(column, '<', value);
      case '_lte':
        return queryBuilder.whereNot(column, '<=', value);
      case '_in':
        return queryBuilder.whereIn(column, value);
      case '_notIn':
        return queryBuilder.whereNotIn(column, value);
      case '_regExp':
        return queryBuilder.whereRaw(`${column} REGEXP ${value}`);
      case '_iRegExp':
        return queryBuilder.whereRaw(`LOWER(${column}) REGEXP LOWER(${value})`);
      case '_between':
        return queryBuilder.whereBetween(column, value);
      case '_notBetween':
        return queryBuilder.whereNotBetween(column, value);
      case '_like':
        return queryBuilder.whereLike(column, value);
      case '_contains':
        return queryBuilder.whereLike(column, `%${value}%`);
      case '_startWith':
        return queryBuilder.whereLike(column, `${value}%`);
      case '_endsWith':
        return queryBuilder.whereLike(column, `%${value}`);
      case '_iLike':
        return queryBuilder.whereILike(column, value);
      default:
        return null;
    }
  }

  columnFilter({
    queryBuilder,
    column,
    filterValue,
  }: {
    queryBuilder: Knex.QueryBuilder;
    column: string;
    filterValue: Record<string, any>;
  }) {
    const columnAlias = `${this.alias}.${column}`;

    for (const [expression, value] of Object.entries(filterValue)) {
      this.basicFilter({
        queryBuilder,
        column: columnAlias,
        value,
        expression,
      });
    }
  }

  where() {
    for (const [key, value] of Object.entries(this.filter)) {
      if (this.metadata.columns[key]) {
        this.columnFilter({
          queryBuilder: this.queryBuilder,
          column: key,
          filterValue: value,
        });
      }
    }
    return this.queryBuilder;
  }
}
