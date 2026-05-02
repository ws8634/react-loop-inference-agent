from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from enum import Enum


class ExitCode(Enum):
    SUCCESS = 0
    MAX_ITERATIONS_REACHED = 1
    MODEL_NOT_CONFIGURED = 2
    ERROR = 3


class Phase(Enum):
    THINK = "THINK"
    SELECT = "SELECT"
    EXECUTE = "EXECUTE"
    OBSERVE = "OBSERVE"
    CONCLUDE = "CONCLUDE"


@dataclass
class SkillCall:
    name: str
    arguments: Dict[str, Any]


@dataclass
class LLMResponse:
    thought: str
    skill_call: Optional[SkillCall] = None
    final_answer: Optional[str] = None


@dataclass
class SkillResult:
    success: bool
    output: str
    error_message: Optional[str] = None


@dataclass
class LoopIteration:
    iteration: int
    phase: Phase
    content: str
    skill_name: Optional[str] = None
    skill_args: Optional[Dict[str, Any]] = None
    skill_result: Optional[SkillResult] = None


@dataclass
class LoopState:
    user_query: str
    max_iterations: int
    current_iteration: int = 0
    iterations: List[LoopIteration] = field(default_factory=list)
    final_answer: Optional[str] = None
    exit_code: ExitCode = ExitCode.SUCCESS
    model_configured: bool = True
