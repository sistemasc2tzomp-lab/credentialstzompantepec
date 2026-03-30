const fs = require('fs');
const code = fs.readFileSync('js/auth.js', 'utf8');
const stack = [];
let inString = false;
let stringChar = '';
let templateDepth = 0;

for (let i = 0; i < code.length; i++) {
  const c = code[i];
  const next = code[i+1];
  
  if (inString) {
      if (c === '\\') { i++; continue; }
      if (c === stringChar) {
          inString = false;
      }
      if (stringChar === '`' && c === '$' && next === '{') {
          stack.push({ char: '${', line: getLine(code, i) });
          i++;
      }
  } else {
      if (c === '"' || c === "'" || c === '`') {
          inString = true;
          stringChar = c;
      } else if (c === '/' && next === '/') {
          // skip line comment
          while (i < code.length && code[i] !== '\n') i++;
      } else if (c === '/' && next === '*') {
          // skip block comment
          while (i < code.length && !(code[i] === '*' && code[i+1] === '/')) i++;
          i++; // skip /
      } else if (c === '{') {
          stack.push({ char: '{', line: getLine(code, i) });
      } else if (c === '}') {
          if (stack.length === 0) {
              console.log('Extra closing bracket at line ' + getLine(code, i));
          } else {
              stack.pop();
          }
      } else if (c === '(') {
          stack.push({ char: '(', line: getLine(code, i) });
      } else if (c === ')') {
          let top = stack[stack.length - 1];
          if (top && top.char === '(') stack.pop();
      }
  }
}

function getLine(str, index) {
  return str.substring(0, index).split('\n').length;
}

console.log('Unclosed stacks:');
stack.forEach(s => console.log(s.char + ' at ' + s.line));
