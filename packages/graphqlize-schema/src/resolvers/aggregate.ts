import type { DatabaseMapper } from '@vdtn359/graphqlize-mapper';
import { parseResolveInfo, ResolveTree } from 'graphql-parse-resolve-info';
import { flatten, isEmpty } from 'lodash';
import { GraphQLResolveInfo } from 'graphql/type';
import type { TableBuilder } from '../builders/table';
import { DefaultResolver } from './default';
import { Repository } from './repository';

export class AggregateResolver extends DefaultResolver {
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

  async resolve(
    parent: any,
    { filter, groupBy, having }: Record<string, any>,
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

    return this.repository.aggregate({
      fields,
      filter: transformedFilter,
      groupBy: transformedGroupBy,
      having,
    });
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  private parseResolveInfo(info: GraphQLResolveInfo) {
    const resolveTree = (parseResolveInfo(info) as ResolveTree) ?? {};
    const result = {};
    const queue: { object: any; tree: ResolveTree }[] = [
      { tree: resolveTree, object: result },
    ];
    while (queue.length) {
      const { object, tree: currentResolveTree } = queue.shift()!;
      if (currentResolveTree && currentResolveTree.fieldsByTypeName) {
        for (const [key, subResolveTree] of flatten(
          Object.values(currentResolveTree.fieldsByTypeName).map(Object.entries)
        )) {
          const translator = this.tableBuilder.getTranslator();
          object[translator.columnTypeLookup(key) ?? key] = !isEmpty(
            subResolveTree.fieldsByTypeName
          )
            ? {}
            : true;
          if (typeof object[key] === 'object') {
            queue.push({
              object: object[key],
              tree: subResolveTree,
            });
          }
        }
      }
    }
    return result;
  }
}
