import {History, SystemSerialization} from "~/backend/types";
import {createEffect, createSignal} from "solid-js";
import {isLinearizable} from "~/backend/predicates";
import mermaid from "mermaid";

// todo: put this somewhere better
const fillColor = "green";
const textColor = "black";

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

classDef yay fill:#33691e;
classDef no fill:red;
`.trim();

function getClassSpec(name: string, predicate: boolean) {
    return `class ${name} ${predicate ? "yay" : "no"}`;
}

export function ResultsTree(props: ResultsTreeProps) {
    let canvasRef: HTMLCanvasElement | undefined;
    const [result, setResult] = createSignal();

    function render() {
       // if (!canvasRef) return;
//        const result = isLinearizable(props.history, props.systemSerialization);

//        console.log(result);
//        const ctx = canvasRef.getContext('2d');
//
//        // clear
//        ctx.fillStyle = fillColor;
//        ctx.fillRect(0, 0, 500, 500);
//        ctx.fillStyle = textColor;
//        ctx.font = "12px Arial"
//        ctx.fillText(JSON.stringify(result, undefined, 4), 10, 50);
        const result = isLinearizable(props.history, props.systemSerialization);
/*
A(Linearizable)
    B(Sequential)
    C(Realtime)
D(Causal)
     E(RVal)
   F(Single Order)
    G(PRAM)
    D --> H(Writes Follow Reads)
    G --> I(Monotonic Reads)
    G --> J(Monotonic Writes)
    G --> K(Read Your Writes)
    G --> L(Client Order)*/
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
            getClassSpec("L", result.sequential.causal.pram.isClientOrder),
            ];

        const chart = `${chartDefBase}

${}`
    }

    createEffect(() => {
        render();
    })

   // return <canvas width={500} height={500} ref={canvasRef}/>
    return <pre style={{"text-align": "start"}}>{JSON.stringify(isLinearizable(props.history, props.systemSerialization), undefined, 4)}</pre>
}

interface ResultsTreeProps {
    history: History

    systemSerialization: SystemSerialization
}