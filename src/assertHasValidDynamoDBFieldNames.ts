const validFieldName = /^[a-z]+$/i;

export const assertHasValidDynamoDBFieldNames = (values: { [key: string]: any }) => {
  const invalidFieldNames = Object.keys(values)
    .filter(key => !validFieldName.test(key));

  if (invalidFieldNames.length > 0) {
    throw new Error(`Invalid field name specified ${invalidFieldNames}`);
  }
};
