function add(a, b) {
  return Number(a) + Number(b);
}

function sub(a, b) {
  return Number(a) - Number(b);
}

function mult(a, b) {
  return Number(a) * Number(b);
}

function div(a, b) {
  return Number(a) / Number(b);
}

const expressionEl = document.querySelector(".expression");
const resultEl = document.querySelector(".result");
const calculatorEl = document.querySelector(".calculator");
const modeButtons = document.querySelectorAll(".mode-btn");
const keys = document.querySelectorAll(".key");

let expression = "";
let lastResult = "0";
let justCalculated = false;
let scientificMode = false;
let angleMode = "DEG";

const functionNames = ["sin", "cos", "tan", "log", "ln", "sqrt"];

function isOperator(token) {
  return token === "+" || token === "-" || token === "*" || token === "/" || token === "^";
}

function formatResult(value) {
  if (!Number.isFinite(value)) {
    throw new Error("Calcul impossible");
  }

  if (Object.is(value, -0)) {
    return "0";
  }

  if (Math.abs(value) >= 1e12 || (Math.abs(value) > 0 && Math.abs(value) < 1e-8)) {
    return value.toExponential(8).replace(/\.0+e/, "e").replace(/(\.\d*?)0+e/, "$1e");
  }

  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(10)));
}

function normalizeForDisplay(expr) {
  if (!expr) {
    return "0";
  }

  return expr
    .replace(/PI/g, "pi")
    .replace(/\*/g, "x")
    .replace(/\//g, "÷")
    .replace(/\^/g, "^");
}

function updateDisplay(resultText) {
  expressionEl.textContent = normalizeForDisplay(expression);
  resultEl.textContent = resultText;
}

function clearAll() {
  expression = "";
  lastResult = "0";
  justCalculated = false;
  updateDisplay("0");
}

function backspace() {
  if (!expression) {
    updateDisplay(lastResult);
    return;
  }

  expression = expression.slice(0, -1);
  if (!expression) {
    lastResult = "0";
  }
  updateDisplay(lastResult);
}

function getCurrentTokenRange() {
  if (!expression) {
    return null;
  }

  let end = expression.length - 1;
  while (end >= 0 && expression[end] === " ") {
    end -= 1;
  }

  if (end < 0) {
    return null;
  }

  let start = end;
  let depth = 0;

  while (start >= 0) {
    const ch = expression[start];

    if (ch === ")") {
      depth += 1;
    } else if (ch === "(") {
      if (depth === 0) {
        break;
      }
      depth -= 1;
    } else if (depth === 0 && isOperator(ch)) {
      if (ch === "-" && (start === 0 || isOperator(expression[start - 1]) || expression[start - 1] === "(")) {
        start -= 1;
        continue;
      }
      break;
    }

    start -= 1;
  }

  return {
    start: start + 1,
    end: end + 1
  };
}

function wrapCurrentToken(prefix, suffix) {
  const range = getCurrentTokenRange();
  if (!range) {
    return false;
  }

  const token = expression.slice(range.start, range.end);
  expression = `${expression.slice(0, range.start)}${prefix}${token}${suffix}${expression.slice(range.end)}`;
  return true;
}

function toggleCurrentSign() {
  const range = getCurrentTokenRange();
  if (!range) {
    expression = "-";
    updateDisplay(lastResult);
    return;
  }

  const token = expression.slice(range.start, range.end);
  if (token.startsWith("(-") && token.endsWith(")")) {
    const inner = token.slice(2, -1);
    expression = `${expression.slice(0, range.start)}${inner}${expression.slice(range.end)}`;
  } else {
    expression = `${expression.slice(0, range.start)}(-${token})${expression.slice(range.end)}`;
  }

  updateDisplay(lastResult);
}

function applyPercent() {
  const changed = wrapCurrentToken("(", ")/100");
  if (changed) {
    updateDisplay(lastResult);
  }
}

function appendDigit(value) {
  if (justCalculated) {
    expression = "";
    justCalculated = false;
  }

  expression += value;
  updateDisplay(lastResult);
}

function appendDot() {
  if (justCalculated) {
    expression = "";
    justCalculated = false;
  }

  const range = getCurrentTokenRange();
  if (!range) {
    expression += "0.";
    updateDisplay(lastResult);
    return;
  }

  const token = expression.slice(range.start, range.end);
  if (/^[\d.]+$/.test(token) && token.includes(".")) {
    return;
  }

  if (isOperator(expression[expression.length - 1]) || expression.endsWith("(")) {
    expression += "0.";
  } else {
    expression += ".";
  }

  updateDisplay(lastResult);
}

function appendOperator(operator) {
  if (!expression) {
    if (operator === "-") {
      expression = "-";
      updateDisplay(lastResult);
    }
    return;
  }

  const lastChar = expression[expression.length - 1];

  if (isOperator(lastChar)) {
    expression = `${expression.slice(0, -1)}${operator}`;
  } else if (lastChar === "(") {
    if (operator === "-") {
      expression += operator;
    }
  } else {
    expression += operator;
  }

  justCalculated = false;
  updateDisplay(lastResult);
}

function appendLeftParen() {
  if (justCalculated) {
    expression = "";
    justCalculated = false;
  }

  const last = expression[expression.length - 1];
  if (expression && (!isOperator(last) && last !== "(")) {
    expression += "*(";
  } else {
    expression += "(";
  }

  updateDisplay(lastResult);
}

function appendRightParen() {
  if (!expression) {
    return;
  }

  const openCount = (expression.match(/\(/g) || []).length;
  const closeCount = (expression.match(/\)/g) || []).length;
  const last = expression[expression.length - 1];

  if (openCount > closeCount && !isOperator(last) && last !== "(") {
    expression += ")";
    updateDisplay(lastResult);
  }
}

function appendFunction(name) {
  if (justCalculated) {
    justCalculated = false;
  }

  const last = expression[expression.length - 1];
  if (expression && !isOperator(last) && last !== "(") {
    expression += `*${name}(`;
  } else {
    expression += `${name}(`;
  }

  updateDisplay(lastResult);
}

function appendConstant(value) {
  if (justCalculated) {
    expression = "";
    justCalculated = false;
  }

  const last = expression[expression.length - 1];
  if (expression && !isOperator(last) && last !== "(") {
    expression += `*${value}`;
  } else {
    expression += value;
  }

  updateDisplay(lastResult);
}

function applySquare() {
  const changed = wrapCurrentToken("(", ")^2");
  if (changed) {
    updateDisplay(lastResult);
  }
}

function applyInverse() {
  const changed = wrapCurrentToken("1/(", ")");
  if (changed) {
    updateDisplay(lastResult);
  }
}

function autoCloseParentheses(expr) {
  const openCount = (expr.match(/\(/g) || []).length;
  const closeCount = (expr.match(/\)/g) || []).length;
  if (openCount > closeCount) {
    return `${expr}${")".repeat(openCount - closeCount)}`;
  }
  return expr;
}

function tokenize(expr) {
  const tokens = [];
  let i = 0;

  while (i < expr.length) {
    const char = expr[i];

    if (char === " ") {
      i += 1;
      continue;
    }

    if ((char >= "0" && char <= "9") || char === ".") {
      let number = char;
      i += 1;
      while (i < expr.length) {
        const next = expr[i];
        if ((next >= "0" && next <= "9") || next === ".") {
          number += next;
          i += 1;
        } else {
          break;
        }
      }
      if ((number.match(/\./g) || []).length > 1) {
        throw new Error("Nombre invalide");
      }
      tokens.push({ type: "number", value: Number(number) });
      continue;
    }

    if (/[A-Za-z]/.test(char)) {
      let identifier = char;
      i += 1;
      while (i < expr.length && /[A-Za-z]/.test(expr[i])) {
        identifier += expr[i];
        i += 1;
      }

      if (identifier === "PI") {
        tokens.push({ type: "number", value: Math.PI });
      } else if (identifier === "E") {
        tokens.push({ type: "number", value: Math.E });
      } else if (functionNames.includes(identifier)) {
        tokens.push({ type: "function", value: identifier });
      } else {
        throw new Error("Fonction inconnue");
      }
      continue;
    }

    if (isOperator(char)) {
      tokens.push({ type: "operator", value: char });
      i += 1;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      i += 1;
      continue;
    }

    throw new Error("Caractere invalide");
  }

  return tokens;
}

function toRpn(tokens) {
  const output = [];
  const stack = [];
  const precedence = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3, "u-": 4 };
  const rightAssociative = new Set(["^", "u-"]);

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    if (token.type === "number") {
      output.push(token);
      continue;
    }

    if (token.type === "function") {
      stack.push(token);
      continue;
    }

    if (token.type === "operator") {
      const previous = tokens[i - 1];
      let op = token.value;

      if (op === "-" && (!previous || (previous.type === "operator") || (previous.type === "paren" && previous.value === "("))) {
        op = "u-";
      }

      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        if (top.type === "function") {
          output.push(stack.pop());
          continue;
        }
        if (top.type !== "operator") {
          break;
        }

        const topOp = top.value;
        const sameOrHigher = rightAssociative.has(op)
          ? precedence[topOp] > precedence[op]
          : precedence[topOp] >= precedence[op];

        if (!sameOrHigher) {
          break;
        }

        output.push(stack.pop());
      }

      stack.push({ type: "operator", value: op });
      continue;
    }

    if (token.type === "paren" && token.value === "(") {
      stack.push(token);
      continue;
    }

    if (token.type === "paren" && token.value === ")") {
      let foundLeft = false;

      while (stack.length > 0) {
        const top = stack.pop();
        if (top.type === "paren" && top.value === "(") {
          foundLeft = true;
          break;
        }
        output.push(top);
      }

      if (!foundLeft) {
        throw new Error("Parentheses invalides");
      }

      if (stack.length > 0 && stack[stack.length - 1].type === "function") {
        output.push(stack.pop());
      }
    }
  }

  while (stack.length > 0) {
    const token = stack.pop();
    if (token.type === "paren") {
      throw new Error("Parentheses invalides");
    }
    output.push(token);
  }

  return output;
}

