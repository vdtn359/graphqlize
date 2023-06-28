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

  async resolve(parent: any, { filter, pagination }: Record<string, any> = {}) {
    const translator = this.tableBuilder.getTranslator();
    const normalisedPagination = this.normalisePagination(pagination);
    const transformedFilter = translator.reverseToDB(filter);
    const result: any[] = await this.repository.list({
      filter: transformedFilter,
      pagination: normalisedPagination,
    });

    const transformedResults = result.map((item) =>
      translator.convertFromDB(item)
    );

    return {
      records: transformedResults,
      limit: pagination.limit,
      offset: pagination.offset,
    };
  }

  private normalisePagination(pagination: any = {}) {
    if (pagination.disabled) {
      return {
        page: 0,
        disable: true,
        limit: 0,
        offset: 0,
      };
    }

    let page = pagination.page ?? null;
    let limit = pagination.limit ?? 20;

    if (limit > 100) {
      limit = 100;
    }
    let offset = pagination.offset ?? null;

    if (page != null) {
      offset = page * limit;
    }

    if (offset != null && page === null) {
      page = Math.floor(offset / limit);
    }

    return {
      offset,
      page,
      limit,
    };
  }
}
