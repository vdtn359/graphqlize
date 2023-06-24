import { mapKeys } from 'lodash';
import type { TableMetadata } from '@vdtn359/graphqlize-mapper';
import type { TableBuilder } from '../builders/table';

export abstract class DefaultResolver {
  protected readonly tableMetadata: TableMetadata;

  constructor(protected readonly tableBuilder: TableBuilder) {
    this.tableMetadata = tableBuilder.getTableMetadata();
  }

  protected reverseToDB(fields: Record<string, any>) {
    return mapKeys(fields, (value, key) =>
      this.tableBuilder.reverseLookup(key)
    );
  }

  protected convertFromDB(record: Record<string, any>) {
    const result = mapKeys(record, (value, key) =>
      this.tableBuilder.columnName(key)
    );
    if (result) {
      result.$raw = record;
    }
    return result;
  }

  abstract resolve(parent: any, args: Record<string, any>, context: any): any;
}
