import { Title } from "solid-start";
import OperationView from "~/components/operationsview/OperationView";
import OperationsView from "~/components/operationsview/OperationsView";
import { generateSerialization, generateHistoryFromString } from "~/backend/util";
import {ResultsTree} from "~/components/ResultsTree";

export default function Home() {
    const history = generateHistoryFromString(`
    ----[A:x<-  1]---------------------------------------
    ----------------[B:x->  1]---[C:x<-  2]---[D:x<-  3]-
    `);

    const abcd = generateSerialization(history, "A B C D");
    const serializ = { 0: abcd, 1: abcd };
    return (
        <main>
            <Title>Consistency Models</Title>

            <OperationsView
                title="History"
                operations={history}/>

            <OperationsView
                title="Serializations"
                operationsDraggable
                operations={serializ}/>

            <ResultsTree history={history} systemSerialization={serializ} />
        </main>
    );
}
