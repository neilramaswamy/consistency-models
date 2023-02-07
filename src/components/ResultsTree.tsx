import {History, SystemSerialization} from "~/backend/types";
import {createEffect, createSignal} from "solid-js";
import {isLinearizable} from "~/backend/predicates";
import mermaid from "mermaid";

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
    const [svg, setSvg] = createSignal();

    async function render() {
        if (!containerRef) return;
        const result = isLinearizable(props.history, props.systemSerialization);

        const classSpecs = [
            getClassSpec("A", result.isLinearizable),
            getClassSpec("B", result.sequential.isSequential),
            getClassSpec("C", result.isRealTime),
            getClassSpec("D", result.sequential.causal.isCausal),
            getClassSpec("E", result.sequential.isRval),
            getClassSpec("F", result.sequential.isSingleOrder),
            getClassSpec("G", result.sequential.causal.pram.isPRAM),
            getClassSpec("H", result.sequential.causal.isWritesFollowReads),
            getClassSpec("I", result.sequential.causal.pram.isMonotonicReads),
            getClassSpec("J", result.sequential.causal.pram.isMonotonicWrites),
            getClassSpec("K", result.sequential.causal.pram.isReadYourWrites),
            getClassSpec("L", result.sequential.causal.pram.isClientOrder),];

        const chart = `${chartDefBase}

${classSpecs.join("\n")}`;

        const svg = await mermaid.mermaidAPI.renderAsync("asdf", chart);
        //setSvg(svg);
        containerRef.innerHTML = svg;
    }

    createEffect(() => {
        render();
    })

    return <>
    <pre style={{"text-align": "start"}}>{JSON.stringify(isLinearizable(props.history, props.systemSerialization), undefined, 4)}</pre>
    <div ref={containerRef}></div>
    </>;
}

interface ResultsTreeProps {
    history: History

    systemSerialization: SystemSerialization
}