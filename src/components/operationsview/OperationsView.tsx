import {
    Operation,
    SystemSerialization,
    History,
    OriginalOperationsByName,
} from "~/backend/types";
import { sortOperations } from "~/backend/util";
import OperationsSlider from "./OperationsSlider";
import "./OperationsView.css";

export default function OperationsView(props: OperationsViewProps) {
    function operationMoved(op: Operation, newStart: number) {
        op.endTime = newStart + (op.endTime - op.startTime);
        op.startTime = newStart;

        if (!props.onOperationsChanged) return;
        props.onOperationsChanged(sortOperations({ ...props.operations }));
    }

    const title = props.type === "History" ? "History" : "Serializations";

    const originalOperations = Object.entries(
        props.history
    ).reduce<OriginalOperationsByName>(
        (acc, [_, ops]: [string, Operation[]]) => {
            const currOriginalOps = ops.reduce(
                (acc, op) => ({ ...acc, [op.operationName]: op }),
                {}
            );

            return { ...acc, ...currOriginalOps };
        },
        {}
    );

    return (
        <div class="ops-view">
            <h2 class="view-title">{title}</h2>
            {Object.entries(props.operations).map(([procId, ops]) => (
                <div class="op-slider-container">
                    <span class="op-slider-title">Client {procId}</span>
                    {props.type === "History" ? (
                        <OperationsSlider type="History" operations={ops} />
                    ) : (
                        <OperationsSlider
                            type="Serializations"
                            operations={ops}
                            onOperationMoved={operationMoved}
                            originalOperations={originalOperations}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}

interface OperationsViewProps {
    type: "History" | "Serializations";

    history: History;
    operations: SystemSerialization | History;

    onOperationsChanged?: (ops: SystemSerialization | History) => unknown;
}
