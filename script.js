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
const themeToggleButton = document.querySelector("[data-theme-toggle]");
const copyResultButton = document.querySelector(".result-copy");
const actionButtons = document.querySelectorAll("[data-action]");
const historyListEl = document.querySelector("[data-history-list]");

let expression = "";
let lastResult = "0";
let justCalculated = false;
let scientificMode = false;
let angleMode = "DEG";
let theme = "light";
let memoryValue = 0;
let historyEntries = [];
let copyFeedbackTimeout = null;

const functionNames = ["sin", "cos", "tan", "asin", "acos", "atan", "log", "ln", "sqrt", "fact"];
const TRIG_EPSILON = 1e-12;
const THEME_STORAGE_KEY = "calculator-theme";
const MAX_HISTORY_ENTRIES = 16;

function isOperator(token) {
  return token === "+" || token === "-" || token === "*" || token === "/" || token === "^" || token === "C" || token === "P";
}

function formatResult(value) {
  if (!Number.isFinite(value)) {
    throw new Error("Calcul impossible");
  }

  if (Math.abs(value) < TRIG_EPSILON) {
    value = 0;
  }

  if (Object.is(value, -0)) {
    return "0";
  }

  if (Math.abs(value) >= 1e12 || (Math.abs(value) > 0 && Math.abs(value) < 1e-8)) {
    return value.toExponential(8).replace(/\.0+e/, "e").replace(/(\.\d*?)0+e/, "$1e");
  }

  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(10)));
}

function computeFactorial(value) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Domaine invalide");
  }

  if (value > 170) {
    throw new Error("Calcul impossible");
  }

  let result = 1;
  for (let i = 2; i <= value; i += 1) {
    result *= i;
  }
  return result;
}

function setTheme(nextTheme, shouldPersist) {
  theme = nextTheme === "dark" ? "dark" : "light";
  document.body.setAttribute("data-theme", theme);

  if (themeToggleButton) {
    const isDark = theme === "dark";
    themeToggleButton.textContent = isDark ? "Light" : "Dark";
    themeToggleButton.setAttribute("aria-label", isDark ? "Activer le mode clair" : "Activer le mode sombre");
    themeToggleButton.setAttribute("aria-pressed", isDark ? "true" : "false");
  }

  if (shouldPersist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      // Ignore storage failures in restricted environments.
    }
  }
}

function initializeTheme() {
  let initialTheme = "light";

  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "dark" || savedTheme === "light") {
      initialTheme = savedTheme;
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      initialTheme = "dark";
    }
  } catch (error) {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      initialTheme = "dark";
    }
  }

  setTheme(initialTheme, false);
}

function normalizeForDisplay(expr) {
  if (!expr) {
    return "0";
  }

  return expr
    .replace(/PI/g, "pi")
    .replace(/C/g, " nCr ")
    .replace(/P/g, " nPr ")
    .replace(/\*/g, "x")
    .replace(/\//g, "÷")
    .replace(/\^/g, "^");
}

function updateDisplay(resultText) {
  expressionEl.textContent = normalizeForDisplay(expression);
  resultEl.textContent = resultText;
}

function parseDisplayNumber() {
  const value = Number(lastResult);
  return Number.isFinite(value) ? value : null;
}

function formatMemoryValue(value) {
  try {
    return formatResult(value);
  } catch (error) {
    return "0";
  }
}

function resetCopyFeedback() {
  if (!copyResultButton) {
    return;
  }

  copyResultButton.classList.remove("is-success");
  copyResultButton.textContent = "Copier";
}

function showCopyFeedback(success) {
  if (!copyResultButton) {
    return;
  }

  if (copyFeedbackTimeout) {
    clearTimeout(copyFeedbackTimeout);
  }

  if (success) {
    copyResultButton.classList.add("is-success");
    copyResultButton.textContent = "Copie";
  } else {
    copyResultButton.classList.remove("is-success");
    copyResultButton.textContent = "Echec";
  }

  copyFeedbackTimeout = setTimeout(() => {
    resetCopyFeedback();
    copyFeedbackTimeout = null;
  }, 1200);
}

async function copyCurrentResult() {
  if (lastResult === "Erreur") {
    showCopyFeedback(false);
    return;
  }

  const valueToCopy = lastResult;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(valueToCopy);
      showCopyFeedback(true);
      return;
    }
  } catch (error) {
    // Fallback below.
  }

  try {
    const hiddenInput = document.createElement("textarea");
    hiddenInput.value = valueToCopy;
    hiddenInput.setAttribute("readonly", "");
    hiddenInput.style.position = "absolute";
    hiddenInput.style.left = "-9999px";
    document.body.appendChild(hiddenInput);
    hiddenInput.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(hiddenInput);
    showCopyFeedback(copied);
  } catch (error) {
    showCopyFeedback(false);
  }
}

function appendLiteral(literal) {
  if (!literal) {
    return;
  }

  if (justCalculated) {
    expression = "";
    justCalculated = false;
  }

  const last = expression[expression.length - 1];
  if (expression && !isOperator(last) && last !== "(") {
    expression += "*";
  }

  if (literal.startsWith("-") && expression && !isOperator(expression[expression.length - 1]) && expression[expression.length - 1] !== "(") {
    expression += `(${literal})`;
  } else {
    expression += literal;
  }

  updateDisplay(lastResult);
}

