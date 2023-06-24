export interface SchemaOptions {
  case?: 'camelCase' | 'snakeCase' | 'pascalCase' | 'constantCase';
}

export const DEFAULT_OPTIONS = {
  case: 'camelCase' as const,
};

export type SchemaOptionType = SchemaOptions & {
  case: NonNullable<SchemaOptions['case']>;
};
