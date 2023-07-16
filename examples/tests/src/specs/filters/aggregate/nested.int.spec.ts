import { Server } from 'http';
import { clearDB, getServer } from '../../../helpers/utils';
import { expectUserMatchesUserResponse } from '../../../helpers/assert';
import { userFactory } from '../../../helpers/factories';
import { sequelize } from '../../../database/sequelize';
import { listUsersQuery } from '../../../helpers/queries';

describe('Has one nested association', () => {
  const users: any[] = [];
  const sessions: any[] = [];
  let server: Server;

  beforeAll(async () => {
    server = await getServer();
  });
  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => clearDB());

  beforeEach(async () => {
    users[0] = await userFactory();

    users[1] = await userFactory();

    sessions[0] = await sequelize.models.session.create({
      name: '1st session',
      location: 'Paris',
      start: '2021-01-01T00:00:00Z',
      end: '2021-01-01T09:00:00Z',
    });

    sessions[1] = await sequelize.models.session.create({
      name: '2nd session',
      location: 'London',
      start: '2021-01-01T00:00:00Z',
      end: '2021-01-01T09:00:00Z',
    });

    await sequelize.models.userSession.create({
      userId: users[0].id,
      sessionId: sessions[0].id,
      time: '2021-01-01T05:00:00Z',
    });

    await sequelize.models.userSession.create({
      userId: users[0].id,
      sessionId: sessions[1].id,
      time: '2021-01-01T07:00:00Z',
    });

    await sequelize.models.userSession.create({
      userId: users[1].id,
      sessionId: sessions[0].id,
      time: '2021-01-01T07:00:00Z',
    });
  });

  it('should filter by aggregate (match)', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: {
        userSessions: {
          session: { _count: { id: { _eq: 2 } } },
        },
      },
    });

    expectUserMatchesUserResponse(users[0], response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('should filter by aggregate (no match)', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: {
        userSessions: { session: { _count: { id: { _eq: 3 } } } },
      },
    });
    expect(response.data.listUsers.count).toEqual(0);
  });
});
