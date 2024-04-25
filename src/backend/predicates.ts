// some helper functions
import { assert } from "console";
import {
    ExplanationFragment,
    PredicateResult,
    monotonicReadsExplanationFragment,
    monotonicWritesExplanationFragment,
} from "./explanation";
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

function forEachClientHistory(
    history: History,
    callback: (clientId: string, operations: Operation[]) => void
) {
    return Object.entries(history).forEach(([id, serialization]) =>
        callback(id, serialization)
    );
}

function everySerialization(
    systemSerialization: SystemSerialization,
    callback: (clientId: number, serialization: Serialization) => boolean
) {
    return Object.entries(systemSerialization).every(([id, serialization]) => {
        const val = callback(parseInt(id), serialization);
        return val;
    });
}

function forEachSerialization(
    systemSerialization: SystemSerialization,
    callback: (processId: string, serialization: Serialization) => void
) {
    return Object.entries(systemSerialization).forEach(
        ([id, serialization]) => {
            callback(id, serialization);
        }
    );
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

export function isMonotonicReadsWithExplanation(
    history: History,
    systemSerialization: SystemSerialization
): PredicateResult {
    // For every serialization, for every read:
    // Find the index of the write/visibility result corresponding to it
    // If the current index is less than the previous index, we've regressed, and that's an exception
    let violationList: ExplanationFragment[] = [];

    forEachSerialization(systemSerialization, (clientId, serialization) => {
        let previousWriteOrVisibilityIndex = -1;

        for (let i = 0; i < serialization.length; i++) {
            const currOp = serialization[i];

            if (currOp.type === OperationType.Read) {
                const writeOrVisibilityIndex = serialization.findIndex(
                    (op, index) =>
                        (op.type === OperationType.Write ||
                            op.type === OperationType.Visibility) &&
                        op.value === currOp.value
                );

                if (writeOrVisibilityIndex === -1) {
                    // TODO(neil): This is a tricky case: we read something we never wrote.
                }

                if (writeOrVisibilityIndex < previousWriteOrVisibilityIndex) {
                    // TODO: record the error
                }
            }
        }
    });

    return {
        satisfied: violationList.length === 0,
        explanation: violationList,
    };
}

export function isMonotonicWrites(
    history: History,
    systemSerialization: SystemSerialization
): PredicateResult {
    // For every pair of writes (sliding window) in every history, every serialization
    // needs to see them in that order.
    let violationList: ExplanationFragment[] = [];

    forEachClientHistory(history, (clientHistoryId, operations) => {
        const writesInProcessHistory = operations.filter(
            o => o.type == OperationType.Write
        );

        for (let i = 0; i < writesInProcessHistory.length - 1; i++) {
            const currHistoricalWrite = writesInProcessHistory[i];
            const nextHistoricalWrite = writesInProcessHistory[i + 1];

            // Now, check that in every serialization, currHistoricalWrite comes
            // before nextHistoricalWrite.
            forEachSerialization(
                systemSerialization,
                (clientSerializationId, serialization) => {
                    const currSerializationIndex = serialization.findIndex(
                        o =>
                            o.operationName ===
                            currHistoricalWrite.operationName
                    );
                    const nextSerializationIndex = serialization.findIndex(
                        o =>
                            o.operationName ===
                            nextHistoricalWrite.operationName
                    );

                    assert(currSerializationIndex !== -1);
                    assert(nextSerializationIndex !== -1);

                    if (currSerializationIndex > nextSerializationIndex) {
                        violationList = violationList.concat(
                            monotonicWritesExplanationFragment(
                                parseInt(clientHistoryId),
                                parseInt(clientSerializationId),
                                currHistoricalWrite,
                                nextHistoricalWrite,
                                serialization[nextSerializationIndex],
                                serialization[currSerializationIndex]
                            )
                        );
                    }
                }
            );
        }
    });

    return {
        satisfied: violationList.length === 0,
        explanation: violationList,
    };
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

            return isSubset(causalWrites, onlyWritesSet);
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

// Returns true if the ordering of writes on every client is the same.
export function isSingleOrder(
    history: History,
    systemSerialization: SystemSerialization
): boolean {
    if (Object.keys(systemSerialization).length === 0) {
        return false;
    }

    const firstSerialization = systemSerialization[0]
        .filter(s => s.type === OperationType.Write)
        .map(s => s.operationName)
        .join(" ");

    return everySerialization(
        systemSerialization,
        (processId, serialization) => {
            return (
                serialization
                    .filter(s => s.type === OperationType.Write)
                    .map(s => s.operationName)
                    .join(" ") === firstSerialization
            );
        }
    );
}

export function isClientOrder(
    history: History,
    systemSerialization: SystemSerialization
): boolean {
    return everySerialization(
        systemSerialization,
        (processId, serialization) => {
            // history[processId] should be a subsequence of serialization
            return isSubsequence(history[processId], serialization);
        }
    );
}

function isSubsequence(portion: Operation[], sequence: Operation[]): boolean {
    if (portion.length > sequence.length) {
        return false;
    }

    let j = 0;
    PortionLoop: for (let i = 0; i < portion.length; i++) {
        const portionCurrent = portion[i];

        for (; j < sequence.length; j++) {
            const sequenceCurrent = sequence[j];
            if (
                portionCurrent.operationName === sequenceCurrent.operationName
            ) {
                continue PortionLoop;
            }
        }

        return false;
    }

    return true;
}

export function isPRAM(
    history: History,
    systemSerialization: SystemSerialization
) {
    const monotonicReads = isMonotonicReads(history, systemSerialization);
    const monoticWrites = isMonotonicWrites(
        history,
        systemSerialization
    ).satisfied;
    const readYourWrites = isReadYourWrites(history, systemSerialization);
    const clientOrder = isClientOrder(history, systemSerialization);

    return {
        isMonotonicReads: monotonicReads,
        isMonotonicWrites: monoticWrites,
        isReadYourWrites: readYourWrites,
        isClientOrder: clientOrder,
        isPRAM:
            monotonicReads && monoticWrites && readYourWrites && clientOrder,
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
        isCausal: pram.isPRAM && writesFollowReads,
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
    const rval = isRval(history, systemSerialization);
    const singleOrder = isSingleOrder(history, systemSerialization);

    return {
        causal,
        isRval: rval,
        isSingleOrder: singleOrder,
        isSequential: causal.pram.isPRAM && rval && singleOrder,
    };
}

// Returns whether, if A returns before B, then A comes before B in all serializations.
// However, if B is a read on serialization i, then we only check the condition for serialization i.
export function isRealTime(
    history: History,
    systemSerialization: SystemSerialization
): boolean {
    // Not defined without an arbitration order
    if (!isSingleOrder(history, systemSerialization)) {
        return false;
    }

    const operationMap: { [key: string]: Operation } = {};
    Object.values(history)
        .flat()
        .map(operation => (operationMap[operation.operationName] = operation));

    return everySerialization(
        systemSerialization,
        (processId, serialization) => {
            for (let i = 0; i < serialization.length; i++) {
                for (let j = i + 1; j < serialization.length; j++) {
                    const first = serialization[i];
                    const second = serialization[j];

                    if (first.endTime >= second.endTime) {
                        return false;
                    }
                }
            }

            return true;
        }
    );
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
        isLinearizable: sequential.isSequential && realTime,
    };
}
