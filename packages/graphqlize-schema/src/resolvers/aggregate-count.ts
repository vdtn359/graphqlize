import type { DatabaseMapper } from '@vdtn359/graphqlize-mapper';
import { GraphQLResolveInfo } from 'graphql/type';
import type { TableBuilder } from '../builders/table';
import { Repository } from './repository';
import { AggregateResolver } from './aggregate';

export class AggregateCountResolver extends AggregateResolver {
  constructor({
    mapper,
    tableBuilder,
    repository,
  }: {
    mapper: DatabaseMapper;
    tableBuilder: TableBuilder;
    repository: Repository;
  }) {
    super({ mapper, tableBuilder, repository });
  }

  async resolve(
    { filter, groupBy, having }: Record<string, any>,
    args: any,
    context: any,
    info: GraphQLResolveInfo
  ) {
    const fields = this.parseResolveInfo(info);
    const translator = this.tableBuilder.getTranslator();
    const transformedFilter = filter
      ? translator.reverseToDB(filter)
      : undefined;
    const transformedGroupBy = groupBy
      ? translator.reverseToDB(groupBy)
      : undefined;

    return this.repository.aggregateCount({
      fields,
      filter: transformedFilter,
      groupBy: transformedGroupBy,
      having,
    });
  }
}
