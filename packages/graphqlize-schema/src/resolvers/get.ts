import type { DatabaseMapper } from '@vdtn359/graphqlize-mapper';
import type { TableBuilder } from '../builders/table';
import { DefaultResolver } from './default';
import { DataLoaderManager } from './data-loader-manager';

export class GetResolver extends DefaultResolver {
  private mapper: DatabaseMapper;

  private dataloaderManager: DataLoaderManager;

  constructor({
    mapper,
    tableBuilder,
    dataLoaderManager,
  }: {
    mapper: DatabaseMapper;
    tableBuilder: TableBuilder;
    dataLoaderManager: DataLoaderManager;
  }) {
    super(tableBuilder);
    this.mapper = mapper;
    this.dataloaderManager = dataLoaderManager;
  }

  async resolve(parent: any, { by: queries }: Record<string, any>) {
    const typeName = Object.keys(queries)[0];
    if (!typeName) {
      throw new Error('At least one candidate key must be specified');
    }

    const dataLoaderName = this.tableBuilder.reverseLookup(typeName);
    let keyValue;
    if (this.tableMetadata.compositeKeys[dataLoaderName]) {
      keyValue = this.reverseToDB(queries[typeName]);
    } else {
      keyValue = this.reverseToDB(queries);
    }
    const result = await this.dataloaderManager.load(dataLoaderName, keyValue);
    return this.convertFromDB(result);
  }
}
