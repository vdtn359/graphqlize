import type { TableMetadata } from '@vdtn359/graphqlize-mapper';
import { SchemaComposer } from 'graphql-compose';
import { GraphQLNonNull } from 'graphql';
import { SchemaOptionType } from './options';
import type { TableBuilder } from './table';
import { TableTranslator } from './translator';

export class GetInputBuilder {
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
    options: SchemaOptionType;
    metadata: TableMetadata;
    tableBuilder: TableBuilder;
  }) {
    this.composer = composer;
    this.metadata = metadata;
    this.tableBuilder = tableBuilder;
    this.translator = this.tableBuilder.getTranslator();
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
    if (!Object.keys(this.metadata.candidateKeys).length) {
      return null;
    }
    return this.composer.getOrCreateITC(
      this.translator.getFilterName(),
      (tc) => {
        for (const [keyName, candidateKeys] of Object.entries(
          this.metadata.candidateKeys
        )) {
          if (candidateKeys.length === 1) {
            const candidateColumn = this.metadata.columns[candidateKeys[0]];
            tc.addFields({
              [this.translator.columnName(keyName)]: {
                type: candidateColumn.type as any,
              },
            });
          } else {
            const candidateTC = this.buildCompositeKeyTC(candidateKeys);

            tc.addFields({
              [this.translator.columnName(keyName)]: {
                type: candidateTC.getType(),
              },
            });
          }
        }
      }
    );
  }

  private buildCompositeKeyTC(candidateKeys: string[]) {
    const name = this.translator.getCompositeKeyNames(candidateKeys);
    return this.composer.getOrCreateITC(name, (tc) => {
      for (const candidateKey of candidateKeys) {
        const candidateColumn = this.metadata.columns[candidateKey];
        tc.addFields({
          [this.translator.columnName(candidateKey)]: {
            type: new GraphQLNonNull(candidateColumn.type as any),
          },
        });
      }
    });
  }
}