function applyFunction(name, value) {
  if (name === "sin") {
    const angle = angleMode === "DEG" ? (value * Math.PI) / 180 : value;
    return Math.sin(angle);
  }
  if (name === "cos") {
    const angle = angleMode === "DEG" ? (value * Math.PI) / 180 : value;
    return Math.cos(angle);
  }
  if (name === "tan") {
    const angle = angleMode === "DEG" ? (value * Math.PI) / 180 : value;
    return Math.tan(angle);
  }
  if (name === "log") {
    if (value <= 0) {
      throw new Error("Domaine invalide");
    }
    return Math.log10(value);
  }
  if (name === "ln") {
    if (value <= 0) {
      throw new Error("Domaine invalide");
    }
    return Math.log(value);
  }
  if (name === "sqrt") {
    if (value < 0) {
      throw new Error("Domaine invalide");
    }
    return Math.sqrt(value);
  }

  throw new Error("Fonction inconnue");
}

function evaluateRpn(rpn) {
  const stack = [];

  rpn.forEach((token) => {
    if (token.type === "number") {
      stack.push(token.value);
      return;
    }

    if (token.type === "function") {
      if (stack.length < 1) {
        throw new Error("Expression invalide");
      }
      const value = stack.pop();
      stack.push(applyFunction(token.value, value));
      return;
    }

    if (token.type === "operator") {
      if (token.value === "u-") {
        if (stack.length < 1) {
          throw new Error("Expression invalide");
        }
        stack.push(-stack.pop());
        return;
      }

      if (stack.length < 2) {
        throw new Error("Expression invalide");
      }

      const right = stack.pop();
      const left = stack.pop();

      if (token.value === "+") {
        stack.push(add(left, right));
      } else if (token.value === "-") {
        stack.push(sub(left, right));
      } else if (token.value === "*") {
        stack.push(mult(left, right));
      } else if (token.value === "/") {
        stack.push(div(left, right));
      } else if (token.value === "^") {
        stack.push(Math.pow(left, right));
      } else {
        throw new Error("Operateur invalide");
      }
    }
  });

  if (stack.length !== 1) {
    throw new Error("Expression invalide");
  }

  return stack[0];
}

