import { History, SystemSerialization } from "~/backend/types";
import { createEffect, createSignal } from "solid-js";
import { isLinearizable } from "~/backend/predicates";
import mermaid from "mermaid";
import "./ResultsTree.css";
import { Explanation } from "./explanation/Explanation";

// todo: put this somewhere better
const chartDefBase = `
graph TD
    A --> C(Realtime)
    A(Linearizable) --> B(Sequential)
    B --> E(RVal)
    B --> D(Causal)
    B --> F(Single Order)
    D --> G(PRAM)
    D --> H(Writes Follow Reads)
    G --> I(Monotonic Reads)
    G --> J(Monotonic Writes)
    G --> K(Read Your Writes)
    G --> L(Client Order)

classDef yay fill:#33691e,color:white
classDef no fill:#b71c1c,color:white
`.trim();

function getClassSpec(name: string, predicate: boolean) {
    return `class ${name} ${predicate ? "yay" : "no"}`;
}

export function ResultsTree(props: ResultsTreeProps) {
    let containerRef: HTMLDivElement | undefined;
    const [result, setResult] = createSignal(
        isLinearizable(props.history, props.systemSerialization)
    );

    async function render() {
        const nextResult = isLinearizable(
            props.history,
            props.systemSerialization
        );

        const classSpecs = [
            getClassSpec("A", nextResult.isLinearizable),
            getClassSpec("B", nextResult.sequential.satisfied),
            getClassSpec("C", nextResult.realTime.satisfied),
            getClassSpec("D", nextResult.sequential.causal.satisfied),
            getClassSpec("E", nextResult.sequential.rval.satisfied),
            getClassSpec("F", nextResult.sequential.singleOrder),
            getClassSpec("G", nextResult.sequential.causal.pram.satisfied),
            getClassSpec(
                "H",
                nextResult.sequential.causal.writesFollowReads.satisfied
            ),
            getClassSpec(
                "I",
                nextResult.sequential.causal.pram.monotonicReads.satisfied
            ),
            getClassSpec(
                "J",
                nextResult.sequential.causal.pram.monoticWrites.satisfied
            ),
            getClassSpec(
                "K",
                nextResult.sequential.causal.pram.readYourWrites.satisfied
            ),
            getClassSpec("L", nextResult.sequential.causal.pram.clientOrder),
        ];

        const chart = `${chartDefBase}
            ${classSpecs.join("\n")}`;

        mermaid.mermaidAPI.renderAsync("asdf", chart).then(svg => {
            if (!containerRef) return;
            containerRef.innerHTML = svg;
        });

        setResult(nextResult);
    }

    createEffect(() => {
        render();
        console.log("new result");
        console.log(result());
    });

    return (
        <div class="results">
            <div class="results-tree" ref={containerRef} />
            <div class="results-explanation">
                <Explanation
                    fragments={[
                        result().realTime.explanation,
                        result().sequential.rval.explanation,
                        result().sequential.causal.writesFollowReads
                            .explanation,
                        result().sequential.causal.pram.monotonicReads
                            .explanation,
                        result().sequential.causal.pram.monoticWrites
                            .explanation,
                        result().sequential.causal.pram.readYourWrites
                            .explanation,
                    ].flat()}
                />
            </div>
        </div>
    );
}

interface ResultsTreeProps {
    history: History;

    systemSerialization: SystemSerialization;
}
