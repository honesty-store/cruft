import { IConfiguration, IHasVersion, IHasMetadata } from './index';
import { __findAll } from './findAll';

export const find = <T>({ client, tableName }: IConfiguration) =>
  async (fields: { [key: string]: string | number | boolean }): Promise<T & IHasVersion & IHasMetadata> => {
    const items = await __findAll<T>({ client, tableName })(fields);

    if (items.length === 0) {
      throw new Error('No value found');
    }

    if (items.length > 1) {
      throw new Error('Multiple values found');
    }

    return items[0];
  };
