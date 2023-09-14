import type { TableMetadata } from '@vdtn359/graphqlize-mapper';
import { InputTypeComposer, SchemaComposer } from 'graphql-compose';
import { GraphQLList, GraphQLNonNull } from 'graphql/type';
import { GraphQLScalarType } from 'graphql';
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
      sort: new GraphQLList(
        new GraphQLNonNull(listInputBuilder.buildSort().getType())
      ),
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
      this.buildGroupByDate(tc);

      const schemaBuilder = this.tableBuilder.getSchemaBuilder();
      for (const [column, foreignKey] of Object.entries({
        ...this.metadata.belongsTo,
        ...this.metadata.hasOne,
        ...this.metadata.hasMany,
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

  private buildGroupByDate(tc: InputTypeComposer) {
    const timestampFields = Object.keys(this.metadata.columns).filter(
      (columnName) => {
        const column = this.metadata.columns[columnName];
        return (
          column.type instanceof GraphQLScalarType &&
          column.type.name === 'DateTime'
        );
      }
    );
    if (timestampFields.length) {
      const groupByDateTc = this.composer.getOrCreateITC(
        this.translator.groupByDateName(),
        (groupDateTc) => {
          for (const columnName of timestampFields) {
            groupDateTc.addFields({
              [this.translator.columnName(columnName)]: {
                type: 'Boolean',
              },
            });
          }
        }
      );
      tc.addFields({
        _year: groupByDateTc.getType(),
        _month: groupByDateTc.getType(),
        _yearMonth: groupByDateTc.getType(),
        _date: groupByDateTc.getType(),
        _day: groupByDateTc.getType(),
        _dayOfWeek: groupByDateTc.getType(),
      });
    }
  }

  private buildHaving() {
    return this.composer.getOrCreateITC(this.translator.having(), () => {
      const listInputBuilder = this.tableBuilder.getListInputBuilder();
      const filter = listInputBuilder.buildFilter();
      return filter.clone(this.translator.having());
    });
  }
}
