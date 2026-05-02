from typing import List, Union, Tuple, Optional
from src.models import SkillResult
from src.skills.base import BaseSkill, register_skill


Token = Union[float, str]


def _tokenize(expr: str) -> Tuple[bool, List[Token], str]:
    tokens: List[Token] = []
    i = 0
    n = len(expr)
    
    while i < n:
        c = expr[i]
        
        if c.isspace():
            i += 1
            continue
        
        if c.isdigit() or c == ".":
            j = i
            has_dot = False
            while j < n and (expr[j].isdigit() or expr[j] == "."):
                if expr[j] == ".":
                    if has_dot:
                        return False, [], f"无效数字：多个小数点在位置 {j}"
                    has_dot = True
                j += 1
            num_str = expr[i:j]
            if num_str == "." or num_str == "":
                return False, [], f"无效数字在位置 {i}"
            try:
                num = float(num_str)
                tokens.append(num)
            except ValueError:
                return False, [], f"无效数字：{num_str}"
            i = j
            continue
        
        if c in "+-*/()":
            tokens.append(c)
            i += 1
            continue
        
        return False, [], f"不支持的字符 '{c}' 在位置 {i}"
    
    return True, tokens, ""


def _check_parentheses_depth(tokens: List[Token]) -> Tuple[bool, str]:
    depth = 0
    max_depth = 0
    for token in tokens:
        if token == "(":
            depth += 1
            max_depth = max(max_depth, depth)
        elif token == ")":
            depth -= 1
        if depth < 0:
            return False, "括号不匹配：右括号多于左括号"
    if depth != 0:
        return False, "括号不匹配：左括号多于右括号"
    if max_depth > 1:
        return False, f"只支持最多一层括号，当前嵌套深度为 {max_depth}"
    return True, ""


def _apply_op(a: float, op: str, b: float) -> Tuple[bool, float, str]:
    if op == "+":
        return True, a + b, ""
    elif op == "-":
        return True, a - b, ""
    elif op == "*":
        return True, a * b, ""
    elif op == "/":
        if b == 0:
            return False, 0.0, "除数不能为零"
        return True, a / b, ""
    return False, 0.0, f"未知运算符: {op}"


def _evaluate_no_parens(tokens: List[Token]) -> Tuple[bool, float, str]:
    if not tokens:
        return False, 0.0, "空表达式"
    
    values: List[float] = []
    ops: List[str] = []
    
    i = 0
    n = len(tokens)
    
    if tokens[0] == "-":
        if i + 1 >= n or not isinstance(tokens[i + 1], float):
            return False, 0.0, "负号后缺少数字"
        values.append(-float(tokens[i + 1]))
        i += 2
    elif isinstance(tokens[0], float):
        values.append(float(tokens[0]))
        i += 1
    else:
        return False, 0.0, f"表达式不能以 {tokens[0]} 开头"
    
    while i < n:
        op = tokens[i]
        if op not in "+-*/":
            return False, 0.0, f"期望运算符，得到 {op}"
        i += 1
        
        if i >= n:
            return False, 0.0, "运算符后缺少操作数"
        
        if isinstance(tokens[i], float):
            val = float(tokens[i])
            i += 1
        else:
            return False, 0.0, f"期望数字，得到 {tokens[i]}"
        
        if op in "*/":
            if not values:
                return False, 0.0, "表达式格式错误"
            a = values.pop()
            ok, res, err = _apply_op(a, op, val)
            if not ok:
                return False, 0.0, err
            values.append(res)
        else:
            values.append(val)
            ops.append(op)
    
    if not values:
        return False, 0.0, "表达式格式错误"
    
    result = values[0]
    for i in range(len(ops)):
        op = ops[i]
        val = values[i + 1]
        ok, result, err = _apply_op(result, op, val)
        if not ok:
            return False, 0.0, err
    
    return True, result, ""


def _evaluate_tokens(tokens: List[Token]) -> Tuple[bool, float, str]:
    if "(" not in tokens:
        return _evaluate_no_parens(tokens)
    
    start = -1
    for i, token in enumerate(tokens):
        if token == "(":
            start = i
        elif token == ")" and start != -1:
            inner_tokens = tokens[start + 1:i]
            ok, inner_result, err = _evaluate_no_parens(inner_tokens)
            if not ok:
                return False, 0.0, err
            new_tokens = tokens[:start] + [inner_result] + tokens[i + 1:]
            return _evaluate_tokens(new_tokens)
    
    return False, 0.0, "括号处理失败"


def calculate(expression: str) -> Tuple[bool, float, str]:
    ok, tokens, err = _tokenize(expression)
    if not ok:
        return False, 0.0, err
    
    ok, err = _check_parentheses_depth(tokens)
    if not ok:
        return False, 0.0, err
    
    return _evaluate_tokens(tokens)


@register_skill
class CalculatorSkill(BaseSkill):
    name = "calculate"
    description = "计算加减乘除表达式，支持最多一层括号。不使用 eval，手动解析计算。"
    parameters = {
        "expression": {
            "type": "string",
            "description": "要计算的数学表达式，例如 '3 + 4 * 2' 或 '(10 - 4) / 3'",
            "required": True,
        }
    }

    def execute(self, expression: str) -> SkillResult:
        if not expression or not isinstance(expression, str):
            return SkillResult(
                success=False,
                output="",
                error_message="表达式不能为空",
            )
        
        ok, result, err = calculate(expression)
        
        if not ok:
            return SkillResult(
                success=False,
                output="",
                error_message=f"计算失败：{err}",
            )
        
        if result == int(result):
            output = str(int(result))
        else:
            output = str(result)
        
        return SkillResult(
            success=True,
            output=output,
            error_message=None,
        )
