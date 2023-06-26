import type { DatabaseMapper } from '@vdtn359/graphqlize-mapper';
import { SchemaComposer, schemaComposer } from 'graphql-compose';
import { merge } from 'lodash';
import { DEFAULT_OPTIONS, SchemaOptions, SchemaOptionType } from './options';
import { TableBuilder } from './table';

export class SchemaBuilder {
  private tableBuilders: Record<string, TableBuilder> = {};

  private composer: SchemaComposer;

  private options: SchemaOptionType;

  private constructor(
    private readonly mapper: DatabaseMapper,
    options?: SchemaOptions
  ) {
    this.options = merge(DEFAULT_OPTIONS, options);
    this.composer = schemaComposer.clone();
  }

  static async init(mapper: DatabaseMapper, options?: SchemaOptions) {
    const schemaBuilder = new SchemaBuilder(mapper, options);
    const tables = await mapper.listTables();

    await Promise.all(
      tables.map(async (table) => {
        const tableMetadata = await mapper.getTableMetadata(table);

        schemaBuilder.tableBuilders[table] = new TableBuilder({
          composer: schemaBuilder.composer,
          options: schemaBuilder.options,
          schemaBuilder,
          metadata: tableMetadata,
          mapper,
        });
      })
    );

    for (const tableBuilder of Object.values(schemaBuilder.tableBuilders)) {
      tableBuilder.buildSchema();
    }

    for (const tableBuilder of Object.values(schemaBuilder.tableBuilders)) {
      tableBuilder.buildObjectAssociation();
    }

    return schemaBuilder;
  }

  getTableBuilder(table: string) {
    if (!this.tableBuilders[table]) {
      throw new Error(`Table ${table} not found`);
    }
    return this.tableBuilders[table];
  }

  async toSchema() {
    return this.composer.buildSchema();
  }
}
