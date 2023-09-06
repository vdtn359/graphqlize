import type {
  DatabaseMapper,
  ForeignKeyMetadata,
  ForeignKeyType,
  IntrospectionResult,
  IntrospectionTableResult,
  TableMapper,
  TableMetadata,
} from '@vdtn359/graphqlize-mapper';
import schemaInspector from '@vdtn359/knex-schema-inspector';
import { knex, Knex } from 'knex';
import { fromPairs, mapValues, merge } from 'lodash';
import { GraphQLDateTime, GraphQLJSONObject } from 'graphql-scalars';
import fsPromise from 'fs/promises';
import fs from 'fs';
import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLString,
} from 'graphql';
import { Column } from '@vdtn359/knex-schema-inspector/dist/types/column';
import { plural as pluralize } from 'pluralize';
import { ForeignKey } from '@vdtn359/knex-schema-inspector/dist/types/foreign-key';
import jsonStringify from 'json-stringify-deterministic';
import { GraphQLScalarType } from 'graphql/index';
import { SqlTableMapper } from './table-mapper';
import { SchemaOptions, TableOptions } from './options';

export class SchemaMapper implements DatabaseMapper {
  instance: Knex;

  private inspector: ReturnType<typeof schemaInspector> | null;

  private tables: Record<string, TableMetadata> = {};

  private constructor(
    config: Knex.Config,
    private readonly options: SchemaOptions = {}
  ) {
    const { introspect = true } = options;
    this.instance = knex({
      searchPath: options.schema,
      // @ts-ignore: only applicable for mysql
      typeCast(field, next) {
        if (field.type === 'TINY') {
          return field.string() === '1';
        }
        return next();
      },
      postProcessResponse: (result, queryContext) => {
        if (!queryContext?.table || !result || typeof result !== 'object') {
          return result;
        }
        if (Array.isArray(result)) {
          return result.map((record) =>
            this.transformResult(record, queryContext.table)
          );
        }
        return this.transformResult(result, queryContext.table);
      },
      ...config,
    });
    this.inspector = introspect ? schemaInspector(this.instance) : null;
  }

  private transformResult(record: Record<string, any>, table: string) {
    const tableMetadata = this.getTableMetadata(table);
    // eslint-disable-next-line sonarjs/cognitive-complexity
    return mapValues(record, (value, key) => {
      if (!value) {
        return value;
      }
      if (tableMetadata.columns[key]) {
        const columnMetadata = tableMetadata.columns[key];
        if (!(columnMetadata.type instanceof GraphQLScalarType)) {
          return value;
        }
        if (columnMetadata.type.name === 'Int' && typeof value === 'string') {
          return parseInt(value, 10);
        }
        if (columnMetadata.type.name === 'Float' && typeof value === 'string') {
          return parseFloat(value);
        }
        if (
          columnMetadata.type.name === 'JSONObject' &&
          typeof value === 'string'
        ) {
          return JSON.parse(value);
        }
        if (
          columnMetadata.type.name === 'Date' ||
          columnMetadata.type.name === 'DateTime'
        ) {
          const date = new Date(value);
          return Number.isNaN(date.getTime()) ? null : date.toISOString();
        }
      }
      return value;
    });
  }

  static async create(config: Knex.Config, options?: SchemaOptions) {
    const mapper = new SchemaMapper(config, options);
    await mapper.init();

    return mapper;
  }

  private async getIntrospectionResult(): Promise<IntrospectionResult> {
    if (!this.options.version) {
      return this.introspect();
    }
    const { versionFile = 'schema.json' } = this.options;
    const cachedResult = fs.existsSync(versionFile)
      ? JSON.parse(
          await fsPromise.readFile(versionFile, {
            encoding: 'utf-8',
          })
        )
      : null;
    const shouldUseCacheResult =
      cachedResult &&
      jsonStringify(cachedResult.options) === jsonStringify(this.options);
    if (shouldUseCacheResult) {
      return cachedResult.results;
    }
    const introspectResult = await this.introspect();

    await fsPromise.writeFile(
      versionFile,
      JSON.stringify({
        options: this.options,
        results: introspectResult,
      }),
      {
        encoding: 'utf-8',
      }
    );

    return introspectResult;
  }

