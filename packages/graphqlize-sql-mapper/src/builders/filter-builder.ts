import type {
  ForeignKeyMetadata,
  TableMetadata,
} from '@vdtn359/graphqlize-mapper';
import { Knex } from 'knex';
import { generateAlias } from '../utils';
import type { SqlMapper } from '../schema-mapper';
import { getDialectHandler } from '../dialects/factory';

export class FilterBuilder {
  private metadata: TableMetadata;

  private filter: Record<string, any>;

  private queryBuilder: Knex.QueryBuilder;

  private aliasMap: Record<string, number>;

  private alias: string;

  private schemaMapper: SqlMapper;

  private knex: Knex;

  constructor({
    filter,
    metadata,
    queryBuilder,
    aliasMap,
    schemaMapper,
    knex,
  }: {
    filter: Record<string, any>;
    metadata: TableMetadata;
    knex: Knex;
    queryBuilder: Knex.QueryBuilder;
    aliasMap: Record<string, number>;
    schemaMapper: SqlMapper;
  }) {
    this.knex = knex;
    this.schemaMapper = schemaMapper;
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
    operator,
    value,
  }: {
    queryBuilder: Knex.QueryBuilder;
    column: any;
    operator: string;
    value: any;
  }) {
    const expression = column;
    const dialectHandler = getDialectHandler(queryBuilder.client.dialect);
    switch (operator) {
      case '_eq':
        return queryBuilder.where(expression, value);
      case '_neq':
        return queryBuilder.whereNot(expression, value);
      case '_gt':
        return queryBuilder.where(expression, '>', value);
      case '_gte':
        return queryBuilder.where(expression, '>=', value);
      case '_lt':
        return queryBuilder.where(expression, '<', value);
      case '_lte':
        return queryBuilder.where(expression, '<=', value);
      case '_in':
        return queryBuilder.whereIn(expression, value);
      case '_notIn':
        return queryBuilder.whereNotIn(expression, value);
      case '_regExp':
        return queryBuilder.whereRaw(`${expression} REGEXP ${value}`);
      case '_iRegExp':
        return queryBuilder.whereRaw(
          `LOWER(${expression}) REGEXP LOWER(${value})`
        );
      case '_between':
        return queryBuilder.whereBetween(expression, value);
      case '_notBetween':
        return queryBuilder.whereNotBetween(expression, value);
      case '_like':
        return queryBuilder.whereLike(expression, value);
      case '_contains':
        return queryBuilder.whereLike(expression, `%${value}%`);
      case '_startWith':
        return queryBuilder.whereLike(expression, `${value}%`);
      case '_endsWith':
        return queryBuilder.whereLike(expression, `%${value}`);
      case '_iLike':
        return queryBuilder.whereILike(expression, value);
      case '_year':
        return this.columnFilter({
          queryBuilder,
          column: dialectHandler.year(this.knex, expression),
          filterValue: value,
        });
      case '_month':
        return this.columnFilter({
          queryBuilder,
          column: dialectHandler.month(this.knex, expression),
          filterValue: value,
        });
      case '_day':
        return this.columnFilter({
          queryBuilder,
          column: dialectHandler.day(this.knex, expression),
          filterValue: value,
        });
      case '_date':
        return this.columnFilter({
          queryBuilder,
          column: dialectHandler.date(this.knex, expression),
          filterValue: value,
        });
      case '_hour':
        return this.columnFilter({
          queryBuilder,
          column: dialectHandler.hour(this.knex, expression),
          filterValue: value,
        });
      case '_minute':
        return this.columnFilter({
          queryBuilder,
          column: dialectHandler.minute(this.knex, expression),
          filterValue: value,
        });
      case '_second':
        return this.columnFilter({
          queryBuilder,
          column: dialectHandler.second(this.knex, expression),
          filterValue: value,
        });
      case '_dayOfWeek':
        return this.columnFilter({
          queryBuilder,
          column: dialectHandler.dayOfWeek(this.knex, expression),
          filterValue: value,
        });
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
    column: any;
    filterValue: Record<string, any>;
  }) {
    for (const [expression, value] of Object.entries(filterValue)) {
      this.basicFilter({
        queryBuilder,
        column,
        value,
        operator: expression,
      });
    }
  }

  singleAssociationFilter({
    queryBuilder,
    filterValue,
    foreignKey,
  }: {
    queryBuilder: Knex.QueryBuilder;
    filterValue: Record<string, any>;
    foreignKey: ForeignKeyMetadata;
  }) {
    if (!Object.values(filterValue).filter((val) => val !== undefined).length) {
      return;
    }
    const { referenceTable } = foreignKey;
    const referenceTableMetadata =
      this.schemaMapper.getTableMetadata(referenceTable);

    const filterBuilder = new FilterBuilder({
      filter: filterValue,
      queryBuilder,
      aliasMap: this.aliasMap,
      schemaMapper: this.schemaMapper,
      metadata: referenceTableMetadata,
      knex: this.knex,
    });

    filterBuilder.join(foreignKey, this.alias);
    filterBuilder.where();
  }

  manyAssociationFilter({
    queryBuilder,
    filterValue,
    foreignKey,
  }: {
    queryBuilder: Knex.QueryBuilder;
    filterValue: Record<string, any>;
    foreignKey: ForeignKeyMetadata;
  }) {
    if (!Object.values(filterValue).filter((val) => val !== undefined).length) {
      return;
    }
    const { referenceTable } = foreignKey;
    const referenceTableMetadata =
      this.schemaMapper.getTableMetadata(referenceTable);

    queryBuilder.whereExists((subQueryBuilder) => {
      const filterBuilder = new FilterBuilder({
        filter: filterValue,
        queryBuilder: subQueryBuilder,
        aliasMap: this.aliasMap,
        schemaMapper: this.schemaMapper,
        metadata: referenceTableMetadata,
        knex: this.knex,
      });

      filterBuilder.exists();
      filterBuilder.whereJoin(foreignKey, this.alias);
      filterBuilder.where();
    });
  }

  exists() {
    this.queryBuilder.select(1);
    this.queryBuilder.from({
      [this.getAlias()]: this.metadata.name,
    });
  }

  private join(foreignKey: ForeignKeyMetadata, alias: string) {
    const { referenceTable, columns, referenceColumns } = foreignKey;

    this.queryBuilder.leftJoin(
      {
        [this.getAlias()]: referenceTable,
      },
      (qb) => {
        for (let i = 0; i < columns.length; i++) {
          qb.andOn(
            `${this.alias}.${referenceColumns[i]}`,
            '=',
            `${alias}.${columns[i]}`
          );
        }
      }
    );
  }

  private whereJoin(foreignKey: ForeignKeyMetadata, alias: string) {
    const { columns, referenceColumns } = foreignKey;

    for (let i = 0; i < columns.length; i++) {
      this.queryBuilder.andWhere(
        `${this.alias}.${referenceColumns[i]}`,
        '=',
        `${alias}.${columns[i]}`
      );
    }
  }

  where() {
    for (const [key, value] of Object.entries(this.filter)) {
      if (this.metadata.columns[key]) {
        const columnAlias = this.knex.raw('??', `${this.alias}.${key}`);
        this.columnFilter({
          queryBuilder: this.queryBuilder,
          column: columnAlias,
          filterValue: value,
        });
      }

      if (this.metadata.belongsTo[key]) {
        this.singleAssociationFilter({
          queryBuilder: this.queryBuilder,
          filterValue: value,
          foreignKey: this.metadata.belongsTo[key],
        });
      }

      if (this.metadata.hasOne[key]) {
        this.singleAssociationFilter({
          queryBuilder: this.queryBuilder,
          filterValue: value,
          foreignKey: this.metadata.hasOne[key],
        });
      }

      if (this.metadata.hasMany[key]) {
        this.manyAssociationFilter({
          queryBuilder: this.queryBuilder,
          filterValue: value,
          foreignKey: this.metadata.hasMany[key],
        });
      }
    }
    return this.queryBuilder;
  }
}
