import {
    History,
    Operation,
    OperationType,
    SystemSerialization,
} from "./types";

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
    const processes = h
        .trim()
        .split("\n")
        .map(p => p.trim());
    if (processes.length === 0) {
        return {};
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

    let history: History = {};

    processes.forEach(
        (line, proc) => (history[proc] = generateSessionProjection(line, proc))
    );

    return history;
};

// No need to user an actual parser since this is fairly simple
//
// ---[A:x<-1]-----[C:x<-3]-------[E:x<-5]----------------[G:x<-7]
// -------------[B:x<-2]-------[D:x<-4]------[F:x<-6]---[H:x<-8]--
export const generateSessionProjection = (
    line: string,
    proc: number
): Operation[] => {
    let operations: Operation[] = [];

    const regex = /\[([A-Z]):([a-z])(<-|->)\s*(\d)\]/g;
    const matches = line.matchAll(regex);

    for (const match of matches) {
        const operationName = match[1];
        // const obj = match[2];
        const arrow = match[3];
        const value = parseInt(match[4], 10);
        // assert(
        //     match.index !== undefined,
        //     `Match index was undefined for ${match}`
        // )

        const type = arrow === "->" ? OperationType.Read : OperationType.Write;

        const startTime = match.index || 0;
        // Subtract one since the end time is inclusive and then just add a bit
        const endTime = startTime + match[0].length - 1;

        operations.push({
            operationName,

            type,
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
