import pytest
from typing import List, Dict, Any, Optional
from src.models import LLMResponse, SkillCall, ExitCode, LoopState, Phase
from src.llm.base import BaseLLM
from src.loop import ThinkingLoop, run_loop


class NeverEndingLLM(BaseLLM):
    configured: bool = True
    call_count: int = 0

    def chat(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> LLMResponse:
        self.call_count += 1
        return LLMResponse(
            thought=f"第 {self.call_count} 次思考。我需要再调用一下计算器...",
            skill_call=SkillCall(
                name="calculate",
                arguments={"expression": "1 + 1"},
            ),
        )


class TestMaxIterations:
    def test_loop_stops_at_max_iterations(self):
        llm = NeverEndingLLM()
        max_iter = 3
        
        collected_iterations = []
        def capture_output(iteration):
            collected_iterations.append(iteration)
        
        loop = ThinkingLoop(
            llm=llm,
            max_iterations=max_iter,
            console_output_fn=capture_output,
        )
        
        state = loop.run("随便什么问题")
        
        assert state.exit_code == ExitCode.MAX_ITERATIONS_REACHED
        assert state.current_iteration == max_iter
        assert "最大轮次限制" in state.iterations[-1].content

    def test_run_loop_max_iterations_return_code_1(self):
        llm = NeverEndingLLM()
        
        state = run_loop(
            user_query="测试",
            llm=llm,
            max_iterations=2,
            console_output_fn=lambda x: None,
        )
        
        assert state.exit_code.value == 1

    def test_normal_loop_exits_with_code_0(self):
        from src.llm.fake import FakeLLM
        llm = FakeLLM()
        
        state = run_loop(
            user_query="你好",
            llm=llm,
            max_iterations=10,
            console_output_fn=lambda x: None,
        )
        
        assert state.exit_code.value == 0

    def test_phases_recorded_correctly(self):
        from src.llm.fake import FakeLLM
        llm = FakeLLM()
        
        collected = []
        state = run_loop(
            user_query="计算 3 + 5",
            llm=llm,
            max_iterations=10,
            console_output_fn=lambda x: collected.append(x),
        )
        
        phases = [it.phase for it in collected]
        
        assert Phase.THINK in phases
        assert Phase.SELECT in phases
        assert Phase.EXECUTE in phases
        assert Phase.OBSERVE in phases
        assert Phase.CONCLUDE in phases

    def test_unconfigured_llm_exits_early(self):
        from src.llm.fake import UnconfiguredLLM
        llm = UnconfiguredLLM()
        
        state = run_loop(
            user_query="你好",
            llm=llm,
            max_iterations=10,
            console_output_fn=lambda x: None,
        )
        
        assert state.exit_code == ExitCode.MODEL_NOT_CONFIGURED
        assert state.exit_code.value == 2
        assert state.current_iteration == 1
