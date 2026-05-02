# 思考循环代理

一个简单的 ReAct-style 思考循环代理。输入一段话，程序自动判断是否需要调用内置技能，拿到结果再继续思考，一轮一轮地走。

---

## 从零跑通一整套

### 1. 装依赖

```bash
pip install -r requirements.txt
```

### 2. 跑主程序

```bash
python run.py "计算 3 + 4 * 2"
```

或者从标准输入读：

```bash
echo "计算 10 / 2" | python run.py
```

### 3. 可选参数

```bash
python run.py "你好" -m 5    # --max-iterations，最大轮次（默认 10）
python run.py "你好" --no-model  # 模拟模型未配置的情况（用于测试）
```

### 4. 跑测试

```bash
python -m pytest -v
```

安静模式全过：

```bash
python -m pytest -q
```

---

## 返回值说明

| 返回码 | 含义 |
|--------|------|
| 0      | 正常结束（任务完成或给出最终答案） |
| 1      | 达到最大轮次限制，任务未完成 |
| 2      | 模型没配上 |
| 3      | 其他错误（参数错误等） |

示例（检查返回码）：

```bash
python run.py "计算 1 + 1" ; echo "Exit code: $?"
```

---

## 以后接真实大模型改哪里

钩子在 `src/llm/base.py` 的 `BaseLLM` 类。

### 改动步骤

1. 新建 `src/llm/real_llm.py`，继承 `BaseLLM`

```python
from src.llm.base import BaseLLM
from src.models import LLMResponse, SkillCall
from typing import List, Dict, Any, Optional

class RealLLM(BaseLLM):
    configured: bool = True
    
    def __init__(self, api_key: str = None):
        # 这里初始化你的模型客户端
        self.api_key = api_key or os.getenv("YOUR_API_KEY")
        if not self.api_key:
            self.configured = False  # 没配好就标记为未配置
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> LLMResponse:
        # 这里调真实大模型的 API
        # messages 是 OpenAI 格式的对话历史
        # tools 是技能描述列表
        
        # 解析模型返回，构造 LLMResponse:
        # - 如果有 final_answer，直接返回
        # - 如果要调用技能，填 skill_call
        
        return LLMResponse(
            thought="模型的思考过程",
            skill_call=SkillCall(name="技能名", arguments={"参数": "值"}),
            # 或者 final_answer="最终答案"
        )
```

2. 在 `src/cli.py` 的 `get_llm()` 里替换默认模型：

```python
from src.llm.real_llm import RealLLM

def get_llm() -> BaseLLM:
    global _LLM_INSTANCE
    if _LLM_INSTANCE is None:
        _LLM_INSTANCE = RealLLM()  # 换这里
    return _LLM_INSTANCE
```

### 注意事项

- 如果 `is_configured()` 返回 `False`，或者 `chat()` 抛出 `"模型没配上"` 的 RuntimeError，程序会优雅退出，返回码为 2
- `tools` 参数格式参考 `SkillRegistry.get_all_signatures()` 的输出
- 控制台输出的格式化逻辑在 `src/loop.py` 的 `_default_console_output`，要改样式动这里

---

## 内置技能

### read_file - 读取文件

- 只允许读取当前允许目录（默认是当前目录或 `./data`）内的文件
- 路径校验：拒绝 `..` 跳转、绝对路径、非法字符
- 用 `set_allowed_directory(path)` 可以改允许的目录

### calculate - 计算器

- 支持加减乘除和最多一层括号
- 手动 tokenize + 解析，**不使用 eval**
- 正确处理运算符优先级（乘除先于加减）
- 除零会报错返回

---

## 控制台输出示例

```
用户查询: 计算 3 + 4 * 2
最大轮次: 10

============================================================
[思考中] (第 1 轮)
============================================================
用户想要计算数学表达式。从查询中识别出表达式：3 + 4 * 2。我需要调用 calculate 技能来计算这个表达式。

============================================================
[选择技能] (第 1 轮)
============================================================
技能: calculate
参数: {'expression': '3 + 4 * 2'}
思考内容: 用户想要计算数学表达式...

============================================================
[执行技能] (第 1 轮)
============================================================
执行状态: 成功
输出: 11

============================================================
[观察结果] (第 1 轮)
============================================================
技能执行结果：11

============================================================
[结论] (第 2 轮)
============================================================
计算结果是：11
```
