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
    ----[A:x<-   1]------------------------------[D:x<-    2]-----
    ------------------[B:x->   1]---[C:x<-    3]------------------
    `);

    const acd = generateSerialization(history, "A D C");
    const abcd = generateSerialization(history, "A B D C");

    const [serial, setSerial] = createSignal<SystemSerialization>({
        0: acd,
        1: abcd,
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
