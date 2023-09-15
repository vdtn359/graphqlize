/* eslint-disable no-underscore-dangle */
import type {
  TableMetadata,
  ForeignKeyMetadata,
  Pagination,
  SortDirection,
  NullsDirection,
} from '@vdtn359/graphqlize-mapper';
import { Knex } from 'knex';
import jsonStringify from 'json-stringify-deterministic';
import { map, TraverseContext } from 'traverse';
import { omit } from 'lodash';
import { WhereBuilder } from './where-builder';
import type { SchemaMapper } from '../schema-mapper';
import { generateAlias } from '../utils';
import { getDialectHandler } from '../dialects/factory';
import { BaseDialect } from '../dialects/base';

export class SelectBuilder {
  private readonly metadata: TableMetadata;

  private readonly pagination?: Pagination;

  private readonly sort?: Record<string, any>[];

  private readonly filter: Record<string, any>;

  private readonly knex: Knex;

  private readonly dialectHandler: BaseDialect;

  private readonly schemaMapper: SchemaMapper;

  private readonly aliasMap: Record<string, number>;

  private readonly topWhereBuilder: WhereBuilder;

  private readonly partitions?: Record<string, any>[];

  private readonly knexBuilder: Knex.QueryBuilder;

  private readonly isTopLevel: boolean;

  private joinMap: Record<string, [string, string]> = {};

  private readonly fields?: Record<string, any>;

  private readonly groupBy?: Record<string, any>;

  private readonly having?: Record<string, any>;

  private readonly useWindowFunctions?: boolean;

  private readonly foreignKey?: ForeignKeyMetadata;

  constructor({
    filter,
    pagination,
    sort,
    fields,
    partitions,
    groupBy,
    having,
    metadata,
    knex,
    schemaMapper,
    knexBuilder,
    aliasMap = {},
    isTopLevel = true,
    useWindowFunctions = false,
    foreignKey,
  }: {
    filter?: Record<string, any>;
    fields?: Record<string, any>;
    groupBy?: Record<string, any>;
    having?: Record<string, any>;
    sort?: Record<string, any>[];
    partitions?: Record<string, any>[];
    metadata: TableMetadata;
    schemaMapper: SchemaMapper;
    knexBuilder?: Knex.QueryBuilder;
    knex: Knex;
    pagination?: Pagination;
    isTopLevel?: boolean;
    aliasMap?: Record<string, number>;
    useWindowFunctions?: boolean;
    foreignKey?: ForeignKeyMetadata;
  }) {
    this.schemaMapper = schemaMapper;
    this.pagination = pagination;
    this.metadata = metadata;
    this.useWindowFunctions = useWindowFunctions;
    this.knex = knex;
    this.filter = filter ?? {};
    this.fields = fields;
    this.partitions = partitions;
    this.groupBy = groupBy;
    this.having = having;
    this.sort = sort;
    this.aliasMap = aliasMap;
    this.isTopLevel = isTopLevel;
    this.foreignKey = foreignKey;
    this.knexBuilder =
      knexBuilder ??
      this.knex.select().queryContext({
        table: this.metadata.name,
      });
    this.dialectHandler = getDialectHandler(this.knexBuilder.client.dialect);

    this.topWhereBuilder = new WhereBuilder({
      filter: this.filter,
      metadata: this.metadata,
      knex: this.knex,
      knexBuilder: this.knexBuilder,
      selectBuilder: this,
      alias: this.claimAlias(this.metadata.name),
      partitions: this.partitions,
    });
  }

  list(fields: any = '*'): Knex.QueryBuilder | Knex.QueryBuilder[] {
    if (
      this.partitions?.length &&
      this.pagination?.perPartition &&
      this.isTopLevel
    ) {
      return this.applyPartitionSelect(fields);
    }
    if (fields === '*') {
      this.knexBuilder.select(`${this.topWhereBuilder.getAlias()}.*`);
    } else {
      this.knexBuilder.select(fields);
    }
    return this.build();
  }

