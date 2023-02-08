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
    ----[A:x<-   1]-[B:x<-   2]-------------------------------
    -----------------------------[C:x->   1]---[D:x->   2]----
    `);

    const ab = generateSerialization(history, "A B");
    const abcd = generateSerialization(history, "A B C D");

    const [serial, setSerial] = createSignal<SystemSerialization>({
        0: ab,
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
