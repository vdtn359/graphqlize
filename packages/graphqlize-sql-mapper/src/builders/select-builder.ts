import type {
  TableMetadata,
  ForeignKeyMetadata,
} from '@vdtn359/graphqlize-mapper';
import { Knex } from 'knex';
import { WhereBuilder } from './where-builder';
import type { SchemaMapper } from '../schema-mapper';
import { generateAlias } from '../utils';

export class SelectBuilder {
  private readonly metadata: TableMetadata;

  private pagination?: Record<string, any>;

  private readonly filter: Record<string, any>;

  private readonly knex: Knex;

  private readonly schemaMapper: SchemaMapper;

  private readonly aliasMap: Record<string, number>;

  private readonly topWhereBuilder: WhereBuilder;

  private readonly knexBuilder: Knex.QueryBuilder;

  private readonly isTopLevel: boolean;

  constructor({
    filter,
    pagination,
    metadata,
    knex,
    schemaMapper,
    knexBuilder,
    aliasMap = {},
    isTopLevel = true,
  }: {
    filter: Record<string, any>;
    metadata: TableMetadata;
    schemaMapper: SchemaMapper;
    knexBuilder?: Knex.QueryBuilder;
    knex: Knex;
    pagination?: Record<string, any>;
    isTopLevel?: boolean;
    aliasMap?: Record<string, number>;
  }) {
    this.schemaMapper = schemaMapper;
    this.pagination = pagination;
    this.metadata = metadata;
    this.knex = knex;
    this.filter = filter;
    this.aliasMap = aliasMap;
    this.isTopLevel = isTopLevel;
    this.knexBuilder = knexBuilder ?? this.knex.select();

    this.topWhereBuilder = new WhereBuilder({
      filter: this.filter,
      metadata: this.metadata,
      knex: this.knex,
      knexBuilder: this.knexBuilder,
      selectBuilder: this,
      alias: this.claimAlias(this.metadata.name),
    });
  }

  private claimAlias(table: string) {
    const tableAlias = generateAlias(table);
    this.aliasMap[tableAlias] = (this.aliasMap[tableAlias] ?? 0) + 1;

    // ensure aliases are unique
    return `${tableAlias}_${this.aliasMap[tableAlias]}`;
  }

  singleAssociationFilter({
    whereBuilder,
    filterValue,
    foreignKey,
  }: {
    whereBuilder: WhereBuilder;
    filterValue: Record<string, any>;
    foreignKey: ForeignKeyMetadata;
  }) {
    // eslint-disable-next-line no-underscore-dangle
    if (filterValue?._nested !== true) {
      this.joinFilter({
        whereBuilder,
        filterValue,
        foreignKey,
      });
    } else {
      this.subQueryFilter({
        whereBuilder,
        filterValue,
        foreignKey,
      });
    }
  }

  manyAssociationFilter({
    whereBuilder,
    filterValue,
    foreignKey,
  }: {
    whereBuilder: WhereBuilder;
    filterValue: Record<string, any>;
    foreignKey: ForeignKeyMetadata;
  }) {
    // eslint-disable-next-line no-underscore-dangle
    if (this.isTopLevel || filterValue?._nested !== false) {
      // perform an exists filter to ensure pagination is not affected
      this.subQueryFilter({
        whereBuilder,
        filterValue,
        foreignKey,
      });
    } else {
      this.joinFilter({
        whereBuilder,
        filterValue,
        foreignKey,
      });
    }
  }

  private joinFilter({
    whereBuilder,
    filterValue,
    foreignKey,
  }: {
    whereBuilder: WhereBuilder;
    filterValue: Record<string, any>;
    foreignKey: ForeignKeyMetadata;
  }) {
    if (!Object.values(filterValue).filter((val) => val !== undefined).length) {
      return;
    }
    const { referenceTable } = foreignKey;
    const referenceTableMetadata =
      this.schemaMapper.getTableMetadata(referenceTable);

    const targetWhereBuilder = new WhereBuilder({
      filter: filterValue,
      knexBuilder: whereBuilder.getKnexBuilder(),
      selectBuilder: this,
      metadata: referenceTableMetadata,
      knex: this.knex,
      alias: this.claimAlias(referenceTable),
    });
    this.join(
      foreignKey,
      whereBuilder.getAlias(),
      targetWhereBuilder.getAlias()
    );
    targetWhereBuilder.build();
  }

  private subQueryFilter({
    whereBuilder,
    filterValue,
    foreignKey,
  }: {
    whereBuilder: WhereBuilder;
    filterValue: Record<string, any>;
    foreignKey: ForeignKeyMetadata;
  }) {
    if (!Object.values(filterValue).filter((val) => val !== undefined).length) {
      return;
    }
    const knexBuilder = whereBuilder.getKnexBuilder();
    const { referenceTable } = foreignKey;
    const referenceTableMetadata =
      this.schemaMapper.getTableMetadata(referenceTable);

    knexBuilder.whereExists((subQueryBuilder) => {
      const selectBuilder = new SelectBuilder({
        filter: filterValue,
        knexBuilder: subQueryBuilder,
        knex: this.knex,
        metadata: referenceTableMetadata,
        schemaMapper: this.schemaMapper,
        aliasMap: this.aliasMap,
        isTopLevel: false,
      });

      selectBuilder.list(1);
      selectBuilder
        .getWhereBuilder()
        .whereJoin(foreignKey, whereBuilder.getAlias());
    });
  }

  private join(
    foreignKey: ForeignKeyMetadata,
    alias: string,
    targetAlias: string
  ) {
    const { referenceTable, columns, referenceColumns } = foreignKey;

    this.knexBuilder.leftJoin(
      {
        [targetAlias]: referenceTable,
      },
      (qb) => {
        for (let i = 0; i < columns.length; i++) {
          qb.andOn(
            `${targetAlias}.${referenceColumns[i]}`,
            '=',
            `${alias}.${columns[i]}`
          );
        }
      }
    );
  }

  getSchemaMapper() {
    return this.schemaMapper;
  }

  private build() {
    this.knexBuilder.from({
      [this.topWhereBuilder.getAlias()]: this.metadata.name,
    });
    // build where statements
    this.topWhereBuilder.build();

    return this.knexBuilder;
  }

  list(fields: any = '*') {
    if (fields === '*') {
      this.knexBuilder.select(`${this.topWhereBuilder.getAlias()}.*`);
    } else {
      this.knexBuilder.select(fields);
    }
    return this.build();
  }

  private getWhereBuilder() {
    return this.topWhereBuilder;
  }

  async count() {
    const queryBuilder = this.build();

    const [result = {}] = await queryBuilder.count();

    return result['count(*)'] ?? 0;
  }
}
