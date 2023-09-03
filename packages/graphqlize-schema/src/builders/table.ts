import type {
  DatabaseMapper,
  Pagination,
  TableMetadata,
} from '@vdtn359/graphqlize-mapper';
import {
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
} from 'graphql';
import { ObjectTypeComposer, SchemaComposer } from 'graphql-compose';
import { SchemaOptionType } from './options';
import { hasColumns, mergeTransform } from '../utils';
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
import { buildEnumType } from '../types/enum';
import { AggregateInputBuilder } from './aggregate-input';
import { AggregateResolver } from '../resolvers/aggregate';
import { HasCountResolver } from '../resolvers/has-count';

export class TableBuilder {
  private readonly metadata: TableMetadata;

  private readonly mapper: DatabaseMapper;

  private readonly getResolver: DefaultResolver;

  private readonly translator: TableTranslator;

  private readonly listResolver: DefaultResolver;

  private readonly aggregateResolver: DefaultResolver;

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

    this.aggregateResolver = new AggregateResolver({
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
      this.translator.typeName(this.metadata.alias),
      (tc) => {
        for (const [columnName, columnMetadata] of Object.entries(
          this.metadata.columns
        )) {
          let graphqlType: any = columnMetadata.type;
          if (graphqlType instanceof GraphQLEnumType) {
            graphqlType = buildEnumType(
              this.translator,
              columnMetadata,
              this.composer
            ).getType();
          }
          tc.addFields({
            [this.translator.columnName(columnName)]: {
              type: columnMetadata.nullable
                ? graphqlType
                : new GraphQLNonNull(graphqlType),
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
      this.translator.typeName(this.metadata.alias)
    );
    for (const [constraintName, foreignKey] of Object.entries(
      this.metadata.belongsTo
    )) {
      const { referenceTable, columns } = foreignKey;
      const isNullable = columns.every(
        (column) => this.metadata.columns[column].nullable
      );

      const referencedTypeBuilder =
        this.schemaBuilder.getTableBuilder(referenceTable);
      const referencedType = referencedTypeBuilder.buildObjectTC();

      tc.addFields({
        [this.translator.associationName(constraintName)]: {
          type: isNullable
            ? referencedType
            : new GraphQLNonNull(referencedType.getType()),
          resolve: async (parent, args, context, info) => {
            const belongToResolver: DefaultResolver = new BelongToResolver({
              mapper: this.mapper,
              tableBuilder: this,
              foreignKey,
            });
            return belongToResolver.resolve(parent, args, context, info);
          },
        },
      });
    }
  }

  buildHasManyAssociation() {
    const tc = this.composer.getOTC(
      this.translator.typeName(this.metadata.alias)
    );
    for (const [constraintName, foreignKey] of Object.entries(
      this.metadata.hasMany
    )) {
      const { referenceTable } = foreignKey;
      const referencedTypeBuilder =
        this.schemaBuilder.getTableBuilder(referenceTable);
      const referencedType = referencedTypeBuilder.buildMultiObjectTC();
      const referencedListInputBuilder =
        referencedTypeBuilder.getListInputBuilder();

      tc.addFields({
        [this.translator.associationName(constraintName)]: {
          type: new GraphQLNonNull(referencedType.getType()),
          resolve: async (parent, args) => {
            const pagination = this.normalisePagination(args.pagination);
            const { columns } = foreignKey;

            if (!hasColumns(parent?.$raw ?? {}, columns)) {
              return {
                ...pagination,
                records: [],
                count: 0,
              };
            }

            return {
              ...pagination,
              parent,
              foreignKey,
              args: {
                sort: args.sort,
                filter: args.filter,
                pagination: pagination && {
                  ...pagination,
                  perPartition: true,
                },
              },
            };
          },
          args: referencedListInputBuilder.buildSchema(false),
        },
      });
    }
  }

  buildHasOneAssociation() {
    const tc = this.composer.getOTC(
      this.translator.typeName(this.metadata.alias)
    );
    for (const [constraintName, foreignKey] of Object.entries(
      this.metadata.hasOne
    )) {
      const { referenceTable } = foreignKey;
      const referencedTypeBuilder =
        this.schemaBuilder.getTableBuilder(referenceTable);
      const referencedType = referencedTypeBuilder.buildObjectTC();

      tc.addFields({
        [this.translator.associationName(constraintName)]: {
          type: referencedType.getType(),
          resolve: async (parent, args, context, info) => {
            const hasResolver: DefaultResolver = new HasResolver({
              mapper: this.mapper,
              tableBuilder: this,
              foreignKey,
            });
            const result = await hasResolver.resolve(
              parent,
              args,
              context,
              info
            );
            return result[0] ?? null;
          },
        },
      });
    }
  }

  buildMultiObjectTC() {
    const objectType = this.buildObjectTC();

    return this.composer.getOrCreateOTC(
      this.translator.typeName(this.metadata.alias, true),
      (tc) => {
        tc.addFields({
          records: {
            type: new GraphQLNonNull(
              new GraphQLList(new GraphQLNonNull(objectType.getType()))
            ),
            resolve: (parent, args, context, info) => {
              if (parent.records) {
                return parent.records;
              }
              if (parent.foreignKey) {
                const hasManyResolver: DefaultResolver = new HasResolver({
                  mapper: this.mapper,
                  tableBuilder: this,
                  foreignKey: parent.foreignKey,
                });
                return hasManyResolver.resolve(
                  parent.parent,
                  {
                    ...args,
                    ...parent.args,
                  },
                  context,
                  info
                );
              }
              return this.listResolver.resolve(
                parent,
                args ?? {},
                context,
                info
              );
            },
          },
          limit: 'Int!',
          offset: 'Int!',
          count: {
            type: 'Int',
            resolve: (parent, args, context, info) => {
              if (parent.count) {
                return parent.count;
              }

              if (parent.foreignKey) {
                const hasCountResolver: DefaultResolver = new HasCountResolver({
                  mapper: this.mapper,
                  tableBuilder: this,
                  foreignKey: parent.foreignKey,
                });

                return hasCountResolver.resolve(
                  parent.parent,
                  {
                    ...args,
                    ...parent.args,
                  },
                  context,
                  info
                );
              }
              return this.countResolver.resolve(
                parent,
                args ?? {},
                context,
                info
              );
            },
          },
        });
      }
    );
  }

  buildAggregateObjectTC() {
    const aggregateRecord = this.composer.getOrCreateOTC(
      this.translator.aggregateRootTypeName(),
      (tc) => {
        tc.addFields({
          group: 'JSON',
          count: this.buildCountAggregateObjectTC(),
          avg: this.buildAvgAggregateObjectTC(),
          sum: this.buildOtherAggregateObjectTC('sum'),
          min: this.buildOtherAggregateObjectTC('min'),
          max: this.buildOtherAggregateObjectTC('max'),
        });
      }
    );
    return this.composer.getOrCreateOTC(
      this.translator.aggregateResultsName(),
      (tc) => {
        tc.addFields({
          records: {
            type: new GraphQLNonNull(
              new GraphQLList(new GraphQLNonNull(aggregateRecord.getType()))
            ),
            resolve: (parent, args, context, info) =>
              this.aggregateResolver.resolve(parent, args, context, info),
          },
          limit: 'Int',
          offset: 'Int',
          count: {
            type: 'Int',
            resolve: () => null,
          },
        });
      }
    );
  }

  buildCountAggregateObjectTC() {
    return this.composer.getOrCreateOTC(
      this.translator.aggregateTypeName('count'),
      (tc) => {
        for (const column of Object.keys(this.metadata.columns)) {
          tc.addFields({
            [this.translator.columnName(column)]: {
              type: 'Int',
            },
          });
        }

        tc.addFields({
          _all: {
            type: 'Int',
          },
        });

        for (const [column, foreignKey] of Object.entries({
          ...this.metadata.belongsTo,
          ...this.metadata.hasOne,
        })) {
          const { referenceTable } = foreignKey;
          const referencedTypeBuilder =
            this.schemaBuilder.getTableBuilder(referenceTable);

          tc.addFields({
            [this.translator.associationName(column)]: {
              type: referencedTypeBuilder.buildCountAggregateObjectTC(),
            },
          });
        }
      }
    );
  }

  buildAvgAggregateObjectTC() {
    return this.composer.getOrCreateOTC(
      this.translator.aggregateTypeName('avg'),
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
              type: 'Float',
            },
          });
        }

        for (const [column, foreignKey] of Object.entries({
          ...this.metadata.belongsTo,
          ...this.metadata.hasOne,
        })) {
          const { referenceTable } = foreignKey;
          const referencedTypeBuilder =
            this.schemaBuilder.getTableBuilder(referenceTable);

          tc.addFields({
            [this.translator.associationName(column)]: {
              type: referencedTypeBuilder.buildAvgAggregateObjectTC(),
            },
          });
        }
      }
    );
  }

