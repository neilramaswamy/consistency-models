import { Operation } from "./types";

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
            content: "became visible to",
        },
        {
            type: "client",
            clientId: serializingClientId,
        },
        {
            type: "string",
            content: "before",
        },
        {
            type: "operation",
            operation: secondHistoricalWrite,
        },
        {
            type: "string",
            content: "became visible to it. However,",
        },
        {
            type: "client",
            clientId: issuingClientId,
        },
        {
            type: "string",
            content: ", who originally performed these writes, performed",
        },
        {
            type: "operation",
            operation: firstHistoricalWrite,
        },
        {
            type: "string",
            emphasis: [],
            content: "before",
        },
        {
            type: "operation",
            operation: secondSerializedWrite,
        },
        {
            type: "string",
            content: ".",
        },
    ];
};
