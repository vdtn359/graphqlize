import { sequelize } from './sequelize';

module.exports = async () => {
  await sequelize.close();
  process.exit(0);
};
