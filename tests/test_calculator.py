import pytest
from src.skills import CalculatorSkill, calculate


class TestCalculatorSkill:
    def test_basic_addition(self):
        ok, result, err = calculate("3 + 4")
        assert ok is True
        assert result == 7.0

    def test_basic_subtraction(self):
        ok, result, err = calculate("10 - 3")
        assert ok is True
        assert result == 7.0

    def test_basic_multiplication(self):
        ok, result, err = calculate("5 * 6")
        assert ok is True
        assert result == 30.0

    def test_basic_division(self):
        ok, result, err = calculate("15 / 3")
        assert ok is True
        assert result == 5.0

    def test_operator_precedence_multiplication_first(self):
        ok, result, err = calculate("3 + 4 * 2")
        assert ok is True
        assert result == 11.0

    def test_operator_precedence_division_first(self):
        ok, result, err = calculate("10 - 6 / 2")
        assert ok is True
        assert result == 7.0

    def test_left_associativity(self):
        ok, result, err = calculate("8 / 2 / 2")
        assert ok is True
        assert result == 2.0

    def test_single_parentheses(self):
        ok, result, err = calculate("(3 + 4) * 2")
        assert ok is True
        assert result == 14.0

    def test_parentheses_with_precedence(self):
        ok, result, err = calculate("10 - (6 + 2) / 2")
        assert ok is True
        assert result == 6.0

    def test_floating_point_numbers(self):
        ok, result, err = calculate("3.5 + 2.5")
        assert ok is True
        assert result == 6.0

    def test_negative_number_start(self):
        ok, result, err = calculate("-5 + 3")
        assert ok is True
        assert result == -2.0

    def test_complex_expression(self):
        ok, result, err = calculate("(100 - 20) / 5 + 3 * 4")
        assert ok is True
        assert result == 28.0

    def test_skill_execute_success(self):
        skill = CalculatorSkill()
        result = skill.execute(expression="3 + 4 * 2")
        assert result.success is True
        assert result.output == "11"

    def test_division_by_zero_error(self):
        ok, result, err = calculate("10 / 0")
        assert ok is False
        assert "除数不能为零" in err

    def test_skill_division_by_zero(self):
        skill = CalculatorSkill()
        result = skill.execute(expression="10 / 0")
        assert result.success is False
        assert "除数不能为零" in result.error_message

    def test_nested_parentheses_denied(self):
        ok, result, err = calculate("((3 + 4) * 2)")
        assert ok is False
        assert "最多一层括号" in err

    def test_mismatched_parentheses_left(self):
        ok, result, err = calculate("(3 + 4")
        assert ok is False
        assert "左括号多于右括号" in err

    def test_mismatched_parentheses_right(self):
        ok, result, err = calculate("3 + 4)")
        assert ok is False
        assert "右括号多于左括号" in err

    def test_invalid_character(self):
        ok, result, err = calculate("3 + abc")
        assert ok is False
        assert "不支持的字符" in err

    def test_multiple_decimal_points(self):
        ok, result, err = calculate("3.1.4 + 2")
        assert ok is False
        assert "多个小数点" in err

    def test_empty_expression(self):
        skill = CalculatorSkill()
        result = skill.execute(expression="")
        assert result.success is False
        assert "不能为空" in result.error_message

    def test_expression_starting_with_operator(self):
        ok, result, err = calculate("* 3 + 4")
        assert ok is False

    def test_expression_ending_with_operator(self):
        ok, result, err = calculate("3 + 4 *")
        assert ok is False
        assert "运算符后缺少操作数" in err

    def test_floating_point_result_display(self):
        skill = CalculatorSkill()
        result = skill.execute(expression="7 / 2")
        assert result.success is True
        assert result.output == "3.5"

    def test_integer_result_display(self):
        skill = CalculatorSkill()
        result = skill.execute(expression="6 / 2")
        assert result.success is True
        assert result.output == "3"
