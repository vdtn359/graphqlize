import type { DatabaseMapper, TableMetadata } from '@vdtn359/graphqlize-mapper';
import { GraphQLList, GraphQLNonNull } from 'graphql';
import { ObjectTypeComposer, SchemaComposer } from 'graphql-compose';
import { SchemaOptionType } from './options';
import { mergeTransform } from '../utils';
import { GetInputBuilder } from './get-input';
import { ListInputBuilder } from './list-input';
import { GetResolver } from '../resolvers/get';
import { DefaultResolver } from '../resolvers/default';
import { Repository } from '../resolvers/repository';
import type { SchemaBuilder } from './schema';
import { BelongToResolver } from '../resolvers/belong-to';
import { HasResolver } from '../resolvers/has';
import { ListResolver } from '../resolvers/list';
import { TableTranslator } from './translator';
import { CountResolver } from '../resolvers/count';

export class TableBuilder {
  private readonly metadata: TableMetadata;

  private readonly mapper: DatabaseMapper;

  private readonly getResolver: DefaultResolver;

  private readonly translator: TableTranslator;

  private readonly listResolver: DefaultResolver;

  private readonly countResolver: DefaultResolver;

  private readonly schemaBuilder: SchemaBuilder;

  private repository: Repository;

  private composer: SchemaComposer;

  private options: SchemaOptionType;

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
    this.options = options;
    this.metadata = metadata;
    this.composer = composer;
    this.mapper = mapper;
    this.schemaBuilder = schemaBuilder;
    this.repository = new Repository(this.metadata, mapper);

    this.getResolver = new GetResolver({
      mapper: this.mapper,
      tableBuilder: this,
      repository: this.repository,
    });

    this.listResolver = new ListResolver({
      mapper: this.mapper,
      tableBuilder: this,
      repository: this.repository,
    });

    this.countResolver = new CountResolver({
      mapper: this.mapper,
      tableBuilder: this,
      repository: this.repository,
    });

    this.translator = new TableTranslator({
      tableBuilder: this,
      casing: options.case,
    });
  }

  buildTranslatorMap() {
    this.translator.init();
  }

  buildObjectTC() {
    return this.composer.getOrCreateOTC(
      this.translator.typeName(this.metadata.name),
      (tc) => {
        for (const [columnName, columnMetadata] of Object.entries(
          this.metadata.columns
        )) {
          const type = columnMetadata.type as any;
          tc.addFields({
            [this.translator.columnName(columnName)]: {
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
    this.buildHasOneAssociation();
  }

  buildBelongsToAssociation() {
    const tc = this.composer.getOTC(
      this.translator.typeName(this.metadata.name)
    );
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
        [this.translator.associationName(constraintName)]: {
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
    const tc = this.composer.getOTC(
      this.translator.typeName(this.metadata.name)
    );
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
        [this.translator.associationName(constraintName)]: {
          type: referencedType.getType(),
          resolve: (parent, args, context) => {
            const hasManyResolver: DefaultResolver = new HasResolver({
              mapper: this.mapper,
              tableBuilder: this,
              repository: this.repository,
              foreignKey,
            });
            return hasManyResolver.resolve(parent, args, context);
          },
        },
      });
    }
  }

  buildHasOneAssociation() {
    const tc = this.composer.getOTC(
      this.translator.typeName(this.metadata.name)
    );
    for (const [constraintName, foreignKey] of Object.entries(
      this.metadata.hasOne
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
        [this.translator.associationName(constraintName)]: {
          type: new GraphQLList(new GraphQLNonNull(referencedType.getType())),
          resolve: async (parent, args, context) => {
            const hasManyResolver: DefaultResolver = new HasResolver({
              mapper: this.mapper,
              tableBuilder: this,
              repository: this.repository,
              foreignKey,
            });
            const result = await hasManyResolver.resolve(parent, args, context);
            return result[0] ?? null;
          },
        },
      });
    }
  }

  buildMultiObjectTC() {
    const objectType = this.buildObjectTC();

    return this.composer.getOrCreateOTC(
      this.translator.typeName(this.metadata.name, true),
      (tc) => {
        tc.addFields({
          records: {
            type: new GraphQLNonNull(
              new GraphQLList(new GraphQLNonNull(objectType.getType()))
            ),
            resolve: (parent, args, context) =>
              this.listResolver.resolve(parent, args ?? {}, context),
          },
          limit: 'Int!',
          offset: 'Int!',
          count: {
            type: 'Int',
            resolve: (parent, args, context) =>
              this.countResolver.resolve(parent, args ?? {}, context),
          },
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
    const listInputBuilder = this.getListMethodBuilder();

    this.composer.Query.addFields({
      [this.listMethodName(multiObjectType)]: {
        type: new GraphQLNonNull(multiObjectType.getType()),
        resolve: (parent, args) => {
          const pagination = this.normalisePagination(args.pagination);
          return {
            ...pagination,
            filter: args.filter,
            pagination,
          };
        },
        args: listInputBuilder.buildSchema(),
      },
    });
  }

  private normalisePagination(pagination: any = {}) {
    if (pagination.disabled) {
      return {
        page: 0,
        disable: true,
        limit: 0,
        offset: 0,
      };
    }

    let page = pagination.page ?? null;
    let limit = pagination.limit ?? 20;

    if (limit > 100) {
      limit = 100;
    }
    let offset = pagination.offset ?? null;

    if (page != null) {
      offset = page * limit;
    }

    if (offset != null && page === null) {
      page = Math.floor(offset / limit);
    }

    return {
      offset,
      page,
      limit,
    };
  }

  getListMethodBuilder() {
    return new ListInputBuilder({
      composer: this.composer,
      metadata: this.metadata,
      tableBuilder: this,
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

  getTranslator() {
    return this.translator;
  }
}
