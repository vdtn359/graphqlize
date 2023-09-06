import type { IntrospectionTableResult } from '@vdtn359/graphqlize-mapper';

export type TableOptions = Partial<IntrospectionTableResult> & {
  includeColumns?: string[];
  excludeColumns?: string[];
  includeForeignKeys?: string[];
  excludeForeignKeys?: string[];
};

export interface SchemaOptions {
  schema?: string;
  allowWindowFunctions?: boolean;
  version?: string;
  versionFile?: string;
  includeTables?: string[];
  excludeTables?: string[];
  introspect?: boolean;
  tables?: Record<string, TableOptions>;
}
