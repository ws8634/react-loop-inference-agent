class CalculatorSkill {
  constructor() {
    this.name = 'calculator';
    this.description = '计算数学表达式，支持加减乘除和最多一层括号';
    this.params = {
      expression: {
        type: 'string',
        description: '要计算的数学表达式'
      }
    };
  }

  _tokenize(expression) {
    const tokens = [];
    let currentNumber = '';

    for (let i = 0; i < expression.length; i++) {
      const char = expression[i];

      if (/\s/.test(char)) {
        continue;
      }

      if (/\d|\./.test(char)) {
        currentNumber += char;
      } else {
        if (currentNumber) {
          tokens.push({ type: 'number', value: parseFloat(currentNumber) });
          currentNumber = '';
        }

        if (['+', '-', '*', '/', '(', ')'].includes(char)) {
          tokens.push({ type: 'operator', value: char });
        } else {
          throw new Error(`无效的字符: ${char}`);
        }
      }
    }

    if (currentNumber) {
      tokens.push({ type: 'number', value: parseFloat(currentNumber) });
    }

    return tokens;
  }

  _countParentheses(tokens) {
    let openCount = 0;
    for (const token of tokens) {
      if (token.type === 'operator' && token.value === '(') {
        openCount++;
      } else if (token.type === 'operator' && token.value === ')') {
        openCount--;
      }
    }
    return openCount;
  }

  _evaluateSimple(tokens) {
    let numbers = [];
    let operators = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === 'number') {
        numbers.push(token.value);
      } else if (token.type === 'operator') {
        if (token.value === '*' || token.value === '/') {
          const nextToken = tokens[i + 1];
          if (!nextToken || nextToken.type !== 'number') {
            throw new Error('表达式格式错误');
          }

          const lastNum = numbers.pop();
          const nextNum = nextToken.value;

          if (token.value === '*') {
            numbers.push(lastNum * nextNum);
          } else {
            if (nextNum === 0) {
              throw new Error('除零错误');
            }
            numbers.push(lastNum / nextNum);
          }
          i++;
        } else {
          operators.push(token.value);
        }
      }
    }

    let result = numbers[0];
    for (let i = 0; i < operators.length; i++) {
      const op = operators[i];
      const num = numbers[i + 1];

      if (op === '+') {
        result += num;
      } else if (op === '-') {
        result -= num;
      }
    }

    return result;
  }

  _evaluateWithParentheses(tokens) {
    const openParenIndex = tokens.findIndex(
      t => t.type === 'operator' && t.value === '('
    );

    if (openParenIndex === -1) {
      return this._evaluateSimple(tokens);
    }

    let closeParenIndex = -1;
    let depth = 1;

    for (let i = openParenIndex + 1; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === 'operator' && token.value === '(') {
        depth++;
      } else if (token.type === 'operator' && token.value === ')') {
        depth--;
        if (depth === 0) {
          closeParenIndex = i;
          break;
        }
      }
    }

    if (closeParenIndex === -1) {
      throw new Error('括号不匹配');
    }

    if (openParenIndex + 1 >= closeParenIndex) {
      throw new Error('空括号');
    }

    const innerTokens = tokens.slice(openParenIndex + 1, closeParenIndex);
    const innerResult = this._evaluateSimple(innerTokens);

    const newTokens = [
      ...tokens.slice(0, openParenIndex),
      { type: 'number', value: innerResult },
      ...tokens.slice(closeParenIndex + 1)
    ];

    return this._evaluateWithParentheses(newTokens);
  }

  async execute(params) {
    const { expression } = params;

    if (!expression || typeof expression !== 'string') {
      return {
        success: false,
        error: '表达式不能为空'
      };
    }

    try {
      const tokens = this._tokenize(expression);

      if (tokens.length === 0) {
        return {
          success: false,
          error: '表达式为空'
        };
      }

      const parenBalance = this._countParentheses(tokens);
      if (parenBalance !== 0) {
        return {
          success: false,
          error: '括号不匹配'
        };
      }

      const result = this._evaluateWithParentheses(tokens);

      return {
        success: true,
        result: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = CalculatorSkill;
