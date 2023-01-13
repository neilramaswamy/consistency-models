# Design Doc

Data model:

-   Histories of operations
-   Operations have: read/write, value, start time, end time, process ID, opt. linearization point
-   Serializations are per-process, and there's one for the entire process set

Predicates:

All take in a history and system sequential specification and return a boolean.

A derived property is one that is composed purely of smaller, existing predicates:

-   ReadYourWrites
-   MonotonicWrites
-   MonotonicReads
-   WritesFollowReads

-   SingleOrder

-   PRAM (derived)
-   Causal (derived)

-   Sequential consistency (derived): Causal + SingleOrder (this might be wrong)

-   RealTime

-   Linearizability (derived)

# UI

Determined offline

# Questions

-   In Read-your-writes, do you need to read one of the values that YOU wrote in your serialization,
    or can it be any value that was written (in your serialization)?

# Observations

-   A very confusing point in the literature is that we often say that all _processes_ needs to observe
    this or that. But that's not _quite_ right, I think. In a distributed environment on multiple nodes,
    it's possible for individual replicas to permanently diverge, or not observe "this or that" ever. However,
    if the system always appears to satisfy some consistency model for _clients_, due to coordinated reads
    like quorum reads, does the system still satisfy the consistency model? This question makes me wonder
    whether we really mean to use the word "processes" and "nodes" in our formal definitions. It's not
    the nodes that need to serialize in a certain way—it's simply that the clients need to perceive
    a certain type of serialization.
