import { Knex } from 'knex';
import type { BaseDialect } from './base';
import { DefaultDialect } from './default';

export class SqliteDialect extends DefaultDialect implements BaseDialect {
  transform(value: any): any {
    if (value instanceof Date) {
      return `${value.toISOString().replace('T', ' ').replace('Z', '')} +00:00`;
    }
    if (Array.isArray(value)) {
      return value.map((element) => this.transform(element));
    }
    return value;
  }

  dayOfWeek(knex: Knex, name: string): any {
    return knex.raw(`CAST(STRFTIME('%w', ${name}) AS INT) + 1`);
  }

  hour(knex: Knex, name: string): any {
    return knex.raw(`CAST(STRFTIME('%H', ${name}) AS INT)`);
  }

  minute(knex: Knex, name: string): any {
    return knex.raw(`CAST(STRFTIME('%M', ${name}) AS INT)`);
  }

  second(knex: Knex, name: string): any {
    return knex.raw(`CAST(STRFTIME('%S', ${name}) AS INT)`);
  }

  year(knex: Knex, name: string): any {
    return knex.raw(`CAST(STRFTIME('%Y', ${name}) AS INT)`);
  }

  month(knex: Knex, name: string): any {
    return knex.raw(`CAST(STRFTIME('%m', ${name}) AS INT)`);
  }

  date(knex: Knex, name: string): any {
    return knex.raw(`DATE(${name})`);
  }

  day(knex: Knex, name: string): any {
    return knex.raw(`CAST(STRFTIME('%d', ${name}) AS INT)`);
  }
}
