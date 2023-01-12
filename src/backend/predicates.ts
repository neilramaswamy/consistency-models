// some helper functions
import { write } from "fs";
import {
    History,
    SystemSerialization,
    Serialization,
    OperationType,
    Operation,
} from "./types";

function everyProcessHistory(
    history: History,
    callback: (processId: string, operations: Operation[]) => boolean
) {
    return Object.entries(history).every(([id, serialization]) =>
        callback(id, serialization)
    );
}

function everySerialization(
    systemSerialization: SystemSerialization,
    callback: (processId: string, serialization: Serialization) => boolean
) {
    return Object.entries(systemSerialization).every(([id, serialization]) =>
        callback(id, serialization)
    );
}

function anySerialization(
    systemSerialization: SystemSerialization,
    callback: (processId: string, serialization: Serialization) => boolean
) {
    return Object.entries(systemSerialization).some(([id, serialization]) =>
        callback(id, serialization)
    );
}

function filterNonProcessOperations(
    processId: string,
    history: History,
    serialization: Serialization
) {
    return serialization.filter(s => history[processId].includes(s));
}

export function isReadYourWrites(
    history: History,
    systemSerialization: SystemSerialization
): boolean {
    // put another way, any serialization in which, for a given process,
    // if you read a value x, the write for x must have happened before that.
    return everySerialization(
        systemSerialization,
        (proccessId, serialization) => {
            // then, just make sure we read stuff we've written before
            const writtenValues: number[] = [];

            return serialization.every(op => {
                if (op.type === OperationType.Write) {
                    writtenValues.push(op.value);
                    return true;
                }

                return writtenValues.includes(op.value);
            });
        }
    );
}

export function isMonotonicWrites(
    history: History,
    systemSerialization: SystemSerialization
): boolean {
    return everySerialization(systemSerialization, (process, serialization) => {
        const writes = serialization.filter(s => s.type == OperationType.Write);

        // filter by process, and make sure that our serialization wrote in the same order the program did
        return everyProcessHistory(history, (processId, operations) => {
            let lastIndex = -1;
            return operations.every(op => {
                const nextIndex = writes.indexOf(op);
                const isNext = nextIndex > lastIndex;
                lastIndex = nextIndex;
                return isNext;
            });
        });
    });
}

export function isMonotonicReads(
    history: History,
    systemSerialization: SystemSerialization
): boolean {
    return everySerialization(
        systemSerialization,
        (processId, serialization) => {
            let writes = serialization
                .filter(s => s.type == OperationType.Write)
                .map(s => s.value);
            const reads = serialization.filter(
                s => s.type == OperationType.Read
            );

            for (let i = 0; i < reads.length; i++) {
                const read = reads[i];
                let writeIndex = writes.indexOf(read.value);

                // Two cases: you read something you NEVER wrote, or you regress on your writes.
                if (writeIndex < 0) {
                    return false;
                }

                writes = writes.slice(writeIndex + 1);
            }

            return true;
        }
    );
}

export function isWritesFollowReads(
    history: History,
    systemSerialization: SystemSerialization
): boolean {
    return false;
}

export function isSingleOrder(
    history: History,
    systemSerialization: SystemSerialization
): boolean {
    return false;
}

export function isPRAM(
    history: History,
    systemSerialization: SystemSerialization
): boolean {
    return false;
}

export function isCausal(
    history: History,
    systemSerialization: SystemSerialization
): boolean {
    return false;
}

export function isSequential(
    history: History,
    systemSerialization: SystemSerialization
): boolean {
    return false;
}

export function isRealTime(
    history: History,
    systemSerialization: SystemSerialization
): boolean {
    return false;
}

export function isLinearizable(
    history: History,
    systemSerialization: SystemSerialization
): boolean {
    return false;
}