  private async introspect(): Promise<IntrospectionResult> {
    const { inspector } = this;
    if (!inspector) {
      if (!this.options.tables) {
        throw new Error('Tables must be provided when not introspecting');
      }
      return mapValues(this.options.tables, (value, table) => ({
        compositeKeys: {},
        alias: table,
        columns: {},
        candidateKeys: {},
        foreignKeys: {},
        ...value,
      })) as IntrospectionResult;
    }
    let filteredTables =
      this.options.includeTables ?? (await inspector.tables());
    filteredTables = filteredTables.filter(
      (table) => !this.options.excludeTables?.includes(table)
    );

    const introspectionResult = fromPairs(
      await Promise.all(
        filteredTables.map(async (table) => {
          const tableOption = this.options.tables?.[table] ?? {};

          const filteredColumns = this.filterColumns(
            await inspector.columnInfo(table),
            tableOption
          );

          const filteredForeignKeys = this.filterForeignKeys(
            filteredTables,
            filteredColumns.map((column) => column.name),
            await inspector.foreignKeys(table),
            tableOption
          );

          const primaryKey = await inspector.primary(table);

          const introspectionTableResult: IntrospectionTableResult = {
            alias: table,
            primaryKey,
            candidateKeys: {},
            compositeKeys: {},
            columns: {},
            foreignKeys: this.getForeignKeys(filteredForeignKeys, table),
          };

          if (primaryKey) {
            introspectionTableResult.candidateKeys[primaryKey] = [primaryKey];
          }

          for (const column of filteredColumns) {
            introspectionTableResult.columns[column.name] = {
              nullable: column.is_nullable,
              defaultValue: column.default_value,
              rawType: column.data_type,
            };

            if (column.is_unique) {
              introspectionTableResult.candidateKeys[column.name] = [
                column.name,
              ];
            }
          }

          return [table, introspectionTableResult];
        })
      )
    );

    return merge(introspectionResult, this.options.tables);
  }

  private filterColumns(columns: Column[], tableOptions: TableOptions) {
    return columns.filter((column) =>
      this.allowColumn(column.name, tableOptions)
    );
  }

  private allowColumn(column: string, tableOptions: TableOptions) {
    if (tableOptions.includeColumns?.length) {
      return tableOptions.includeColumns.includes(column);
    }
    if (tableOptions.excludeColumns?.length) {
      return !tableOptions.excludeColumns.includes(column);
    }

    return true;
  }

  private filterForeignKeys(
    tables: string[],
    columns: string[],
    foreignKeys: ForeignKey[],
    tableOptions: TableOptions
  ) {
    let filteredForeignKeys = foreignKeys;

    if (tableOptions.includeForeignKeys?.length) {
      filteredForeignKeys = filteredForeignKeys.filter((foreignKey) =>
        tableOptions.includeForeignKeys?.includes(foreignKey.column)
      );
    }
    if (tableOptions.excludeForeignKeys?.length) {
      filteredForeignKeys = filteredForeignKeys.filter(
        (foreignKey) =>
          !tableOptions.excludeForeignKeys?.includes(foreignKey.column)
      );
    }
    return filteredForeignKeys.filter((foreignKey) => {
      if (!tables.includes(foreignKey.foreign_key_table)) {
        return false;
      }

      if (!columns.includes(foreignKey.column)) {
        return false;
      }

      const referenceTableOptions =
        this.options.tables?.[foreignKey.foreign_key_table];

      return !(
        referenceTableOptions &&
        !this.allowColumn(foreignKey.foreign_key_column, referenceTableOptions)
      );
    });
  }

  async init() {
    const result = await this.getIntrospectionResult();

    for (const [table, tableInfo] of Object.entries(result)) {
      const { columns, foreignKeys } = tableInfo;
      this.tables[table] = {
        ...tableInfo,
        name: table,
        columns: mapValues(columns, (column, name) => ({
          ...column,
          name,
          type: this.mapType(column.rawType, column.enumValues),
        })),
        belongsTo: mapValues(foreignKeys, (value) => ({
          ...value,
          type: 'belongsTo' as const,
          table,
        })),
        hasOne: {},
        hasMany: {},
      };
    }

    for (const [table, tableInfo] of Object.entries(result)) {
      this.buildHasMany(tableInfo.foreignKeys, table);
    }
  }

