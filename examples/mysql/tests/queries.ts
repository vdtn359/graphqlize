import gql from 'graphql-tag';
import { Server } from 'http';
import { sendQuery } from './utils';
import { userFragment } from './fragment';

export const listUserFactories = async (
  server: Server,
  params: Record<string, any>
) =>
  sendQuery(server, {
    query: gql`
      query Query {
        listUsers(filter: { username: {} }) {
          records {
            ...UserFragment
          }
          count
        }
      }
      ${userFragment}
    `,
  });
