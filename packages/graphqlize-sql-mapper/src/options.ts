export interface TableOptions {
  includeColumns?: string[];
  excludeColumns?: string[];
  includeForeignKeys?: string[];
  excludeForeignKeys?: string[];
}

export interface SchemaOptions {
  allowWindowFunctions?: boolean;
  version?: string;
  versionFile?: string;
  includeTables?: string[];
  excludeTables?: string[];

  tables?: Record<string, TableOptions>;
}
