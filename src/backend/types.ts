// - Histories of operations
// - Operations have: read/write, value, start time, end time, process ID,
// - Serializations are per-process, and there's one for the entire process set

export enum OperationType {
    Read = 1,
    Write,
}

export interface Operation {
    type: OperationType;

    // Short string (i.e. a character) to uniquely identify the event
    operationName: string;

    // Value being written, or value being read
    value: number;

    // True if this operation was issued directly by a client.
    // False if this operation is one created as a result of message passing.
    isOriginal: boolean;

    startTime: number;
    endTime: number;
}

export interface History {
    [processId: number]: Operation[];
}

export type Serialization = Operation[];

export interface SystemSerialization {
    [processId: number]: Serialization;
}
