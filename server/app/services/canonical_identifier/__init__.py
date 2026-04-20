"""Canonical ingredient identifier pipeline."""

from app.services.canonical_identifier.pipeline import PipelineResult, identify_receipt

__all__ = ["identify_receipt", "PipelineResult"]
