import {isPRAM, isWritesFollowReads} from "./predicates";
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

describe("Writes follow reads", () => {
    const history = generateHistoryFromString(`
    ----[A:x<-1]---------------------------------
    --------------[B:x->1]---[C:x<-2]---[D:x<-3]-
    `);

    const abcd = generateSerialization(history, "A B C D");
    const adcb = generateSerialization(history, "A D C B");


    const abdc = generateSerialization(history, "A B D C");

   test("ensures that if a process reads a value v, which came from a write w1 and later performs write w2, then w2 is visible after w1", () => {
       expect(isWritesFollowReads(history, { 0: abcd, 1: abcd })).toEqual(true);
   })
});