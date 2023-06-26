import type { DatabaseMapper, TableMetadata } from '@vdtn359/graphqlize-mapper';
import DataLoader from 'dataloader';

export class Repository<T = any> {
  private readonly uniqueDataLoaders: Record<
    string,
    DataLoader<Record<string, any>, T[]>
  > = {};

  private readonly multiDataLoaders: Record<
    string,
    DataLoader<Record<string, any>, T[]>
  > = {};

  constructor(
    private readonly tableMetadata: TableMetadata,
    private readonly mapper: DatabaseMapper
  ) {
    for (const candidateKeys of Object.values(tableMetadata.candidateKeys)) {
      this.createDataLoader(candidateKeys, true);
    }

    for (const { referenceColumns } of Object.values(tableMetadata.hasMany)) {
      this.createDataLoader(referenceColumns, true);
    }

    for (const { referenceColumns } of Object.values(tableMetadata.hasOne)) {
      this.createDataLoader(referenceColumns, true);
    }

    for (const { columns } of Object.values(tableMetadata.belongsTo)) {
      this.createDataLoader(columns);
    }
  }

  getDataLoaderName(columns: string[]) {
    return columns.sort().join(',');
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  createDataLoader(columns: string[], unique = false) {
    const dataLoaders = unique ? this.uniqueDataLoaders : this.multiDataLoaders;
    const dataLoaderName = this.getDataLoaderName(columns);
    if (dataLoaders[dataLoaderName]) {
      return;
    }
    dataLoaders[dataLoaderName] = new DataLoader<Record<string, any>, any>(
      async (keys) => {
        const tableMapper = this.mapper.getTableMapper<T>(
          this.tableMetadata.name
        );
        const result = await tableMapper.findByColumns(keys, unique);
        const resultMap: Record<string, T[]> = {};
        for (const item of result) {
          const key = this.getByColumns(columns, item);
          if (!resultMap[key]) {
            resultMap[key] = [];
          }
          resultMap[key].push(item);
        }

        return keys.map((key) => {
          const currentValue = this.getByColumns(columns, key);
          const values = resultMap[currentValue] ?? [];
          for (const value of values) {
            this.preload(value);
          }
          if (unique) {
            return (resultMap[currentValue] ?? [])[0] ?? null;
          }
          return values;
        });
      }
    );
  }

  async loadOne(columns: string[], key: Record<string, any>) {
    const dataLoaderName = this.getDataLoaderName(columns);
    if (this.uniqueDataLoaders[dataLoaderName]) {
      return this.uniqueDataLoaders[dataLoaderName].load(key);
    }
    if (this.multiDataLoaders[dataLoaderName]) {
      const results =
        (await this.multiDataLoaders[dataLoaderName].load(key)) ?? [];
      return results[0] ?? null;
    }
    return null;
  }

  async loadMany(columns: string[], key: Record<string, any>) {
    const dataLoaderName = this.getDataLoaderName(columns);
    if (this.multiDataLoaders[dataLoaderName]) {
      return this.multiDataLoaders[dataLoaderName].load(key);
    }
    if (this.uniqueDataLoaders[dataLoaderName]) {
      const result = await this.uniqueDataLoaders[dataLoaderName].load(key);
      return result ? [result] : [];
    }
    return [];
  }

  preload(record: any) {
    for (const [dataLoaderName, dataLoader] of Object.entries(
      this.uniqueDataLoaders
    )) {
      const columns = dataLoaderName.split(',');
      const key = columns.reduce(
        (agg, current) => ({
          ...agg,
          [current]: record[current],
        }),
        {}
      );
      dataLoader.prime(key, record);
    }
  }

  private getByColumns(columns: string[], item: any) {
    return JSON.stringify(columns.map((column) => item[column]));
  }
}
