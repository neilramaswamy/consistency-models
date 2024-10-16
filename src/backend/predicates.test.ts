import { describe, expect, test } from "@jest/globals";
import { isLinearizable, isMonotonicReads, isPRAM, isRval } from "./predicates";
import {
    generateFullSerializationFromString,
    generateHistoryFromString,
} from "./util";

describe("PRAM", () => {
    const history = generateHistoryFromString(`
        ----[A:x<-1]-----------------------------------------------------------
        ---------------------[B:x->1]-----------[C:x<-2]------------[D:x<-3]---
    `);

    test("is true with the same linearizable sequence", () => {
        const serialization = generateFullSerializationFromString(
            history,
            `
        ----[A:x<-1]----------------------------[C:x<-2]------------[D:x<-3]--
        ----[A:x<-1]---------[B:x->1]-----------[C:x<-2]------------[D:x<-3]--
        `
        );

        expect(isPRAM(history, serialization)).toMatchObject({
            monotonicReads: {
                satisfied: true,
                explanation: [],
            },
            monotonicWrites: {
                satisfied: true,
                explanation: [],
            },
            readYourWrites: {
                satisfied: true,
                explanation: [],
            },
            clientOrder: true,
            satisfied: true,
        });
    });

    test("is not met when you read before writing anything", () => {
        const serialization = generateFullSerializationFromString(
            history,
            `
        ----[A:x<-1]------------------------------[C:x<-2]------------[D:x<-3]
        ---------------------[B:x->1]-[A:x<-1]--[C:x<-2]------------[D:x<-3]--
        `
        );

        expect(isPRAM(history, serialization)).toMatchObject({
            monotonicReads: {
                satisfied: true,
                explanation: [],
            },
            monotonicWrites: {
                satisfied: true,
                explanation: [],
            },
            readYourWrites: {
                satisfied: false,
                // TODO(neil): Explanation
                // explanation: []
            },
            clientOrder: true,
            satisfied: false,
        });
    });

    test("pram may satisfy all three base predicates without client order", () => {
        const serialization = generateFullSerializationFromString(
            history,
            `
        ----[C:x<-2]--------------------[D:x<-3]------------[A:x<-1]----------
        ----[C:x<-2]--------------------[D:x<-3]------------[A:x<-1]-[B:x->1]-
        `
        );

        expect(isPRAM(history, serialization)).toMatchObject({
            monotonicReads: {
                satisfied: true,
                explanation: [],
            },
            monotonicWrites: {
                satisfied: true,
                explanation: [],
            },
            readYourWrites: {
                satisfied: true,
                explanation: [],
            },
            clientOrder: false,
            satisfied: false,
        });
    });

    test("pram is not satisfied when there are not monotonic writes", () => {
        const serialization = generateFullSerializationFromString(
            history,
            `
        ----[A:x<-1]------------------------------------------------[D:x<-3]---[C:x<-2]
        ----[A:x<-1]---------[B:x->1]-----------[C:x<-2]------------[D:x<-3]-----------
        `
        );

        expect(isPRAM(history, serialization)).toMatchObject({
            monotonicReads: {
                satisfied: true,
                explanation: [],
            },
            monotonicWrites: {
                satisfied: false,
                // TODO(neil): Explanation
                // explanation: [],
            },
            readYourWrites: {
                satisfied: true,
                explanation: [],
            },
            clientOrder: true,
            satisfied: false,
        });
    });

    const history2 = generateHistoryFromString(`
    ----[A:x<-1]-----[B:x<-2]----------------------------------------
    --------------------------------[C:x->2]-----------------[D:x->1]
    `);

    test("pram is not satisfied when there are not monotonic reads", () => {
        const serialization = generateFullSerializationFromString(
            history2,
            `
        ----[A:x<-1]-----[B:x<-2]----------------------------------------
        ------[A:x<-1]------[B:x<-2]----[C:x->2]-----------------[D:x->1]
        `
        );

        expect(isPRAM(history2, serialization)).toMatchObject({
            monotonicReads: {
                satisfied: false,
                // TODO(neil): Explanation
                // explanation: [],
            },
            monotonicWrites: {
                satisfied: true,
                explanation: [],
            },
            readYourWrites: {
                satisfied: true,
                explanation: [],
            },
            clientOrder: true,
            satisfied: false,
        });
    });

    // const history3 = generateHistoryFromString(`
    // ----[A:x<-1]-[B:x<-2]-------------------------
    // -----------------------[C:x->1]---[D:x->2]----
    // `);

    // const ab3 = generateSerialization(history3, "A B");
    // const acbd3 = generateSerialization(history3, "A C B D");
    // const bdac3 = generateSerialization(history3, "B D A C");

    // TODO(neil): Put this in the paper as a good example of why we should include reads in
    // serializations.
    test("serialization with multiple reads is not pram unless reads follow program order", () => {
        const serialization = generateFullSerializationFromString(
            history2,
            `
        ----[A:x<-1]-----[B:x<-2]----------------------------------------
        ----[A:x<-1]-----[B:x<-2]-------[D:x->1]-----------------[C:x->2]
        `
        );

        expect(isPRAM(history2, serialization)).toMatchObject({
            monotonicReads: {
                satisfied: true,
                explanation: [],
            },
            monotonicWrites: {
                satisfied: true,
                explanation: [],
            },
            readYourWrites: {
                satisfied: true,
                explanation: [],
            },
            clientOrder: false,
            satisfied: false,
        });
    });
});

