import {createSignal} from "solid-js";
import {Operation} from "~/backend/types";
import "./OperationView.css";

export default function OperationView({op}: OperationsSliderProps) {
    return (
        <div class="operation" style={{"--start-time": op.startTime}}>{op.operationName}</div>
    );
}

interface OperationsSliderProps {
    op: Operation
}