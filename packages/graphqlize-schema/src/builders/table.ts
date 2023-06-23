import type { TableMetadata } from '@vdtn359/graphqlize-types';
import { GraphQLList, GraphQLNonNull } from 'graphql';
import { ObjectTypeComposer, SchemaComposer } from 'graphql-compose';
import { DefaultBuilder } from './default';
import { SchemaOptionType } from './options';
import { mergeTransform } from '../utils';
import { GetInputBuilder } from './get-input';

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
            [this.columnName(columnName)]: {
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

  private getMethodName(objectType: ObjectTypeComposer) {
    return mergeTransform(['get', objectType.getTypeName()], this.options.case);
  }

  private listMethodName(objectType: ObjectTypeComposer) {
    return mergeTransform(
      ['list', objectType.getTypeName()],
      this.options.case
    );
  }

  buildSchema() {
    const objectType = this.buildObjectTC();
    const multiObjectType = this.buildMultiObjectTC();

    this.buildGetMethod(objectType);
    this.buildListMethod(multiObjectType);
  }

  buildGetMethod(objectType: ObjectTypeComposer) {
    const getInputBuilder = new GetInputBuilder({
      composer: this.composer,
      options: this.options,
      metadata: this.metadata,
      tableBuilder: this,
    });
    const methodName = this.getMethodName(objectType);
    this.composer.Query.addFields({
      [methodName]: {
        type: objectType,
        resolve: () => null,
      },
    });
    const schema = getInputBuilder.buildSchema();
    if (schema) {
      this.composer.Query.addFieldArgs(methodName, { by: schema.NonNull });
    }
  }

  buildListMethod(multiObjectType: ObjectTypeComposer) {
    this.composer.Query.addFields({
      [this.listMethodName(multiObjectType)]: {
        type: new GraphQLNonNull(multiObjectType.getType()),
        resolve: () => null,
      },
    });
  }
}
