import { DataTypes, Sequelize } from 'sequelize';

export default (sequelize: Sequelize) => {
  sequelize.define(
    'user',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      username: {
        allowNull: false,
        type: DataTypes.STRING,
        unique: true,
        validate: {
          // We require usernames to have length of at least 3, and
          // only use letters, numbers and underscores/dash.
          is: /^(\w|-){3,}$/,
        },
      },
      provider: {
        allowNull: false,
        type: DataTypes.ENUM('google', 'facebook', 'local'),
        unique: 'user_email_provider_unique',
      },
      email: {
        allowNull: false,
        type: DataTypes.STRING,
        unique: 'user_email_provider_unique',
      },
      statsId: {
        allowNull: true,
        unique: true,
        type: DataTypes.INTEGER,
      },
      details: {
        allowNull: true,
        type: DataTypes.JSON,
      },
      verified: {
        allowNull: true,
        type: DataTypes.BOOLEAN,
      },
    },
    {
      underscored: true,
      indexes: [
        {
          name: 'provider_created_at',
          fields: ['provider', 'created_at'],
        },
      ],
    }
  );
};
