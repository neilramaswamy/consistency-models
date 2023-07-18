import { Operation, SystemSerialization } from "~/backend/types";
import { sortOperations } from "~/backend/util";
import OperationsSlider from "./OperationsSlider";
import "./OperationsView.css";

export default function OperationsView(props: OperationViewProps) {
    function operationMoved(op: Operation, newStart: number) {
        op.endTime = newStart + (op.endTime - op.startTime);
        op.startTime = newStart;

        if (!props.onOperationsChanged) return;
        props.onOperationsChanged(sortOperations({ ...props.operations }));
    }

    const title = props.type === "History" ? "History" : "Serializations";

    return (
        <div class="ops-view">
            <h2 class="view-title">{title}</h2>
            {Object.entries(props.operations).map(([procId, ops]) => (
                <div class="op-slider-container">
                    <span class="op-slider-title">Client {procId}</span>
                    <OperationsSlider
                        type={props.type}
                        operations={ops}
                        onOperationMoved={operationMoved}
                    />
                </div>
            ))}
        </div>
    );
}

interface OperationViewProps {
    type: "History" | "Serializations";

    operations: SystemSerialization | History;

    onOperationsChanged?: (ops: SystemSerialization | History) => unknown;
}