function renderHistory() {
  if (!historyListEl) {
    return;
  }

  historyListEl.textContent = "";

  if (historyEntries.length === 0) {
    const emptyItem = document.createElement("li");
    const emptyText = document.createElement("p");
    emptyText.className = "history-empty";
    emptyText.textContent = "Aucun calcul pour le moment.";
    emptyItem.appendChild(emptyText);
    historyListEl.appendChild(emptyItem);
    return;
  }

  historyEntries.forEach((entry, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    const exp = document.createElement("span");
    const res = document.createElement("span");

    button.type = "button";
    button.className = "history-item";
    button.setAttribute("data-history-index", String(index));

    exp.className = "history-item-exp";
    exp.textContent = entry.expression;
    res.className = "history-item-res";
    res.textContent = `= ${entry.result}`;

    button.appendChild(exp);
    button.appendChild(res);
    item.appendChild(button);
    historyListEl.appendChild(item);
  });
}

function addHistoryEntry(rawExpression, rawResult) {
  const normalizedExpression = normalizeForDisplay(rawExpression) || "0";
  historyEntries = [
    { expression: normalizedExpression, result: rawResult },
    ...historyEntries
  ].slice(0, MAX_HISTORY_ENTRIES);
  renderHistory();
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

function applyFactorial() {
  const changed = wrapCurrentToken("fact(", ")");
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
      } else if (identifier === "C" || identifier === "P") {
        tokens.push({ type: "operator", value: identifier });
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
  const precedence = { "+": 1, "-": 1, "*": 2, "/": 2, "C": 2, "P": 2, "^": 3, "u-": 4 };
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
  function normalizeTrigValue(raw) {
    if (Math.abs(raw) < TRIG_EPSILON) {
      return 0;
    }
    if (Math.abs(raw - 1) < TRIG_EPSILON) {
      return 1;
    }
    if (Math.abs(raw + 1) < TRIG_EPSILON) {
      return -1;
    }
    return raw;
  }

  if (name === "sin") {
    const angle = angleMode === "DEG" ? (value * Math.PI) / 180 : value;
    return normalizeTrigValue(Math.sin(angle));
  }
  if (name === "cos") {
    const angle = angleMode === "DEG" ? (value * Math.PI) / 180 : value;
    return normalizeTrigValue(Math.cos(angle));
  }
  if (name === "tan") {
    const angle = angleMode === "DEG" ? (value * Math.PI) / 180 : value;
    if (Math.abs(Math.cos(angle)) < TRIG_EPSILON) {
      throw new Error("Domaine invalide");
    }
    return normalizeTrigValue(Math.tan(angle));
  }
  if (name === "asin") {
    if (value < -1 || value > 1) {
      throw new Error("Domaine invalide");
    }
    const angle = Math.asin(value);
    return angleMode === "DEG" ? (angle * 180) / Math.PI : angle;
  }
  if (name === "acos") {
    if (value < -1 || value > 1) {
      throw new Error("Domaine invalide");
    }
    const angle = Math.acos(value);
    return angleMode === "DEG" ? (angle * 180) / Math.PI : angle;
  }
  if (name === "atan") {
    const angle = Math.atan(value);
    return angleMode === "DEG" ? (angle * 180) / Math.PI : angle;
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
  if (name === "fact") {
    return computeFactorial(value);
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
      } else if (token.value === "C") {
        if (!Number.isInteger(left) || !Number.isInteger(right) || left < 0 || right < 0 || right > left) {
          throw new Error("Domaine invalide");
        }
        const numerator = computeFactorial(left);
        const denominator = computeFactorial(right) * computeFactorial(left - right);
        stack.push(div(numerator, denominator));
      } else if (token.value === "P") {
        if (!Number.isInteger(left) || !Number.isInteger(right) || left < 0 || right < 0 || right > left) {
          throw new Error("Domaine invalide");
        }
        stack.push(div(computeFactorial(left), computeFactorial(left - right)));
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
    const expressionBeforeCalc = expression;
    const value = evaluateExpression(expression);
    const formatted = formatResult(value);
    expression = formatted;
    lastResult = formatted;
    justCalculated = true;
    updateDisplay(formatted);
    addHistoryEntry(expressionBeforeCalc, formatted);
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

function toggleAngleModeFromKeyboard() {
  const degButton = document.querySelector('.key[data-action="deg"]');
  if (degButton) {
    toggleAngleMode(degButton);
    return;
  }

  angleMode = angleMode === "DEG" ? "RAD" : "DEG";
}

function executeAction(action, value, sourceButton) {
  if (!action) {
    return;
  }

  if (action === "clear") {
    clearAll();
    return;
  }

  if (action === "copy-result") {
    copyCurrentResult();
    return;
  }

  if (action === "history-clear") {
    historyEntries = [];
    renderHistory();
    return;
  }

  if (action === "memory-clear") {
    memoryValue = 0;
    return;
  }

  if (action === "memory-recall") {
    appendLiteral(formatMemoryValue(memoryValue));
    return;
  }

  if (action === "ans") {
    if (lastResult !== "Erreur") {
      appendLiteral(lastResult);
    }
    return;
  }

  if (action === "memory-add") {
    const displayedValue = parseDisplayNumber();
    if (displayedValue !== null) {
      memoryValue += displayedValue;
    }
    return;
  }

  if (action === "memory-subtract") {
    const displayedValue = parseDisplayNumber();
    if (displayedValue !== null) {
      memoryValue -= displayedValue;
    }
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

  if (action === "sqrt") {
    appendFunction("sqrt");
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

  if (action === "factorial") {
    applyFactorial();
    return;
  }

  if (action === "ncr") {
    appendOperator("C");
    return;
  }

  if (action === "npr") {
    appendOperator("P");
    return;
  }

  if (action === "inv") {
    applyInverse();
    return;
  }

  if (action === "deg") {
    if (sourceButton) {
      toggleAngleMode(sourceButton);
    } else {
      toggleAngleModeFromKeyboard();
    }
    return;
  }

  if (action === "equals") {
    calculate();
  }
}

function handleAction(button) {
  const { action, value } = button.dataset;
  executeAction(action, value, button);
}

function handleKeyboardInput(event) {
  if (event.ctrlKey || event.altKey || event.metaKey) {
    return;
  }

  const targetTag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : "";
  const isEditable = targetTag === "input" || targetTag === "textarea" || targetTag === "select"
    || (event.target && event.target.isContentEditable);

  if (isEditable) {
    return;
  }

  const { key } = event;

  if (/^\d$/.test(key)) {
    event.preventDefault();
    executeAction("digit", key);
    return;
  }

  if (key === "." || key === ",") {
    event.preventDefault();
    executeAction("dot");
    return;
  }

  if (key === "+" || key === "-" || key === "*" || key === "/" || key === "^") {
    event.preventDefault();
    executeAction("op", key);
    return;
  }

  if (key === "Enter" || key === "=") {
    event.preventDefault();
    executeAction("equals");
    return;
  }

  if (key === "Backspace") {
    event.preventDefault();
    executeAction("backspace");
    return;
  }

  if (key === "Delete" || key === "Escape") {
    event.preventDefault();
    executeAction("clear");
    return;
  }

  if (key === "(") {
    event.preventDefault();
    executeAction("left-paren");
    return;
  }

  if (key === ")") {
    event.preventDefault();
    executeAction("right-paren");
    return;
  }

  if (key === "%") {
    event.preventDefault();
    executeAction("percent");
    return;
  }

  if (!scientificMode) {
    return;
  }

  const lowered = key.toLowerCase();

  if (lowered === "s") {
    event.preventDefault();
    executeAction("func", "sin");
  } else if (key === "!") {
    event.preventDefault();
    executeAction("factorial");
  } else if (lowered === "a") {
    event.preventDefault();
    executeAction("func", "asin");
  } else if (lowered === "b") {
    event.preventDefault();
    executeAction("func", "acos");
  } else if (lowered === "n") {
    event.preventDefault();
    executeAction("func", "atan");
  } else if (lowered === "c") {
    event.preventDefault();
    executeAction("func", "cos");
  } else if (lowered === "t") {
    event.preventDefault();
    executeAction("func", "tan");
  } else if (lowered === "l") {
    event.preventDefault();
    executeAction("func", "ln");
  } else if (lowered === "g") {
    event.preventDefault();
    executeAction("func", "log");
  } else if (lowered === "r") {
    event.preventDefault();
    executeAction("sqrt");
  } else if (lowered === "p") {
    event.preventDefault();
    executeAction("const", "PI");
  } else if (lowered === "e") {
    event.preventDefault();
    executeAction("const", "E");
  } else if (lowered === "i") {
    event.preventDefault();
    executeAction("inv");
  } else if (lowered === "h") {
    event.preventDefault();
    executeAction("ncr");
  } else if (lowered === "j") {
    event.preventDefault();
    executeAction("npr");
  } else if (lowered === "q") {
    event.preventDefault();
    executeAction("pow2");
  } else if (lowered === "d") {
    event.preventDefault();
    executeAction("deg");
  }
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.modeTarget);
  });
});

if (themeToggleButton) {
  themeToggleButton.addEventListener("click", () => {
    setTheme(theme === "dark" ? "light" : "dark", true);
  });
}

actionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    handleAction(button);
  });
});

if (historyListEl) {
  historyListEl.addEventListener("click", (event) => {
    const target = event.target.closest("[data-history-index]");
    if (!target) {
      return;
    }

    const index = Number(target.getAttribute("data-history-index"));
    const selectedEntry = historyEntries[index];
    if (!selectedEntry) {
      return;
    }

    expression = selectedEntry.result;
    lastResult = selectedEntry.result;
    justCalculated = true;
    updateDisplay(lastResult);
  });
}

document.addEventListener("keydown", handleKeyboardInput);

setMode("simple");
clearAll();
initializeTheme();
renderHistory();
