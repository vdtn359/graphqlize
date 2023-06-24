import type { DatabaseMapper, TableMetadata } from '@vdtn359/graphqlize-mapper';
import DataLoader from 'dataloader';

export class DataLoaderManager<T = any> {
  private readonly dataLoaders: Record<
    string,
    DataLoader<Record<string, any>, T>
  > = {};

  private readonly columnLookup: Record<string, string[]> = {};

  constructor(
    private readonly tableMetadata: TableMetadata,
    private readonly mapper: DatabaseMapper
  ) {
    for (const [keyName, candidateKeys] of Object.entries(
      tableMetadata.candidateKeys
    )) {
      this.createDataLoader(keyName, candidateKeys);
    }
  }

  createDataLoader(name: string, columns: string[]) {
    this.columnLookup[name] = columns;
    this.dataLoaders[name] = new DataLoader<Record<string, any>, T>(
      async (keys) => {
        const tableMapper = this.mapper.getTableMapper(this.tableMetadata.name);
        const result = await tableMapper.findByKeys(keys);
        const resultMap: Record<string, any> = {};
        for (const item of result) {
          resultMap[this.getByColumns(columns, item)] = item;
        }

        return keys.map((key) => {
          const currentValue = this.getByColumns(columns, key);

          return resultMap[currentValue] ?? null;
        });
      }
    );
  }

  load(name: string, key: Record<string, any>) {
    return this.dataLoaders[name].load(key);
  }

  prime(name: string, record: any) {
    const columns = this.columnLookup[name];
    const key = columns.reduce(
      (agg, current) => ({
        ...agg,
        [current]: record[current],
      }),
      {}
    );
    return this.dataLoaders[name].prime(key, record);
  }

  private getByColumns(columns: string[], item: any) {
    return JSON.stringify(columns.map((column) => item[column]));
  }
}
