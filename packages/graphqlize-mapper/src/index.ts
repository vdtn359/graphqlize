import type { GraphQLType } from 'graphql';

export type ForeignKeyType = 'hasOne' | 'belongsTo' | 'hasMany';

export interface ForeignKeyMetadata {
  type: ForeignKeyType;
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
  findByFilter(params: {
    filter?: Record<string, any>;
    sort?: Record<string, any>[];
    pagination?: Pagination;
    partitions?: readonly Record<string, any>[];
  }): Promise<T[]>;

  countByFilter(params: { filter?: Record<string, any> }): Promise<number>;

  aggregateByFilter(param: {
    filter?: Record<string, any>;
    partitions?: readonly Record<string, any>[];
    having?: Record<string, any>;
    groupBy?: Record<string, any>;
    fields: Record<string, any>;
    pagination?: Pagination;
    sort?: Record<string, any>[];
  }): Promise<any>;
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

  getTableMapper<T>(table: string): TableMapper<T>;

  defineForeignKey({
    table,
    type,
    name,
    foreignKey,
  }: {
    table: string;
    type: 'hasOne' | 'belongsTo' | 'hasMany';
    name: 'string';
    foreignKey: Omit<ForeignKeyMetadata, 'table'>;
  }): void;
}

export interface Pagination {
  disabled?: boolean;
  perPartition?: boolean;
  offset: number;
  limit: number;
}

export type SortDirection = 'asc' | 'desc';
export type NullsDirection = 'first' | 'last';
