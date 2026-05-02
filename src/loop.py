import sys
from typing import List, Dict, Any, Optional, Callable
from src.models import (
    ExitCode,
    Phase,
    LoopState,
    LoopIteration,
    LLMResponse,
    SkillResult,
    SkillCall,
)
from src.skills import SkillRegistry
from src.llm import BaseLLM


ConsoleOutputFn = Callable[[LoopIteration], None]


def _default_console_output(iteration: LoopIteration) -> None:
    phase_headers = {
        Phase.THINK: "[思考中]",
        Phase.SELECT: "[选择技能]",
        Phase.EXECUTE: "[执行技能]",
        Phase.OBSERVE: "[观察结果]",
        Phase.CONCLUDE: "[结论]",
    }
    
    header = phase_headers.get(iteration.phase, f"[{iteration.phase.value}]")
    print(f"\n{'='*60}")
    print(f"{header} (第 {iteration.iteration} 轮)")
    print(f"{'='*60}")
    
    if iteration.phase == Phase.SELECT and iteration.skill_name:
        print(f"技能: {iteration.skill_name}")
        if iteration.skill_args:
            print(f"参数: {iteration.skill_args}")
        print(f"思考内容: {iteration.content}")
    
    elif iteration.phase == Phase.EXECUTE and iteration.skill_result:
        if iteration.skill_result.success:
            print(f"执行状态: 成功")
            print(f"输出: {iteration.skill_result.output}")
        else:
            print(f"执行状态: 失败")
            print(f"错误: {iteration.skill_result.error_message}")
    
    else:
        print(iteration.content)


class ThinkingLoop:
    def __init__(
        self,
        llm: BaseLLM,
        max_iterations: int = 10,
        console_output_fn: Optional[ConsoleOutputFn] = None,
    ):
        self.llm = llm
        self.max_iterations = max_iterations
        self.console_output_fn = console_output_fn or _default_console_output
        self.messages: List[Dict[str, str]] = []
        self.tools = SkillRegistry.get_all_signatures()

    def _record_iteration(
        self,
        state: LoopState,
        phase: Phase,
        content: str,
        skill_name: Optional[str] = None,
        skill_args: Optional[Dict[str, Any]] = None,
        skill_result: Optional[SkillResult] = None,
    ) -> None:
        iteration = LoopIteration(
            iteration=state.current_iteration,
            phase=phase,
            content=content,
            skill_name=skill_name,
            skill_args=skill_args,
            skill_result=skill_result,
        )
        state.iterations.append(iteration)
        self.console_output_fn(iteration)

    def run(self, user_query: str) -> LoopState:
        state = LoopState(
            user_query=user_query,
            max_iterations=self.max_iterations,
        )

        if not self.llm.is_configured():
            state.exit_code = ExitCode.MODEL_NOT_CONFIGURED
            state.model_configured = False
            state.current_iteration = 1
            self._record_iteration(
                state,
                Phase.CONCLUDE,
                "模型没配上。请配置有效的模型后再试。",
            )
            return state

        self.messages = [
            {"role": "system", "content": "你是一个思考循环代理。根据用户的问题，决定是否需要调用工具来获取信息或执行操作。可用的工具包括：read_file（读取文件）和 calculate（计算数学表达式）。如果不需要工具，请直接给出最终答案。"},
            {"role": "user", "content": user_query},
        ]

        while state.current_iteration < self.max_iterations:
            state.current_iteration += 1

            try:
                llm_response = self.llm.chat(self.messages, tools=self.tools)
            except RuntimeError as e:
                if "模型没配上" in str(e):
                    state.exit_code = ExitCode.MODEL_NOT_CONFIGURED
                    state.model_configured = False
                    self._record_iteration(
                        state,
                        Phase.CONCLUDE,
                        "模型没配上。请配置有效的模型后再试。",
                    )
                    return state
                raise

            self._record_iteration(
                state,
                Phase.THINK,
                llm_response.thought,
            )

            if llm_response.final_answer is not None:
                state.final_answer = llm_response.final_answer
                state.exit_code = ExitCode.SUCCESS
                self._record_iteration(
                    state,
                    Phase.CONCLUDE,
                    llm_response.final_answer,
                )
                return state

            if llm_response.skill_call is None:
                state.final_answer = "无法处理该查询：模型既没有选择工具，也没有给出最终答案。"
                state.exit_code = ExitCode.SUCCESS
                self._record_iteration(
                    state,
                    Phase.CONCLUDE,
                    state.final_answer,
                )
                return state

            skill_call: SkillCall = llm_response.skill_call

            self._record_iteration(
                state,
                Phase.SELECT,
                llm_response.thought,
                skill_name=skill_call.name,
                skill_args=skill_call.arguments,
            )

            skill_class = SkillRegistry.get(skill_call.name)
            if skill_class is None:
                error_msg = f"未知的技能：{skill_call.name}"
                skill_result = SkillResult(
                    success=False,
                    output="",
                    error_message=error_msg,
                )
            else:
                skill = skill_class()
                try:
                    skill_result = skill.execute(**skill_call.arguments)
                except Exception as e:
                    skill_result = SkillResult(
                        success=False,
                        output="",
                        error_message=f"技能执行出错：{str(e)}",
                    )

            self._record_iteration(
                state,
                Phase.EXECUTE,
                f"执行技能：{skill_call.name}",
                skill_result=skill_result,
            )

            if skill_result.success:
                tool_content = skill_result.output
            else:
                tool_content = f"执行失败：{skill_result.error_message}"

            self._record_iteration(
                state,
                Phase.OBSERVE,
                f"技能执行结果：{tool_content}",
            )

            self.messages.append(
                {
                    "role": "assistant",
                    "content": llm_response.thought,
                }
            )
            self.messages.append(
                {
                    "role": "tool",
                    "name": skill_call.name,
                    "content": tool_content,
                }
            )

        state.exit_code = ExitCode.MAX_ITERATIONS_REACHED
        self._record_iteration(
            state,
            Phase.CONCLUDE,
            f"达到最大轮次限制（{self.max_iterations} 轮），任务未完成。",
        )
        return state


def run_loop(
    user_query: str,
    llm: BaseLLM,
    max_iterations: int = 10,
    console_output_fn: Optional[ConsoleOutputFn] = None,
) -> LoopState:
    loop = ThinkingLoop(
        llm=llm,
        max_iterations=max_iterations,
        console_output_fn=console_output_fn,
    )
    return loop.run(user_query)
