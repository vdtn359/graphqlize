import type { TableMetadata } from '@vdtn359/graphqlize-mapper';
import { mapKeys, transform as objectTransform } from 'lodash';
import { SchemaOptionType } from './options';
import {
  mergeTransform,
  pluralizeTransform,
  singular,
  transform,
} from '../utils';
import type { TableBuilder } from './table';

export class TableTranslator {
  private readonly tableBuilder: TableBuilder;

  private readonly casing: SchemaOptionType['case'];

  private tableMetadata: TableMetadata;

  private columnLookup: Record<string, string> = {};

  private associationLookup: Record<string, string> = {};

  private associationMap: Record<string, TableTranslator> = {};

  constructor({
    tableBuilder,
    casing,
  }: {
    tableBuilder: TableBuilder;
    casing: SchemaOptionType['case'];
  }) {
    this.tableBuilder = tableBuilder;
    this.tableMetadata = tableBuilder.getTableMetadata();
    this.casing = casing;
  }

  private buildColumnsLookup() {
    for (const columnName of Object.keys(this.tableMetadata.columns)) {
      this.columnLookup[this.columnName(columnName)] = columnName;
    }

    for (const compositeKeyName of Object.keys(
      this.tableMetadata.candidateKeys
    )) {
      const keyTypeName = this.columnName(compositeKeyName);
      if (!this.columnLookup[keyTypeName]) {
        this.columnLookup[keyTypeName] = compositeKeyName;
      }
    }
  }

  private buildAssociationsLookup() {
    for (const [constraintName, foreignKey] of Object.entries({
      ...this.tableMetadata.belongsTo,
      ...this.tableMetadata.hasMany,
      ...this.tableMetadata.hasOne,
    })) {
      const typeName = this.associationName(constraintName);
      this.associationLookup[typeName] = constraintName;
      const schemaBuilder = this.tableBuilder.getSchemaBuilder();
      const { referenceTable } = foreignKey;
      const referenceTableBuilder =
        schemaBuilder.getTableBuilder(referenceTable);
      this.associationMap[typeName] = referenceTableBuilder.getTranslator();
    }
  }

  getTypeNameCasing(): SchemaOptionType['case'] {
    return this.casing === 'camelCase' ? ('pascalCase' as const) : this.casing;
  }

  enumTypeName(name: string) {
    return this.typeName(`${this.tableMetadata.name} ${name} Enum`);
  }

  enumTypeFilterName(name: string) {
    return this.typeName(`${this.tableMetadata.name} ${name} Enum Filter`);
  }

  typeName(name: string, plural = false) {
    const casing = this.getTypeNameCasing();
    const singularName = transform(singular(name), casing);
    if (plural) {
      const pluralName = pluralizeTransform(name, casing);
      if (pluralName === singularName) {
        return mergeTransform([singularName, 'List'], casing);
      }
      return pluralName;
    }
    return singularName;
  }

  associationName(name: string) {
    return transform(name, this.casing);
  }

  columnName(name: string) {
    return name
      .split('__')
      .map((part) => transform(part, this.casing))
      .join('__');
  }

  getFilterName() {
    const objectType = this.tableBuilder.buildObjectTC();
    const casing = this.getTypeNameCasing();
    return mergeTransform(['get', objectType.getTypeName(), 'input'], casing);
  }

  listFilterName() {
    const objectType = this.tableBuilder.buildMultiObjectTC();
    const casing = this.getTypeNameCasing();
    return mergeTransform(['list', objectType.getTypeName(), 'input'], casing);
  }

  sortName() {
    const objectType = this.tableBuilder.buildObjectTC();
    const casing = this.getTypeNameCasing();
    return mergeTransform(['sort', objectType.getTypeName()], casing);
  }

  getCompositeKeyNames(compositeKeys: string[]) {
    const casing = this.getTypeNameCasing();
    return mergeTransform(
      [this.tableMetadata.name, ...compositeKeys, 'key'],
      casing
    );
  }

  reverseToDB(fields: Record<string, any>) {
    return objectTransform(fields, (ret: any, value, key) => {
      if (['_and', '_or'].includes(key)) {
        // eslint-disable-next-line no-param-reassign
        ret[key] = value.map((element: any) => this.reverseToDB(element));
        return;
      }
      if (['_not'].includes(key)) {
        // eslint-disable-next-line no-param-reassign
        ret[key] = this.reverseToDB(value);
        return;
      }
      if (this.columnLookup[key]) {
        // eslint-disable-next-line no-param-reassign
        ret[this.columnLookup[key]] = value;
        return;
      }
      if (this.associationLookup[key]) {
        const translator = this.associationMap[key];
        // eslint-disable-next-line no-param-reassign
        ret[this.associationLookup[key]] = value
          ? translator.reverseToDB(value)
          : null;
        return;
      }
      // eslint-disable-next-line no-param-reassign
      ret[key] = value;
    });
  }

  convertFromDB(record: Record<string, any>) {
    const result = mapKeys(record, (value, key) => this.columnName(key) ?? key);
    if (result) {
      result.$raw = record;
    }
    return result;
  }

  columnTypeLookup(typeName: string) {
    return this.columnLookup[typeName];
  }

  init() {
    this.buildColumnsLookup();
    this.buildAssociationsLookup();
  }
}
