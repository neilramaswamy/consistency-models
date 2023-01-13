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
