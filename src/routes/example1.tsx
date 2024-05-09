import InteractiveModels from "~/components/pages/InteractiveModels";

const history1 = `
----[A:x<- 1]----------------------------------------------------------------
----------------[B:x-> 1]-----------[C:x<- 2]-----------[D:x<- 3]------------
`;

const serialization1 = `
----[A:x<- 1]-----------------------[C:x<- 2]-----------[D:x<- 3]------------
----[A:x<- 1]---[B:x-> 1]-----------[C:x<- 2]-----------[D:x<- 3]------------
`;

export default function Example1() {
    return (
        <InteractiveModels
            historyStr={history1}
            serializationStr={serialization1}
        />
    );
}
