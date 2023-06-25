import type { DatabaseMapper } from '@vdtn359/graphqlize-mapper';
import type { TableBuilder } from '../builders/table';
import { DefaultResolver } from './default';
import { Repository } from './repository';

export class GetResolver extends DefaultResolver {
  private mapper: DatabaseMapper;

  private dataloaderManager: Repository;

  constructor({
    mapper,
    tableBuilder,
    repository,
  }: {
    mapper: DatabaseMapper;
    tableBuilder: TableBuilder;
    repository: Repository;
  }) {
    super(tableBuilder);
    this.mapper = mapper;
    this.dataloaderManager = repository;
  }

  async resolve(parent: any, { by: queries }: Record<string, any>) {
    const typeName = Object.keys(queries)[0];
    if (!typeName) {
      throw new Error('At least one candidate key must be specified');
    }

    const dataLoaderName = this.tableBuilder.reverseLookup(typeName);
    let keyValue;
    let columns: string[];
    if (this.tableMetadata.compositeKeys[dataLoaderName]) {
      keyValue = this.reverseToDB(queries[typeName]);
      columns = this.tableMetadata.compositeKeys[dataLoaderName];
    } else {
      keyValue = this.reverseToDB(queries);
      columns = [dataLoaderName];
    }
    const result = await this.dataloaderManager.loadOne(columns, keyValue);
    return this.convertFromDB(result);
  }
}
