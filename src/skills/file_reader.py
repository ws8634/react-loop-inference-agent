import os
from typing import Dict, Any, Optional
from src.models import SkillResult
from src.skills.base import BaseSkill, register_skill


_ALLOWED_DIRECTORY: Optional[str] = None


def set_allowed_directory(path: str) -> None:
    global _ALLOWED_DIRECTORY
    _ALLOWED_DIRECTORY = os.path.abspath(path)


def get_allowed_directory() -> str:
    global _ALLOWED_DIRECTORY
    if _ALLOWED_DIRECTORY is None:
        cwd = os.getcwd()
        _ALLOWED_DIRECTORY = os.path.join(cwd, "data")
        if not os.path.exists(_ALLOWED_DIRECTORY):
            _ALLOWED_DIRECTORY = cwd
    return _ALLOWED_DIRECTORY


def _is_path_safe(filename: str) -> bool:
    if not filename or not isinstance(filename, str):
        return False
    
    if filename.startswith("/") or filename.startswith("\\"):
        return False
    
    if ".." in filename.split(os.sep) or ".." in filename.split("/"):
        return False
    
    if "\0" in filename:
        return False
    
    for bad_char in ["<", ">", ":", "\"", "|", "?", "*"]:
        if bad_char in filename:
            return False
    
    allowed_dir = get_allowed_directory()
    try:
        target_path = os.path.abspath(os.path.join(allowed_dir, filename))
    except (OSError, ValueError):
        return False
    
    real_allowed = os.path.realpath(allowed_dir)
    real_target = os.path.realpath(target_path)
    
    common = os.path.commonpath([real_allowed, real_target])
    return common == real_allowed


@register_skill
class FileReadSkill(BaseSkill):
    name = "read_file"
    description = "从允许的目录读取指定文件的内容。文件名不能包含路径跳转符号。"
    parameters = {
        "filename": {
            "type": "string",
            "description": "要读取的文件名，只能是当前允许目录下的文件名，不能包含 .. 或绝对路径",
            "required": True,
        }
    }

    def execute(self, filename: str) -> SkillResult:
        if not _is_path_safe(filename):
            return SkillResult(
                success=False,
                output="",
                error_message="路径被拒绝：文件名包含非法字符或路径跳转。只能使用当前允许目录下的普通文件名。",
            )
        
        allowed_dir = get_allowed_directory()
        target_path = os.path.abspath(os.path.join(allowed_dir, filename))
        
        if not os.path.exists(target_path):
            return SkillResult(
                success=False,
                output="",
                error_message=f"文件不存在：{filename}",
            )
        
        if not os.path.isfile(target_path):
            return SkillResult(
                success=False,
                output="",
                error_message=f"路径不是文件：{filename}",
            )
        
        try:
            with open(target_path, "r", encoding="utf-8") as f:
                content = f.read()
            return SkillResult(
                success=True,
                output=content,
                error_message=None,
            )
        except UnicodeDecodeError:
            return SkillResult(
                success=False,
                output="",
                error_message="文件不是 UTF-8 文本文件，无法读取。",
            )
        except IOError as e:
            return SkillResult(
                success=False,
                output="",
                error_message=f"读取文件时出错：{str(e)}",
            )
