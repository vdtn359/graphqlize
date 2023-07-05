import type {
  TableMetadata,
  ForeignKeyMetadata,
  Pagination,
} from '@vdtn359/graphqlize-mapper';
import { Knex } from 'knex';
import jsonStringify from 'json-stringify-deterministic';
import { map, TraverseContext } from 'traverse';
import { WhereBuilder } from './where-builder';
import type { SchemaMapper } from '../schema-mapper';
import { generateAlias } from '../utils';

export class SelectBuilder {
  private readonly metadata: TableMetadata;

  private readonly pagination?: Pagination;

  private readonly sort?: Record<string, any>[];

  private readonly filter: Record<string, any>;

  private readonly knex: Knex;

  private readonly schemaMapper: SchemaMapper;

  private readonly aliasMap: Record<string, number>;

  private readonly topWhereBuilder: WhereBuilder;

  private readonly knexBuilder: Knex.QueryBuilder;

  private readonly isTopLevel: boolean;

  private joinMap: Record<string, Record<string, string>> = {};

  private readonly fields?: Record<string, any>;

  private readonly groupBy?: Record<string, any>;

  private readonly having?: Record<string, any>;

  constructor({
    filter,
    pagination,
    sort,
    fields,
    groupBy,
    having,
    metadata,
    knex,
    schemaMapper,
    knexBuilder,
    aliasMap = {},
    isTopLevel = true,
  }: {
    filter?: Record<string, any>;
    fields?: Record<string, any>;
    groupBy?: Record<string, any>;
    having?: Record<string, any>;
    sort?: Record<string, any>[];
    metadata: TableMetadata;
    schemaMapper: SchemaMapper;
    knexBuilder?: Knex.QueryBuilder;
    knex: Knex;
    pagination?: Pagination;
    isTopLevel?: boolean;
    aliasMap?: Record<string, number>;
  }) {
    this.schemaMapper = schemaMapper;
    this.pagination = pagination;
    this.metadata = metadata;
    this.knex = knex;
    this.filter = filter ?? {};
    this.fields = fields;
    this.groupBy = groupBy;
    this.having = having;
    this.sort = sort;
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
    if (
      filterValue &&
      !Object.values(filterValue).filter((val) => val !== undefined).length
    ) {
      return;
    }
    const { referenceTable } = foreignKey;
    const referenceTableMetadata =
      this.schemaMapper.getTableMetadata(referenceTable);

    const existingJoin = this.joinMap[this.getJoinKey(foreignKey)];
    let usedFilter = filterValue;

    if (usedFilter === null) {
      usedFilter = {};
      const { referenceColumns } = foreignKey;
      for (const referenceColumn of referenceColumns) {
        usedFilter[referenceColumn] = {
          _eq: null,
        };
      }
    }

    const targetWhereBuilder = new WhereBuilder({
      filter: usedFilter,
      knexBuilder: whereBuilder.getKnexBuilder(),
      selectBuilder: this,
      metadata: referenceTableMetadata,
      knex: this.knex,
      alias: existingJoin?.[referenceTable] ?? this.claimAlias(referenceTable),
    });
    if (!existingJoin) {
      this.join(
        foreignKey,
        whereBuilder.getAlias(),
        targetWhereBuilder.getAlias()
      );
    }
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
    if (
      filterValue &&
      !Object.values(filterValue).filter((val) => val !== undefined).length
    ) {
      return;
    }
    const knexBuilder = whereBuilder.getKnexBuilder();
    const { referenceTable } = foreignKey;
    const referenceTableMetadata =
      this.schemaMapper.getTableMetadata(referenceTable);

    const usedMethod = filterValue ? 'whereExists' : 'whereNotExists';

    knexBuilder[usedMethod]((subQueryBuilder) => {
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
    const joinKey = this.getJoinKey(foreignKey);
    if (this.joinMap[joinKey]) {
      return this.joinMap[joinKey];
    }
    const { table, referenceTable, columns, referenceColumns } = foreignKey;
    this.joinMap[joinKey] = {
      [table]: alias,
      [referenceTable]: targetAlias,
    };

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

    return this.joinMap[joinKey];
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

    if (this.pagination && !this.pagination.disabled) {
      this.knexBuilder.limit(this.pagination.limit);
      this.knexBuilder.offset(this.pagination.offset);
    }

    if (this.sort) {
      this.applySort(this.sort);
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

  private applySort(sorts: Record<string, any>[]) {
    for (const sortItem of sorts) {
      this.resolveAndJoinAlias({
        fields: sortItem,
        alias: this.topWhereBuilder.getAlias(),
        tableMetadata: this.metadata,
        callback: (context, { alias, tableMetadata }, value) => {
          if (
            tableMetadata.columns[context.key!] &&
            typeof value.direction === 'string'
          ) {
            this.knexBuilder.orderBy(
              `${alias}.${context.key}`,
              value.direction,
              value.nulls
            );
            return {
              value,
              stop: true,
            };
          }
          return undefined;
        },
      });
    }
  }

  private getJoinKey(foreignKey: ForeignKeyMetadata) {
    return jsonStringify({
      [foreignKey.referenceTable]: [foreignKey.referenceColumns],
      [foreignKey.table]: [foreignKey.columns],
    });
  }

  async aggregate() {
    if (this.fields) {
      const knexBuilder = this.build();
      const { select: aggregateFields, mapping: aggregateMapping } =
        this.convertFieldsToAlias(this.fields);
      const { select: groupFields, mapping: groupMapping } =
        this.convertFieldsToAlias({ group: this.groupBy });
      this.knexBuilder.select({
        ...aggregateFields,
        ...groupFields,
      });
      for (const groupField of Object.values(groupFields ?? {})) {
        this.knexBuilder.groupByRaw(groupField);
      }

      const results = await knexBuilder;
      return results.map((result: any) =>
        map({ ...aggregateMapping, ...groupMapping }, (value) => {
          if (typeof value !== 'object') {
            return result[value];
          }
          return undefined;
        })
      );
    }
    return null;
  }

  convertFieldsToAlias(fields: Record<string, any>) {
    const select: Record<string, any> = {};
    const mapping: Record<string, any> = {};

    for (const [operation, fieldValue] of Object.entries(fields)) {
      mapping[operation] = this.resolveAndJoinAlias({
        fields: fieldValue,
        alias: this.topWhereBuilder.getAlias(),
        tableMetadata: this.metadata,
        callback: (context, { alias }, value) => {
          if (value === true) {
            const fieldAlias = [operation, alias, context.key].join('_');
            const columnPath = this.knex.raw('??', `${alias}.${context.key}`);
            select[fieldAlias] =
              operation !== 'group'
                ? this.knex.raw(`${operation}(${columnPath.toQuery()})`)
                : columnPath;
            return {
              value: fieldAlias,
              stop: true,
            };
          }
          return undefined;
        },
      });
    }
    return {
      select,
      mapping,
    };
  }

  resolveAndJoinAlias({
    alias: initialAlias,
    tableMetadata: initialTableMetadata,
    callback,
    fields,
  }: {
    tableMetadata: TableMetadata;
    alias: string;
    callback: (
      context: TraverseContext,
      node: { alias: string; tableMetadata: TableMetadata },
      value: any
    ) => { stop: boolean; value?: any } | void;
    fields: Record<string, any>;
  }) {
    const nodes: Record<
      string,
      { alias: string; tableMetadata: TableMetadata }
    > = {
      '': {
        alias: initialAlias,
        tableMetadata: initialTableMetadata,
      },
    };

    const handleNode = (context: TraverseContext, value: any) => {
      const parentPath = [...context.path]
        .slice(0, context.path.length - 1)
        .join('/');
      const newNode = nodes[parentPath] ?? nodes[''];
      if (context.key && context.path.length) {
        const { alias: currentAlias, tableMetadata: currentTableMetadata } =
          newNode;

        const associations = {
          ...currentTableMetadata.belongsTo,
          ...currentTableMetadata.hasMany,
          ...currentTableMetadata.hasOne,
        };

        if (associations[context.key]) {
          const foreignKey = associations[context.key];
          const { referenceTable } = foreignKey;
          const referenceTableMetadata =
            this.schemaMapper.getTableMetadata(referenceTable);
          let existingJoin = this.joinMap[this.getJoinKey(foreignKey)];

          if (!existingJoin) {
            // not already join
            existingJoin = this.join(
              foreignKey,
              currentAlias,
              this.claimAlias(referenceTable)
            );
          }
          const newPath = context.path.join('/');
          nodes[newPath] = {
            alias: existingJoin[referenceTable],
            tableMetadata: referenceTableMetadata,
          };
        }

        const result = callback(context, newNode, value);
        if (result?.value) {
          context.update(result.value, result?.stop);
        }
      }
    };

    return map(fields, function traverse(value) {
      handleNode(this, value);
    });
  }
}
