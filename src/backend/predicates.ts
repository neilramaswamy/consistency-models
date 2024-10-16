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
    realTimeExplanationFragment,
    successfullyLinearizableExplanationFragment,
    writesFollowReadsViolatedForCausalPair,
} from "./explanation";
import {
    History,
    SystemSerialization,
    Serialization,
    OperationType,
    Operation,
} from "./types";
import {
    everySerialization,
    forEachClientHistory,
    forEachSerialization,
} from "./util";

function generateSummaryFromViolations(
    modelName: string,
    violationList: ExplanationFragment[][]
): ExplanationFragment[] {
    let summary: ExplanationFragment[] = [];

    if (violationList.length > 0) {
        let reasonStr = violationList.length === 1 ? "reason" : "reasons";

        summary.push({
            type: "string",
            content: `The ${modelName} property was not satisfied for the following ${reasonStr}:`,
        });

        summary.push({
            type: "list",
            children: violationList,
        });
    }

    return summary;
}

export function isRval(
    history: History,
    systemSerialization: SystemSerialization
): PredicateResult {
    let violationList: ExplanationFragment[][] = [];

    forEachSerialization(systemSerialization, (clientId, serialization) => {
        let lastNonReadOperation: Operation | null = null;

        serialization.forEach(op => {
            if (op.type !== OperationType.Read) {
                lastNonReadOperation = op;
            } else {
                // If lastValue === null, then we fail RVal. Note that you would also fail
                // ReadYourWrites in this case.
                if (lastNonReadOperation === null) {
                    violationList.push(
                        rValNullNonReadExplanationFragment(clientId, op)
                    );
                } else if (lastNonReadOperation.value !== op.value) {
                    violationList.push(
                        rValExplanationFragment(
                            clientId,
                            lastNonReadOperation,
                            op
                        )
                    );
                }
            }
        });
    });

    const finalViolationList = generateSummaryFromViolations(
        "RVal",
        violationList
    );

    return {
        satisfied: finalViolationList.length === 0,
        explanation: finalViolationList,
    };
}

export function isReadYourWrites(
    history: History,
    systemSerialization: SystemSerialization
): PredicateResult {
    let violationList: ExplanationFragment[][] = [];

    forEachSerialization(systemSerialization, (clientId, serialization) => {
        let writtenValues: number[] = [];

        serialization.forEach(op => {
            if (op.type !== OperationType.Read) {
                writtenValues.push(op.value);
            } else {
                let found = writtenValues.includes(op.value);
                if (!found) {
                    // Record the violation
                    violationList.push(
                        readYourWritesExplanationFragment(clientId, op)
                    );
                }
            }
        });
    });

    const finalViolationList = generateSummaryFromViolations(
        "Read Your Writes",
        violationList
    );

    return {
        satisfied: finalViolationList.length === 0,
        explanation: finalViolationList,
    };
}

