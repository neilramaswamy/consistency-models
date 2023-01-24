import {History, SystemSerialization} from "~/backend/types";
import {createEffect} from "solid-js";

// todo: put this somewhere better
const fillColor = "white";
const fillColor = "white";
const fillColor = "white";

export function ResultsTree({ history, systemSerialization }: ResultsTreeProps) {
    let canvasRef: HTMLCanvasElement | undefined;

    function render() {
        if (!canvasRef) return;
        const ctx = canvasRef.getContext('2d');

        // clear
        ctx.fillStyle = "white";
    }

    createEffect(() => {
        render();
    })

    return <canvas ref={canvasRef}/>
}

interface ResultsTreeProps {
    history: History

    systemSerialization: SystemSerialization
}