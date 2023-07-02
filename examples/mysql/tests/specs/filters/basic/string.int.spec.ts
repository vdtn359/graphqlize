import { Server } from 'http';
import { clearDB, getServer } from '#tests/utils';
import { expectUserMatchesUserResponse } from '#tests/assert';
import { userFactory } from '#tests/factories';
import { listUsersQuery } from '#tests/queries';

const USERNAME = 'jack-sparrow';

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
      username: USERNAME,
    });
  });

  it('empty', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { username: {} },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('eq', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { username: { _eq: USERNAME } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('ne', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { username: { _neq: USERNAME } },
    });
    expect(response.data.listUsers.count).toEqual(0);
  });

  it('contains', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { username: { _contains: USERNAME } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('like', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { username: { _like: 'jack%' } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('iLike', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { username: { _iLike: 'jAcK%' } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('in', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { username: { _in: [USERNAME, 'test'] } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('startsWith', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { username: { _startsWith: 'jack' } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('endsWith', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { username: { _endsWith: 'sparrow' } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('notIn', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { username: { _notIn: [USERNAME, 'test'] } },
    });
    expect(response.data.listUsers.count).toEqual(0);
  });

  it('between', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { username: { _between: ['jack', 'jacl'] } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('notBetween', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { username: { _notBetween: ['jack', 'jacl'] } },
    });
    expect(response.data.listUsers.count).toEqual(0);
  });

  it('gt', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { username: { _gt: 'jack' } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('gte', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { username: { _gte: USERNAME } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('lt', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { username: { _lt: 'jacl' } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('lte', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { username: { _lte: USERNAME } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });
});
