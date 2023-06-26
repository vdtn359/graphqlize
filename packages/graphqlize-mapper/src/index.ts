import type { GraphQLType } from 'graphql';

export interface ForeignKeyMetadata {
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
}

export interface DatabaseMapper {
  getTableMetadata(table: string): Promise<TableMetadata>;

  listTables(): Promise<string[]>;

  listColumns(table: string): Promise<Record<string, ColumnMetadata>>;

  getColumn(table: string, column: string): Promise<ColumnMetadata>;

  mapColumn(table: string, column: string): Promise<GraphQLType>;

  getTableMapper<T>(table: string): TableMapper<T>;
}
