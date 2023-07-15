import { Title } from "solid-start";
import OperationView from "~/components/operationsview/OperationView";
import OperationsView from "~/components/operationsview/OperationsView";
import {
    generateSerialization,
    generateHistoryFromString,
} from "~/backend/util";
import { ResultsTree } from "~/components/ResultsTree";
import { createEffect, createSignal } from "solid-js";
import { SystemSerialization } from "~/backend/types";

export default function Home() {
    const history = generateHistoryFromString(`
    ----[A:x<-1]---------------------------------
    --------------[B:x->1]---[C:x<-2]---[D:x<-3]-
    `);

    const cda = generateSerialization(history, "C D A");
    const cdab = generateSerialization(history, "C D A B");

    console.log(cdab);

    const [serial, setSerial] = createSignal<SystemSerialization>({
        0: cda,
        1: cdab,
    });

    return (
        <main>
            <Title>Consistency Models</Title>

            <OperationsView title="History" operations={history} />

            <OperationsView
                title="Serializations"
                operationsDraggable
                operations={serial()}
                onOperationsChanged={s => setSerial(s as SystemSerialization)}
            />

            <ResultsTree history={history} systemSerialization={serial()} />
        </main>
    );
}
