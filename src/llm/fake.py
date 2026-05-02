import re
from typing import List, Dict, Any, Optional
from src.models import LLMResponse, SkillCall
from src.llm.base import BaseLLM


class FakeLLM(BaseLLM):
    configured: bool = True

    def __init__(self):
        pass

    def _extract_tool_result(self, messages: List[Dict[str, str]]) -> Optional[Dict[str, Any]]:
        for msg in reversed(messages):
            if msg.get("role") == "tool":
                return {
                    "tool_name": msg.get("name", ""),
                    "content": msg.get("content", ""),
                }
        return None

    def _extract_last_assistant_content(self, messages: List[Dict[str, str]]) -> Optional[str]:
        for msg in reversed(messages):
            if msg.get("role") == "assistant":
                return msg.get("content", "")
        return None

    def _is_math_query(self, text: str) -> bool:
        math_keywords = ["计算", "等于", "多少", "几", "算一下", "求解", "答案"]
        has_math_op = bool(re.search(r"[\d+\-*/()]", text))
        
        for kw in math_keywords:
            if kw in text:
                return True
        return has_math_op and len(text) < 100

    def _extract_math_expression(self, text: str) -> Optional[str]:
        patterns = [
            r"计算\s*[:：]?\s*([\d+\-*/().\s]+)",
            r"等于\s*[:：]?\s*([\d+\-*/().\s]+)",
            r"([\d]+\s*[+\-*/]\s*[\d()+\-*/.\s]+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                expr = match.group(1).strip()
                if expr:
                    return expr
        
        simple_match = re.search(r"([\d+\-*/().\s]+)", text)
        if simple_match:
            expr = simple_match.group(1).strip()
            if re.search(r"[+\-*/]", expr):
                return expr
        
        return None

    def _is_file_query(self, text: str) -> bool:
        file_keywords = ["读取", "读文件", "打开", "查看", "文件内容", "read", "file"]
        for kw in file_keywords:
            if kw in text:
                return True
        return False

    def _extract_filename(self, text: str) -> Optional[str]:
        patterns = [
            r"读取\s*[:：]?\s*([a-zA-Z0-9_\-./]+)",
            r"文件\s*[:：]?\s*([a-zA-Z0-9_\-./]+)",
            r"([a-zA-Z0-9_\-]+\.[a-zA-Z0-9]+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                filename = match.group(1).strip()
                if filename:
                    return filename
        return None

    def chat(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> LLMResponse:
        if not messages:
            return LLMResponse(
                thought="没有收到用户输入",
                final_answer="请提供一个有效的查询。",
            )

        user_query = ""
        for msg in messages:
            if msg.get("role") == "user":
                user_query = msg.get("content", "")
                break

        tool_result = self._extract_tool_result(messages)

        if tool_result:
            tool_name = tool_result["tool_name"]
            tool_content = tool_result["content"]

            if tool_name == "calculate":
                thought = f"计算技能执行完成。结果是：{tool_content}"
                return LLMResponse(
                    thought=thought,
                    final_answer=f"计算结果是：{tool_content}",
                )
            elif tool_name == "read_file":
                thought = "文件读取技能执行完成。"
                return LLMResponse(
                    thought=thought,
                    final_answer=f"文件读取结果：\n{tool_content}",
                )
            else:
                return LLMResponse(
                    thought=f"收到工具 {tool_name} 的执行结果",
                    final_answer=f"执行结果：{tool_content}",
                )

        if self._is_file_query(user_query):
            filename = self._extract_filename(user_query)
            if filename:
                thought = f"用户想要读取文件。从查询中识别出文件名：{filename}。我需要调用 read_file 技能来读取这个文件的内容。"
                return LLMResponse(
                    thought=thought,
                    skill_call=SkillCall(
                        name="read_file",
                        arguments={"filename": filename},
                    ),
                )
            else:
                return LLMResponse(
                    thought="用户提到了文件操作，但没有明确指定文件名。",
                    final_answer="请指定要读取的文件名。",
                )

        if self._is_math_query(user_query):
            expr = self._extract_math_expression(user_query)
            if expr:
                thought = f"用户想要计算数学表达式。从查询中识别出表达式：{expr}。我需要调用 calculate 技能来计算这个表达式。"
                return LLMResponse(
                    thought=thought,
                    skill_call=SkillCall(
                        name="calculate",
                        arguments={"expression": expr},
                    ),
                )
            else:
                return LLMResponse(
                    thought="用户提到了数学计算，但没有识别出明确的表达式。",
                    final_answer="请提供一个明确的数学表达式，例如 '3 + 4 * 2'。",
                )

        return LLMResponse(
            thought=f"收到用户查询：{user_query}。这是一个一般性问题，我可以直接回答。",
            final_answer=f"我收到了您的查询：\"{user_query}\"。这是一个简单的对话示例。如果您需要计算数学表达式或读取文件，请告诉我。",
        )


class UnconfiguredLLM(BaseLLM):
    configured: bool = False

    def chat(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> LLMResponse:
        raise RuntimeError("模型没配上")

    def is_configured(self) -> bool:
        return False
