import type { TableMetadata } from '@vdtn359/graphqlize-types';
import { GraphQLList, GraphQLNonNull } from 'graphql';
import { SchemaComposer } from 'graphql-compose';
import { DefaultBuilder } from './default';
import { SchemaOptionType } from './options';
import { mergeTransform } from '../utils';

export class TableBuilder extends DefaultBuilder {
  private readonly metadata: TableMetadata;

  constructor({
    composer,
    options,
    metadata,
  }: {
    composer: SchemaComposer;
    options: SchemaOptionType;
    metadata: TableMetadata;
  }) {
    super({ composer, options });
    this.metadata = metadata;
  }

  buildObjectTC() {
    return this.composer.getOrCreateOTC(
      this.typeName(this.metadata.name),
      (tc) => {
        for (const [columnName, columnMetadata] of Object.entries(
          this.metadata.columns
        )) {
          tc.addFields({
            [this.typeName(columnName)]: {
              type: columnMetadata.type as any,
            },
          });
        }
      }
    );
  }

  buildMultiObjectTC() {
    const objectType = this.buildObjectTC();

    return this.composer.getOrCreateOTC(
      this.typeName(this.metadata.name, true),
      (tc) => {
        tc.addFields({
          records: {
            type: new GraphQLNonNull(
              new GraphQLList(new GraphQLNonNull(objectType.getType()))
            ),
          },
          limit: 'Int!',
          offset: 'Int!',
          count: 'Int!',
        });
      }
    );
  }

  buildSchema() {
    const objectType = this.buildObjectTC();
    const multiObjectType = this.buildMultiObjectTC();

    this.composer.Query.addFields({
      [mergeTransform(['get', objectType.getTypeName()], this.options.case)]: {
        type: objectType,
        resolve: () => null,
      },
      [mergeTransform(
        ['list', multiObjectType.getTypeName()],
        this.options.case
      )]: {
        type: new GraphQLNonNull(multiObjectType.getType()),
        resolve: () => null,
      },
    });
  }
}
