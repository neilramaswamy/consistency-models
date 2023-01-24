import { Operation } from "~/backend/types";
import OperationsSlider from "./OperationsSlider";
import {createSignal} from "solid-js";

export default function OperationsView() {
    const [ops, setOps] = createSignal<Operation[]>([
        {operationName: "a", startTime: 0, endTime: 10},
        {operationName: "b", startTime: 20, endTime: 30},
        {operationName: "c", startTime: 40, endTime: 50},
        {operationName: "d", startTime: 60, endTime: 70},
        ] as any as Operation[])

    function operationMoved(op: Operation, newStart: number) {
        op.startTime = newStart;
        setOps([...ops()])
    }

    return <OperationsSlider operations={ops()} onOperationMoved={operationMoved} />
}