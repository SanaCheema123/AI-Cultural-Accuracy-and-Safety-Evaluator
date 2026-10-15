# ML package

This directory is intentionally provider-agnostic. Production model implementations should satisfy the contracts in `backend/app/ai/interfaces.py` and can be prototyped here before being promoted into API/worker adapters.

Pipelines keep semantic similarity, cultural assessment, safety, and potential bias indicators separate. Cultural output must include uncertainty and support expert correction.
