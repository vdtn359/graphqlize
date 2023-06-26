import type { TableMetadata } from '@vdtn359/graphqlize-mapper';
import type { TableBuilder } from '../builders/table';

export abstract class DefaultResolver {
  protected readonly tableMetadata: TableMetadata;

  constructor(protected readonly tableBuilder: TableBuilder) {
    this.tableMetadata = tableBuilder.getTableMetadata();
  }

  abstract resolve(parent: any, args: Record<string, any>, context: any): any;
}
