import type { TableMetadata } from '@vdtn359/graphqlize-mapper';
import { GraphQLResolveInfo } from 'graphql/type';
import DataLoader from 'dataloader';
import type { TableBuilder } from '../builders/table';

const DATA_LOADER_KEY = Symbol('DataLoader');

export abstract class DefaultResolver {
  protected readonly tableMetadata: TableMetadata;

  constructor(protected readonly tableBuilder: TableBuilder) {
    this.tableMetadata = tableBuilder.getTableMetadata();
  }

  abstract resolve(
    parent: any,
    args: Record<string, any>,
    context: any,
    info: GraphQLResolveInfo
  ): any;

  getOrCreateDataLoader(
    context: any,
    info: GraphQLResolveInfo,
    dataLoaderFactory: () => DataLoader<any, any>
  ) {
    if (!context[DATA_LOADER_KEY]) {
      context[DATA_LOADER_KEY] = {};
    }
    const cachedKey = JSON.stringify([info.path.typename, info.path.key]);
    let cachedLoader = context[DATA_LOADER_KEY][cachedKey];
    if (!cachedLoader) {
      cachedLoader = dataLoaderFactory();
      context[DATA_LOADER_KEY][cachedKey] = cachedLoader;
    }
    return cachedLoader;
  }
}
