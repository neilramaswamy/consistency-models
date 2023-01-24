import {Operation, OperationType, SystemSerialization} from "~/backend/types";
import OperationsSlider from "./OperationsSlider";
import "./OperationsView.css";
import {createEffect} from "solid-js";
import {sortOperations} from "~/backend/util";

export default function OperationsView(props: OperationViewProps) {
    function operationMoved(op: Operation, newStart: number) {
        op.endTime = newStart + (op.endTime - op.startTime);
        op.startTime = newStart;
        
        if (!props.onOperationsChanged) return;
        props.onOperationsChanged(sortOperations({ ...props.operations }));
    }

    return <div class="ops-view">
        <h2 class="view-title">{props.title}</h2>
        {Object.entries(props.operations).map(([procId, ops]) => (
            <div class="op-slider-container">
                <span class="op-slider-title">Process {procId}</span>
                <OperationsSlider operations={ops} onOperationMoved={operationMoved} operationsDraggable={props.operationsDraggable}/>
            </div>)
        )}
    </div>
}

interface OperationViewProps {
    title: string;

    operations: SystemSerialization | History;

    onOperationsChanged?: (ops: SystemSerialization | History) => unknown;

    operationsDraggable?: boolean;
}