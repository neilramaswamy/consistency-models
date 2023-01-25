import {createSignal} from "solid-js";
import {Operation, OperationType} from "~/backend/types";
import "./OperationView.css";

export default function OperationView(props: OperationsSliderProps) {
    let operationDiv: HTMLDivElement | undefined;
    const [startX, setStartX] = createSignal<number>(0);
    const [dragX, setDragX] = createSignal<number>(0);
    const [leftOffset, setLeftOffset] = createSignal<number>(0);
    const [dragging, setDragging] = createSignal<boolean>(false);
    const [isTransparent, setTransparent] = createSignal<boolean>(false);
    const [lastValidPosition, setLastValidPosition] = createSignal<number>(0);

    function startDrag(e: MouseEvent) {
        if (!props.draggable || !operationDiv) return;
        const { left } = operationDiv.getBoundingClientRect();
        setDragging(true);
        setStartX(e.pageX);
        setDragX(e.pageX);
        setLastValidPosition(e.pageX);
        setLeftOffset(e.pageX - left);
        document.body.addEventListener("mouseup", moveEnd);
        document.body.addEventListener("mouseleave", moveEnd);
        document.body.addEventListener("mousemove", moveDrag);
    }

    function moveDrag(e: MouseEvent) {
        const moveResult = props.canMove(e.pageX - leftOffset());

        if (!moveResult.allowed && moveResult.suggestedPosition)
            setDragX(leftOffset() + moveResult.suggestedPosition);
        else
            setDragX(e.pageX);

        if (moveResult.allowed) setLastValidPosition(e.pageX);
        else if (moveResult.suggestedPosition) setLastValidPosition(leftOffset() + moveResult.suggestedPosition);
        setTransparent(!moveResult.allowed && !moveResult.suggestedPosition);
    }

    function moveEnd() {
        setDragging(false);
        document.body.removeEventListener("mouseup", moveEnd);
        document.body.removeEventListener("mouseleave", moveEnd);
        document.body.removeEventListener("mousemove", moveDrag);

        // and commit!
        props.onMoved(lastValidPosition() - leftOffset())
    }
    return (
            <div
                class={`operation ${props.op.type === OperationType.Read ? "read" : "write"} ${props.draggable ? "draggable" : ""} ${isTransparent() ? "transparent" : ""}`}
                ref={operationDiv}
                style={{
                    "--start-time": props.op.startTime,
                    "--end-time": props.op.endTime,
                    "transform": dragging() ? `translateX(${dragX() - startX()}px)` : ""
                }}
                onmousedown={startDrag}>
                <span class="name">{props.op.operationName}</span>
                <div class="info">
                    <span class="variable">x</span>
                    <span class="material-symbols-outlined icon">{props.op.type === OperationType.Read ? "east" : "west"}</span>
                    <span class="value">{props.op.value}</span>
                </div>
            </div>
    );
}

interface OperationsSliderProps {
    op: Operation;

    draggable?: boolean;

    canMove(px: number): { allowed: boolean, suggestedPosition?: number };

    onMoved(px: number): unknown;
}