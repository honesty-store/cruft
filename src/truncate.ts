import { IConfiguration, IHasId, IHasVersion } from './index';

export const truncate = ({ client, tableName }: IConfiguration) =>
  async (item: IHasId & IHasVersion): Promise<void> => {
    try {
      await client.delete({
        TableName: tableName,
        Key: {
          id: item.id
        },
        ConditionExpression: 'version = :version',
        ExpressionAttributeValues: {
          ':version': item.version
        }
      })
        .promise();
    }
    catch (e) {
      if (e.code !== 'ConditionalCheckFailedException') {
        throw e;
      }
      throw new Error(`Item is out of date`);
    }
  };