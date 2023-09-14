import { Server } from 'http';
import { clearDB, getServer } from '../../../helpers/utils';
import { expectUserMatchesUserResponse } from '../../../helpers/assert';
import { userFactory } from '../../../helpers/factories';
import { listUsersQuery } from '../../../helpers/queries';

const CREATED = '2021-02-01T03:04:05Z';
describe('Date filters', () => {
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
      createdAt: new Date(CREATED),
    });
  });

  it('throw on invalid date', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { createdAt: { _eq: 'blah' } },
    });
    expect(response.errors[0].message).toMatch('value is an invalid Date');
  });

  it('empty', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { createdAt: {} },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('eq', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { createdAt: { _eq: CREATED } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('ne', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { createdAt: { _neq: CREATED } },
    });
    expect(response.data.listUsers.count).toEqual(0);
  });

  it('in', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { createdAt: { _in: [CREATED] } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('notIn', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { createdAt: { _notIn: [CREATED] } },
    });
    expect(response.data.listUsers.count).toEqual(0);
  });

  it('gt', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { createdAt: { _gt: '2020-12-31T00:00:00Z' } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('gte', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { createdAt: { _gte: CREATED } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('lt', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { createdAt: { _lt: '2021-02-02T00:00:00Z' } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('lte', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { createdAt: { _lte: CREATED } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('year', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { createdAt: { _year: { _eq: 2021 } } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('month', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { createdAt: { _month: { _eq: 2 } } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('day', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { createdAt: { _day: { _eq: 1 } } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('hour', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { createdAt: { _hour: { _eq: 3 } } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('minute', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { createdAt: { _minute: { _eq: 4 } } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('second', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { createdAt: { _second: { _eq: 5 } } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('date', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { createdAt: { _date: { _eq: '2021-02-01' } } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('dayOfWeek', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: { createdAt: { _dow: { _eq: 2 } } },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });
});
