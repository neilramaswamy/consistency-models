let opId = 0;

/**
 * newOpId is used to generate unique operation IDs to be used on any type of
 * operation, whether it's a read, write, or visibility operation.
 *
 * Operation IDs are used in this project to enable making canonical references
 * to a particular operation. Since we'd like to highlight an operation on
 * its history/serialization/both when it's hovered over in explanation text,
 * it's important that we have canonical way to refer to a new operation.
 *
 * @returns a new, globally unique operation ID.
 */
export const newOpId = (): number => {
    return opId++;
};
