import {
    DragDropProvider,
    DragDropSensors,
    DragOverlay,
    SortableProvider,
    createSortable,
    closestCenter,
    DragEvent,
    Id,
    useDragDropContext,
    Transformer,
    closestCorners,
    mostIntersecting,
    createDraggable,
    createDroppable,
} from "@thisbeyond/solid-dnd";
import { createEffect, createSignal, For } from "solid-js";
import { Operation } from "~/backend/types";
import { generateHistoryFromString } from "~/backend/util";
import "./Slider.css";

type DroppableData = {
    // If not a track, then an operation.
    isTrack: boolean;

    // The track index if the data is for a track.
    // The track this operation belongs to if the data is for an operation.
    trackId: number;
};

const Track = (props: { id: number; track: Operation[] }) => {
    const data = { isTrack: true, trackId: props.id };
    const droppable = createDroppable(props.id, data);

    return (
        <div use:droppable class="track">
            <For each={props.track}>
                {item => (
                    <DraggableOperation trackId={props.id} operation={item} />
                )}
            </For>
        </div>
    );
};

const DraggableOperation = (props: {
    trackId: number;
    operation: Operation;
}) => {
    const { operation: op, trackId } = props;
    const draggable = createDraggable(op.operationName);

    const data = { isTrack: false, trackId };
    const droppable = createDroppable(op.operationName, data);

    return (
        <div
            use:draggable
            use:droppable
            class="operation"
        >{`${op.operationName}`}</div>
    );
};

const ConstrainDragAxis = () => {
    const [, { onDragStart, onDragEnd, addTransformer, removeTransformer }] =
        useDragDropContext()!;

    const dampen = (value: number) => {
        if (Math.abs(value) < 10) {
            return 0;
        }
        return value;
    };

    const transformer: Transformer = {
        id: "constrain-x-axis",
        order: 100,
        callback: transform => ({ ...transform, y: dampen(transform.y) }),
    };

    onDragStart(({ draggable }: DragEvent) => {
        addTransformer("draggables", draggable.id, transformer);
    });

    onDragEnd(({ draggable }: DragEvent) => {
        removeTransformer("draggables", draggable.id, transformer.id);
    });

    return <></>;
};

const history = generateHistoryFromString(`
----[A:x<-1]---------------------------------
--------------[B:x->1]---[C:x<-2]---[D:x<-3]-
`);

export const SortableHorizontalListExample = () => {
    let transform = { x: 0, y: 0 };

    const [track1, setTrack1] = createSignal<Operation[]>(history[0]);
    const [track2, setTrack2] = createSignal<Operation[]>(history[1]);

    const onDragStart = ({ draggable }: DragEvent) => {
        console.log(draggable);
    };

    const onDragEnd = ({ draggable, droppable }: DragEvent) => {
        const node = draggable.node;

        node.style.setProperty("top", node.offsetTop + transform.y + "px");
        node.style.setProperty("left", node.offsetLeft + transform.x + "px");
    };

    return (
        <DragDropProvider
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            collisionDetector={mostIntersecting}
        >
            <DragDropSensors />
            <ConstrainDragAxis />
            <div class="container">
                <Track id={0} track={track1()} />
                <Track id={1} track={track2()} />
            </div>
        </DragDropProvider>
    );
};
