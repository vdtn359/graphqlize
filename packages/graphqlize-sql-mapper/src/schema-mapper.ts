import type {
  DatabaseMapper,
  ForeignKeyMetadata,
  ForeignKeyType,
  TableMapper,
  TableMetadata,
} from '@vdtn359/graphqlize-mapper';
import schemaInspector from '@vdtn359/knex-schema-inspector';
import { knex, Knex } from 'knex';
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
import { SqlTableMapper } from './table-mapper';
import { SchemaOptions, TableOptions } from './options';

type IntrospectionResult = {
  table: string;
  columns: Column[];
  foreignKeys: ForeignKey[];
  primaryKey: string | null;
}[];

export class SchemaMapper implements DatabaseMapper {
  instance: Knex;

  private inspector: ReturnType<typeof schemaInspector>;

  private tables: Record<string, TableMetadata> = {};

  private constructor(
    config: Knex.Config,
    private readonly options: SchemaOptions = {}
  ) {
    this.instance = knex({
      // @ts-ignore: only applicable for mysql
      typeCast(field, next) {
        if (field.type === 'TINY') {
          return field.string() === '1';
        }
        return next();
      },
      ...config,
    });
    this.inspector = schemaInspector(this.instance);
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

  private async introspect() {
    let filteredTables =
      this.options.includeTables ?? (await this.inspector.tables());
    filteredTables = filteredTables.filter(
      (table) => !this.options.excludeTables?.includes(table)
    );

    return Promise.all(
      filteredTables.map(async (table) => {
        const tableOption = this.options.tables?.[table] ?? {};

        const filteredColumns = this.filterColumns(
          await this.inspector.columnInfo(table),
          tableOption
        );

        const filteredForeignKeys = this.filterForeignKeys(
          filteredTables,
          filteredColumns.map((column) => column.name),
          await this.inspector.foreignKeys(table),
          tableOption
        );

        const primaryKey = await this.inspector.primary(table);
        return {
          table,
          columns: filteredColumns,
          foreignKeys: filteredForeignKeys,
          primaryKey: filteredColumns.some(
            (column) => column.name === primaryKey
          )
            ? primaryKey
            : null,
        };
      })
    );
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

    for (const tableInfo of result) {
      const { table, columns, foreignKeys } = tableInfo;
      const hasId = columns.find((column) => column.name === 'id');
      if (!tableInfo.primaryKey && hasId) {
        tableInfo.primaryKey = 'id';
      }
      this.tables[table] = {
        name: table,
        columns: {},
        primaryKey: null,
        candidateKeys: {},
        compositeKeys: {},
        belongsTo: {},
        hasOne: {},
        hasMany: {},
      };
      this.buildCandidateKeys(tableInfo.primaryKey, columns, table);
      this.buildBelongsTo(foreignKeys, table);
    }

    for (const { table, foreignKeys } of result) {
      this.buildHasMany(foreignKeys, table);
    }
  }

  private buildCandidateKeys(
    primaryKey: string | null,
    columns: Column[],
    table: string
  ) {
    if (primaryKey) {
      this.tables[table].candidateKeys[primaryKey] = [primaryKey];
    }

    for (const column of columns) {
      this.tables[table].columns[column.name] = {
        name: column.name,
        nullable: column.is_nullable,
        isPrimaryKey: column.is_primary_key,
        type: this.mapType(column),
        defaultValue: column.default_value,
        rawType: column.data_type,
      };

      if (column.is_unique) {
        this.tables[table].candidateKeys[column.name] = [column.name];
      }
    }
  }

  private buildBelongsTo(foreignKeys: ForeignKey[], table: string) {
    this.tables[table].belongsTo = foreignKeys.reduce((agg, current) => {
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

  private buildHasMany(foreignKeys: ForeignKey[], table: string) {
    for (const foreignKey of foreignKeys) {
      if (table !== foreignKey.foreign_key_table) {
        this.tables[foreignKey.foreign_key_table].hasMany[pluralize(table)] = {
          columns: [foreignKey.foreign_key_column],
          table: foreignKey.foreign_key_table,
          referenceTable: table,
          referenceColumns: [foreignKey.column],
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
  private mapType(column: Column) {
    const { data_type: dataType, enum_values: enumValues } = column;
    const transformedType = dataType.toLowerCase();
    if (
      transformedType.includes('char') ||
      transformedType.includes('text') ||
      transformedType === 'time'
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
      transformedType.includes('timestamp')
    ) {
      return GraphQLDateTime;
    }
    if (
      transformedType.includes('float') ||
      transformedType.includes('double')
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
