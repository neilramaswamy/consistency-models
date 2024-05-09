import { createEffect, createSignal } from "solid-js";
import { Title } from "solid-start";
import { SystemSerialization } from "~/backend/types";
import {
    generateAsciiDiagrams,
    generateFullSerializationFromString,
    generateHistoryFromString,
} from "~/backend/util";
import Sidebar from "../sidebar/Sidebar";
import OperationsView from "../operationsview/OperationsView";
import { ResultsTree } from "../ResultsTree";

interface InteractiveModelsProps {
    historyStr: string;
    serializationStr: string;
}

export default function InteractiveModels(props: InteractiveModelsProps) {
    const history = generateHistoryFromString(props.historyStr);

    const serialization = generateFullSerializationFromString(
        history,
        props.serializationStr
    );

    const [serial, setSerial] =
        createSignal<SystemSerialization>(serialization);

    createEffect(() => {
        const diagrams = generateAsciiDiagrams(history, serial());
        console.log(`History:\n${diagrams.historyStr}`);
        console.log(`Serializations:\n${diagrams.systemSerializationStr}`);
    });

    return (
        <main>
            <Title>Consistency Models</Title>

            <Sidebar />

            <OperationsView
                type="History"
                history={history}
                operations={history}
            />

            <OperationsView
                type="Serializations"
                history={history}
                operations={serial()}
                onOperationsChanged={s => {
                    setSerial(s as SystemSerialization);
                }}
            />

            <ResultsTree history={history} systemSerialization={serial()} />
        </main>
    );
}
