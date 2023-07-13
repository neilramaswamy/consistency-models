# Interactive Consistency Models

## Demo

> Disclaimer: this project is not yet production ready. Please avoid sharing it broadly, since there are still bugs and pedagogical shortcomings in the website that might confuse more than clarify.

You can watch a video of how to use the website [here](https://www.loom.com/share/35d39938cac5467f8989c9a9f4ffaee7?sid=0b4e24da-e962-4904-a3a3-0c7af8dacf31).

## Some Pedagogy

This project aims to bring intuition to formal consistency models by making them visual and interactive. Through personal experience, I have found that consistency models are hard to teach\* for the following reasons:

1. Most individuals new to distributed computing aren't familiar with reasoning about arbitrary interleavings of events (consistency models really are just about specifying what subset of event interleavings are acceptable).
2. Different models have exceptionally subtle differences, which leads learners to questions of the form: "so... how is model X any different from model Y?" and "why does this serialization satisfy model M but not model N"?
3. There are a lot of consistency models, and most of their names don't do a great job of remininding you what they really mean.

I think that the following ideas may help with these issues:

1. Letting people drag around events (within serializations) in their browser invites users into the world of arbitrarily complicated event interleavings, but allows them to explore interleavings at their own pace. An automated consistency-model checker can determine (and explain!) which models are satisfied.
2. We plan on creating a consistency model matrix, where element `[i, j]` satisfies model `i` but not does not satisfy some model `j`. Such a matrix would help answer questions of the form "how does M differ from N?", and I believe this type of matrix would be novel.
3. When consistency models are presented linearly (i.e. "weak" to "strong"), they can be hard to keep track of. But when models are thought of as a tree, it's possible to build up what some model guarantees by considering the guarantees of its children.

Additionally, to help understand what models are the most confusing (and perhaps why), we'll have quizzes as we walk through various consistency models. With user consent, we'll collect (anonymized) results, which we can later use to improve our work. The quizzes will likely be of the form:

-   Using history H, create a serialization that satisfies this model M
-   Using history H, create a serialization that satisfies M but not N

## Current Work

-   Provide a guided tour through all the consistency models, so that we explain the idea of histories and serializations
-   Create a "model M but not model N" matrix of consistency models for quick reference
-   Add the ability for the consistency-model checker to explain why something satisfies/fails to satisfy a particular model
-   Hook up our unit tests to GitHub actions
