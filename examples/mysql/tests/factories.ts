import { sequelize } from './sequelize';

export const statsFactory = async (props: Record<string, any> = {}) =>
  sequelize.models.stats.create({
    views: 100,
    likes: 50,
    exp: 3,
    ...props,
  });

export const userFactory = async (props: Record<string, any> = {}) =>
  sequelize.models.user.create({
    username: 'jack-sparrow',
    provider: 'local',
    email: 'test@gmail.com',
    verified: true,
    details: {
      firstName: 'Tuan',
      lastName: 'Nguyen',
    },
    createdAt: new Date('2021-01-01T00:00:00Z'),
    ...props,
  });
