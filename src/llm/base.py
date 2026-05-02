from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from src.models import LLMResponse, SkillCall


class BaseLLM(ABC):
    configured: bool = True

    @abstractmethod
    def chat(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> LLMResponse:
        pass

    def is_configured(self) -> bool:
        return self.configured
