import type { DatabaseMapper } from '@vdtn359/graphqlize-mapper';
import type { TableBuilder } from '../builders/table';
import { DefaultResolver } from './default';
import { Repository } from './repository';
import { TableTranslator } from '../builders/translator';

export class ListResolver extends DefaultResolver {
  private mapper: DatabaseMapper;

  private repository: Repository;

  private translator: TableTranslator;

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
    this.translator = tableBuilder.getTranslator();
    this.mapper = mapper;
    this.repository = repository;
  }

  async resolve(parent: any, { filter, pagination }: Record<string, any> = {}) {
    const normalisedPagination = this.normalisePagination(pagination);
    const transformedFilter = this.translator.reverseToDB(filter);
    const result: any[] = this.repository.list({
      filter: transformedFilter,
      pagination: normalisedPagination,
    });

    const transformedResults = result.map((item) =>
      this.translator.convertFromDB(item)
    );

    return {
      records: transformedResults,
      limit: pagination.limit,
      offset: pagination.offset,
    };
  }

  // transformFilter(filter: Record<string, any>) {
  //   const result: Record<string, any> = {};
  //   for (const [key, value] of Object.values(filter)) {
  //     if (this.tableMetadata.belongsTo[key]) {
  //       // belong to relation
  //       const { referenceTable } = this.tableMetadata.belongsTo[key];
  //     }
  //
  //     result[this.tableBuilder.reverseLookup(key)] = value;
  //   }
  //
  //   return result;
  // }

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
