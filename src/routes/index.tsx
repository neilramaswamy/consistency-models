import { Title } from "solid-start";
import Counter from "~/components/Counter";
import { SortableHorizontalListExample } from "~/components/Slider";
import OperationView from "~/components/operationsview/OperationView";
import OperationsView from "~/components/operationsview/OperationsView";
import { OperationType } from "~/backend/types";

export default function Home() {
    return (
        <main>
            <Title>Consistency Models</Title>

            <OperationsView
                title="History"
                operations={{
                0: [
                    {type: OperationType.Write, value: 3, operationName: "A", startTime: 0, endTime: 10},
                    {type: OperationType.Read, value: 3, operationName: "C", startTime: 40, endTime: 50},
                    {type: OperationType.Read, value: 1, operationName: "D", startTime: 65, endTime: 85},
                    ],
                1: [
                    {type: OperationType.Write, value: 1, operationName: "B", startTime: 20, endTime: 33},
                    ],
            }}/>

            <OperationsView
                title="Serializations"
                operationsDraggable
                operations={{
                0: [
                    {type: OperationType.Write, value: 3, operationName: "A", startTime: 0, endTime: 10},
                    {type: OperationType.Write, value: 1, operationName: "B", startTime: 20, endTime: 33},
                    {type: OperationType.Read, value: 3, operationName: "C", startTime: 40, endTime: 50},
                    {type: OperationType.Read, value: 1, operationName: "D", startTime: 65, endTime: 85},
                    ],
                    1: [
                    {type: OperationType.Write, value: 3, operationName: "A", startTime: 0, endTime: 10},
                    {type: OperationType.Write, value: 1, operationName: "B", startTime: 20, endTime: 33},
                    {type: OperationType.Read, value: 3, operationName: "C", startTime: 40, endTime: 50},
                    {type: OperationType.Read, value: 1, operationName: "D", startTime: 65, endTime: 85},
                    ],
                }}/>
        </main>
    );
}
