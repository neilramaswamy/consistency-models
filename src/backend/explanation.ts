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
          type: "client";
          clientId: number;
      }
    | {
          type: "string";
          emphasis?: TextEmphasis[];
          content: string;
      }
    | {
          type: "list";
          ordered: boolean;
          children: ExplanationFragment[];
      };

export const monotonicReadsExplanationFragment = (
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
            content: " had a read, ",
        },
        {
            type: "operation",
            operation: firstRead,
        },
        {
            type: "string",
            content: `, which returned the value from ${operationTypeToString(
                firstWriteOrVisibility
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
                earlierWriteOrVisibility
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
                result += fragment.ordered ? "1. " : "- ";
                result += fragmentsToString(fragment.children);
                break;
        }
    }

    return result;
};
