import { SchemaOptions } from '@vdtn359/graphqlize-sql-mapper';

export const options: SchemaOptions = {
  introspect: false,
  tables: {
    users: {
      alias: 'users',
      primaryKey: 'id',
      candidateKeys: {
        id: ['id'],
        username: ['username'],
        stats_id: ['stats_id'],
      },
      compositeKeys: {},
      foreignKeys: {
        stats: {
          columns: ['stats_id'],
          referenceTable: 'stats',
          referenceColumns: ['id'],
        },
        mentor: {
          columns: ['mentor_id'],
          referenceTable: 'users',
          referenceColumns: ['id'],
        },
      },
      columns: {
        id: {
          nullable: false,
          defaultValue: null,
          rawType: 'int',
        },
        username: {
          nullable: false,
          defaultValue: null,
          rawType: 'varchar',
        },
        provider: {
          nullable: false,
          defaultValue: null,
          rawType: 'enum',
        },
        email: {
          nullable: false,
          defaultValue: null,
          rawType: 'varchar',
        },
        stats_id: {
          nullable: true,
          defaultValue: null,
          rawType: 'int',
        },
        details: {
          nullable: true,
          defaultValue: null,
          rawType: 'json',
        },
        verified: {
          nullable: true,
          defaultValue: null,
          rawType: 'boolean',
        },
        mentor_id: {
          nullable: true,
          defaultValue: null,
          rawType: 'int',
        },
      },
    },
    stats: {
      alias: 'stats',
      primaryKey: 'id',
      candidateKeys: {
        id: ['id'],
      },
      compositeKeys: {},
      columns: {
        id: {
          nullable: false,
          defaultValue: null,
          rawType: 'int',
        },
        exp: {
          nullable: false,
          defaultValue: null,
          rawType: 'int',
        },
        likes: {
          nullable: false,
          defaultValue: null,
          rawType: 'int',
        },
        views: {
          nullable: false,
          defaultValue: null,
          rawType: 'int',
        },
        created_at: {
          nullable: false,
          defaultValue: null,
          rawType: 'datetime',
        },
        updated_at: {
          nullable: false,
          defaultValue: null,
          rawType: 'datetime',
        },
      },
    },
  },
};
