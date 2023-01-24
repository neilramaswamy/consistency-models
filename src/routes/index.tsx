import { Title } from "solid-start";
import OperationView from "~/components/operationsview/OperationView";
import OperationsView from "~/components/operationsview/OperationsView";
import { generateSerialization, generateHistoryFromString } from "~/backend/util";
import {ResultsTree} from "~/components/ResultsTree";
import {createSignal} from "solid-js";
import { SystemSerialization } from "~/backend/types";

export default function Home() {
    const history = generateHistoryFromString(`
    ----[A:x<-  1]---------------------------------------
    ----------------[B:x->  1]---[C:x<-  2]---[D:x<-  3]-
    `);

    const abcd1 = generateSerialization(history, "A B C D");
    const abcd2 = generateSerialization(history, "A B C D");

    const [serial, setSerial] = createSignal<SystemSerialization>({ 0: abcd1, 1: abcd2 });

    return (
        <main>
            <Title>Consistency Models</Title>

            <OperationsView
                title="History"
                operations={history}/>

            <OperationsView
                title="Serializations"
                operationsDraggable
                operations={serial()}
                onOperationsChanged={s => setSerial(s as SystemSerialization)}/>

            <ResultsTree history={history} systemSerialization={serial()} />
        </main>
    );
}
