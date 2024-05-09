import { createEffect } from "solid-js";
import { ExplanationFragment } from "~/backend/explanation";

interface ExplanationProps {
    fragments: ExplanationFragment[];
}

const listToEnglish = (name: string, items: string[]): string => {
    if (items.length === 0) {
        return "";
    } else if (items.length === 1) {
        return `${name} ${items[0]}`;
    } else if (items.length === 2) {
        return `${name} ${items[0]} and ${items[1]}`;
    } else {
        return `${name} ${items.slice(0, items.length - 1).join(", ")}, and ${
            items[items.length - 1]
        }`;
    }
};

const fragmentsToMarkup = (fragments: ExplanationFragment[]) => {
    return fragments.map(fragment => {
        if (fragment.type === "string") {
            return <span>{fragment.content}</span>;
        } else if (fragment.type === "client") {
            return <span>{`Client ${fragment.clientId}`}</span>;
        } else if (fragment.type === "operation") {
            return (
                <span>{`Operation ${fragment.operation.operationName}`}</span>
            );
        } else if (fragment.type === "list") {
            return (
                <ul>
                    {fragment.children.map((item, i) => (
                        <li>{fragmentsToMarkup(item)}</li>
                    ))}
                </ul>
            );
        } else if (fragment.type === "operations") {
            // In the future, this won't be so easy, since we'll need to make Operations their
            // own component so that when they're hovered over, we can highlight them in the
            // history/serialization.
            return (
                <span>
                    {listToEnglish(
                        "Operation",
                        fragment.operations.map(o => o.operationName)
                    )}
                </span>
            );
        } else if (fragment.type === "clients") {
            return (
                <span>
                    {listToEnglish(
                        "Client",
                        fragment.clientIds.map(id => id.toString())
                    )}
                </span>
            );
        }
    });
};

export function Explanation(props: ExplanationProps) {
    return <div class="explanation">{fragmentsToMarkup(props.fragments)}</div>;
}
