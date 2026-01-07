"""Custom exceptions for PCG Level Blockout."""

class PCGError(Exception):
    """Base class for all PCG errors."""
    pass

class InvalidSplineError(PCGError):
    """Raised when the spline is invalid or cannot be sampled."""
    pass

class GenerationError(PCGError):
    """Raised when generation fails."""
    pass

class ParameterError(PCGError):
    """Raised when parameters are invalid."""
    pass