  async count() {
    const queryBuilder = this.build();

    const [result = {}] = await queryBuilder.count();

    return result.count ?? result['count(*)'] ?? 0;
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
    const existingJoin = this.getJoinAlias(whereBuilder.getAlias(), foreignKey);
    if (this.isTopLevel && !existingJoin && filterValue?._nested !== false) {
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

    const existingJoin = this.getJoinAlias(whereBuilder.getAlias(), foreignKey);
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
      alias: existingJoin ?? this.claimAlias(referenceTable),
    });
    if (!existingJoin) {
      this.join(
        foreignKey,
        whereBuilder.getAlias(),
        targetWhereBuilder.getAlias(),
        filterValue?._required
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
        foreignKey,
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
    targetAlias: string,
    required = false
  ) {
    const existingJoin = this.getJoinAlias(alias, foreignKey);
    if (existingJoin) {
      return existingJoin;
    }
    const isBelongsTo = foreignKey.type === 'belongsTo';
    const joinKey = this.getJoinKey(alias, foreignKey);
    const inverseJoinKey = this.getJoinKey(targetAlias, foreignKey);
    const { referenceTable, columns, referenceColumns } = foreignKey;
    const joinValue: [string, string] = isBelongsTo
      ? [alias, targetAlias]
      : [targetAlias, alias];
    this.joinMap[joinKey] = joinValue;
    this.joinMap[inverseJoinKey] = joinValue;

    const joinType = required ? 'join' : 'leftJoin';
    this.knexBuilder[joinType](
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

    return targetAlias;
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

    if (this.pagination && !this.pagination.disabled) {
      this.knexBuilder.limit(this.pagination.limit);
      this.knexBuilder.offset(this.pagination.offset);
    }

    if (this.sort) {
      this.applySort(this.sort);
    }

    return this.knexBuilder;
  }

  private applyPartitionSelect(fields: any) {
    if (!this.partitions?.length) {
      throw new Error('Partitions not defined');
    }
    if (!this.pagination?.limit) {
      throw new Error('Pagination not defined');
    }
    if (this.useWindowFunctions) {
      const selectBuilder = new SelectBuilder({
        filter: this.filter,
        partitions: this.partitions,
        knex: this.knex,
        metadata: this.metadata,
        schemaMapper: this.schemaMapper,
      });
      const subQuery = selectBuilder.list(fields) as Knex.QueryBuilder;

      const partitionOrderBy: any = this.sort
        ? this.applySort(this.sort, false)
        : this.knex.raw('select 1');
      const partitionBy = Object.keys(this.partitions[0]).map(
        (key) => `${this.topWhereBuilder.getAlias()}.${key}`
      );
      subQuery.rowNumber('partition_row_number', (qb) => {
        qb.orderBy(partitionOrderBy).partitionBy(partitionBy);
      });
      const offset = (this.pagination.offset ?? 0) + 1;
      return this.knexBuilder
        .select()
        .from({
          main: subQuery as any,
        })
        .whereBetween('partition_row_number', [
          offset,
          offset + this.pagination.limit - 1,
        ]);
    }
    // create a new select statement per partition and join the results
    return this.partitions.map((partition) => {
      const selectBuilder = new SelectBuilder({
        filter: this.filter,
        pagination: omit(this.pagination, 'perPartition'),
        partitions: [partition],
        sort: this.sort,
        knex: this.knex,
        metadata: this.metadata,
        schemaMapper: this.schemaMapper,
      });

      return selectBuilder.list(fields) as Knex.QueryBuilder;
    });
  }

  getWhereBuilder() {
    return this.topWhereBuilder;
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  private applySort(sorts: Record<string, any>[], orderBy = true) {
    const fields: {
      column: any;
      order?: SortDirection;
      nulls?: NullsDirection;
    }[] = [];
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
            if (context.parent?.key && context.parent.key.startsWith('_')) {
              const { expression: orderExpression } = this.buildSelectField({
                parentKey: context.parent?.key,
                key: context.key!,
                tableAlias: alias,
              });

              if (orderBy) {
                this.knexBuilder.orderBy(
                  orderExpression as any,
                  value.direction,
                  value.nulls
                );
              }

              fields.push({
                column: orderExpression,
                order: value.direction,
                nulls: value.nulls,
              });

              return {
                value,
                stop: true,
              };
            }
            const fieldName = `${alias}.${context.key}`;
            if (orderBy) {
              this.knexBuilder.orderBy(fieldName, value.direction, value.nulls);
            }
            fields.push({
              column: fieldName,
              order: value.direction,
              nulls: value.nulls,
            });
            return {
              value,
              stop: true,
            };
          }
          return undefined;
        },
      });
    }
    return fields;
  }

  private getJoinAlias(alias: string, foreignKey: ForeignKeyMetadata) {
    const joinKey = this.getJoinKey(alias, foreignKey);
    const existingJoin = this.joinMap[joinKey];

    if (existingJoin) {
      return foreignKey.type === 'belongsTo'
        ? existingJoin[1]
        : existingJoin[0];
    }
    return null;
  }

  private getJoinKey(alias: string, foreignKey: ForeignKeyMetadata) {
    return jsonStringify(
      foreignKey.type === 'belongsTo'
        ? [
            alias,
            foreignKey.table,
            foreignKey.columns,
            foreignKey.referenceTable,
            foreignKey.referenceColumns,
          ]
        : [
            alias,
            foreignKey.referenceTable,
            foreignKey.referenceColumns,
            foreignKey.table,
            foreignKey.columns,
          ]
    );
  }

  aggregateBuilder() {
    if (this.fields) {
      this.build();
      const { select: aggregateFields, mapping: aggregateMapping } =
        this.convertFieldsToAlias(this.fields);
      const { select: groupFields, mapping: groupMapping } =
        this.convertFieldsToAlias({ group: this.groupBy });
      if (this.having) {
        this.applyHaving(this.having);
      }
      this.knexBuilder.select({
        ...aggregateFields,
        ...groupFields,
      });
      for (const groupField of Object.values(groupFields ?? {})) {
        this.knexBuilder.groupByRaw(groupField);
      }
      return {
        query: this.knexBuilder,
        fields: {
          ...aggregateMapping,
          ...groupMapping,
        },
      };
    }
    return null;
  }

  async aggregate() {
    const aggregateQuery = this.aggregateBuilder();
    if (aggregateQuery?.fields) {
      const results = await this.knexBuilder;
      return results.map((result: any) =>
        map(aggregateQuery.fields, (value) => {
          if (typeof value !== 'object') {
            if (result[value] instanceof Date) {
              return result[value].toISOString();
            }
            return result[value];
          }
          return undefined;
        })
      );
    }
    return null;
  }

  async aggregateCount() {
    const aggregateQuery = this.aggregateBuilder();
    if (aggregateQuery?.query) {
      const queryBuilder = this.knex.select().from({
        main: aggregateQuery.query.select(1) as any,
      });
      const [result = {}] = await queryBuilder.count();
      return result.count ?? result['count(*)'] ?? 0;
    }
    return 0;
  }

  private applyHaving(havingFilter: Record<string, any>) {
    const { metadata } = this;
    const transformedHavingFilter = map(havingFilter, function traverse(value) {
      // disable subquery for having queries
      if (
        this.key &&
        metadata.hasMany[this.key] &&
        typeof value === 'object' &&
        value._nested !== undefined
      ) {
        return {
          ...value,
          _nested: false,
        };
      }
      return undefined;
    });
    const whereBuilder = new WhereBuilder({
      filter: transformedHavingFilter,
      metadata: this.metadata,
      alias: this.topWhereBuilder.getAlias(),
      knex: this.knex,
      knexBuilder: this.knex.select(),
      selectBuilder: this,
    });
    whereBuilder.build();

    const { having, where, bindings } = whereBuilder.toQuery();

    if (having || where) {
      const statement = [where, having].filter(Boolean).join(' AND ');
      this.knexBuilder.havingRaw(statement, bindings);
    }
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  private convertFieldsToAlias(fields: Record<string, any>) {
    const select: Record<string, any> = {};
    const mapping: Record<string, any> = {};

    for (const [operation, fieldValue] of Object.entries(fields)) {
      mapping[operation] = this.resolveAndJoinAlias({
        fields: fieldValue,
        alias: this.topWhereBuilder.getAlias(),
        tableMetadata: this.metadata,
        callback: (context, { alias: tableAlias }, value) => {
          if (value === true) {
            const { alias: fieldAlias, expression } = this.buildSelectField({
              parentKey:
                operation === 'group' ? context.parent?.key : operation,
              key: context.key ?? '',
              tableAlias,
            });
            // leaf node
            select[fieldAlias] = expression;
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

  private buildSelectField({
    parentKey,
    key,
    tableAlias,
  }: {
    parentKey?: string;
    key: string;
    tableAlias: string;
  }) {
    const operation = (parentKey?.replace('_', '') as any) ?? '';
    const isDistinct = operation === 'countDistinct';
    let aggregateOperation: string | null = null;
    // leaf node
    let columnPath =
      key === '_all'
        ? this.knex.raw('*')
        : this.knex.raw('??', `${tableAlias}.${key}`);
    const aliasPaths = [tableAlias, parentKey].filter(Boolean);
    switch (operation) {
      case 'year':
      case 'month':
      case 'date':
      case 'yearMonth':
      case 'day':
      case 'dayOfWeek': {
        aliasPaths.push(operation);
        // @ts-ignore
        columnPath = this.dialectHandler[operation](
          this.knex,
          columnPath.toQuery()
        );
        break;
      }
      default:
        if (
          operation &&
          ['count', 'countDistinct', 'max', 'min', 'sum', 'avg'].includes(
            operation
          )
        ) {
          aggregateOperation = isDistinct ? 'count' : operation;
          aliasPaths.push(aggregateOperation as string);
        }
        break;
    }

    const fieldAlias = [...aliasPaths, key].join('_').toLowerCase();
    const expression = aggregateOperation
      ? this.knex.raw(
          `${aggregateOperation}(${
            isDistinct ? 'DISTINCT ' : ''
          }${columnPath.toQuery()})`
        )
      : columnPath;

    return {
      alias: fieldAlias,
      expression,
    };
  }

  private resolveAndJoinAlias({
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
          let existingJoin = this.getJoinAlias(currentAlias, foreignKey);

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
            alias: existingJoin,
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

  getForeignKey() {
    return this.foreignKey;
  }

  getDialectHandler() {
    return this.dialectHandler;
  }
}
