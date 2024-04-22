// - Histories of operations
// - Operations have: read/write, value, start time, end time, process ID,
// - Serializations are per-process, and there's one for the entire process set

export enum OperationType {
    Read = 1,
    Write,
    Visiility,
}

/**
 * Operations in histories have type OperationType.Read or OperationType.Write.
 * Operations in histories also have operations of type read and write, but they
 * also contain operations of type OperationType.Visibility.
 *
 * The serialization for client i will contain the following:
 *
 *  - The reads and writes from history i. These operations will be of types
 *    OperationType.Read and OperationType.Write, respectively.
 *  - The writes from all other clients' histories. These operations will be of
 *    type OperationType.Visibility.
 *
 * An operation can be uniquely identified by three things: its clientId, its
 * operationName, and isHistory. Consider why:
 *
 *  - clientId isn't unique: a single client issues multiple operations.
 *  - operationName isn't unique. While the History section only will have one
 *    operation with a given operationName, the Serialization section will have
 *    multiple operations (of type Visibility) with the same operationName.
 *  - isHistory is needed because a (clientId, operationName) may be either part
 *    of the history or the serialization for that clientId.
 */
export interface Operation {
    type: OperationType;

    // Whether this operation is part of the history section, or the
    // serialization section.
    isHistory: boolean;
    // The clientId that this operation takes place on. If this is a read or
    // a write, it's the clientId that issued the operation. If it's a
    // visibility operation, it's the clientId that this operation is visible
    // to.
    clientId: number;
    // Short string (i.e. a character) to identify the operation
    operationName: string;

    // Value being written, or value being read
    value: number;

    startTime: number;
    endTime: number;
}

export type OriginalOperationsByName = { [key: string]: Operation };

export interface History {
    [processId: number]: Operation[];
}

export type Serialization = Operation[];

export interface SystemSerialization {
    [processId: number]: Serialization;
}
