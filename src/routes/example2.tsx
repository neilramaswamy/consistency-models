import InteractiveModels from "~/components/pages/InteractiveModels";

const history1 = `
----[A:x<- 1]-----[B:x<- 2]----------------------------------------
--------------------------------[C:x-> 2]-----------------[D:x-> 1]
`;

const serialization1 = `
----[A:x<- 1]-----[B:x<- 2]------------------------------------------
------[A:x<- 1]------[B:x<- 2]----[C:x-> 2]-----------------[D:x-> 1]
`;

export default function Example2() {
    return (
        <InteractiveModels
            historyStr={history1}
            serializationStr={serialization1}
        />
    );
}
