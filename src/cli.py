import sys
import os
import argparse
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.models import ExitCode
from src.llm import BaseLLM, FakeLLM, UnconfiguredLLM
from src.loop import run_loop


_LLM_INSTANCE: Optional[BaseLLM] = None


def get_llm() -> BaseLLM:
    global _LLM_INSTANCE
    if _LLM_INSTANCE is None:
        _LLM_INSTANCE = FakeLLM()
    return _LLM_INSTANCE


def set_llm(llm: BaseLLM) -> None:
    global _LLM_INSTANCE
    _LLM_INSTANCE = llm


def main() -> int:
    parser = argparse.ArgumentParser(
        description="思考循环代理 - 根据用户输入自动调用技能完成任务",
    )
    parser.add_argument(
        "query",
        nargs="?",
        help="用户查询内容（如未提供，将从标准输入读取）",
    )
    parser.add_argument(
        "--max-iterations",
        "-m",
        type=int,
        default=10,
        help="最大迭代轮次（默认：10）",
    )
    parser.add_argument(
        "--no-model",
        action="store_true",
        help="模拟模型未配置的情况（用于测试）",
    )

    args = parser.parse_args()

    if args.no_model:
        set_llm(UnconfiguredLLM())

    if args.query is None:
        if sys.stdin.isatty():
            parser.print_help()
            return ExitCode.ERROR.value
        query = sys.stdin.read().strip()
        if not query:
            print("错误：未提供查询内容", file=sys.stderr)
            return ExitCode.ERROR.value
    else:
        query = args.query

    llm = get_llm()
    max_iterations = args.max_iterations

    print(f"用户查询: {query}")
    print(f"最大轮次: {max_iterations}")

    state = run_loop(
        user_query=query,
        llm=llm,
        max_iterations=max_iterations,
    )

    return state.exit_code.value


if __name__ == "__main__":
    sys.exit(main())
