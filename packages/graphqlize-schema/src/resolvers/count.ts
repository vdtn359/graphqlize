import type { DatabaseMapper } from '@vdtn359/graphqlize-mapper';
import type { TableBuilder } from '../builders/table';
import { DefaultResolver } from './default';
import { Repository } from './repository';

export class CountResolver extends DefaultResolver {
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

  async resolve({ filter }: Record<string, any> = {}) {
    const translator = this.tableBuilder.getTranslator();
    const transformedFilter = translator.reverseToDB(filter);

    return this.repository.count({
      filter: transformedFilter,
    });
  }
}
