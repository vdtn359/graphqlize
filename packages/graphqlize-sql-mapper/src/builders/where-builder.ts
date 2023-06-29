import type {
  ForeignKeyMetadata,
  TableMetadata,
} from '@vdtn359/graphqlize-mapper';
import { Knex } from 'knex';
import type { SchemaMapper } from '../schema-mapper';
import { getDialectHandler } from '../dialects/factory';
import type { SelectBuilder } from './select-builder';
import QueryCallback = Knex.QueryCallback;

export class WhereBuilder {
  private readonly metadata: TableMetadata;

  private readonly filter: Record<string, any>;

  private readonly knexBuilder: Knex.QueryBuilder;

  private readonly selectBuilder: SelectBuilder;

  private readonly alias: string;

  private readonly schemaMapper: SchemaMapper;

  private readonly knex: Knex;

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
    type,
  }: {
    knexBuilder: Knex.QueryBuilder;
    column: any;
    operator: string;
    value: any;
    type: string;
  }) {
    const dialectHandler = getDialectHandler(knexBuilder.client.dialect);
    switch (operator) {
      case '_eq':
        return knexBuilder.andWhere(column, value);
      case '_neq':
        return knexBuilder.andWhereNot(column, value);
      case '_gt':
        return knexBuilder.andWhere(column, '>', value);
      case '_gte':
        return knexBuilder.andWhere(column, '>=', value);
      case '_lt':
        return knexBuilder.andWhere(column, '<', value);
      case '_lte':
        return knexBuilder.andWhere(column, '<=', value);
      case '_in':
        return knexBuilder.whereIn(column, value);
      case '_notIn':
        return knexBuilder.whereNotIn(column, value);
      case '_regExp':
        return knexBuilder.andWhereRaw(`${column} REGEXP ${value}`);
      case '_iRegExp':
        return knexBuilder.andWhereRaw(
          `LOWER(${column}) REGEXP LOWER(${value})`
        );
      case '_between':
        return knexBuilder.andWhereBetween(column, value);
      case '_notBetween':
        return knexBuilder.andWhereNotBetween(column, value);
      case '_like':
        return knexBuilder.andWhereLike(column, value);
      case '_contains':
        if (type === 'set') {
          return knexBuilder.andWhereRaw(
            `FIND_IN_SET(?, ${column.toString()}) IS NOT NULL`,
            value
          );
        }
        return knexBuilder.andWhereLike(column, `%${value}%`);
      case '_startWith':
        return knexBuilder.andWhereLike(column, `${value}%`);
      case '_endsWith':
        return knexBuilder.andWhereLike(column, `%${value}`);
      case '_iLike':
        return knexBuilder.andWhereILike(column, value);
      case '_fields':
        return knexBuilder.andWhere((subQuery) => {
          for (const field of value) {
            this.columnFilter({
              knexBuilder: subQuery,
              filterValue: field.value,
              column: dialectHandler.json(
                this.knex,
                column.toString(),
                field.field
              ),
              type,
            });
          }
        });

      case '_year':
        return this.columnFilter({
          knexBuilder,
          column: dialectHandler.year(this.knex, column),
          filterValue: value,
          type,
        });
      case '_month':
        return this.columnFilter({
          knexBuilder,
          column: dialectHandler.month(this.knex, column),
          filterValue: value,
          type,
        });
      case '_day':
        return this.columnFilter({
          knexBuilder,
          column: dialectHandler.day(this.knex, column),
          filterValue: value,
          type,
        });
      case '_date':
        return this.columnFilter({
          knexBuilder,
          column: dialectHandler.date(this.knex, column),
          filterValue: value,
          type,
        });
      case '_hour':
        return this.columnFilter({
          knexBuilder,
          column: dialectHandler.hour(this.knex, column),
          filterValue: value,
          type,
        });
      case '_minute':
        return this.columnFilter({
          knexBuilder,
          column: dialectHandler.minute(this.knex, column),
          filterValue: value,
          type,
        });
      case '_second':
        return this.columnFilter({
          knexBuilder,
          column: dialectHandler.second(this.knex, column),
          filterValue: value,
          type,
        });
      case '_dayOfWeek':
        return this.columnFilter({
          knexBuilder,
          column: dialectHandler.dayOfWeek(this.knex, column),
          filterValue: value,
          type,
        });
      default:
        return null;
    }
  }

  private columnFilter({
    knexBuilder,
    column,
    filterValue,
    type,
  }: {
    knexBuilder: Knex.QueryBuilder;
    column: any;
    filterValue: Record<string, any>;
    type: string;
  }) {
    for (const [expression, value] of Object.entries(filterValue)) {
      this.basicFilter({
        knexBuilder,
        column,
        value,
        operator: expression,
        type,
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

  private andBuilder({
    filters,
    knexBuilder,
  }: {
    filters: any[];
    knexBuilder: Knex.QueryBuilder;
  }) {
    for (const filter of filters) {
      const whereBuilder = new WhereBuilder({
        filter,
        knexBuilder,
        alias: this.alias,
        knex: this.knex,
        selectBuilder: this.selectBuilder,
        metadata: this.metadata,
      });
      whereBuilder.build();
    }
  }

  private orBuilder({
    filters,
    knexBuilder,
  }: {
    filters: any[];
    knexBuilder: Knex.QueryBuilder;
  }) {
    const orCallbacks: QueryCallback[] = filters
      .map((filter) =>
        this.callbackBuilder((orBuilder) => {
          const whereBuilder = new WhereBuilder({
            filter,
            knexBuilder: orBuilder,
            alias: this.alias,
            knex: this.knex,
            selectBuilder: this.selectBuilder,
            metadata: this.metadata,
          });
          whereBuilder.build();
        })
      )
      .filter(Boolean) as QueryCallback[];

    if (!orCallbacks.length) {
      return;
    }

    knexBuilder.andWhere((subQuery) => {
      orCallbacks.forEach((orCallback) => {
        subQuery.orWhere(orCallback);
      });
    });
  }

  private notBuilder({
    filter,
    knexBuilder,
  }: {
    filter: Record<string, any>;
    knexBuilder: Knex.QueryBuilder;
  }) {
    const notCallback = this.callbackBuilder((notBuilder) => {
      const whereBuilder = new WhereBuilder({
        filter,
        knexBuilder: notBuilder,
        alias: this.alias,
        knex: this.knex,
        selectBuilder: this.selectBuilder,
        metadata: this.metadata,
      });
      whereBuilder.build();
    });
    if (!notCallback) {
      return;
    }
    knexBuilder.andWhereNot(notCallback);
  }

  private callbackBuilder(
    callback: (knexBuilder: Knex.QueryBuilder) => void
  ): Knex.QueryCallback | null {
    const knexBuilder = this.knex.select();
    callback(knexBuilder);

    const compiledQuery = knexBuilder.client.queryCompiler(knexBuilder);
    const { bindings } = knexBuilder.toSQL();
    const where = compiledQuery.where().substring(6);

    if (!where.trim()) {
      return null;
    }

    return (orBuilder: Knex.QueryBuilder) => {
      orBuilder.whereRaw(where, bindings);
    };
  }

  build() {
    for (const [key, value] of Object.entries(this.filter)) {
      if (key === '_and') {
        this.andBuilder({
          knexBuilder: this.knexBuilder,
          filters: value,
        });
      }
      if (key === '_or') {
        this.orBuilder({
          knexBuilder: this.knexBuilder,
          filters: value,
        });
      }
      if (key === '_not') {
        this.notBuilder({
          knexBuilder: this.knexBuilder,
          filter: value,
        });
      }
      if (this.metadata.columns[key]) {
        const columnAlias = this.knex.raw('??', `${this.alias}.${key}`);
        this.columnFilter({
          knexBuilder: this.knexBuilder,
          column: columnAlias,
          filterValue: value,
          type: this.metadata.columns[key].rawType.toLowerCase(),
        });
      }

      if (this.metadata.belongsTo[key]) {
        this.selectBuilder.singleAssociationFilter({
          whereBuilder: this,
          filterValue: value,
          foreignKey: this.metadata.belongsTo[key],
        });
      }

      if (this.metadata.hasOne[key]) {
        this.selectBuilder.singleAssociationFilter({
          whereBuilder: this,
          filterValue: value,
          foreignKey: this.metadata.hasOne[key],
        });
      }

      if (this.metadata.hasMany[key]) {
        this.selectBuilder.manyAssociationFilter({
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
