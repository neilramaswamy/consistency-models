import { Route, useNavigate } from "solid-start";

// This is a hack so that we don't use index.tsx.
// The issue with index.tsx is that the empty route, "", is a substring of "example2".
// This means that it shows up as an active page when on the example2/3 page.
export default function Home() {
    const nav = useNavigate();

    nav("./example1");
    return <></>;
}
