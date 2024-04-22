import {
    isRval,
    isCausal,
    isPRAM,
    isSingleOrder,
    isWritesFollowReads,
    isLinearizable,
    isSequential,
    isMonotonicWrites,
} from "./predicates";
import { describe, test, expect } from "@jest/globals";
import { generateHistoryFromString, generateSerialization } from "./util";
import { fragmentsToString } from "./explanation";

describe("PRAM", () => {
    const history = generateHistoryFromString(`
    ----[A:x<-1]---------------------------------
    --------------[B:x->1]---[C:x<-2]---[D:x<-3]-
    `);

    const acd = generateSerialization(history, "A C D");
    const abcd = generateSerialization(history, "A B C D");

    const cda = generateSerialization(history, "C D A");
    const bcda = generateSerialization(history, "B C D A");

    const adc = generateSerialization(history, "A D C");

    const cdab = generateSerialization(history, "C D A B");
    const abdc = generateSerialization(history, "A B D C");

    test("is true with the same linearizable sequence", () => {
        expect(isPRAM(history, { 0: acd, 1: abcd })).toEqual({
            isMonotonicReads: true,
            isMonotonicWrites: true,
            isReadYourWrites: true,
            isClientOrder: true,
            isPRAM: true,
        });
    });

    test("is not met when you read before writing anything", () => {
        expect(isPRAM(history, { 0: acd, 1: bcda })).toEqual({
            isMonotonicReads: true,
            isMonotonicWrites: true,
            isReadYourWrites: false,
            isClientOrder: true,
            isPRAM: false,
        });
    });

    test("pram may satisfy all three base predicates without client order", () => {
        expect(isPRAM(history, { 0: cda, 1: cdab })).toEqual({
            isMonotonicReads: true,
            isMonotonicWrites: true,
            isReadYourWrites: true,
            isClientOrder: false,
            isPRAM: false,
        });
    });

    test("pram is not satisfied when there are not monotonic writes", () => {
        expect(isPRAM(history, { 0: adc, 1: abcd })).toEqual({
            isMonotonicReads: true,
            isMonotonicWrites: false,
            isReadYourWrites: true,
            isClientOrder: true,
            isPRAM: false,
        });
    });

    const history2 = generateHistoryFromString(`
    ----[A:x<-1]-[B:x<-2]-------------------------
    -----------------------[C:x->2]---[D:x->1]----
    `);
    const ab = generateSerialization(history2, "A B");

    const abcd2 = generateSerialization(history2, "A B C D");
    const adbc2 = generateSerialization(history2, "A D B C");
    const acbd2 = generateSerialization(history2, "A C B D");

    test("pram is not satisfied when there are not monotonic reads", () => {
        expect(isPRAM(history2, { 0: ab, 1: abcd2 })).toEqual({
            isMonotonicReads: false,
            isMonotonicWrites: true,
            isReadYourWrites: true,
            isClientOrder: true,
            isPRAM: false,
        });
    });

    test("full program order does not imply pram", () => {
        expect(isPRAM(history2, { 0: ab, 1: acbd2 })).toEqual({
            // TODO(neil): It's unclear how isMonotonicReads is defined if you do not read your
            // writes... For now, we set it as false.
            isMonotonicReads: false,
            isMonotonicWrites: true,
            isReadYourWrites: false,
            isClientOrder: true,
            isPRAM: false,
        });
    });

    const history3 = generateHistoryFromString(`
    ----[A:x<-1]-[B:x<-2]-------------------------
    -----------------------[C:x->1]---[D:x->2]----
    `);

    const ab3 = generateSerialization(history3, "A B");
    const acbd3 = generateSerialization(history3, "A C B D");
    const bdac3 = generateSerialization(history3, "B D A C");

    // TODO(neil): Put this in the paper as a good example of why we should include reads in
    // serializations.
    test("serialization with multiple reads is not pram unless reads follow program order", () => {
        expect(isPRAM(history3, { 0: ab3, 1: acbd3 })).toEqual({
            isMonotonicReads: true,
            isMonotonicWrites: true,
            isReadYourWrites: true,
            isClientOrder: true,
            isPRAM: true,
        });

        expect(isPRAM(history3, { 0: ab3, 1: bdac3 })).toEqual({
            isMonotonicReads: true,
            isMonotonicWrites: false,
            isReadYourWrites: true,
            isClientOrder: false,
            isPRAM: false,
        });
    });
});

describe("sequential consistency", () => {
    // We will always expect: A -> C, and A -> D
    const history = generateHistoryFromString(`
    ----[A:x<-1]---------------------------------
    --------------[B:x->1]---[C:x<-2]---[D:x<-3]-
    `);

    const abcd = generateSerialization(history, "A C D");
    const cdab = generateSerialization(history, "C D A B");

    const systemSerialization = { 0: abcd, 1: cdab };

    expect(isSequential(history, systemSerialization).isSequential).toBe(false);
    expect(isSingleOrder(history, systemSerialization)).toEqual(false);
    expect(isPRAM(history, systemSerialization)).toHaveProperty(
        "isPRAM",
        false
    );
    expect(isRval(history, systemSerialization)).toEqual(true);

    expect(isWritesFollowReads(history, systemSerialization)).toBe(false);
    expect(isCausal(history, systemSerialization)).toHaveProperty(
        "isCausal",
        false
    );
});

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

        const s0 = generateSerialization(history, "A B");
        const s1 = generateSerialization(history, "B A");

        const result = isMonotonicWrites(history, { 0: s0, 1: s1 });

        expect(result.satisfied).toBe(false);
        expect(fragmentsToString(result.explanation)).toBe(
            "Operation B became " +
                "visible to Client 1 before Operation A. However, Client 0, who " +
                "originally performed these writes, performed Operation A before " +
                "Operation B."
        );
    });
});
