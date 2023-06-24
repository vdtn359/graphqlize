import type { TableMetadata } from '@vdtn359/graphqlize-types';
import { ObjectTypeComposer, SchemaComposer } from 'graphql-compose';
import { DefaultBuilder } from './default';
import { SchemaOptionType } from './options';
import type { TableBuilder } from './table';
import { mergeTransform } from '../utils';
import { getFilterType } from '../types';

export class ListInputBuilder extends DefaultBuilder {
  private readonly metadata: TableMetadata;

  private readonly tableBuilder: TableBuilder;

  constructor({
    composer,
    options,
    metadata,
    tableBuilder,
  }: {
    composer: SchemaComposer;
    options: SchemaOptionType;
    metadata: TableMetadata;
    tableBuilder: TableBuilder;
  }) {
    super({ composer, options });
    this.metadata = metadata;
    this.tableBuilder = tableBuilder;
  }

  filterName(objectType: ObjectTypeComposer) {
    const casing = this.getTypeNameCasing();
    return mergeTransform(['list', objectType.getTypeName(), 'input'], casing);
  }

  sortName(objectType: ObjectTypeComposer) {
    const casing = this.getTypeNameCasing();
    return mergeTransform(['sort', objectType.getTypeName()], casing);
  }

  buildSchema() {
    const objectType = this.tableBuilder.buildMultiObjectTC();
    return {
      filter: this.buildFilter(objectType),
      pagination: this.buildPagination(),
      sort: this.buildSort(objectType),
    };
  }

  buildFilter(objectType: ObjectTypeComposer) {
    return this.composer.getOrCreateITC(this.filterName(objectType), (tc) => {
      for (const [columnName, columnMetadata] of Object.entries(
        this.metadata.columns
      )) {
        tc.addFields({
          [this.columnName(columnName)]: {
            type: getFilterType(columnMetadata.type as any, this.composer),
          },
        });
      }
    });
  }

  buildSort(objectType: ObjectTypeComposer) {
    const sortDirection = this.composer.getOrCreateETC(
      this.typeName('SortDirection'),
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
    return this.composer.getOrCreateITC(this.sortName(objectType), (tc) => {
      for (const columnName of Object.keys(this.metadata.columns)) {
        tc.addFields({
          [this.columnName(columnName)]: {
            type: sortDirection,
          },
        });
      }
    });
  }

  buildPagination() {
    return this.composer.getOrCreateITC(this.typeName('Pagination'), (tc) => {
      tc.addFields({
        disabled: {
          type: 'Boolean',
        },
        page: {
          type: 'Int',
          defaultValue: 0,
        },
        size: {
          type: 'Int',
          defaultValue: 20,
        },
        offset: {
          type: 'Int',
          defaultValue: 0,
        },
      });
    });
  }
}
