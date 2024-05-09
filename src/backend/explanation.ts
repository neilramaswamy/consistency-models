import { Operation, operationTypeToString } from "./types";

export interface PredicateResult {
    satisfied: boolean;
    explanation: ExplanationFragment[];
}

export enum TextEmphasis {
    Bold,
    Italic,
    Underline,
}

export type ExplanationFragment =
    | {
          type: "operation";
          operation: Operation;
      }
    | {
          // Sugar so that pluralization is handled automatically
          type: "operations";
          operations: Operation[];
      }
    | {
          type: "client";
          clientId: number;
      }
    | {
          type: "clients";
          clientIds: number[];
      }
    | {
          type: "string";
          emphasis?: TextEmphasis[];
          content: string;
      }
    | {
          type: "list";
          children: ExplanationFragment[][];
      };

export const monotonicReadsRegressionExplanationFragment = (
    clientId: number,
    firstRead: Operation,
    firstWriteOrVisibility: Operation,
    laterRead: Operation,
    earlierWriteOrVisibility: Operation
): ExplanationFragment[] => {
    return [
        {
            type: "client",
            clientId,
        },
        {
            type: "string",
            content: " performed a read, ",
        },
        {
            type: "operation",
            operation: firstRead,
        },
        {
            type: "string",
            content: `, which returned the value from ${operationTypeToString(
                firstWriteOrVisibility.type
            )}`,
        },
        {
            type: "operation",
            operation: firstWriteOrVisibility,
        },
        {
            type: "string",
            content: ". However, a subsequent read, ",
        },
        {
            type: "operation",
            operation: laterRead,
        },
        {
            type: "string",
            content: ", returned ",
        },
        {
            type: "operation",
            operation: earlierWriteOrVisibility,
        },
        {
            type: "string",
            content: `, which was a ${operationTypeToString(
                earlierWriteOrVisibility.type
            )} operation that occurred before `,
        },
        {
            type: "operation",
            operation: firstWriteOrVisibility,
        },
        {
            type: "string",
            content: ".",
        },
    ];
};

export const writesFollowReadsViolatedForCausalPair = (
    sourceWrite: Operation,
    read: Operation,
    subsequentWrite: Operation,
    violatingClientSerializations: number[]
): ExplanationFragment[] => {
    return [
        {
            type: "operation",
            operation: sourceWrite,
        },
        {
            type: "string",
            content: ` was a write operation whose value was read by `,
        },
        {
            type: "operation",
            operation: read,
        },
        {
            type: "string",
            content: `. The read was then followed by a subsequent write, `,
        },
        {
            type: "operation",
            operation: subsequentWrite,
        },
        {
            type: "string",
            content: `. Thus, operation `,
        },
        {
            type: "operation",
            operation: sourceWrite,
        },
        {
            type: "string",
            content: ` should come before `,
        },
        {
            type: "operation",
            operation: subsequentWrite,
        },
        {
            type: "string",
            content:
                " in all serializations. However, this was not the case for ",
        },
        {
            type: "clients",
            clientIds: violatingClientSerializations,
        },
        {
            type: "string",
            content: ".",
        },
    ];
};

export const rValNullNonReadExplanationFragment = (
    clientId: number,
    readOp: Operation
): ExplanationFragment[] => {
    return [
        {
            type: "client",
            clientId,
        },
        {
            type: "string",
            content: ` performed a read, `,
        },
        {
            type: "operation",
            operation: readOp,
        },
        {
            type: "string",
            content: `, which returned ${readOp.value}, even though no value was previously written or visible.`,
        },
    ];
};

export const rValExplanationFragment = (
    clientId: number,
    directlyPreviousWriteOrVisibilityOp: Operation,
    readOp: Operation
): ExplanationFragment[] => {
    return [
        {
            type: "client",
            clientId,
        },
        {
            type: "string",
            content: " performed a read, ",
        },
        {
            type: "operation",
            operation: readOp,
        },
        {
            type: "string",
            content:
                ", which didn't return the value from the most recent write or visibility operation, ",
        },
        {
            type: "operation",
            operation: directlyPreviousWriteOrVisibilityOp,
        },
        {
            type: "string",
            content: ".",
        },
    ];
};

export const readYourWritesExplanationFragment = (
    clientId: number,
    readOperation: Operation
): ExplanationFragment[] => {
    return [
        {
            type: "client",
            clientId,
        },
        {
            type: "string",
            content: " performed a read, ",
        },
        {
            type: "operation",
            operation: readOperation,
        },
        {
            type: "string",
            content: `, which returned ${readOperation.value}`,
        },
        {
            type: "string",
            content:
                ", a value that it never wrote and that was never visible to it.",
        },
    ];
};

export const realTimeExplanationFragment = (
    sourceWrite: Operation,
    visibilityOperation: Operation
): ExplanationFragment[] => {
    return [
        {
            type: "client",
            clientId: visibilityOperation.clientId,
        },
        {
            type: "string",
            content: "'s ",
        },
        {
            type: "operation",
            operation: visibilityOperation,
        },
        {
            type: "string",
            content: " didn't overlap with its issuing write operation, ",
        },
        {
            type: "operation",
            operation: sourceWrite,
        },
        {
            type: "string",
            content: ".",
        },
    ];
};

/*
<Operation B> became visible to client 2 before <Operation A> became visible to it.
Client k, who originally performed these writes, performed <Operation A> before <Operation B>.
*/
export const monotonicWritesExplanationFragment = (
    issuingClientId: number,
    serializingClientId: number,
    firstHistoricalWrite: Operation,
    secondHistoricalWrite: Operation,
    firstSerializedWrite: Operation,
    secondSerializedWrite: Operation
): ExplanationFragment[] => {
    // return `${firstSerializedWrite} became visible to Client ${serializingClientId} before ${secondHistoricalWrite} became
    // visible to it. However, client ${issuingClientId}, who originally performed these writes, performed ${firstHistoricalWrite}
    // before ${secondSerializedWrite}`.

    return [
        {
            type: "operation",
            operation: firstSerializedWrite,
        },
        {
            type: "string",
            content: " became visible to ",
        },
        {
            type: "client",
            clientId: serializingClientId,
        },
        {
            type: "string",
            content: " before ",
        },
        {
            type: "operation",
            operation: secondSerializedWrite,
        },
        {
            type: "string",
            content: ". However, ",
        },
        {
            type: "client",
            clientId: issuingClientId,
        },
        {
            type: "string",
            content: ", who originally performed these writes, performed ",
        },
        {
            type: "operation",
            operation: firstHistoricalWrite,
        },
        {
            type: "string",
            emphasis: [],
            content: " before ",
        },
        {
            type: "operation",
            operation: secondHistoricalWrite,
        },
        {
            type: "string",
            content: ".",
        },
    ];
};

export const fragmentsToString = (fragments: ExplanationFragment[]): string => {
    let result = "";

    for (const fragment of fragments) {
        switch (fragment.type) {
            case "operation":
                result += `Operation ${fragment.operation.operationName}`;
                break;
            case "client":
                result += `Client ${fragment.clientId}`;
                break;
            case "string":
                result += fragment.content;
                break;
            case "list":
                result += fragment.children.map(f => fragmentsToString(f));
                break;
        }
    }

    return result;
};

export const successfullyLinearizableExplanationFragment =
    (): ExplanationFragment[] => {
        return [
            {
                type: "string",
                content:
                    "The current serialization linearizes, which means that it satisfies all weaker consistency models. Modify the blue visibility operations in the serialization to see how it affects different consistency models.",
            },
        ];
    };
