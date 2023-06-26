import type { TableMetadata } from '@vdtn359/graphqlize-mapper';
import { mapKeys } from 'lodash';
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
    this.tableMetadata = this.tableBuilder.getTableMetadata();
    this.casing = casing;

    this.buildColumnsLookup();
    this.buildAssociationsLookup();
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
    return mapKeys(fields, (value, key) => this.columnTypeLookup(key) ?? key);
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
}
