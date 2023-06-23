import type { GraphQLType } from 'graphql';

export interface ForeignKeyMetadata {
  column: string[];
  referenceTable: string;
  referenceColumns: string[];
}

export interface TableMetadata {
  name: string;
  columns: Record<string, ColumnMetadata>;
  candidateKeys: Record<string, string[]>;
  foreignKeys: Record<string, ForeignKeyMetadata>;
}

export interface ColumnMetadata {
  name: string;
  nullable: boolean;
  defaultValue?: any;
  isPrimaryKey: boolean;
  type: GraphQLType;
  rawType: string;
}

export interface DatabaseMapper {
  getTableMetadata(table: string): Promise<TableMetadata>;

  listTables(): Promise<string[]>;

  listColumns(table: string): Promise<Record<string, ColumnMetadata>>;

  getColumn(table: string, column: string): Promise<ColumnMetadata>;

  mapColumn(table: string, column: string): Promise<GraphQLType>;
}
