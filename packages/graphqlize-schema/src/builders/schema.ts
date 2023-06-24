import type { DatabaseMapper } from '@vdtn359/graphqlize-mapper';
import { schemaComposer } from 'graphql-compose';
import { merge } from 'lodash';
import { DEFAULT_OPTIONS, SchemaOptions } from './options';
import { DefaultBuilder } from './default';
import { TableBuilder } from './table';

export class SchemaBuilder extends DefaultBuilder {
  constructor(
    private readonly mapper: DatabaseMapper,
    options?: SchemaOptions
  ) {
    super({
      options: merge(DEFAULT_OPTIONS, options),
      composer: schemaComposer.clone(),
    });
  }

  async toSchema() {
    const tables = await this.mapper.listTables();

    await Promise.all(
      tables.map(async (table) => {
        const tableMetadata = await this.mapper.getTableMetadata(table);

        const tableBuilder = new TableBuilder({
          composer: this.composer,
          options: this.options,
          metadata: tableMetadata,
          mapper: this.mapper,
        });

        tableBuilder.buildSchema();
      })
    );

    return this.composer.buildSchema();
  }
}
