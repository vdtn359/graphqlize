import { DataTypes, Sequelize } from 'sequelize';

export default (sequelize: Sequelize) => {
  sequelize.define(
    'orchestra',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: {
        allowNull: false,
        type: DataTypes.STRING,
      },
    },
    {
      underscored: true,
    }
  );
};
