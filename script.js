function mult(a, b) {
  return Number(a) * Number(b);
}

function div(a, b) {
  return Number(a) / Number(b);
}

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
const keys = document.querySelectorAll(".keys .key");

let expression = "";
let justCalculated = false;

function isOperator(token) {
  return token === "+" || token === "-" || token === "*" || token === "/";
}

function tokenize(expr) {
  const tokens = [];
  let current = "";

  for (let i = 0; i < expr.length; i += 1) {
    const char = expr[i];

    if (char >= "0" && char <= "9") {
      current += char;
      continue;
    }

    if (char === ".") {
      if (current.includes(".")) {
        throw new Error("Nombre invalide");
      }
      current += ".";
      continue;
    }

    if (isOperator(char)) {
      if (current !== "") {
        tokens.push(current);
        current = "";
      }

      const previous = tokens[tokens.length - 1];
      if (char === "-" && (tokens.length === 0 || isOperator(previous))) {
        current = "-";
        continue;
      }

      tokens.push(char);
      continue;
    }

    throw new Error("Caractere invalide");
  }

  if (current !== "") {
    tokens.push(current);
  }

  return tokens;
}

function evaluateTokens(tokens) {
  if (tokens.length === 0) {
    return 0;
  }

  const values = [Number(tokens[0])];
  const operators = [];

  for (let i = 1; i < tokens.length; i += 2) {
    const operator = tokens[i];
    const rawValue = tokens[i + 1];
    const value = Number(rawValue);

    if (!Number.isFinite(value) || !isOperator(operator)) {
      throw new Error("Expression invalide");
    }

    if (operator === "*" || operator === "/") {
      const previous = values.pop();
      const computed = operator === "*" ? mult(previous, value) : div(previous, value);
      if (!Number.isFinite(computed)) {
        throw new Error("Calcul impossible");
      }
      values.push(computed);
    } else {
      operators.push(operator);
      values.push(value);
    }
  }

  let total = values[0];
  for (let i = 0; i < operators.length; i += 1) {
    total = operators[i] === "+" ? add(total, values[i + 1]) : sub(total, values[i + 1]);
  }

  if (!Number.isFinite(total)) {
    throw new Error("Calcul impossible");
  }

  return total;
}

function evaluateExpression(expr) {
  const tokens = tokenize(expr);
  if (tokens.length === 0 || isOperator(tokens[tokens.length - 1])) {
    throw new Error("Expression incomplete");
  }
  return evaluateTokens(tokens);
}

function formatResult(value) {
  if (Object.is(value, -0)) {
    return "0";
  }
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(10)));
}

function updateDisplay(nextResult) {
  expressionEl.textContent = expression || "0";
  resultEl.textContent = nextResult;
}

function clearAll() {
  expression = "";
  justCalculated = false;
  updateDisplay("0");
}

function appendDigitOrDot(token) {
  if (justCalculated) {
    expression = "";
    justCalculated = false;
  }

  if (token === ".") {
    const parts = expression.split(/[\+\-\*\/]/);
    const currentNumber = parts[parts.length - 1];
    if (currentNumber.includes(".")) {
      return;
    }
    if (expression === "" || isOperator(expression[expression.length - 1])) {
      expression += "0";
    }
  }

  expression += token;
  updateDisplay(resultEl.textContent);
}

function appendOperator(operator) {
  if (expression === "") {
    if (operator === "-") {
      expression = "-";
    }
    updateDisplay(resultEl.textContent);
    return;
  }

  const last = expression[expression.length - 1];
  if (isOperator(last)) {
    expression = expression.slice(0, -1) + operator;
  } else {
    expression += operator;
  }

  justCalculated = false;
  updateDisplay(resultEl.textContent);
}

function calculate() {
  try {
    const value = evaluateExpression(expression);
    const formatted = formatResult(value);
    expression = formatted;
    justCalculated = true;
    updateDisplay(formatted);
  } catch (error) {
    expression = "";
    justCalculated = false;
    updateDisplay("Erreur");
  }
}

keys.forEach((key) => {
  key.addEventListener("click", () => {
    const token = key.textContent.trim();

    if (token === "AC") {
      clearAll();
      return;
    }

    if (token === "=") {
      calculate();
      return;
    }

    if (token === "+" || token === "-" || token === "*" || token === "/") {
      appendOperator(token);
      return;
    }

    if ((token >= "0" && token <= "9") || token === ".") {
      appendDigitOrDot(token);
      return;
    }
  });
});

clearAll();
