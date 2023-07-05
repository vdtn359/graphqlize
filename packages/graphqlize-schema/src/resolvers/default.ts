import type { TableMetadata } from '@vdtn359/graphqlize-mapper';
import { GraphQLResolveInfo } from 'graphql/type';
import type { TableBuilder } from '../builders/table';

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
}
