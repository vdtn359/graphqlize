import type {
  ColumnMetadata,
  DatabaseMapper,
  TableMetadata,
} from '@vdtn359/types';
import schemaInspector from 'knex-schema-inspector';
import { knex, Knex } from 'knex';
import { GraphQLDateTime } from 'graphql-scalars';
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLList,
  GraphQLInt,
  GraphQLString,
} from 'graphql';

export class SqlMapper implements DatabaseMapper {
  instance: Knex;

  private inspector: ReturnType<typeof schemaInspector>;

  private tables: Record<string, TableMetadata> = {};

  private constructor(options: Knex.Config) {
    this.instance = knex(options);
    this.inspector = schemaInspector(this.instance);
  }

  static async create(options: Knex.Config) {
    const mapper = new SqlMapper(options);
    await mapper.init();

    return mapper;
  }

  async init() {
    const tables = await this.inspector.tables();

    const result = await Promise.all(
      tables.map(async (table) => ({
        table,
        columns: await this.inspector.columnInfo(table),
        foreignKeys: await this.inspector.foreignKeys(table),
        primaryKey: await this.inspector.primary(table),
      }))
    );

    for (const { table, columns, primaryKey, foreignKeys } of result) {
      this.tables[table] = {
        name: table,
        columns: {},
        candidateKeys: {
          ...(primaryKey && {
            [primaryKey]: [primaryKey],
          }),
        },
        foreignKeys: foreignKeys.reduce(
          (agg, current) => ({
            ...agg,
            [current.constraint_name ?? current.column]: {
              foreignKey: [current.column],
              referenceTable: current.foreign_key_table,
              referenceColumns: [current.foreign_key_column],
            },
          }),
          {}
        ),
      };
      for (const column of columns) {
        this.tables[table].columns[column.name] = {
          name: column.name,
          nullable: column.is_nullable,
          isPrimaryKey: column.is_primary_key,
          type: SqlMapper.mapType(column.data_type),
          defaultValue: column.default_value,
          rawType: column.data_type,
        };

        if (column.is_unique) {
          this.tables[table].candidateKeys[column.name] = [column.name];
        }
      }
    }
  }

  async listColumns(table: string) {
    const tableMetadata = await this.getTableMetadata(table);
    return tableMetadata.columns;
  }

  listTables() {
    return Promise.resolve(Object.keys(this.tables));
  }

  async hasColumn(table: string, column: string) {
    const tableMetadata = await this.getTableMetadata(table);
    return !!tableMetadata.columns[column];
  }

  async getColumn(table: string, column: string): Promise<ColumnMetadata> {
    const tableMetadata = await this.getTableMetadata(table);
    if (!tableMetadata.columns[column]) {
      throw new Error(`Column ${column} not found in table ${table}`);
    }
    return Promise.resolve(tableMetadata.columns[column]);
  }

  getTableMetadata(table: string): Promise<TableMetadata> {
    if (!this.tables[table]) {
      throw new Error(`Table ${table} not found`);
    }
    return Promise.resolve(this.tables[table]);
  }

  async mapColumn(table: string, column: string) {
    const columnMetadata = this.tables[table].columns[column];
    if (!columnMetadata) {
      throw new Error(`Column ${column} not found in table ${table}`);
    }
    return SqlMapper.mapType(columnMetadata.type.toString());
  }

  static mapType(dataType: string) {
    const transformedType = dataType.toLowerCase();
    if (transformedType.includes('char') || transformedType.includes('text')) {
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
    if (transformedType === 'enum') {
      return GraphQLString;
    }
    throw new Error(`Unmapped type: ${dataType}`);
  }
}
