import {History, SystemSerialization} from "~/backend/types";
import {createEffect, createSignal} from "solid-js";
import {isLinearizable} from "~/backend/predicates";

// todo: put this somewhere better
const fillColor = "green";
const textColor = "black";

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