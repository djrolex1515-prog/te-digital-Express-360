import sys
with open(sys.argv[1], 'r', encoding='utf-8') as f:
    c = f.read()
stack = []
for i, ch in enumerate(c):
    if ch in '({[':
        stack.append((ch, i))
    elif ch in ')}]':
        idx = ')}]'.index(ch)
        exp = '({['[idx]
        if not stack or stack[-1][0] != exp:
            print(f'ERR at {i}: expect {exp}, got {ch}')
            print(f'Context: {c[max(0,i-20):i+20]!r}')
            sys.exit(1)
        stack.pop()
if stack:
    for ch, p in stack:
        line = c[:p].count('\n') + 1
        print(f'Unclosed {ch} at pos {p} (line {line})')
    sys.exit(1)
print('BALANCE OK')
lines = c.split('\n')
for l in lines[-10:]:
    print(repr(l))
