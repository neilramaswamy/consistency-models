import {createSignal} from "solid-js";
import "./OperationsSlider.css";
import {Operation} from "~/backend/types";
import OperationView from "~/components/operationsview/OperationView";


export default function OperationsSlider(props: OperationsSliderProps) {
    const [bounds, setBounds] = createSignal<DOMRect>();

    function canMove(px: number | undefined, op: Operation, suggest: boolean = true): { allowed: boolean, suggestedPosition?: number } {
        if (!px) return { allowed: false };

        // can we move here?
        const operationLeft = pxToTrackUnits(px);
        const operationWidth = (op.endTime - op.startTime);
        const operationEnd = operationLeft + operationWidth;

        const intersections = [];

        function trySuggest(num: number) {
            if (!suggest) return undefined;

            const px = trackUnitsToPx(num);
            return canMove(px, op, false).allowed ? px : undefined;
        }

        if (operationLeft < 0) return { allowed: false, suggestedPosition: trySuggest(0) };
        if (operationEnd > 100) return { allowed: false, suggestedPosition: trySuggest(100 - operationWidth) };

        return props.operations
            .filter(op2 => op2.operationName !== op.operationName)
            .reduce<{ allowed: boolean }>((a, e) => {
                if (!a.allowed) return a;
                // check if we intersect with this other operation
                return { allowed: operationLeft > e.endTime || operationEnd < e.startTime };
                }, { allowed: true });
    }

    function pxToTrackUnits(px: number) {
        const rectBounds = bounds();
        if (!rectBounds) return 0;

        let adjusted = px - rectBounds.left;
        return (adjusted / rectBounds.width) * 100;
    }

    function trackUnitsToPx(tu: number) {
        const rectBounds = bounds();
        if (!rectBounds) return 0;
        return ((tu / 100) * rectBounds.width) + rectBounds.left;
    }

    return (<div class="operation-container" ref={(div) => {
        // i swear this is actually recommended https://github.com/solidjs/solid/issues/116
        setTimeout(() => setBounds(div.getBoundingClientRect()));
    }}>
        {props.operations.map(o => <OperationView
            op={o}
            canMove={(px) => canMove(px, o)}
            draggable={props.operationsDraggable}
            onMoved={(px) => props.onOperationMoved(o, pxToTrackUnits(px))}/>)}
        <div class="operation-track"></div>
    </div>);
}

interface OperationsSliderProps {
    operations: Operation[];

    operationsDraggable?: boolean;

    onOperationMoved(op: Operation, start: number): unknown;
}