describe("sequential consistency", () => {
    // We will always expect: A -> C, and A -> D
    const history = generateHistoryFromString(`
    ----[A:x<-1]----------------------------------------------------
    ----------------[B:x->1]------------[C:x<-2]------------[D:x<-3]
    `);

    test("non-linearizable serialization can be sequentially consistent", () => {
        const serialization = generateFullSerializationFromString(
            history,
            `
    ----[A:x<-1]---------------------------------[C:x<-2]---[D:x<-3]
    ----[A:x<-1]----[B:x->1]------------[C:x<-2]------------[D:x<-3]
    `
        );

        expect(isLinearizable(history, serialization)).toMatchObject({
            satisfied: false,
            explanation: [],

            realTime: {
                satisfied: false,
                // TODO(neil): Explanation
                // explanation: [],
            },

            sequential: {
                satisfied: true,

                rval: {
                    satisfied: true,
                    explanation: [],
                },
                causal: {
                    satisfied: true,
                },
                singleOrder: true,
            },
        });
    });
});

describe("monotonic reads", () => {
    const history = generateHistoryFromString(`
    ----[A:x<-1]------[B:x<-2]----------------------------------------
    --------------------------------[C:x->2]------------------[D:x->1]
    `);

    test("read operations without any visibility operations", () => {
        const serialization = generateFullSerializationFromString(
            history,
            `
        ----[A:x<-1]------[B:x<-2]----------------------------------------
        ---------------------[B:x<-2]---[C:x->2]-----[A:x<-1]-----[D:x->1]
        `
        );

        expect(isMonotonicReads(history, serialization).satisfied).toBe(false);
    });
});

