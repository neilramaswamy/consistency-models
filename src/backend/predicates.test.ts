import { isPRAM } from "./predicates";
import { describe, test, expect } from "@jest/globals";
import { generateHistoryFromString, generateSerialization } from "./util";

const history = generateHistoryFromString(`
----[A:x->1]---------------------------------
--------------[B:x->1]---[C:x<-2]---[D:x<-3]-
`);

const ser = generateSerialization(history, "A B C D");

describe("PRAM", () => {
    test("like, works", () => {
        expect(isPRAM(history, { 0: ser, 1: ser })).toMatchObject({
            isPRAM: false
        });
    });
});
