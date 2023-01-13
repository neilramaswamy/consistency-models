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

    startTime: number;
    endTime: number;
}

export interface History {
    [processId: string]: Operation[];
}

export type Serialization = Operation[];

export interface SystemSerialization {
    [processId: string]: Serialization;
}
