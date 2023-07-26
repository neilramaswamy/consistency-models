// The tutorial screen/animatable area will have three pieces:
// history, serialization, text content

import {
    History,
    Operation,
    Serialization,
    SystemSerialization,
} from "~/backend/types";

// Location is a 4-tuple that contains enough information to position an Operation.
type Location = {
    source: "history" | "serialization";
    clientIndex: number;

    start: number;
    end: number;
};

// Interpolation specifies how an operation should visually change across its animation.
enum Interpolation {
    Slide = 1,
    FadeIn,
    FadeOut,
}

// ChainingMode specifies how an animation "chains" to the previous animation: it works exactly
// the same as Google Slides.
enum ChainingMode {
    OnClick = 1,
    WithPrevious,
    AfterPrevious,
}

type TextContent = {
    title: string;
    content: string;
};

type BaseTransition = {
    chainingMode: ChainingMode;

    // If undefined, the text from the previous transition should be kept in place.
    textContent?: TextContent;
};

// BaseOperationTransition holds the properties needed to animate a single Operation, whether it's
// part of a History or a Serialization.
interface BaseOperationTransition extends BaseTransition {
    startLocation?: Location;
    endLocation?: Location;

    interpolation: Interpolation;
}

// BaseSliderTransition holds the properties needed to animate an entire History slider set or
// Serialization slider set.
interface BaseSliderTransition extends BaseTransition {}

interface HistoryOperationTransition extends BaseOperationTransition {
    historyOperationSelector: (history: History) => Operation;
}

interface SerializationOperationTransition extends BaseOperationTransition {
    serializationOperationSelector: (
        serialization: SystemSerialization
    ) => Operation;
}

interface HistorySliderTransition extends BaseSliderTransition {
    newHistory: History;
}

interface SerializationSliderTransition extends BaseSliderTransition {
    newSerialization: Serialization;
}

interface MultipleChoiceQuizTransition extends BaseTransition {
    // These options will be rendered below the textContent from the BaseTransition
    options: string[];
    // The correct answer, as an index into options
    correctIndex: number;

    grader: (chosenIndex: number) => QuizResults;
}

interface SlidingQuizTransition extends BaseTransition {
    // NOTE: The quiz content will be shown via textContent in BaseTransition

    grader: (systemSerialization: SystemSerialization) => QuizResults;
}

interface QuizResults {
    passed: boolean;
    hint: string;
}
