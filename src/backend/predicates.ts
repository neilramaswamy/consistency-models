// some helper functions
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

export function isRval(
    history: History,
    systemSerialization: SystemSerialization
): boolean {
    return everySerialization(
        systemSerialization,
        (processId, serialization) => {
            let lastValue: number | null = null;

            for (let i = 0; i < serialization.length; i++) {
                const op = serialization[i];

                if (op.type === OperationType.Write) {
                    lastValue = op.value;
                } else {
                    // Includes the case when lastValue === null
                    if (lastValue !== op.value) {
                        return false;
                    }
                }
            }

            return true;
        }
    );
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

function setify(ops: Operation[]) {
    let set = new Set<string>();

    for (let i = 0; i < ops.length; i++) {
        for (let j = i + 1; j < ops.length; j++) {
            set.add(operationTupleToString(ops[i], ops[j]));
        }
    }

    return set;
}

export function isWritesFollowReads(
    history: History,
    systemSerialization: SystemSerialization
): boolean {
    let valueMap: { [key: number]: Operation } = {};

    everyProcessHistory(history, (processId, operations) => {
        operations.forEach(op => {
            if (op.type === OperationType.Write) {
                valueMap[op.value] = op;
            }
        });

        return true;
    });

    // Now iterate through every operation in every serialization
    let causalWrites: Set<string> = new Set();

    everyProcessHistory(history, (processId, operations) => {
        for (let i = 0; i < operations.length; i++) {
            const op = operations[i];

            if (op.type == OperationType.Read) {
                const associatedWrite = valueMap[op.value];

                if (associatedWrite === undefined) {
                    // We read something we never wrote
                    // TODO(neil): Should we throw an error here?
                    return false;
                } else {
                    // Subsequent writes need to come after associatedWrite
                    for (let j = i + 1; j < operations.length; j++) {
                        if (operations[j].type == OperationType.Write) {
                            const futureWrite = operations[j];

                            causalWrites.add(
                                operationTupleToString(
                                    associatedWrite,
                                    futureWrite
                                )
                            );
                        }
                    }
                }
            }
        }

        return true;
    });

    // Make sure causalWrites are respected by every serialization
    return everySerialization(
        systemSerialization,
        (processId, serialization) => {
            const onlyWrites = serialization.filter(
                op => op.type === OperationType.Write
            );
            const onlyWritesSet = setify(onlyWrites);

            return isSubset(onlyWritesSet, causalWrites);
        }
    );
}

function isSubset(set1: Set<string>, set2: Set<string>) {
    for (let elem of set1) {
        if (!set2.has(elem)) {
            return false;
        }
    }

    return true;
}

export function isSingleOrder(
    history: History,
    systemSerialization: SystemSerialization
): boolean {
    if (Object.keys(systemSerialization).length === 0) {
        return false;
    }

    const firstSerialization = systemSerialization[0]
        .map(s => s.operationName)
        .join(" ");

    return everySerialization(
        systemSerialization,
        (processId, serialization) => {
            return (
                serialization.map(s => s.operationName).join(" ") ===
                firstSerialization
            );
        }
    );
}

export function isPRAM(
    history: History,
    systemSerialization: SystemSerialization
) {
    const monotonicReads = isMonotonicReads(history, systemSerialization);
    const monoticWrites = isMonotonicWrites(history, systemSerialization);
    const readYourWrites = isReadYourWrites(history, systemSerialization);

    return {
        isMonotonicReads: monotonicReads,
        isMonotonicWrites: monoticWrites,
        isReadYourWrites: readYourWrites,
        isPRAM: monotonicReads && monoticWrites && readYourWrites,
    };
}

export function isCausal(
    history: History,
    systemSerialization: SystemSerialization
) {
    const pram = isPRAM(history, systemSerialization);
    const writesFollowReads = isWritesFollowReads(history, systemSerialization);

    return {
        pram: pram,
        isWritesFollowReads: writesFollowReads,
        isCausal: pram && writesFollowReads,
    };
}

export function operationTupleToString(a: Operation, b: Operation) {
    return `${a.operationName} ${b.operationName}`;
}

export function isSequential(
    history: History,
    systemSerialization: SystemSerialization
) {
    const causal = isCausal(history, systemSerialization);
    const singleOrder = isSingleOrder(history, systemSerialization);

    return {
        causal,
        isSingleOrder: singleOrder,
    };
}

// Unfortunately, this type signature doesn't conform to all the other type signatures, but that's
// because RealTime is defined using the arbitration order.
export function isRealTime(
    history: History,
    systemSerialization: SystemSerialization
): boolean {
    // Not defined without an arbitration order
    if (!isSingleOrder(history, systemSerialization)) {
        return false;
    }

    const arbitration = systemSerialization[0];

    // Create a set out of the arbitration order
    let arbitrationSet: Set<string> = new Set();
    for (let i = 0; i < arbitration.length; i++) {
        for (let j = i + 1; j < arbitration.length; j++) {
            arbitrationSet.add(
                operationTupleToString(arbitration[i], arbitration[j])
            );
        }
    }

    // Make sure that the returns before relation is a subset of the arbitration order
    const allOperations = Object.values(history).flat();
    for (let i = 0; i < allOperations.length; i++) {
        for (let j = i + 1; j < allOperations.length; j++) {
            const returnsBefore =
                allOperations[i].endTime < allOperations[j].endTime;

            if (returnsBefore) {
                const inArbitration = arbitrationSet.has(
                    operationTupleToString(allOperations[i], allOperations[j])
                );

                if (!inArbitration) {
                    return false;
                }
            }
        }
    }

    return true;
}

export function isLinearizable(
    history: History,
    systemSerialization: SystemSerialization
) {
    const sequential = isSequential(history, systemSerialization);
    const realTime = isRealTime(history, systemSerialization);

    return {
        sequential,
        isRealTime: realTime,
        isLinearizable: sequential && realTime,
    };
}
