import type { GraphQLType } from 'graphql';

export interface ForeignKeyMetadata {
  table: string;
  columns: string[];
  referenceTable: string;
  referenceColumns: string[];
}

export interface TableMetadata {
  name: string;
  primaryKey: string | null;
  columns: Record<string, ColumnMetadata>;
  candidateKeys: Record<string, string[]>;
  compositeKeys: Record<string, string[]>;
  belongsTo: Record<string, ForeignKeyMetadata>;
  hasMany: Record<string, ForeignKeyMetadata>;
  hasOne: Record<string, ForeignKeyMetadata>;
}

export interface ColumnMetadata {
  name: string;
  nullable: boolean;
  defaultValue?: any;
  isPrimaryKey: boolean;
  type: GraphQLType;
  rawType: string;
}

export interface TableMapper<T> {
  findByColumns(
    keys: readonly Record<string, any>[],
    unique?: boolean
  ): Promise<T[]>;

  findByFilter(params: {
    filter?: Record<string, any>;
    sort?: Record<string, any>[];
    pagination?: Pagination;
  }): Promise<T[]>;

  countByFilter(params: { filter?: Record<string, any> }): Promise<number>;
}

export interface DatabaseMapper {
  getTableMetadata(table: string): Promise<TableMetadata> | TableMetadata;

  listTables(): Promise<string[]> | string[];

  listColumns(
    table: string
  ): Promise<Record<string, ColumnMetadata>> | Record<string, ColumnMetadata>;

  getColumn(
    table: string,
    column: string
  ): Promise<ColumnMetadata> | ColumnMetadata;

  mapColumn(table: string, column: string): Promise<GraphQLType> | GraphQLType;

  getTableMapper<T>(table: string): TableMapper<T>;
}

export interface Pagination {
  disabled?: boolean;
  offset: number;
  limit: number;
}

export type SortDirection = 'asc' | 'desc';