  private getForeignKeys(
    foreignKeys: ForeignKey[],
    table: string
  ): Record<string, ForeignKeyMetadata> {
    return foreignKeys.reduce((agg, current) => {
      const constraintName = current.column.includes('_')
        ? current.column.replace(/_id$/, '')
        : current.column;
      return {
        ...agg,
        [constraintName]: {
          columns: [current.column],
          type: 'belongsTo',
          table,
          referenceTable: current.foreign_key_table,
          referenceColumns: [current.foreign_key_column],
        },
      };
    }, {});
  }

  private buildHasMany(
    foreignKeys: IntrospectionTableResult['foreignKeys'],
    table: string
  ) {
    for (const foreignKey of Object.values(foreignKeys)) {
      if (table !== foreignKey.referenceTable) {
        this.tables[foreignKey.referenceTable].hasMany[pluralize(table)] = {
          columns: foreignKey.referenceColumns,
          table: foreignKey.referenceTable,
          referenceTable: table,
          referenceColumns: foreignKey.columns,
          type: 'hasMany',
        };
      }
    }
  }

  listColumns(table: string) {
    const tableMetadata = this.getTableMetadata(table);
    return tableMetadata.columns;
  }

  listTables() {
    return Object.keys(this.tables);
  }

  hasColumn(table: string, column: string) {
    const tableMetadata = this.getTableMetadata(table);
    return !!tableMetadata.columns[column];
  }

  getColumn(table: string, column: string) {
    const tableMetadata = this.getTableMetadata(table);
    if (!tableMetadata.columns[column]) {
      throw new Error(`Column ${column} not found in table ${table}`);
    }
    return tableMetadata.columns[column];
  }

  getTableMetadata(table: string): TableMetadata {
    if (!this.tables[table]) {
      throw new Error(`Table ${table} not found`);
    }
    return this.tables[table];
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  private mapType(dataType: string, enumValues?: string[]) {
    const transformedType = dataType.toLowerCase();
    if (
      transformedType.includes('char') ||
      transformedType.includes('text') ||
      transformedType === 'time' ||
      transformedType === 'blob'
    ) {
      return GraphQLString;
    }
    if (transformedType.includes('tinyint') || transformedType === 'boolean') {
      return GraphQLBoolean;
    }
    if (transformedType === 'date') {
      return GraphQLString;
    }
    if (
      transformedType.includes('datetime') ||
      transformedType.includes('timestamp') ||
      transformedType.includes('time')
    ) {
      return GraphQLDateTime;
    }
    if (
      transformedType.includes('float') ||
      transformedType.includes('double') ||
      transformedType === 'numeric' ||
      transformedType === 'decimal'
    ) {
      return GraphQLFloat;
    }
    if (transformedType.includes('int')) {
      return GraphQLInt;
    }
    if (transformedType === 'bigint') {
      return GraphQLFloat;
    }
    if (transformedType === 'set') {
      return new GraphQLList(GraphQLString);
    }
    if (transformedType.includes('enum')) {
      const isValidEnum =
        enumValues?.length &&
        enumValues.every((value) => /^(A-Z|a-z)\w+$/.test(value));
      if (isValidEnum) {
        return new GraphQLEnumType({
          name: 'EnumValues',
          values: enumValues.reduce(
            (agg, value) => ({
              ...agg,
              [value]: {
                value,
              },
            }),
            {}
          ),
        });
      }
      return GraphQLString;
    }
    if (transformedType.includes('json')) {
      return GraphQLJSONObject;
    }
    throw new Error(`Unmapped type: ${dataType}`);
  }

  getTableMapper<T>(table: string): TableMapper<T> {
    if (!this.tables[table]) {
      throw new Error(`Table ${table} not found`);
    }
    return new SqlTableMapper(
      this.instance,
      this.tables[table],
      this,
      this.options.allowWindowFunctions
    );
  }

  defineForeignKey({
    table,
    type,
    name,
    foreignKey,
  }: {
    table: string;
    type: ForeignKeyType;
    name: string;
    foreignKey: Omit<ForeignKeyMetadata, 'table' | 'type'>;
  }) {
    this.tables[table][type][name] = {
      ...foreignKey,
      table,
      type,
    };
  }

  defineCandidateKeys(table: string, name: string, columns: string[]) {
    this.tables[table].candidateKeys[name] = columns;
    if (columns.length > 1) {
      this.tables[table].compositeKeys[name] = columns;
    }
  }
}
