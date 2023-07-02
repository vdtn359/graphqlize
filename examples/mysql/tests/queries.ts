import gql from 'graphql-tag';
import { Server } from 'http';
import { sendQuery } from './utils';
import { statsFragment, userFragment } from './fragment';

export const listUsersQuery = async (
  server: Server,
  params: Record<string, any>
) =>
  sendQuery(server, {
    query: gql`
      query Query(
        $filter: ListUsersInput
        $pagination: Pagination
        $sort: [SortUser!]
      ) {
        listUsers(filter: $filter, pagination: $pagination, sort: $sort) {
          records {
            ...UserFragment
          }
          count
        }
      }
      ${userFragment}
    `,
    variables: params,
  });

export const listStatsQuery = async (
  server: Server,
  params: Record<string, any>
) =>
  sendQuery(server, {
    query: gql`
      query Query(
        $filter: ListStatsInput
        $pagination: Pagination
        $sort: [SortStat!]
      ) {
        listStats(filter: $filter, pagination: $pagination, sort: $sort) {
          records {
            ...StatsFragment
          }
          count
        }
      }
      ${statsFragment}
    `,
    variables: params,
  });
