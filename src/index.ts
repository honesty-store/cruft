import { DynamoDB } from 'aws-sdk';
import { create } from './create';
import { read } from './read';
import { update } from './update';
import { find } from './find';
import { findAll, __findAll } from './findAll';
import { truncate } from './truncate';

(<any>Symbol).asyncIterator = Symbol.for('asyncIterator');

export type Timestamp = number;

export interface IHasId {
  /**
   * ID managed by consumer
   */
  id: string;
}

export interface IHasVersion {
  /**
   * Monotomically increasing counter managed by store
   */
  version: number;
}

export interface IHasMetadata {
  /**
   * Unix timestamp of record creation managed by store.
   * N.B. The store will always silently override this value if specified to support use cases which read an item, modify it and attempt to
   * write it back.
   */
  created: Timestamp;
  /**
   * Unix timestamp of last record modification managed by store.
   * N.B. The store will always silently override this value if specified to support use cases which read an item, modify it and attempt to
   * write it back.
   */
  modified: Timestamp;
}

export interface IConfiguration {
  client: DynamoDB.DocumentClient;
  tableName: string;
}

export interface ICruft<T> {
  create(item: T & { version: 0 }): Promise<T & IHasVersion & IHasMetadata>;
  read(item: IHasId): Promise<T & IHasVersion & IHasMetadata>;
  update(item: T & IHasId & IHasVersion): Promise<T & IHasVersion & IHasMetadata>;
  find(fields: { [key: string]: string | number | boolean }): Promise<T & IHasVersion & IHasMetadata>;
  __findAll(fields: { [key: string]: string | number | boolean }, options?: { limit?: number }): Promise<Array<T & IHasVersion & IHasMetadata>>;
  findAll(fields: { [key: string]: string | number | boolean }): AsyncIterableIterator<T & IHasVersion & IHasMetadata>;
  truncate(item: IHasId & IHasVersion): Promise<void>;
}

export default <T extends IHasId>({
  endpoint = process.env.AWS_DYNAMODB_ENDPOINT,
  region = process.env.AWS_REGION,
  tableName
}): ICruft<T> => {
  // hack - endpoint isn't a valid property according to the typings
  const client = new DynamoDB.DocumentClient(<{ endpoint: string }>{
    apiVersion: '2012-08-10',
    endpoint,
    region
  });

  return {
    create: create<T>({ client, tableName }),
    read: read<T>({ client, tableName }),
    update: update<T>({ client, tableName }),
    __findAll: __findAll<T>({ client, tableName }),
    findAll: findAll<T>({ client, tableName }),
    find: find<T>({ client, tableName }),
    truncate: truncate({ client, tableName })
  };
};
