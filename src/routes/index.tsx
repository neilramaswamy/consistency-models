import { Title } from "solid-start";
import "solid-devtools";
import OperationView from "~/components/operationsview/OperationView";
import OperationsView from "~/components/operationsview/OperationsView";
import {
    generateHistoryFromString,
    generateFullSerializationFromString,
} from "~/backend/util";
import { ResultsTree } from "~/components/ResultsTree";
import { createEffect, createSignal } from "solid-js";
import { SystemSerialization } from "~/backend/types";

export default function Home() {
    const history = generateHistoryFromString(`
    ----[A:x<-  1]-----------------------------------------------------------
    ---------------------[B:x->  1]---------[C:x<-  2]----------[D:x<-  3]---
    `);

    const serialization = generateFullSerializationFromString(
        history,
        `
    ----[A:x<-  1]----------------------------[C:x<-  2]----------[D:x<-  3]-
    ----[A:x<-  1]-------[B:x->  1]---------[C:x<-  2]----------[D:x<-  3]---
    `
    );

    const [serial, setSerial] =
        createSignal<SystemSerialization>(serialization);

    return (
        <main>
            <Title>Consistency Models</Title>

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
