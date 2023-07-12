import type { TableMetadata } from '@vdtn359/graphqlize-mapper';
import { InputTypeComposer, SchemaComposer } from 'graphql-compose';
import { GraphQLList, GraphQLNonNull } from 'graphql';
import { GraphQLFloat, GraphQLInt } from 'graphql/type';
import type { TableBuilder } from './table';
import { getFilterType } from '../types';
import { TableTranslator } from './translator';
import { buildNumberFilter } from '../types/number';

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

  buildSchema(defaultPagination = true) {
    return {
      filter: this.buildFilter(),
      pagination: {
        type: this.buildPagination(),
        defaultValue: defaultPagination
          ? {
              limit: 20,
            }
          : undefined,
      },
      sort: new GraphQLList(new GraphQLNonNull(this.buildSort().getType())),
    };
  }

  buildFilter() {
    const rawExpression = this.composer.getOrCreateITC(
      this.translator.typeName('RawExpression'),
      (tc) => {
        tc.addFields({
          expression: {
            type: 'String',
          },
          bindings: {
            type: '[JSON]',
          },
        });
      }
    );
    return this.composer.getOrCreateITC(
      this.translator.listFilterName(),
      (tc) => {
        tc.addFields({
          _required: {
            type: 'Boolean',
          },
          _nested: {
            type: 'Boolean',
          },
          _not: {
            type: tc.getType(),
          },
          _raw: {
            type: rawExpression.getType(),
          },
          _and: {
            type: new GraphQLList(new GraphQLNonNull(tc.getType())),
          },
          _or: {
            type: new GraphQLList(new GraphQLNonNull(tc.getType())),
          },
        });

        this.buildTypesFilter(tc);
        this.buildAssociationsFilter(tc);
        this.buildAggregateFilter(tc);
      }
    );
  }

  private buildTypesFilter(tc: InputTypeComposer<any>) {
    for (const [columnName, columnMetadata] of Object.entries(
      this.metadata.columns
    )) {
      tc.addFields({
        [this.translator.columnName(columnName)]: {
          type: getFilterType(columnMetadata, this.translator, this.composer),
        },
      });
    }
  }

  private buildAssociationsFilter(tc: InputTypeComposer<any>) {
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
          type: referencedTableBuilder.getListInputBuilder().buildFilter(),
        },
      });
    }
  }

  private buildAggregateFilter(tc: InputTypeComposer) {
    tc.addFields({
      _count: this.buildCountAggregateFilter(),
      _avg: this.buildAvgAggregateFilter(),
      _sum: this.buildOtherAggregateFilter('sum'),
      _min: this.buildOtherAggregateFilter('min'),
      _max: this.buildOtherAggregateFilter('max'),
    });
  }

  private buildCountAggregateFilter() {
    return this.composer.getOrCreateITC(
      this.translator.aggregateTypeFilterInputName('count'),
      (tc) => {
        for (const column of Object.keys(this.metadata.columns)) {
          tc.addFields({
            [this.translator.columnName(column)]: {
              type: buildNumberFilter(this.translator, this.composer),
            },
          });
        }

        tc.addFields({
          _all: {
            type: buildNumberFilter(this.translator, this.composer),
          },
        });
      }
    );
  }

  private buildAvgAggregateFilter() {
    return this.composer.getOrCreateITC(
      this.translator.aggregateTypeFilterInputName('avg'),
      (tc) => {
        for (const [column, columnMetadata] of Object.entries(
          this.metadata.columns
        )) {
          if (
            columnMetadata.type !== GraphQLInt &&
            columnMetadata.type !== GraphQLFloat
          ) {
            continue;
          }
          tc.addFields({
            [this.translator.columnName(column)]: {
              type: buildNumberFilter(this.translator, this.composer),
            },
          });
        }
      }
    );
  }

  private buildOtherAggregateFilter(type: string) {
    return this.composer.getOrCreateITC(
      this.translator.aggregateTypeFilterInputName(type),
      (tc) => {
        for (const [column, columnMetadata] of Object.entries(
          this.metadata.columns
        )) {
          if (
            columnMetadata.type !== GraphQLInt &&
            columnMetadata.type !== GraphQLFloat
          ) {
            continue;
          }
          tc.addFields({
            [this.translator.columnName(column)]: {
              type: columnMetadata.type,
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
            value: 'asc',
          },
          DESC: {
            value: 'desc',
          },
        });
      }
    );

    const nullsDirection = this.composer.getOrCreateETC(
      this.translator.typeName('NullsDirection'),
      (etc) => {
        etc.addFields({
          FIRST: {
            value: 'first',
          },
          LAST: {
            value: 'last',
          },
        });
      }
    );

    const sortOption = this.composer.getOrCreateITC(
      this.translator.typeName('SortOption'),
      (itc) => {
        itc.addFields({
          direction: {
            type: new GraphQLNonNull(sortDirection.getType()),
          },
          nulls: {
            type: nullsDirection,
          },
        });
      }
    );
    return this.composer.getOrCreateITC(this.translator.sortName(), (tc) => {
      this.buildTypeSort(tc, sortOption);
      this.buildAssociationSort(tc);
      this.buildAggregationSort(tc, sortOption);
    });
  }

  private buildTypeSort(tc: InputTypeComposer, sortOption: InputTypeComposer) {
    for (const columnName of Object.keys(this.metadata.columns)) {
      tc.addFields({
        [this.translator.columnName(columnName)]: {
          type: sortOption,
        },
      });
    }
  }

  private buildAssociationSort(tc: InputTypeComposer<any>) {
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
          type: referencedTableBuilder.getListInputBuilder().buildSort(),
        },
      });
    }
  }

  private buildAggregationSort(
    tc: InputTypeComposer,
    sortOption: InputTypeComposer
  ) {
    tc.addFields({
      _count: this.buildCountAggregationSort(sortOption),
      _avg: this.buildOtherAggregationSort('avg', sortOption),
      _sum: this.buildOtherAggregationSort('sum', sortOption),
      _min: this.buildOtherAggregationSort('min', sortOption),
      _max: this.buildOtherAggregationSort('max', sortOption),
    });
  }

  private buildCountAggregationSort(sortOption: InputTypeComposer) {
    return this.composer.getOrCreateITC(
      this.translator.aggregateTypeSortInputName('count'),
      (tc) => {
        for (const column of Object.keys(this.metadata.columns)) {
          tc.addFields({
            [this.translator.columnName(column)]: {
              type: sortOption,
            },
          });
        }

        tc.addFields({
          _all: {
            type: sortOption,
          },
        });
      }
    );
  }

  private buildOtherAggregationSort(
    type: string,
    sortOption: InputTypeComposer
  ) {
    return this.composer.getOrCreateITC(
      this.translator.aggregateTypeSortInputName(type),
      (tc) => {
        for (const [column, columnMetadata] of Object.entries(
          this.metadata.columns
        )) {
          if (
            columnMetadata.type !== GraphQLInt &&
            columnMetadata.type !== GraphQLFloat
          ) {
            continue;
          }
          tc.addFields({
            [this.translator.columnName(column)]: {
              type: sortOption,
            },
          });
        }
      }
    );
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
