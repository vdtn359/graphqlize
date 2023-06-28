import type {
  TableMetadata,
  ForeignKeyMetadata,
} from '@vdtn359/graphqlize-mapper';
import { Knex } from 'knex';
import { WhereBuilder } from './where-builder';
import type { SqlMapper } from '../schema-mapper';
import { generateAlias } from '../utils';

export class SelectBuilder {
  private readonly metadata: TableMetadata;

  private pagination: Record<string, any>;

  private readonly filter: Record<string, any>;

  private readonly knex: Knex;

  private readonly schemaMapper: SqlMapper;

  private readonly aliasMap: Record<string, number> = {};

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

  private applyFilter(knexBuilder: Knex.QueryBuilder) {
    const filterBuilder = new WhereBuilder({
      filter: this.filter,
      metadata: this.metadata,
      knex: this.knex,
      knexBuilder,
      selectBuilder: this,
      alias: this.claimAlias(this.metadata.name),
      isTopLevel: true,
    });
    knexBuilder.select(`${filterBuilder.getAlias()}.*`);
    knexBuilder.from({
      [filterBuilder.getAlias()]: this.metadata.name,
    });

    filterBuilder.where();
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
    if (whereBuilder.getTopLevel() && filterValue?._nested !== false) {
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
    const knexBuilder = whereBuilder.getKnexBuilder();
    const { referenceTable } = foreignKey;
    const referenceTableMetadata =
      this.schemaMapper.getTableMetadata(referenceTable);

    const targetWhereBuilder = new WhereBuilder({
      filter: filterValue,
      knexBuilder,
      selectBuilder: this,
      metadata: referenceTableMetadata,
      knex: this.knex,
      alias: this.claimAlias(referenceTable),
    });

    this.join(
      knexBuilder,
      foreignKey,
      whereBuilder.getAlias(),
      targetWhereBuilder.getAlias()
    );
    targetWhereBuilder.where();
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
      const targetWhereBuilder = new WhereBuilder({
        filter: filterValue,
        knexBuilder: subQueryBuilder,
        selectBuilder: this,
        metadata: referenceTableMetadata,
        knex: this.knex,
        alias: this.claimAlias(referenceTable),
      });

      this.exists(
        subQueryBuilder,
        referenceTableMetadata,
        targetWhereBuilder.getAlias()
      );
      targetWhereBuilder.whereJoin(foreignKey, whereBuilder.getAlias());
      targetWhereBuilder.where();
    });
  }

  private exists(
    knexBuilder: Knex.QueryBuilder,
    tableMetadata: TableMetadata,
    alias: string
  ) {
    knexBuilder.select(1);
    knexBuilder.from({
      [alias]: tableMetadata.name,
    });
  }

  private join(
    knexBuilder: Knex.QueryBuilder,
    foreignKey: ForeignKeyMetadata,
    alias: string,
    targetAlias: string
  ) {
    const { referenceTable, columns, referenceColumns } = foreignKey;

    knexBuilder.leftJoin(
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

  select() {
    const queryBuilder = this.knex.select();
    this.applyFilter(queryBuilder);
    return queryBuilder;
  }
}
