with open('frontend/ciudadano.js', 'r', encoding='utf-8') as f:
    content = f.read()

brace = 0
paren = 0
bracket = 0
in_str = False
str_char = None
escape = False

for i, ch in enumerate(content):
    if escape:
        escape = False
        continue
    if ch == '\\':
        escape = True
        continue
    if not in_str:
        if ch in '"\'':
            in_str = True
            str_char = ch
        elif ch == '{': brace += 1
        elif ch == '}': brace -= 1
        elif ch == '(': paren += 1
        elif ch == ')': paren -= 1
        elif ch == '[': bracket += 1
        elif ch == ']': bracket -= 1
    else:
        if ch == str_char:
            in_str = False

    if brace < 0 or paren < 0 or bracket < 0:
        print(f'Negative at pos {i}: brace={brace}, paren={paren}, bracket={bracket}')
        print(repr(content[max(0,i-30):i+10]))
        break

print(f'Final: brace={brace}, paren={paren}, bracket={bracket}')