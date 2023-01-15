import {createSignal} from "solid-js";
import "./OperationsSlider.css";
import {Operation} from "~/backend/types";
import OperationView from "~/components/operationsview/OperationView";

const ops: Operation[] = [
    {operationName: "a", startTime: 0},
    {operationName: "b", startTime: 20},
    {operationName: "c", startTime: 40},
    {operationName: "d", startTime: 60},
] as any as Operation[];

export default function OperationsSlider() {
    return (
        <div class="operation-container">
            {ops.map(o => <OperationView op={o}/>)}
        </div>
    );
}
