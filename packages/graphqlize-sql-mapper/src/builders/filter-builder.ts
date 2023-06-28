import type {
  ForeignKeyMetadata,
  TableMetadata,
} from '@vdtn359/graphqlize-mapper';
import { Knex } from 'knex';
import { generateAlias } from '../utils';
import type { SqlMapper } from '../schema-mapper';

export class FilterBuilder {
  private metadata: TableMetadata;

  private filter: Record<string, any>;

  private queryBuilder: Knex.QueryBuilder;

  private aliasMap: Record<string, number>;

  private alias: string;

  private schemaMapper: SqlMapper;

  constructor({
    filter,
    metadata,
    queryBuilder,
    aliasMap,
    schemaMapper,
  }: {
    filter: Record<string, any>;
    metadata: TableMetadata;
    queryBuilder: Knex.QueryBuilder;
    aliasMap: Record<string, number>;
    schemaMapper: SqlMapper;
  }) {
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
    });

    filterBuilder.join(foreignKey, this.alias);
    filterBuilder.where();
  }

  join(foreignKey: ForeignKeyMetadata, alias: string) {
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

  where() {
    for (const [key, value] of Object.entries(this.filter)) {
      if (this.metadata.columns[key]) {
        this.columnFilter({
          queryBuilder: this.queryBuilder,
          column: key,
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
    }
    return this.queryBuilder;
  }
}
