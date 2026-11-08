import { type AvailableOperation } from '#generator/helpers/createGenerateOperations.ts';

export const generateOperationTypes = (availableOperations: AvailableOperation[], operations: string[]): string[] =>
  operations.map((_, index) => {
    const operation = availableOperations[index];

    if (!operation) {
      throw new Error(`Operation at index ${String(index)} does not exist`);
    }

    return `type __Operation${String(index)} = NonNullable<paths[${JSON.stringify(
      operation.path,
    )}][${JSON.stringify(operation.method)}]>;`;
  });
