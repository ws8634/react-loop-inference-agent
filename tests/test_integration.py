import os
import sys
import subprocess
import tempfile
import pytest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUN_PY = os.path.join(PROJECT_ROOT, "run.py")


class TestMainEntryIntegration:
    def run_subprocess(self, args, env=None, input_str=None):
        cmd = [sys.executable, RUN_PY] + args
        result = subprocess.run(
            cmd,
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            input=input_str,
            env=env or os.environ.copy(),
        )
        return result

    def test_simple_query_success_exit_code_0(self):
        result = self.run_subprocess(["你好"])
        assert result.returncode == 0
        assert "思考中" in result.stdout
        assert "结论" in result.stdout

    def test_math_query_executes_skill(self):
        result = self.run_subprocess(["计算 3 + 4 * 2"])
        assert result.returncode == 0
        assert "思考中" in result.stdout
        assert "选择技能" in result.stdout
        assert "calculate" in result.stdout
        assert "执行技能" in result.stdout
        assert "11" in result.stdout
        assert "结论" in result.stdout

    def test_file_query_denied_path(self):
        result = self.run_subprocess(["读取 ../secret.txt"])
        assert result.returncode == 0
        assert "选择技能" in result.stdout
        assert "read_file" in result.stdout
        assert "执行技能" in result.stdout
        assert "拒绝" in result.stdout or "拒绝" in result.stdout

    def test_no_model_flag_exit_code_2(self):
        result = self.run_subprocess(["--no-model", "你好"])
        assert result.returncode == 2
        assert "模型没配上" in result.stdout

    def test_max_iterations_flag(self):
        result = self.run_subprocess(["--max-iterations", "2", "你好"])
        assert result.returncode == 0

    def test_empty_query_via_stdin(self):
        result = self.run_subprocess([], input_str="")
        assert result.returncode == 3

    def test_query_via_stdin(self):
        result = self.run_subprocess([], input_str="计算 10 / 2")
        assert result.returncode == 0
        assert "5" in result.stdout

    def test_phases_are_distinct_in_output(self):
        result = self.run_subprocess(["计算 1 + 1"])
        stdout = result.stdout
        
        assert "[思考中]" in stdout
        assert "[选择技能]" in stdout
        assert "[执行技能]" in stdout
        assert "[观察结果]" in stdout
        assert "[结论]" in stdout

    def test_help_message(self):
        result = self.run_subprocess(["--help"])
        assert result.returncode == 0
        assert "思考循环代理" in result.stdout
        assert "max-iterations" in result.stdout

    def test_exit_code_model_not_configured(self):
        result = self.run_subprocess(["--no-model", "test"])
        assert result.returncode == 2

    def test_simple_query_normal_exit(self):
        result = self.run_subprocess(["这是一个简单对话"])
        assert result.returncode == 0


class TestLoopLogic(TestMainEntryIntegration):
    def test_phase_output_contains_iteration_number(self):
        result = self.run_subprocess(["计算 5 * 5"])
        stdout = result.stdout
        
        lines = stdout.split("\n")
        for line in lines:
            if "[思考中]" in line:
                assert "第" in line and "轮" in line
                break

    def test_skill_result_shown_in_execute_phase(self):
        result = self.run_subprocess(["计算 8 / 2"])
        stdout = result.stdout
        
        assert "执行状态: 成功" in stdout
        assert "4" in stdout
