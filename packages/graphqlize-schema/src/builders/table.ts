import type { DatabaseMapper, TableMetadata } from '@vdtn359/graphqlize-mapper';
import { GraphQLList, GraphQLNonNull } from 'graphql';
import { ObjectTypeComposer, SchemaComposer } from 'graphql-compose';
import { DefaultBuilder } from './default';
import { SchemaOptionType } from './options';
import { mergeTransform } from '../utils';
import { GetInputBuilder } from './get-input';
import { ListInputBuilder } from './list-input';
import { GetResolver } from '../resolvers/get';
import { DefaultResolver } from '../resolvers/default';
import { Repository } from '../resolvers/repository';
import type { SchemaBuilder } from './schema';
import { BelongToResolver } from '../resolvers/belong-to';

export class TableBuilder extends DefaultBuilder {
  private readonly metadata: TableMetadata;

  private readonly mapper: DatabaseMapper;

  private readonly getResolver: DefaultResolver;

  private readonly schemaBuilder: SchemaBuilder;

  private readonly columnLookup: Record<string, string> = {};

  private repository: Repository;

  constructor({
    composer,
    options,
    metadata,
    schemaBuilder,
    mapper,
  }: {
    composer: SchemaComposer;
    options: SchemaOptionType;
    metadata: TableMetadata;
    schemaBuilder: SchemaBuilder;
    mapper: DatabaseMapper;
  }) {
    super({ composer, options });
    this.metadata = metadata;
    this.mapper = mapper;
    this.schemaBuilder = schemaBuilder;

    for (const columnName of Object.keys(this.metadata.columns)) {
      this.columnLookup[this.columnName(columnName)] = columnName;
    }

    for (const compositeKeyName of Object.keys(this.metadata.columns)) {
      const keyTypeName = this.columnName(compositeKeyName);
      if (!this.columnLookup[keyTypeName]) {
        this.columnLookup[keyTypeName] = compositeKeyName;
      }
    }
    this.repository = new Repository(this.metadata, mapper);

    this.getResolver = new GetResolver({
      mapper: this.mapper,
      tableBuilder: this,
      repository: this.repository,
    });
  }

  reverseLookup(fieldName: string) {
    return this.columnLookup[fieldName];
  }

  buildObjectTC() {
    return this.composer.getOrCreateOTC(
      this.typeName(this.metadata.name),
      (tc) => {
        for (const [columnName, columnMetadata] of Object.entries(
          this.metadata.columns
        )) {
          const type = columnMetadata.type as any;
          tc.addFields({
            [this.columnName(columnName)]: {
              type: columnMetadata.nullable ? type : new GraphQLNonNull(type),
            },
          });
        }
      }
    );
  }

  buildObjectAssociation() {
    this.buildBelongsToAssociation();
    this.buildHasManyAssociation();
  }

  buildBelongsToAssociation() {
    const tc = this.composer.getOTC(this.typeName(this.metadata.name));
    for (const [constraintName, foreignKey] of Object.entries(
      this.metadata.belongsTo
    )) {
      const { referenceTable, columns } = foreignKey;
      if (columns.length > 1) {
        // TODO support multi foreign keys
        return;
      }
      const [column] = columns;
      const isNullable = this.metadata.columns[column].nullable;

      const referencedTypeBuilder =
        this.schemaBuilder.getTableBuilder(referenceTable);
      const referencedType = referencedTypeBuilder.buildObjectTC();

      tc.addFields({
        [this.columnName(constraintName)]: {
          type: isNullable
            ? referencedType
            : new GraphQLNonNull(referencedType.getType()),
          resolve: (parent, args, context) => {
            const belongToResolver: DefaultResolver = new BelongToResolver({
              mapper: this.mapper,
              tableBuilder: this,
              repository: this.repository,
              foreignKey,
            });
            return belongToResolver.resolve(parent, args, context);
          },
        },
      });
    }
  }

  buildHasManyAssociation() {
    const tc = this.composer.getOTC(this.typeName(this.metadata.name));
    for (const [constraintName, foreignKey] of Object.entries(
      this.metadata.hasMany
    )) {
      const { referenceTable, columns } = foreignKey;
      if (columns.length > 1) {
        // TODO support multi foreign keys
        return;
      }
      const referencedTypeBuilder =
        this.schemaBuilder.getTableBuilder(referenceTable);
      const referencedType = referencedTypeBuilder.buildObjectTC();

      tc.addFields({
        [this.columnName(constraintName, true)]: {
          type: new GraphQLList(new GraphQLNonNull(referencedType.getType())),
        },
      });
    }
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
          count: 'Int',
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
        resolve: (parent, args, context) =>
          this.getResolver.resolve(parent, args ?? {}, context),
      },
    });
    const getInputSchema = getInputBuilder.buildSchema();
    if (getInputSchema) {
      this.composer.Query.addFieldArgs(methodName, getInputSchema);
    }
  }

  buildListMethod(multiObjectType: ObjectTypeComposer) {
    const listInputBuilder = new ListInputBuilder({
      composer: this.composer,
      options: this.options,
      metadata: this.metadata,
      tableBuilder: this,
    });
    this.composer.Query.addFields({
      [this.listMethodName(multiObjectType)]: {
        type: new GraphQLNonNull(multiObjectType.getType()),
        resolve: () => null,
        args: listInputBuilder.buildSchema(),
      },
    });
  }

  getTableMetadata() {
    return this.metadata;
  }

  getSchemaBuilder() {
    return this.schemaBuilder;
  }

  getRepository() {
    return this.repository;
  }
}
