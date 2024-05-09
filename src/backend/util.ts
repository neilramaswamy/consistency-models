import {
    History,
    Operation,
    OperationType,
    Serialization,
    SystemSerialization,
} from "./types";

export function forEachClientHistory(
    history: History,
    callback: (clientId: number, operations: Operation[]) => void
) {
    return Object.entries(history).forEach(([id, serialization]) =>
        callback(parseInt(id), serialization)
    );
}

export function everySerialization(
    systemSerialization: SystemSerialization,
    callback: (clientId: number, serialization: Serialization) => boolean
) {
    return Object.entries(systemSerialization).every(([id, serialization]) => {
        const val = callback(parseInt(id), serialization);
        return val;
    });
}

export function forEachSerialization(
    systemSerialization: SystemSerialization,
    callback: (clientId: number, serialization: Serialization) => void
) {
    return Object.entries(systemSerialization).forEach(
        ([id, serialization]) => {
            callback(parseInt(id), serialization);
        }
    );
}

const extractLinesFromStringTimeline = (s: string): string[] => {
    const processes = s
        .trim()
        .split("\n")
        .map(p => p.trim());
    if (processes.length === 0) {
        return [];
    }

    // Make sure that all processes are the same length
    const firstLength = processes[0].length;
    processes.forEach((p, i) => {
        if (p.length !== firstLength) {
            throw new Error(
                `Line ${i} had length of ${p.length}, expected ${firstLength}`
            );
        }
    });

    return processes;
};

/**
 * Takes a string-based representation of an operation history and returns an OperationHistory that
 * logically represents the string.
 *
 * The string-based format must conform to the following format:
 *  - Each operation must be enclosed by pipes
 *  - Two operations are supported: reads (r) and writes (w). To denote writing a value v,
 *    use the syntax |w<-v|. To denote reading a value v, use the syntax |r->v|.
 *  - Between events in the same process, hyphens must be used
 *  - All lines must have the same length
 * @param h the string-based representation of a history
 */
export const generateHistoryFromString = (h: string): History => {
    const clientHistories = extractLinesFromStringTimeline(h);

    let history: History = {};
    clientHistories.forEach((clientHistory, clientId) => {
        const operations: Operation[] = generateOperationsFromString(
            clientId,
            clientHistory
        );
        history[clientId] = operations;
    });

    return history;
};

export const generateFullSerializationFromString = (
    history: History,
    s: string
): SystemSerialization => {
    const clientSerializations = extractLinesFromStringTimeline(s);

    let systemSerialization: SystemSerialization = {};
    clientSerializations.forEach((clientSerialization, clientId) => {
        const currClientHistory = history[clientId];

        const operations: Operation[] = generateOperationsFromString(
            clientId,
            clientSerialization
        ).map(op => {
            // If this operation exists in the current process history, then its original.
            const originalOp = currClientHistory.find(
                historyOp => historyOp.operationName == op.operationName
            );

            if (originalOp) {
                return originalOp;
            } else {
                return { ...op, type: OperationType.Visibility };
            }
        });

        systemSerialization[clientId] = operations;
    });

    return systemSerialization;
};

// Parses something like the following:
//
// ---[A:x<-1]-----[C:x<-3]-------[E:x<-5]----------------[G:x<-7]
//
// into a list of operations. The operations don't have the isOriginal property, since that can't
// be inferred using just the given string.
export const generateOperationsFromString = (
    clientId: number,
    line: string
): Operation[] => {
    let operations: Operation[] = [];

    const regex = /\[([A-Z]):([a-z])(<-|->)\s*(\d)\]/g;
    const matches = line.matchAll(regex);

    for (const match of matches) {
        const operationName = match[1];
        const arrow = match[3];
        const value = parseInt(match[4], 10);

        const type = arrow === "->" ? OperationType.Read : OperationType.Write;

        const startTime = match.index || 0;
        // Subtract one since the end time is inclusive and then just add a bit
        const endTime = startTime + match[0].length - 1;

        operations.push({
            type,

            isHistory: true,
            clientId,
            operationName,
            value,

            startTime,
            endTime,
        });
    }

    return operations;
};

export const sortOperations = (ops: History | SystemSerialization) => {
    Object.values(ops).forEach((arr: Operation[]) => {
        arr.sort((a, b) => a.startTime - b.startTime);
    });

    return ops;
};

interface AsciiDiagrams {
    historyStr: string;
    systemSerializationStr: string;
}

export const generateAsciiDiagrams = (
    history: History,
    systemSerialization: SystemSerialization
): AsciiDiagrams => {
    let minimumOperationDuration = "[A:x<-1]".length - 1;

    forEachSerialization(systemSerialization, (_, serialization) => {
        serialization.forEach(op => {
            const duration = op.endTime - op.startTime;
            if (duration < minimumOperationDuration) {
                throw new Error(
                    `Cannot create ASCII representation for operation ${op.operationName}, whose duration from ${op.startTime} to ${op.endTime} is less than ${minimumOperationDuration} time units yet`
                );
            }
        });
    });

    let historyLines: string[] = [];
    forEachClientHistory(history, (_, operations) => {
        let line = "";
        operations.forEach(op => {
            const padding = "-".repeat(op.startTime - line.length);
            if (op.type === OperationType.Read) {
                line += padding + `[${op.operationName}:x->${op.value}]`;
            } else {
                line += padding + `[${op.operationName}:x<-${op.value}]`;
            }
        });

        historyLines.push(line);
    });

    let serializationLines: string[] = [];
    forEachSerialization(systemSerialization, (_, serialization) => {
        let line = "";
        serialization.forEach(op => {
            const padding = "-".repeat(op.startTime - line.length);
            if (op.type === OperationType.Read) {
                line += padding + `[${op.operationName}:x->${op.value}]`;
            } else {
                line += padding + `[${op.operationName}:x<-${op.value}]`;
            }
        });

        serializationLines.push(line);
    });

    // Find the longest history/serialization, and extend every line to that length
    const longestLineLength = Math.max(
        ...historyLines.map(l => l.length),
        ...serializationLines.map(l => l.length)
    );
    historyLines = historyLines.map(line => {
        return line + "-".repeat(longestLineLength - line.length);
    });
    serializationLines = serializationLines.map(line => {
        return line + "-".repeat(longestLineLength - line.length);
    });

    return {
        historyStr: historyLines.join("\n"),
        systemSerializationStr: serializationLines.join("\n"),
    };
};
