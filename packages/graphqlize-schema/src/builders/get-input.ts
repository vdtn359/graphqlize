import type { TableMetadata } from '@vdtn359/graphqlize-mapper';
import { ObjectTypeComposer, SchemaComposer } from 'graphql-compose';
import { GraphQLNonNull } from 'graphql';
import { DefaultBuilder } from './default';
import { SchemaOptionType } from './options';
import type { TableBuilder } from './table';
import { mergeTransform } from '../utils';

export class GetInputBuilder extends DefaultBuilder {
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
    return mergeTransform(['get', objectType.getTypeName(), 'filter'], casing);
  }

  buildSchema() {
    const filter = this.buildFilter();
    if (!filter) {
      return null;
    }
    return {
      by: filter.NonNull,
    };
  }

  buildFilter() {
    const objectType = this.tableBuilder.buildObjectTC();
    if (!Object.keys(this.metadata.candidateKeys).length) {
      return null;
    }
    return this.composer.getOrCreateITC(this.filterName(objectType), (tc) => {
      for (const [keyName, candidateKeys] of Object.entries(
        this.metadata.candidateKeys
      )) {
        if (candidateKeys.length === 1) {
          const candidateColumn = this.metadata.columns[candidateKeys[0]];
          tc.addFields({
            [this.columnName(keyName)]: {
              type: candidateColumn.type as any,
            },
          });
        } else {
          const candidateTC = this.buildCompositeKeyTC(candidateKeys);
          tc.addFields({
            [candidateTC.getTypeName()]: {
              type: candidateTC.getType(),
            },
          });
        }
      }
    });
  }

  private getCompositeKeyNames(compositeKeys: string[]) {
    const casing = this.getTypeNameCasing();
    return mergeTransform(
      [this.metadata.name, ...compositeKeys, 'key'],
      casing
    );
  }

  private buildCompositeKeyTC(candidateKeys: string[]) {
    const name = this.getCompositeKeyNames(candidateKeys);
    return this.composer.getOrCreateITC(name, (tc) => {
      for (const candidateKey of candidateKeys) {
        const candidateColumn = this.metadata.columns[candidateKey];
        tc.addFields({
          [this.columnName(candidateKey)]: {
            type: new GraphQLNonNull(candidateColumn.type as any),
          },
        });
      }
    });
  }
}
