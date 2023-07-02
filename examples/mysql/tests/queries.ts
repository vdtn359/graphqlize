import gql from 'graphql-tag';
import { Server } from 'http';
import { sendQuery } from './utils';
import { userFragment } from './fragment';

export const listUsersQuery = async (
  server: Server,
  params: Record<string, any>
) =>
  sendQuery(server, {
    query: gql`
      query Query($filter: ListUsersInput) {
        listUsers(filter: $filter) {
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
