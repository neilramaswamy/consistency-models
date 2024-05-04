// some helper functions
import { assert } from "console";
import {
    ExplanationFragment,
    PredicateResult,
    monotonicReadsRegressionExplanationFragment,
    monotonicWritesExplanationFragment,
    rValExplanationFragment,
    rValNullNonReadExplanationFragment,
    readYourWritesExplanationFragment,
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
): PredicateResult {
    let violationList: ExplanationFragment[] = [];

    forEachSerialization(systemSerialization, (clientId, serialization) => {
        let lastNonReadOperation: Operation | null = null;

        serialization.forEach(op => {
            if (op.type !== OperationType.Read) {
                lastNonReadOperation = op;
            } else {
                // If lastValue === null, then we fail RVal. Note that you would also fail
                // ReadYourWrites in this case.
                if (lastNonReadOperation === null) {
                    violationList = violationList.concat(
                        rValNullNonReadExplanationFragment(
                            parseInt(clientId),
                            op
                        )
                    );
                } else if (lastNonReadOperation.value !== op.value) {
                    violationList = violationList.concat(
                        rValExplanationFragment(
                            parseInt(clientId),
                            lastNonReadOperation,
                            op
                        )
                    );
                }
            }
        });
    });

    return {
        satisfied: violationList.length === 0,
        explanation: violationList,
    };
}

export function isReadYourWrites(
    history: History,
    systemSerialization: SystemSerialization
): PredicateResult {
    let violationList: ExplanationFragment[] = [];

    forEachSerialization(systemSerialization, (clientId, serialization) => {
        let writtenValues: number[] = [];

        serialization.forEach(op => {
            if (op.type !== OperationType.Read) {
                writtenValues.push(op.value);
            } else {
                let found = writtenValues.includes(op.value);
                if (!found) {
                    // Record the violation
                    violationList = violationList.concat(
                        readYourWritesExplanationFragment(
                            parseInt(clientId),
                            op
                        )
                    );
                }
            }
        });
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
): PredicateResult {
    let violations: ExplanationFragment[] = [];

    forEachSerialization(systemSerialization, (clientId, serialization) => {
        let writesOrVisibilities = serialization
            .filter(o => o.type !== OperationType.Read)
            .map(o => o.value);
        let reads = serialization.filter(o => o.type === OperationType.Read);

        let prevWriteIndex = -1;
        for (let i = 0; i < reads.length; i++) {
            const read = reads[i];
            const writeIndex = writesOrVisibilities.indexOf(read.value);

            if (writeIndex < 0) {
                // We read something we never wrote.
            } else if (writeIndex < prevWriteIndex) {
                // We regressed on our writes.
                violations = violations.concat(
                    monotonicReadsRegressionExplanationFragment(
                        parseInt(clientId),
                        reads[i - 1],
                        serialization[prevWriteIndex],
                        reads[i],
                        serialization[writeIndex]
                    )
                );
            } else {
                prevWriteIndex = writeIndex;
            }
        }
    });

    return {
        satisfied: violations.length === 0,
        explanation: violations,
    };
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

/**
 * Writes follow reads say that:
 *
 * writeA -> readB - so -> writeC
 *
 *
 * @param history
 * @param systemSerialization
 * @returns
 */
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

/**
 * SingleOrder returns true if all of the serializations in the system serialization
 * have the same write and visibility operations.
 *
 * The explanation that we choose to give tries to be as simple as possible. If we
 * have the serializations [a b c], [a b c], and [a, c, b], we'll say that the last
 * serialization differed from the other ones. If we had [a b c], [c b a], and [b c a],
 * then we'll say that all of the serializations differed from each other.
 *
 * Of course, we can't cover every single case. The algorithm is as follows: first, we
 * map each unique ordering of write and visibility operations that we have. If there's
 * only 1, we have a single order. Otherwise:
 *
 *  - If one serialization differs from the others, we'll say that serialization differs.
 *  - If all serializations differ from each other, we'll say that all serializations differ.
 */
export function isSingleOrder(
    history: History,
    systemSerialization: SystemSerialization
): boolean {
    if (Object.keys(systemSerialization).length === 0) {
        return false;
    }

    const firstSerialization = systemSerialization[0]
        .filter(s => s.type !== OperationType.Read)
        .map(s => s.operationName)
        .join(" ");

    console.log(firstSerialization);

    return everySerialization(
        systemSerialization,
        (processId, serialization) => {
            let other = serialization
                .filter(s => s.type !== OperationType.Read)
                .map(s => s.operationName)
                .join(" ");
            console.log(other);
            return other == firstSerialization;
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
