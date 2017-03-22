import { IConfiguration, IHasId, IHasVersion, IHasMetadata } from './index';

export const read = <T>({ client, tableName }: IConfiguration) =>
  async (item: IHasId): Promise<T & IHasVersion & IHasMetadata> => {
    const response = await client.get({
      TableName: tableName,
      Key: {
        id: item.id
      }
    })
      .promise();

    if (response.Item == null) {
      throw new Error(`Key not found ${item.id}`);
    }

    return <T & IHasVersion & IHasMetadata>response.Item;
  };