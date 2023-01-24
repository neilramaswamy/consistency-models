import {createSignal} from "solid-js";
import "./OperationsSlider.css";
import {Operation} from "~/backend/types";
import OperationView from "~/components/operationsview/OperationView";


export default function OperationsSlider({ operations: ops, onOperationMoved }: OperationsSliderProps) {
    const [bounds, setBounds] = createSignal<DOMRect>();

    function canMove(px: number, op: Operation): boolean {
        // can we move here?
        const operationLeft = pxToTrackUnits(px);
        const operationEnd = operationLeft + (op.endTime - op.startTime);

        return operationLeft >= 0 && operationEnd <= 100 && ops
            .filter(op2 => op2.operationName !== op.operationName)
            .every(o => {
                // check if we intersect with this other operation
                return operationLeft > o.endTime || operationEnd < o.startTime;
            })
    }

    function pxToTrackUnits(px: number) {
        const rectBounds = bounds();
        if (!rectBounds) return 0;

        let adjusted = px - rectBounds.left;
        return (adjusted / rectBounds.width) * 100;
    }

    return (<div class="operation-container" ref={(div) => {
        // i swear this is actually recommended https://github.com/solidjs/solid/issues/116
        setTimeout(() => setBounds(div.getBoundingClientRect()));
    }}>
        {ops.map(o => <OperationView
            op={o}
            canMove={(px) => canMove(px, o)}
            onMoved={(px) => onOperationMoved(o, pxToTrackUnits(px))}/>)}
        </div>
    );
}

interface OperationsSliderProps {
    operations: Operation[];

    onOperationMoved(op: Operation, start: number): unknown;
}