function evaluateExpression(expr) {
  const fixed = autoCloseParentheses(expr);
  const tokens = tokenize(fixed);
  if (tokens.length === 0) {
    return 0;
  }
  const rpn = toRpn(tokens);
  return evaluateRpn(rpn);
}

function calculate() {
  if (!expression) {
    updateDisplay(lastResult);
    return;
  }

  try {
    const value = evaluateExpression(expression);
    const formatted = formatResult(value);
    expression = formatted;
    lastResult = formatted;
    justCalculated = true;
    updateDisplay(formatted);
  } catch (error) {
    expression = "";
    lastResult = "Erreur";
    justCalculated = false;
    updateDisplay("Erreur");
  }
}

function setMode(mode) {
  scientificMode = mode === "scientific";
  calculatorEl.setAttribute("data-mode", mode);

  modeButtons.forEach((button) => {
    const isTarget = button.dataset.modeTarget === mode;
    button.classList.toggle("is-active", isTarget);
    button.setAttribute("aria-pressed", isTarget ? "true" : "false");
  });

  if (scientificMode) {
    calculatorEl.style.transform = "translateY(-2px)";
    setTimeout(() => {
      calculatorEl.style.transform = "translateY(0)";
    }, 120);
  }
}

function toggleAngleMode(button) {
  angleMode = angleMode === "DEG" ? "RAD" : "DEG";
  button.textContent = angleMode;
}

function handleAction(button) {
  const { action, value } = button.dataset;

  if (action === "clear") {
    clearAll();
    return;
  }

  if (action === "backspace") {
    backspace();
    return;
  }

  if (action === "digit") {
    appendDigit(value);
    return;
  }

  if (action === "dot") {
    appendDot();
    return;
  }

  if (action === "op") {
    appendOperator(value);
    return;
  }

  if (action === "left-paren") {
    appendLeftParen();
    return;
  }

  if (action === "right-paren") {
    appendRightParen();
    return;
  }

  if (action === "func") {
    appendFunction(value);
    return;
  }

  if (action === "const") {
    appendConstant(value);
    return;
  }

  if (action === "toggle-sign") {
    toggleCurrentSign();
    return;
  }

  if (action === "percent") {
    applyPercent();
    return;
  }

  if (action === "pow2") {
    applySquare();
    return;
  }

  if (action === "inv") {
    applyInverse();
    return;
  }

  if (action === "deg") {
    toggleAngleMode(button);
    return;
  }

  if (action === "equals") {
    calculate();
  }
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.modeTarget);
  });
});

keys.forEach((key) => {
  key.addEventListener("click", () => {
    handleAction(key);
  });
});

setMode("simple");
clearAll();