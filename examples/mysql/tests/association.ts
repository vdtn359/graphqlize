import { Sequelize } from 'sequelize';

export const associate = (sequelize: Sequelize) => {
  const { instrument, orchestra, user, stats, session, userSession } =
    sequelize.models;

  user.hasMany(instrument);
  user.hasMany(user, {
    as: 'students',
    foreignKey: 'mentorId',
  });
  user.belongsTo(user, {
    as: 'mentor',
    foreignKey: 'mentorId',
  });
  user.belongsTo(stats, {
    foreignKey: 'statsId',
    as: 'stats',
  });
  user.belongsToMany(session, {
    as: 'sessions',
    through: userSession,
  });
  user.hasMany(userSession);
  session.belongsToMany(user, {
    as: 'users',
    through: userSession,
  });
  userSession.belongsTo(session);
  stats.hasOne(user, {
    foreignKey: 'statsId',
  });

  orchestra.hasMany(instrument);

  instrument.belongsTo(orchestra);
  instrument.belongsTo(user);
};