/*

describe("writes follow reads", () => {
    // We will always expect: A -> C, and A -> D
    const history = generateHistoryFromString(`
    ----[A:x<-1]---------------------------------
    --------------[B:x->1]---[C:x<-2]---[D:x<-3]-
    `);

    const abcd = generateSerialization(history, "A B C D");
    const abdc = generateSerialization(history, "A B D C");

    const adcb = generateSerialization(history, "A D C B");
    const acdb = generateSerialization(history, "A C D B");

    const cdab = generateSerialization(history, "C D A B");

    test("a linearizable serialization", () => {
        expect(isWritesFollowReads(history, { 0: abcd, 1: abcd })).toEqual(
            true
        );
    });

    test("pram can be violated", () => {
        expect(isWritesFollowReads(history, { 0: abcd, 1: abdc })).toEqual(
            true
        );
    });

    test("rval can be violated", () => {
        expect(isWritesFollowReads(history, { 0: adcb, 1: acdb })).toEqual(
            true
        );
    });

    test("one process with an out-of-order write is invalid", () => {
        expect(isWritesFollowReads(history, { 0: abcd, 1: cdab })).toEqual(
            false
        );
    });

    // Causality we need to check:
    // A -> C
    // C -> E
    const history2 = generateHistoryFromString(`
    ---[A:x<-1]----------------------------------------------------
    ------------[B:x->1]---[C:x<-2]--------------------------------
    ---------------------------------[D:x->2]--[E:x<-3]------------
    -----------------------------------------------------[F:x->3]--
    `);

    // Preserve A -> C -> E, permute the rest
    const acebdf = generateSerialization(history2, "A C E B D F");
    const acefdb = generateSerialization(history2, "A C E F D B");

    test("history2: permutations of reads are valid as long as writes are ordered correctly", () => {
        expect(isWritesFollowReads(history2, { 0: acebdf, 1: acefdb })).toEqual(
            true
        );
    });

    // Linearizable
    const abcdef = generateSerialization(history2, "A B C D E F");

    test("history2: linearizable serialization", () => {
        expect(isWritesFollowReads(history2, { 0: abcdef, 1: abcdef })).toEqual(
            true
        );
    });

    // Doesn't have C -> E
    const efabcd = generateSerialization(history2, "E F A B C D");
    // Doesn't have A -> C
    const cdefab = generateSerialization(history2, "C D E F A B");

    test("history2: one missing ordering, C -> E, is incorrect", () => {
        expect(isWritesFollowReads(history2, { 0: abcdef, 1: efabcd })).toEqual(
            false
        );
    });

    test("history2: one missing ordering, C -> E, is incorrect", () => {
        expect(isWritesFollowReads(history2, { 0: cdefab, 1: abcdef })).toEqual(
            false
        );
    });
});

describe("linearizability", () => {
    const history = generateHistoryFromString(`
    ---[A:x<-1]----------------------------[D:x->2]-
    ---------------[B:x<-2]----[C:x<-3]-------------
    `);

    const abcd = generateSerialization(history, "A B C D");
    const abdc = generateSerialization(history, "A B D C");

    test("a non-linearizable serialization can be real-time but not RVal", () => {
        const linearizability = isLinearizable(history, { 0: abcd, 1: abcd });

        expect(linearizability.sequential.isRval).toBe(false);
        expect(linearizability.sequential.isSequential).toBe(false);
        expect(linearizability.isRealTime).toBe(true);
    });

    test("a non-linearizable serialization can be RVal but not real-time", () => {
        const linearizability = isLinearizable(history, { 0: abdc, 1: abdc });

        expect(linearizability.isRealTime).toBe(false);
        expect(linearizability.isLinearizable).toBe(false);
        expect(linearizability.sequential.isSequential).toBe(true);
    });
});

describe("single order", () => {
    test("accepts non-PRAM consistent serializations", () => {
        const history = generateHistoryFromString(`
        ----[A:x<-1]-[B:x<-2]-------------------------
        -----------------------[C:x->2]---[D:x->1]----
        `);

        const s0 = generateSerialization(history, "B A");
        const s1 = generateSerialization(history, "B C A D");

        expect(isSingleOrder(history, { 0: s0, 1: s1 })).toBe(true);
    });

    test("works with serializations with only writes", () => {
        const history = generateHistoryFromString(`
        ----[A:x<-1]-[B:x<-2]-------[E:x<-9]----------
        -----------------------[C:x<-3]---[D:x<-4]----
        `);
        const s0 = generateSerialization(history, "C A B E D");

        expect(isSingleOrder(history, { 0: s0, 1: s0 })).toBe(true);
    });

    test("single order ignores all reads", () => {
        const history = generateHistoryFromString(`
        ----[A:x<-1]---------------------------------
        --------------[B:x->1]---[C:x<-2]---[D:x->3]-
        `);

        // B and D do not matter
        const s0OutOfOrder = generateSerialization(history, "C A");
        const s0InOrder = generateSerialization(history, "A C");
        const s1 = generateSerialization(history, "A B C D");

        expect(isSingleOrder(history, { 0: s0OutOfOrder, 1: s1 })).toBe(false);
        expect(isSingleOrder(history, { 0: s0InOrder, 1: s1 })).toBe(true);
    });
});

describe("monotonic writes", () => {
    test("monotonic writes generates an explanation for a violation", () => {
        const history = generateHistoryFromString(`
        ---[A:x<-1]----[B:x<-2]------------
        -----------------------------------
        `);

        const serialization = generateFullSerializationFromString(
            history,
            `
        ---[A:x<-1]----[B:x<-2]------------
        -----------------[B:x<-2]-[A:x<-1]-
        `
        );

        const result = isMonotonicWrites(history, serialization);

        expect(result.satisfied).toBe(false);
        expect(fragmentsToString(result.explanation)).toBe(
            "Operation B became " +
                "visible to Client 1 before Operation A. However, Client 0, who " +
                "originally performed these writes, performed Operation A before " +
                "Operation B."
        );
    });

    test("monotonic writes can detect three out-of-order visibility operations", () => {
        const history = generateHistoryFromString(`
        ----[A:x<-1]---[B:x<-2]---[C:x<-3]----------------------------------
        --------------------------------------------------------------------
        `);

        const serialization = generateSerializationFromString(
            history,
            `
        ----[A:x<-1]---[B:x<-2]---[C:x<-3]----------------------------------
        -----------------------------[C:x<-3]---[B:x<-2]---[A:x<-1]--------- 
        `
        );

        const result = isMonotonicWrites(history, serialization);

        expect(result.satisfied).toBe(false);

        expect(fragmentsToString(result.explanation)).toBe(
            "Operation B became visible to Client 1 before Operation A. However, Client 0, who originally performed these writes, performed Operation A before Operation B." +
                "Operation C became visible to Client 1 before Operation B. However, Client 0, who originally performed these writes, performed Operation B before Operation C."
        );
    });

    test("monotonic writes can detect out-of-order visibility operations amid in-order visibility operations", () => {
        const history = generateHistoryFromString(`
        --------------------------------------------------------------------
        ----[A:x<-1]---[B:x<-2]---[C:x<-3]----------------------------------
        `);

        const serialization = generateSerializationFromString(
            history,
            `
        -----------------------------[A:x<-1]---[C:x<-3]---[B:x<-2]--------- 
        ----[A:x<-1]---[B:x<-2]---[C:x<-3]----------------------------------
        `
        );

        const result = isMonotonicWrites(history, serialization);

        expect(result.satisfied).toBe(false);
        expect(fragmentsToString(result.explanation)).toBe(
            "Operation C became visible to Client 0 before Operation B. However, Client 1, who originally performed these writes, performed Operation B before Operation C."
        );
    });
});
*/
