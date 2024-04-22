import {
    History,
    Operation,
    OperationType,
    SystemSerialization,
} from "./types";

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
        const operations: Operation[] = generateSingleClientHistory(
            clientId,
            clientHistory
        );
        history[clientId] = operations;
    });

    return history;
};

export const generateSerializationFromString = (
    history: History,
    s: string
): SystemSerialization => {
    const clientSerializations = extractLinesFromStringTimeline(s);

    let systemSerialization: SystemSerialization = {};
    clientSerializations.forEach((clientSerialization, clientId) => {
        const currClientHistory = history[clientId];

        const operations: Operation[] = generateSingleClientHistory(
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
                return { ...op, type: OperationType.Visiility };
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
export const generateSingleClientHistory = (
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

/**
 * Generates an array of Operations using a history and a list of processId names separated by
 * space.
 */
export const generateSerialization = (
    history: History,
    serialization: string
): Operation[] => {
    const map: { [key: string]: Operation } = {};
    Object.values(history)
        .flatMap(_ => _)
        .forEach(
            operation => (map[operation.operationName] = { ...operation })
        );

    const operationIds = serialization.split(" ");
    return operationIds.map(operationId => map[operationId]);
};

export const sortOperations = (ops: History | SystemSerialization) => {
    Object.values(ops).forEach((arr: Operation[]) => {
        arr.sort((a, b) => a.startTime - b.startTime);
    });

    return ops;
};
