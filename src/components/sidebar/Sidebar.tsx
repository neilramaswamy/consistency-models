import { A } from "@solidjs/router";
import "./Sidebar.css";

const pages = [
    {
        title: "Example 1",
        href: "/example1",
    },
    {
        title: "Example 2",
        href: "/example2",
    },
];

export default function Sidebar() {
    return (
        <div>
            {pages.map(page => (
                <A class={"link"} href={page.href}>
                    <span>{page.title}</span>
                </A>
            ))}
        </div>
    );
}
