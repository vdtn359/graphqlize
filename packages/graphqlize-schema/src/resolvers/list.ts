import type { DatabaseMapper } from '@vdtn359/graphqlize-mapper';
import type { TableBuilder } from '../builders/table';
import { DefaultResolver } from './default';
import { Repository } from './repository';

export class ListResolver extends DefaultResolver {
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

  async resolve({ filter, pagination, sort = [] }: Record<string, any> = {}) {
    const translator = this.tableBuilder.getTranslator();
    const transformedFilter = translator.reverseToDB(filter);
    const transformedSort = sort.map((sortItem: any) =>
      translator.reverseToDB(sortItem)
    );
    const result: any[] = await this.repository.list({
      filter: transformedFilter,
      sort: transformedSort,
      pagination,
    });

    return result.map((item) => translator.convertFromDB(item));
  }
}
