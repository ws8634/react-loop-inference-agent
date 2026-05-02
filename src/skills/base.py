from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Type
from src.models import SkillResult


class BaseSkill(ABC):
    name: str
    description: str
    parameters: Dict[str, Dict[str, Any]]

    @abstractmethod
    def execute(self, **kwargs) -> SkillResult:
        pass

    @classmethod
    def get_signature(cls) -> Dict[str, Any]:
        return {
            "name": cls.name,
            "description": cls.description,
            "parameters": cls.parameters,
        }


class SkillRegistry:
    _skills: Dict[str, Type[BaseSkill]] = {}

    @classmethod
    def register(cls, skill_class: Type[BaseSkill]) -> None:
        cls._skills[skill_class.name] = skill_class

    @classmethod
    def get(cls, name: str) -> Optional[Type[BaseSkill]]:
        return cls._skills.get(name)

    @classmethod
    def list_all(cls) -> List[Type[BaseSkill]]:
        return list(cls._skills.values())

    @classmethod
    def list_names(cls) -> List[str]:
        return list(cls._skills.keys())

    @classmethod
    def get_all_signatures(cls) -> List[Dict[str, Any]]:
        return [skill.get_signature() for skill in cls._skills.values()]


def register_skill(skill_class: Type[BaseSkill]) -> Type[BaseSkill]:
    SkillRegistry.register(skill_class)
    return skill_class
