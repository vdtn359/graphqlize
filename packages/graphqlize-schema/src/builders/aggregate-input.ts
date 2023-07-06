import type { TableMetadata } from '@vdtn359/graphqlize-mapper';
import { SchemaComposer } from 'graphql-compose';
import type { TableBuilder } from './table';
import { TableTranslator } from './translator';

export class AggregateInputBuilder {
  private readonly metadata: TableMetadata;

  private readonly tableBuilder: TableBuilder;

  private composer: SchemaComposer;

  private translator: TableTranslator;

  constructor({
    composer,
    metadata,
    tableBuilder,
  }: {
    composer: SchemaComposer;
    metadata: TableMetadata;
    tableBuilder: TableBuilder;
  }) {
    this.composer = composer;
    this.metadata = metadata;
    this.tableBuilder = tableBuilder;
    this.translator = tableBuilder.getTranslator();
  }

  buildSchema() {
    const listInputBuilder = this.tableBuilder.getListInputBuilder();
    return {
      filter: listInputBuilder.buildFilter(),
      pagination: listInputBuilder.buildPagination(),
      sort: listInputBuilder.buildSort(),
      groupBy: this.buildGroupBy(),
      having: this.buildHaving(),
    };
  }

  private buildGroupBy() {
    return this.composer.getOrCreateITC(this.translator.groupByName(), (tc) => {
      for (const columnName of Object.keys(this.metadata.columns)) {
        tc.addFields({
          [this.translator.columnName(columnName)]: {
            type: 'Boolean',
          },
        });
      }
      const schemaBuilder = this.tableBuilder.getSchemaBuilder();
      for (const [column, foreignKey] of Object.entries({
        ...this.metadata.belongsTo,
        ...this.metadata.hasOne,
      })) {
        const { referenceTable } = foreignKey;
        const aggregateInputBuilder = schemaBuilder
          .getTableBuilder(referenceTable)
          .getAggregateInputBuilder();

        tc.addFields({
          [this.translator.associationName(column)]: {
            type: aggregateInputBuilder.buildGroupBy(),
          },
        });
      }
    });
  }

  private buildHaving() {
    return this.composer.getOrCreateITC(this.translator.having(), () => {
      const listInputBuilder = this.tableBuilder.getListInputBuilder();
      const filter = listInputBuilder.buildFilter();
      return filter.clone(this.translator.having());
    });
  }
}
