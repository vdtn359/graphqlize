import type {
  ForeignKeyMetadata,
  TableMetadata,
} from '@vdtn359/graphqlize-mapper';
import { Knex } from 'knex';
import type { SqlMapper } from '../schema-mapper';
import { getDialectHandler } from '../dialects/factory';
import type { SelectBuilder } from './select-builder';

export class WhereBuilder {
  private metadata: TableMetadata;

  private filter: Record<string, any>;

  private knexBuilder: Knex.QueryBuilder;

  private selectBuilder: SelectBuilder;

  private alias: string;

  private schemaMapper: SqlMapper;

  private knex: Knex;

  constructor({
    filter,
    metadata,
    knexBuilder,
    selectBuilder,
    knex,
    alias,
  }: {
    filter: Record<string, any>;
    metadata: TableMetadata;
    knex: Knex;
    selectBuilder: SelectBuilder;
    knexBuilder: Knex.QueryBuilder;
    alias: string;
  }) {
    this.knex = knex;
    this.selectBuilder = selectBuilder;
    this.schemaMapper = selectBuilder.getSchemaMapper();
    this.filter = filter;
    this.metadata = metadata;
    this.knexBuilder = knexBuilder;
    this.alias = alias;
  }

  getAlias() {
    return this.alias;
  }

  private basicFilter({
    knexBuilder,
    column,
    operator,
    value,
  }: {
    knexBuilder: Knex.QueryBuilder;
    column: any;
    operator: string;
    value: any;
  }) {
    const expression = column;
    const dialectHandler = getDialectHandler(knexBuilder.client.dialect);
    switch (operator) {
      case '_eq':
        return knexBuilder.where(expression, value);
      case '_neq':
        return knexBuilder.whereNot(expression, value);
      case '_gt':
        return knexBuilder.where(expression, '>', value);
      case '_gte':
        return knexBuilder.where(expression, '>=', value);
      case '_lt':
        return knexBuilder.where(expression, '<', value);
      case '_lte':
        return knexBuilder.where(expression, '<=', value);
      case '_in':
        return knexBuilder.whereIn(expression, value);
      case '_notIn':
        return knexBuilder.whereNotIn(expression, value);
      case '_regExp':
        return knexBuilder.whereRaw(`${expression} REGEXP ${value}`);
      case '_iRegExp':
        return knexBuilder.whereRaw(
          `LOWER(${expression}) REGEXP LOWER(${value})`
        );
      case '_between':
        return knexBuilder.whereBetween(expression, value);
      case '_notBetween':
        return knexBuilder.whereNotBetween(expression, value);
      case '_like':
        return knexBuilder.whereLike(expression, value);
      case '_contains':
        return knexBuilder.whereLike(expression, `%${value}%`);
      case '_startWith':
        return knexBuilder.whereLike(expression, `${value}%`);
      case '_endsWith':
        return knexBuilder.whereLike(expression, `%${value}`);
      case '_iLike':
        return knexBuilder.whereILike(expression, value);
      case '_year':
        return this.columnFilter({
          knexBuilder,
          column: dialectHandler.year(this.knex, expression),
          filterValue: value,
        });
      case '_month':
        return this.columnFilter({
          knexBuilder,
          column: dialectHandler.month(this.knex, expression),
          filterValue: value,
        });
      case '_day':
        return this.columnFilter({
          knexBuilder,
          column: dialectHandler.day(this.knex, expression),
          filterValue: value,
        });
      case '_date':
        return this.columnFilter({
          knexBuilder,
          column: dialectHandler.date(this.knex, expression),
          filterValue: value,
        });
      case '_hour':
        return this.columnFilter({
          knexBuilder,
          column: dialectHandler.hour(this.knex, expression),
          filterValue: value,
        });
      case '_minute':
        return this.columnFilter({
          knexBuilder,
          column: dialectHandler.minute(this.knex, expression),
          filterValue: value,
        });
      case '_second':
        return this.columnFilter({
          knexBuilder,
          column: dialectHandler.second(this.knex, expression),
          filterValue: value,
        });
      case '_dayOfWeek':
        return this.columnFilter({
          knexBuilder,
          column: dialectHandler.dayOfWeek(this.knex, expression),
          filterValue: value,
        });
      default:
        return null;
    }
  }

  private columnFilter({
    knexBuilder,
    column,
    filterValue,
  }: {
    knexBuilder: Knex.QueryBuilder;
    column: any;
    filterValue: Record<string, any>;
  }) {
    for (const [expression, value] of Object.entries(filterValue)) {
      this.basicFilter({
        knexBuilder,
        column,
        value,
        operator: expression,
      });
    }
  }

  whereJoin(foreignKey: ForeignKeyMetadata, alias: string) {
    const { columns, referenceColumns } = foreignKey;

    for (let i = 0; i < columns.length; i++) {
      this.knexBuilder.andWhere(
        this.knex.raw('??', `${this.alias}.${referenceColumns[i]}`),
        '=',
        this.knex.raw('??', `${alias}.${columns[i]}`)
      );
    }
  }

  where() {
    for (const [key, value] of Object.entries(this.filter)) {
      if (this.metadata.columns[key]) {
        const columnAlias = this.knex.raw('??', `${this.alias}.${key}`);
        this.columnFilter({
          knexBuilder: this.knexBuilder,
          column: columnAlias,
          filterValue: value,
        });
      }

      if (this.metadata.belongsTo[key]) {
        this.selectBuilder.joinFilter({
          whereBuilder: this,
          filterValue: value,
          foreignKey: this.metadata.belongsTo[key],
        });
      }

      if (this.metadata.hasOne[key]) {
        this.selectBuilder.joinFilter({
          whereBuilder: this,
          filterValue: value,
          foreignKey: this.metadata.hasOne[key],
        });
      }

      if (this.metadata.hasMany[key]) {
        this.selectBuilder.subQueryFilter({
          whereBuilder: this,
          filterValue: value,
          foreignKey: this.metadata.hasMany[key],
        });
      }
    }
    return this.knexBuilder;
  }

  getKnexBuilder() {
    return this.knexBuilder;
  }
}
