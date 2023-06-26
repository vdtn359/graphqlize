import type { DatabaseMapper } from '@vdtn359/graphqlize-mapper';
import type { TableBuilder } from '../builders/table';
import { DefaultResolver } from './default';
import { Repository } from './repository';

export class GetResolver extends DefaultResolver {
  private mapper: DatabaseMapper;

  private repository: Repository;

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
    this.repository = repository;
  }

  async resolve(parent: any, { by: queries }: Record<string, any>) {
    const typeName = Object.keys(queries)[0];
    if (!typeName) {
      throw new Error('At least one candidate key must be specified');
    }

    const translator = this.tableBuilder.getTranslator();

    const dataLoaderName = translator.columnTypeLookup(typeName);
    let keyValue;
    let columns: string[];
    if (this.tableMetadata.compositeKeys[dataLoaderName]) {
      keyValue = translator.reverseToDB(queries[typeName]);
      columns = this.tableMetadata.compositeKeys[dataLoaderName];
    } else {
      keyValue = translator.reverseToDB(queries);
      columns = [dataLoaderName];
    }
    const result = await this.repository.loadOne(columns, keyValue);
    return translator.convertFromDB(result);
  }
}
