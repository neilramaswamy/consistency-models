import {
    isRval,
    isCausal,
    isPRAM,
    isSingleOrder,
    isWritesFollowReads,
    isLinearizable,
} from "./predicates";
import { describe, test, expect } from "@jest/globals";
import { generateHistoryFromString, generateSerialization } from "./util";

describe("PRAM", () => {
    const history = generateHistoryFromString(`
    ----[A:x<-1]---------------------------------
    --------------[B:x->1]---[C:x<-2]---[D:x<-3]-
    `);

    const abcd = generateSerialization(history, "A B C D");
    const bcda = generateSerialization(history, "B C D A");
    const cdab = generateSerialization(history, "C D A B");
    const abdc = generateSerialization(history, "A B D C");

    test("is true with the same linearizable sequence", () => {
        expect(isPRAM(history, { 0: abcd, 1: abcd })).toEqual({
            isMonotonicReads: true,
            isMonotonicWrites: true,
            isReadYourWrites: true,
            isPRAM: true,
        });
    });

    test("is not met when you read before writing anything", () => {
        expect(isPRAM(history, { 0: bcda, 1: bcda })).toEqual({
            isMonotonicReads: true,
            isMonotonicWrites: true,
            isReadYourWrites: false,
            isPRAM: false,
        });
    });

    test("pram may have reads not consistent with program order", () => {
        expect(isPRAM(history, { 0: cdab, 1: cdab })).toEqual({
            isMonotonicReads: true,
            isMonotonicWrites: true,
            isReadYourWrites: true,
            isPRAM: true,
        });
    });

    test("pram is not satisfied when there are not monotonic writes", () => {
        expect(isPRAM(history, { 0: abcd, 1: abdc })).toEqual({
            isMonotonicReads: true,
            isMonotonicWrites: false,
            isReadYourWrites: true,
            isPRAM: false,
        });
    });

    const history2 = generateHistoryFromString(`
    ----[A:x<-1]-[B:x<-2]-------------------------
    -----------------------[C:x->2]---[D:x->1]----
    `);
    const abcd2 = generateSerialization(history2, "A B C D");
    const adbc2 = generateSerialization(history2, "A D B C");
    const acbd2 = generateSerialization(history2, "A C B D");

    test("pram is not satisfied when there are not monotonic reads", () => {
        expect(isPRAM(history2, { 0: abcd2, 1: abcd2 })).toEqual({
            isMonotonicReads: false,
            isMonotonicWrites: true,
            isReadYourWrites: true,
            isPRAM: false,
        });
    });

    test("pram can have interleaved reads/writes in non-program order", () => {
        expect(isPRAM(history2, { 0: adbc2, 1: adbc2 })).toEqual({
            isMonotonicReads: true,
            isMonotonicWrites: true,
            isReadYourWrites: true,
            isPRAM: true,
        });
    });

    test("full program order does not imply pram", () => {
        expect(isPRAM(history2, { 0: acbd2, 1: acbd2 })).toEqual({
            // TODO(neil): It's unclear how isMonotonicReads is defined if you do not read your
            // writes... For now, we set it as false.
            isMonotonicReads: false,
            isMonotonicWrites: true,
            isReadYourWrites: false,
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

    const cdab = generateSerialization(history, "C D A B");

    const systemSerialization = { 0: cdab, 1: cdab };

    // So this is confusing. systemSerialization is SingleOrder, PRAM, and RVal.
    //
    // According to http://jepsen.io/consistency/models/sequential, this means it is sequentially
    // consistent. This makes sense. However, it is not the case that it is causal. This means
    // that sequential consistency does not imply causal (and we know that causal is not sequential
    // but we always knew this).

    expect(isSingleOrder(history, systemSerialization)).toEqual(true);
    expect(isPRAM(history, systemSerialization)).toHaveProperty("isPRAM", true);
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
