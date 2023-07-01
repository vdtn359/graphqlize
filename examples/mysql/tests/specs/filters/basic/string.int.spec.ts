import gql from 'graphql-tag';
import { Server } from 'http';
import { clearDB, getServer, sendQuery } from '../../../utils';
import { userFragment } from '../../../fragment';
import { expectUserMatchesUserResponse } from '../../../assert';
import { userFactory } from '../../../factories';

describe('String filters', () => {
  let user: any;
  let server: Server;

  beforeAll(async () => {
    server = await getServer();
  });
  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => clearDB());

  beforeEach(async () => {
    user = await userFactory({
      username: 'jack-sparrow',
    });
  });

  it('empty', async () => {
    const { body: response } = await sendQuery(server, {
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
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('eq', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          listUsers(filter: { username: { _eq: "jack-sparrow" } }) {
            records {
              ...UserFragment
            }
            count
          }
        }
        ${userFragment}
      `,
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('ne', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          listUsers(filter: { username: { _neq: "jack-sparrow" } }) {
            records {
              ...UserFragment
            }
            count
          }
        }
        ${userFragment}
      `,
    });
    expect(response.data.listUsers.count).toEqual(0);
  });

  it('contains', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          listUsers(filter: { username: { _contains: "jack" } }) {
            records {
              ...UserFragment
            }
            count
          }
        }
        ${userFragment}
      `,
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('like', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          listUsers(filter: { username: { _like: "jack%" } }) {
            records {
              ...UserFragment
            }
            count
          }
        }
        ${userFragment}
      `,
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('iLike', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          listUsers(filter: { username: { _iLike: "Jack%" } }) {
            records {
              ...UserFragment
            }
            count
          }
        }
        ${userFragment}
      `,
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('in', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          listUsers(filter: { username: { _in: ["jack-sparrow", "test"] } }) {
            records {
              ...UserFragment
            }
            count
          }
        }
        ${userFragment}
      `,
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('startsWith', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          listUsers(filter: { username: { _startsWith: "jack" } }) {
            records {
              ...UserFragment
            }
            count
          }
        }
        ${userFragment}
      `,
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('endsWith', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          listUsers(filter: { username: { _endsWith: "sparrow" } }) {
            records {
              ...UserFragment
            }
            count
          }
        }
        ${userFragment}
      `,
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('notIn', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          listUsers(
            filter: { username: { _notIn: ["jack-sparrow", "test"] } }
          ) {
            records {
              ...UserFragment
            }
            count
          }
        }
        ${userFragment}
      `,
    });
    expect(response.data.listUsers.count).toEqual(0);
  });

  it('between', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          listUsers(filter: { username: { _between: ["jack", "jacl"] } }) {
            records {
              ...UserFragment
            }
            count
          }
        }
        ${userFragment}
      `,
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('notBetween', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          listUsers(filter: { username: { _notBetween: ["jack", "jacl"] } }) {
            records {
              ...UserFragment
            }
            count
          }
        }
        ${userFragment}
      `,
    });
    expect(response.data.listUsers.count).toEqual(0);
  });

  it('gt', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          listUsers(filter: { username: { _gt: "jack" } }) {
            records {
              ...UserFragment
            }
            count
          }
        }
        ${userFragment}
      `,
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('gte', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          listUsers(filter: { username: { _gte: "jack-sparrow" } }) {
            records {
              ...UserFragment
            }
            count
          }
        }
        ${userFragment}
      `,
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('lt', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          listUsers(filter: { username: { _lte: "jacl" } }) {
            records {
              ...UserFragment
            }
            count
          }
        }
        ${userFragment}
      `,
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('lte', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          listUsers(filter: { username: { _lte: "jack-sparrow" } }) {
            records {
              ...UserFragment
            }
            count
          }
        }
        ${userFragment}
      `,
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });
});
