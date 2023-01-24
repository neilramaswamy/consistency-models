import {createSignal} from "solid-js";
import {Operation} from "~/backend/types";
import "./OperationView.css";

export default function OperationView({ op, canMove, onMoved }: OperationsSliderProps) {
    let operationDiv: HTMLDivElement | undefined;
    const [startX, setStartX] = createSignal<number>(0);
    const [dragX, setDragX] = createSignal<number>(0);
    const [leftOffset, setLeftOffset] = createSignal<number>(0);
    const [dragging, setDragging] = createSignal<boolean>(false);

    function startDrag(e: MouseEvent) {
        if (!operationDiv) return;
        const { left } = operationDiv.getBoundingClientRect();
        setDragging(true);
        setStartX(e.pageX);
        setDragX(e.pageX);
        setLeftOffset(e.pageX - left);
        document.body.addEventListener("mouseup", moveEnd);
        document.body.addEventListener("mouseleave", moveEnd);
        document.body.addEventListener("mousemove", moveDrag);
    }

    function moveDrag(e: MouseEvent) {
        if (!canMove(e.pageX - leftOffset())) return;
        setDragX(e.pageX);
    }

    function moveEnd() {
        setDragging(false);
        document.body.removeEventListener("mouseup", moveEnd);
        document.body.removeEventListener("mouseleave", moveEnd);
        document.body.removeEventListener("mousemove", moveDrag);

        // and commit!
        onMoved(dragX() - leftOffset())
    }

    return (
            <div
                class="operation"
                ref={operationDiv}
                style={{
                    "--start-time": op.startTime,
                    "--end-time": op.endTime,
                    "transform": dragging() ? `translateX(${dragX() - startX()}px)` : ""
                }}
                onmousedown={startDrag}>{op.operationName}</div>
    );
}

interface OperationsSliderProps {
    op: Operation;

    canMove(px: number): boolean;

    onMoved(px: number): unknown;
}