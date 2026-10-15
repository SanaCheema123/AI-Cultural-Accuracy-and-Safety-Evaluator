"""Worker-side orchestration contract.

The production queue can call these stages and post progress/results back to the API.
"""
PIPELINE_STAGES = (
    "validate_request", "detect_language", "process_arabic_prompt", "preprocess_image",
    "generate_embeddings", "calculate_similarity", "analyze_cultural_context",
    "run_safety_classification", "detect_bias_indicators", "aggregate_results",
    "recommend_review", "persist", "generate_report",
)