  buildOtherAggregateObjectTC(type: string) {
    return this.composer.getOrCreateOTC(
      this.translator.aggregateTypeName(type),
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

        for (const [column, foreignKey] of Object.entries({
          ...this.metadata.belongsTo,
          ...this.metadata.hasOne,
        })) {
          const { referenceTable } = foreignKey;
          const referencedTypeBuilder =
            this.schemaBuilder.getTableBuilder(referenceTable);

          tc.addFields({
            [this.translator.associationName(column)]: {
              type: referencedTypeBuilder.buildOtherAggregateObjectTC(type),
            },
          });
        }
      }
    );
  }

  private getMethodName(objectTypeName: string) {
    return mergeTransform(['get', objectTypeName], this.options.case);
  }

  private listMethodName(objectTypeName: string) {
    return mergeTransform(['list', objectTypeName], this.options.case);
  }

  private aggregateMethodName(objectTypeName: string) {
    return mergeTransform(['aggregate', objectTypeName], this.options.case);
  }

  buildSchema() {
    const objectType = this.buildObjectTC();
    const multiObjectType = this.buildMultiObjectTC();
    const aggregateObjectType = this.buildAggregateObjectTC();

    this.buildGetMethod(objectType);
    this.buildListMethod(multiObjectType);
    this.buildAggregateMethod(
      multiObjectType.getTypeName(),
      aggregateObjectType
    );
  }

  buildGetMethod(objectType: ObjectTypeComposer) {
    const getInputBuilder = new GetInputBuilder({
      composer: this.composer,
      options: this.options,
      metadata: this.metadata,
      tableBuilder: this,
    });
    const methodName = this.getMethodName(objectType.getTypeName());
    this.composer.Query.addFields({
      [methodName]: {
        type: objectType,
        resolve: (parent, args, context, info) =>
          this.getResolver.resolve(parent, args ?? {}, context, info),
      },
    });
    const getInputSchema = getInputBuilder.buildSchema();
    if (getInputSchema) {
      this.composer.Query.addFieldArgs(methodName, getInputSchema);
    }
  }

  buildListMethod(multiObjectType: ObjectTypeComposer) {
    const listInputBuilder = this.getListInputBuilder();

    this.composer.Query.addFields({
      [this.listMethodName(multiObjectType.getTypeName())]: {
        type: new GraphQLNonNull(multiObjectType.getType()),
        resolve: (parent, args) => {
          const pagination = this.normalisePagination(args.pagination);
          return {
            ...pagination,
            filter: args.filter,
            sort: args.sort,
            pagination,
          };
        },
        args: listInputBuilder.buildSchema(),
      },
    });
  }

  buildAggregateMethod(
    objectTypesName: string,
    aggregateObjectType: ObjectTypeComposer
  ) {
    const aggregateInputBuilder = this.getAggregateInputBuilder();

    this.composer.Query.addFields({
      [this.aggregateMethodName(objectTypesName)]: {
        type: aggregateObjectType,
        resolve: (parent, args) => {
          const pagination = args.pagination
            ? this.normalisePagination(args.pagination)
            : undefined;
          return {
            groupBy: args.groupBy,
            having: args.having,
            ...pagination,
            filter: args.filter,
            sort: args.sort,
            pagination,
          };
        },
        args: aggregateInputBuilder.buildSchema(),
      },
    });
  }

  private normalisePagination(pagination?: Pagination & { page?: number }) {
    if (!pagination) {
      return null;
    }
    if (pagination.disabled) {
      return {
        page: 0,
        disabled: true,
        limit: 0,
        offset: 0,
      };
    }

    const page = pagination.page ?? null;
    let limit = pagination.limit ?? 20;

    if (limit > 100) {
      limit = 100;
    }
    let offset = pagination.offset ?? null;

    if (page != null) {
      offset = page * limit;
    }

    return {
      offset,
      limit,
    };
  }

  getListInputBuilder() {
    return new ListInputBuilder({
      composer: this.composer,
      metadata: this.metadata,
      tableBuilder: this,
    });
  }

  getAggregateInputBuilder() {
    return new AggregateInputBuilder({
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