export function isMonotonicWrites(
    history: History,
    systemSerialization: SystemSerialization
): PredicateResult {
    // For every pair of writes (sliding window) in every history, every serialization
    // needs to see them in that order.
    let violationList: ExplanationFragment[][] = [];

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
                        violationList.push(
                            monotonicWritesExplanationFragment(
                                clientHistoryId,
                                clientSerializationId,
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

    const finalViolationList = generateSummaryFromViolations(
        "monotonic writes",
        violationList
    );
    return {
        satisfied: finalViolationList.length === 0,
        explanation: finalViolationList,
    };
}

function findIssuingClientAndOperationIndex(
    history: History,
    operation: Operation
) {
    let issuingClientId = -1;
    let operationIndex = -1;

    forEachClientHistory(history, (clientId, operations) => {
        const index = operations.findIndex(
            o => o.value === operation.value && o.type == OperationType.Write
        );
        if (index >= 0) {
            issuingClientId = clientId;
            operationIndex = index;
        }
    });

    return { issuingClientId, operationIndex };
}

export function isMonotonicReads(
    history: History,
    systemSerialization: SystemSerialization
): PredicateResult {
    let violationList: ExplanationFragment[][] = [];

    // In each serialization, for each read operation, we need to remember
    // what process it came from. Then for the next read, we need to find
    // its process, and verify that this second read is at a higher index
    // than the original read.

    forEachSerialization(systemSerialization, (clientId, serialization) => {
        let reads = serialization.filter(o => o.type === OperationType.Read);

        const clientToLatestWriteIndex: { [key: number]: number } = {};

        for (let i = 0; i < reads.length; i++) {
            const read = reads[i];

            const { issuingClientId, operationIndex } =
                findIssuingClientAndOperationIndex(history, read);

            if (issuingClientId < 0 || operationIndex < 0) {
                // This is a degenerate case, I think. So we won't report
                // it as a violation, but it's worth commenting about.
            } else {
                if (clientToLatestWriteIndex[issuingClientId] === undefined) {
                    clientToLatestWriteIndex[issuingClientId] = operationIndex;
                } else {
                    // Make sure that for this client, the write index is increasing
                    const prevWriteIndex =
                        clientToLatestWriteIndex[issuingClientId];
                    if (operationIndex < prevWriteIndex) {
                        violationList.push(
                            monotonicReadsRegressionExplanationFragment(
                                clientId,
                                reads[i - 1], // I don't know about this line.
                                serialization[prevWriteIndex],
                                read,
                                serialization[operationIndex]
                            )
                        );
                    } else {
                        clientToLatestWriteIndex[issuingClientId] =
                            operationIndex;
                    }
                }
            }
        }
    });

    const finalViolations = generateSummaryFromViolations(
        "monotonic reads",
        violationList
    );

    return {
        satisfied: finalViolations.length === 0,
        explanation: finalViolations,
    };
}

/**
 * Writes follow reads say that:
 *
 * writeA -> readB - so -> writeC
 *
 * So, for every read, we need to find the write (not visibility!) where its value came from.
 * If it doesn't exist, we move on (that should be caught by ReadYourWrites).
 *
 * If it does, we enforce an ordering writeA -> writeC
 *
 *
 * @param history
 * @param systemSerialization
 * @returns
 */
export function isWritesFollowReads(
    history: History,
    systemSerialization: SystemSerialization
): PredicateResult {
    // Represents a sourceWrite -vis-> read -so-> futureWrite
    interface WriteReadWrite {
        sourceWrite: Operation;
        read: Operation;
        futureWrite: Operation;
    }

    let valueToWriteOperation: { [key: number]: Operation } = {};

    // Populate the value -> write operation map
    forEachClientHistory(history, (clientId, operations) => {
        operations.forEach(op => {
            if (op.type === OperationType.Write) {
                valueToWriteOperation[op.value] = op;
            }
        });
    });

    // Now iterate through every operation in every serialization
    let causalWrites: WriteReadWrite[] = [];

    forEachClientHistory(history, (clientId, operations) => {
        for (let i = 0; i < operations.length; i++) {
            const op = operations[i];

            if (op.type == OperationType.Read) {
                const sourceWrite = valueToWriteOperation[op.value];

                if (sourceWrite === undefined) {
                    // If we read something we never wrote, that should be caught by
                    // ReadYourWrites. WritesFollowReads does not apply for the case that
                    // for the case that the write is not visible to the read.
                } else {
                    // Subsequent writes need to come after associatedWrite
                    for (let j = i + 1; j < operations.length; j++) {
                        if (operations[j].type == OperationType.Write) {
                            const futureWrite = operations[j];
                            causalWrites.push({
                                sourceWrite,
                                read: op,
                                futureWrite,
                            });
                        }
                    }
                }
            }
        }

        return true;
    });

    let violationList: ExplanationFragment[][] = [];

    causalWrites.forEach(causalWriteInfo => {
        let violatingSerializations: number[] = [];

        forEachSerialization(systemSerialization, (clientId, serialization) => {
            // Find the violation, if any

            const sourceWriteIndex = serialization.findIndex(
                o =>
                    o.operationName ===
                    causalWriteInfo.sourceWrite.operationName
            );
            const futureWriteIndex = serialization.findIndex(
                o =>
                    o.operationName ===
                    causalWriteInfo.futureWrite.operationName
            );

            // The read might not exist in the current serialization, but the writes need
            // to exist. Note that, though, sourceWriteIndex and futureWriteIndex might not
            // be writes in the current serialization. They might be visibility operations.
            // As such, we check existence based on the operationName.
            if (sourceWriteIndex < 0) {
                throw new Error(
                    `Writes follow reads detected an inconsistency. The source write ${causalWriteInfo.sourceWrite.operationName} is not in the serialization for client ${clientId}.`
                );
            } else if (futureWriteIndex < 0) {
                throw new Error(
                    `Writes follow reads detected an inconsistency. The future write ${causalWriteInfo.futureWrite.operationName} is not in the serialization for client ${clientId}.`
                );
            } else if (sourceWriteIndex > futureWriteIndex) {
                violatingSerializations.push(clientId);
            }
        });

        if (violatingSerializations.length > 0) {
            violationList.push(
                writesFollowReadsViolatedForCausalPair(
                    causalWriteInfo.sourceWrite,
                    causalWriteInfo.read,
                    causalWriteInfo.futureWrite,
                    violatingSerializations
                )
            );
        }
    });

    const finalViolations = generateSummaryFromViolations(
        "Writes Follow Reads",
        violationList
    );

    return {
        satisfied: finalViolations.length === 0,
        explanation: finalViolations,
    };
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

    return everySerialization(
        systemSerialization,
        (processId, serialization) => {
            let other = serialization
                .filter(s => s.type !== OperationType.Read)
                .map(s => s.operationName)
                .join(" ");
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
    const monotonicWrites = isMonotonicWrites(history, systemSerialization);
    const readYourWrites = isReadYourWrites(history, systemSerialization);
    const clientOrder = isClientOrder(history, systemSerialization);

    return {
        monotonicReads,
        monotonicWrites,
        readYourWrites,
        clientOrder,

        satisfied:
            monotonicReads.satisfied &&
            monotonicWrites.satisfied &&
            readYourWrites.satisfied &&
            clientOrder,
    };
}

export function isCausal(
    history: History,
    systemSerialization: SystemSerialization
) {
    const pram = isPRAM(history, systemSerialization);
    const writesFollowReads = isWritesFollowReads(history, systemSerialization);

    return {
        pram,
        writesFollowReads,
        satisfied: pram.satisfied && writesFollowReads.satisfied,
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
        rval,
        causal,
        singleOrder,

        satisfied: causal.satisfied && rval.satisfied && singleOrder,
    };
}

/*

Consider the following history:

    ----[A:x<-  1]-----------------------------------------------------------
    ---------------------[B:x->  1]---------[C:x<-  2]----------[D:x<-  3]---

And serialization:

    ----[A:x<-  1]-------------------------------------[C:x<-  2]-[D:x<-  3]-
    ----[A:x<-  1]-------[B:x->  1]---------[C:x<-  2]----------[D:x<-  3]---

By the paper definition of real-time, this is real time. The returns before
relation is generated via the total order A -> C -> D. Indeed, this is the arbitration
order as well. However, the C in the 0th serialization does not fit our intuitive notion
of linearizability, since there needs to be an instantaneous moment in time where the
effect of C becomes globally visible to all clients.

To make this stricter, the implementation below enforces the following property: for each 
visibility operation v for write w, v must overlap with w. We know that v cannot start
before w starts, and because it must overlap, v must start before w ends. So:

w.start < v.start < w.end

Now, we consider the case of two write operations w1 and w2 such that w1 returns before w2.
The original paper would dictate that w1 must come before w2 in the arbitration order. Our
implementation implies that. For all visibility operations v1 and v2, we have that:

w1.start < v1.start < w1.end AND w2.start < v2.start < w2.end

We know that w1 returned before w2, so w1.end < w2.start. So, we have:

w1.start < v1.start < w1.end
AND
w2.start < v2.start < w2.end
AND
w1.end < w2.start

Thus:

w1.start < v1.start < w1.end < w2.start < v2.start < w2.end

Which implies that v1.start < v2.start. So, v1 preceeds v2 in the arbitration order.
*/
export function isRealTime(
    history: History,
    systemSerialization: SystemSerialization
): PredicateResult {
    const operationMap: { [key: string]: Operation } = {};
    Object.values(history)
        .flat()
        .map(operation => (operationMap[operation.operationName] = operation));

    let violationList: ExplanationFragment[][] = [];

    forEachSerialization(systemSerialization, (clientId, serialization) => {
        serialization.forEach(operation => {
            if (operation.type === OperationType.Visibility) {
                const sourceWrite = operationMap[operation.operationName];
                if (!areOverlapping(sourceWrite, operation)) {
                    violationList.push(
                        realTimeExplanationFragment(sourceWrite, operation)
                    );
                }
            }
        });
    });

    const finalViolationList = generateSummaryFromViolations(
        "real-time",
        violationList
    );
    return {
        satisfied: finalViolationList.length === 0,
        explanation: finalViolationList,
    };
}

export function isLinearizable(
    history: History,
    systemSerialization: SystemSerialization
) {
    const sequential = isSequential(history, systemSerialization);
    const realTime = isRealTime(history, systemSerialization);
    const isLinearizable = sequential.satisfied && realTime.satisfied;

    let explanation: ExplanationFragment[] = [];
    if (isLinearizable) {
        explanation = successfullyLinearizableExplanationFragment();
    }

    return {
        sequential,
        realTime,

        satisfied: isLinearizable,
        explanation,
    };
}

const areOverlapping = (a: Operation, b: Operation): boolean => {
    return a.startTime < b.endTime && b.startTime < a.endTime;
};
