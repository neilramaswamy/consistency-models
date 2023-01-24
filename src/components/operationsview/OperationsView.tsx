import {Operation, OperationType, SystemSerialization} from "~/backend/types";
import OperationsSlider from "./OperationsSlider";
import "./OperationsView.css";

export default function OperationsView({ operations, title, operationsDraggable }: OperationViewProps) {
    function operationMoved(op: Operation, newStart: number) {
        console.log("I have moved!!");
//        op.endTime = newStart + (op.endTime - op.startTime);
//        op.startTime = newStart;
    }

    return <div class="ops-view">
        <h2 class="view-title">{title}</h2>
        {Object.entries(operations).map(([procId, ops]) => (
            <div class="op-slider-container">
                <span class="op-slider-title">Process {procId}</span>
                <OperationsSlider operations={ops} onOperationMoved={operationMoved} operationsDraggable={operationsDraggable}/>
            </div>)
        )}
    </div>
}

interface OperationViewProps {
    title: string;

    operations: SystemSerialization | History;

    operationsDraggable?: boolean;
}