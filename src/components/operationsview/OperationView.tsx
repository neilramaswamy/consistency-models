import { createSignal } from "solid-js";
import { Operation, OperationType } from "~/backend/types";
import "./OperationView.css";

interface ICoordinateInfo {
    pageX: number;
}

export default function OperationView(props: OperationsSliderProps) {
    let operationDiv: HTMLDivElement | undefined;
    const [startX, setStartX] = createSignal<number>(0);
    const [dragX, setDragX] = createSignal<number>(0);
    const [leftOffset, setLeftOffset] = createSignal<number>(0);
    const [dragging, setDragging] = createSignal<boolean>(false);
    const [isTransparent, setTransparent] = createSignal<boolean>(false);
    const [lastValidPosition, setLastValidPosition] = createSignal<number>(0);

    function startDrag(e: ICoordinateInfo) {
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
        document.body.addEventListener("touchend", moveEnd);
        document.body.addEventListener("touchmove", touchMove, {
            passive: false,
        });
    }

    function moveDrag(e: ICoordinateInfo) {
        const moveResult = props.canMove(e.pageX - leftOffset());

        if (!moveResult.allowed && moveResult.suggestedPosition)
            setDragX(leftOffset() + moveResult.suggestedPosition);
        else setDragX(e.pageX);

        if (moveResult.allowed) setLastValidPosition(e.pageX);
        else if (moveResult.suggestedPosition)
            setLastValidPosition(leftOffset() + moveResult.suggestedPosition);
        setTransparent(!moveResult.allowed && !moveResult.suggestedPosition);
    }

    function moveEnd() {
        setDragging(false);
        document.body.removeEventListener("mouseup", moveEnd);
        document.body.removeEventListener("mouseleave", moveEnd);
        document.body.removeEventListener("mousemove", moveDrag);
        document.body.removeEventListener("touchend", moveEnd);
        document.body.removeEventListener("touchmove", touchMove);

        // and commit!
        props.onMoved(lastValidPosition() - leftOffset());
    }

    const touchStart = (e: TouchEvent) => startDrag(e.touches[0]);
    const touchMove = (e: TouchEvent) => {
        e.preventDefault();
        moveDrag(e.touches[0]);
    };

    return (
        <div
            class={`operation ${
                props.type == "Serializations" &&
                !props.draggable &&
                "stationary"
            } ${props.op.type === OperationType.Read ? "read" : "write"} ${
                props.draggable ? "draggable" : ""
            } ${isTransparent() ? "transparent" : ""}`}
            ref={operationDiv}
            style={{
                "--start-time": props.op.startTime,
                "--end-time": props.op.endTime,
                transform: dragging()
                    ? `translateX(${dragX() - startX()}px)`
                    : "",
            }}
            onmousedown={startDrag}
            ontouchstart={touchStart}
        >
            <span class="name">{props.op.operationName}</span>
            <div class="info">
                <span>
                    {`${props.op.type === OperationType.Read ? "R" : "W"}(${
                        props.op.value
                    })`}
                </span>
            </div>
        </div>
    );
}

interface OperationsSliderProps {
    // Whether the operation is for a history or a serialization
    type: "History" | "Serializations";

    op: Operation;

    // An operation is draggable if it's a non-original operation
    draggable?: boolean;

    canMove(px: number): { allowed: boolean; suggestedPosition?: number };

    onMoved(px: number): unknown;
}
