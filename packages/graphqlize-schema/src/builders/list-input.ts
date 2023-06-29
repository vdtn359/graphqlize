import type { TableMetadata } from '@vdtn359/graphqlize-mapper';
import { SchemaComposer } from 'graphql-compose';
import { GraphQLList, GraphQLNonNull } from 'graphql';
import type { TableBuilder } from './table';
import { getFilterType } from '../types';
import { TableTranslator } from './translator';

export class ListInputBuilder {
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
    this.translator = this.tableBuilder.getTranslator();
  }

  buildSchema() {
    return {
      filter: this.buildFilter(),
      pagination: {
        type: this.buildPagination(),
        defaultValue: {
          page: 0,
          limit: 20,
        },
      },
      sort: this.buildSort(),
    };
  }

  buildFilter() {
    return this.composer.getOrCreateITC(
      this.translator.listFilterName(),
      (tc) => {
        tc.addFields({
          _nested: {
            type: 'Boolean',
          },
          _not: {
            type: tc.getType(),
          },
          _and: {
            type: new GraphQLList(new GraphQLNonNull(tc.getType())),
          },
          _or: {
            type: new GraphQLList(new GraphQLNonNull(tc.getType())),
          },
        });

        for (const [columnName, columnMetadata] of Object.entries(
          this.metadata.columns
        )) {
          tc.addFields({
            [this.translator.columnName(columnName)]: {
              type: getFilterType(columnMetadata.type as any, this.composer),
            },
          });
        }

        for (const [constraintName, foreignKey] of Object.entries({
          ...this.metadata.belongsTo,
          ...this.metadata.hasOne,
          ...this.metadata.hasMany,
        })) {
          const { referenceTable } = foreignKey;
          const schemaBuilder = this.tableBuilder.getSchemaBuilder();
          const referencedTableBuilder =
            schemaBuilder.getTableBuilder(referenceTable);

          tc.addFields({
            [this.translator.associationName(constraintName)]: {
              type: referencedTableBuilder.getListMethodBuilder().buildFilter(),
            },
          });
        }
      }
    );
  }

  buildSort() {
    const sortDirection = this.composer.getOrCreateETC(
      this.translator.typeName('SortDirection'),
      (etc) => {
        etc.addFields({
          ASC: {
            value: 'ASC',
          },
          DESC: {
            value: 'DESC',
          },
        });
      }
    );
    return this.composer.getOrCreateITC(this.translator.sortName(), (tc) => {
      for (const columnName of Object.keys(this.metadata.columns)) {
        tc.addFields({
          [this.translator.columnName(columnName)]: {
            type: sortDirection,
          },
        });
      }
    });
  }

  buildPagination() {
    return this.composer.getOrCreateITC(
      this.translator.typeName('Pagination'),
      (tc) => {
        tc.addFields({
          disabled: {
            type: 'Boolean',
          },
          page: {
            type: 'Int',
            defaultValue: 0,
          },
          limit: {
            type: 'Int',
            defaultValue: 20,
          },
          offset: {
            type: 'Int',
            defaultValue: 0,
          },
        });
      }
    );
  }
}
