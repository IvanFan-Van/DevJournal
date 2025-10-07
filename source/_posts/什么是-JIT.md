---
title: 什么是 JIT
date: 2025-10-07 10:57:22
tags:
---
JIT (Just In Time Compiler) 技术被广泛应用于 java 的 JVM, nodejs 的 V8 Engine, 以及现代版本的 python 中. 

我们经常听到, 编程语言有两种类型, 分别是编译类型和解释类型, 编译类型例如 C, C++, 我们需要提前使用编译器 (gcc/g++) 来将源代码编译为本地机器上的二进制机器码然后才能让 cpu 执行. 但是这种方式带来一个问题, 就是不同平台, 例如 X86 和 ARM 的机器码是不同的, 甚至不同位数, 例如 32bit 和 64bit 的机器码也不互通 (64bit 程序无法运行在 32 bit 机器上, 但是反过来可以). 这就导致同一份代码, 在不同平台需要单独编译后才能执行. 至此人们在想有没有某种方式可以让代码一次编译, 到处运行? 

早期的 JAVA 开发者就实现了这一愿景, 通过引入 JVM 虚拟机来执行 java 代码, 这样同一份 java 代码编译后在不同平台都可以正常执行, 无需特地为了平台的不同而再次编译. 其通过引入一种中间语言 ByteCode, 将所有 java 编译为 ByteCode, 然后 JVM 负责执行. 而 JVM 本身是不跨平台的, 也就是 JVM 这个 java 执行器会在不同平台单独编译安装, 例如 windows 上就需要安装 windows 版本的 JVM, linux 就需要安装 linux 版本的. 所以 JAVA 也是半编译, 半解释型语言. 

解释型语言那种"无需编译"便可以直接运行的功能是怎么实现的? 实际上就是由一个程序在读取代码时, 实时将其逐条**解释**并**模拟执行**. 在这里**解释**指的是将源代码, 例如 (.py) 编译成中间语言 ByteCode. 而 **模拟执行** 的则是 interpreter 会在程序内部使用数组等数据结构模拟计算机内部的栈和堆等结构, 中间语言 ByteCode 的 LOAD_FAST, STORE_FAST 等指令实际上操控的是由解释器模拟的计算机栈和堆 (虚拟机堆栈), 而不是实际上计算机内存内部的栈和堆. 这就是 **模拟执行**.  但是这也造成了一个问题, 首先就是解释器不会存储每一行代码解释后的 ByteCode, 在遇到同一条代码时, 会重复编译执行, 可以按以下伪代码理解
```
for each line of code:
   bytecode = interpreter.compile(code)
   interpreter.execute(bytecode)
```

也就是说, 像是早期 CPython 中, 碰到循环时, 会反复编译同一块代码多次
```python
for i in range(n):
	print(1)
```

例如上面的 print(1) 会在每一次被执行到时, 都重走一遍 编译 -> 运行 的过程. 这就导致了解释型语言为什么比编译型语言慢的原因. 

第二点则是由于模拟执行, 解释型语言操作的其实都是程序内部模拟的堆栈结构, 这就导致了效率比硬件要低很多. 例如对于相同的将两个数相加的操作, 在机器码中可能如下
```asm
a dw 1
b dw 1
c dw 0

mov ax, [a]
mov bx, [b]
add ax, bx
mov [c], ax
```

而在 CPython 中, 最后的结果如下:

![](20251005130557.png)

其中 `dis` 模块可以用于查看某个函数被编译后的中间语言呢 bytecode. 上述代码展示了 main 函数被编译后的 bytecode 长什么样子. 而这个 bytecode 会被 PVM (python virtual machine) 执行. 其中的 `LOAD_FAST`, `STORE_FAST` 等 bytecode 都是操作的 PVM 中的虚拟堆栈, 而不是真实的计算机内存堆栈.

所以每一次调用  `LOAD_FAST`, `STORE_FAST` , 其实使用的都是数组索引访问等, 这种间接引用都会造成性能开销. 

而 JIT 的出现就是为了加快解释型语言的执行速度, 既然你碰到重复代码会重复编译, 那我就将热点代码编译后的机器码缓存, 下次再执行就无需编译. 这就是 JIT 即时编译的由来. 除了缓存热点代码的机器码来提高速度, JIT 还做了很多不同的步骤进行优化, 如下所示:

|方面|Interpreter (解释器)|JIT (即时编译)|
|---|---|---|
|**执行方式**|逐行/逐指令解释执行，每次运行都重新解析。|先解释执行，热点部分编译成机器码，缓存复用。|
|**编译时机**|运行时临时翻译，不保存。|运行时动态编译，针对热点，只编译一次。|
|**优化水平**|低或无（如简单语法检查）。|高（运行时收集数据，进行针对性优化，如基于实际调用路径的内联）。|
|**粒度**|细粒度（单条指令）。|粗粒度（方法/函数/代码块）。|
|**开销**|每次执行都有解析/翻译开销。|初始编译有开销，但后续执行无开销。|
|**适用场景**|简单脚本、快速启动（如Shell脚本）。|高性能应用、长期运行程序（如服务器、游戏引擎）。|
|**内存使用**|较低（不存机器码）。|较高（存编译后的机器码）。|
但是 JIT 就一劳永逸了吗? 其实不是, 更强的优化和粗粒度的编译, 导致了 JIT 启动慢, 内存高等缺点, 所以在短脚本中, 性能不如解释器. 但是在中大型应用中, JIT 的出现就大大加快了执行速度. 

或许我们只有当真正使用过 JIT 才能感受到 ta 的魅力, 在 python 中, 第三方库 `numba` 提供了 JIT 支持, 其中 `numba` 提供了一个装饰器 `jit`, 可以将一个函数设置为使用 JIT 进行编译. 我们就是用 `numba` 来对矩阵乘法这个运算做一个测试, 以下是一个 python 文件, 其中是实现了矩阵乘法的暴力求解函数, 一个使用纯 python, 另一个则是使用 `jit` 装饰器封装后的使用 JIT 的矩阵乘法, 我们分别调用这两个函数并记录时间.

```python
from numba import jit
import time
import numpy as np

# 矩阵乘法对比
def matrix_multiply(a, b):
    m, n = a.shape
    n, p = b.shape
    result = np.zeros((m, p))
    
    for i in range(m):
        for j in range(p):
            for k in range(n):
                result[i, j] += a[i, k] * b[k, j]
    return result

@jit(nopython=True)
def matrix_multiply_jit(a, b):
    m, n = a.shape
    n, p = b.shape
    result = np.zeros((m, p))
    
    for i in range(m):
        for j in range(p):
            for k in range(n):
                result[i, j] += a[i, k] * b[k, j]
    return result

# 测试
size = 200
a = np.random.rand(size, size)
b = np.random.rand(size, size)

# 预热JIT
matrix_multiply_jit(a, b)

# 正式测试
start = time.time()
r1 = matrix_multiply(a, b)
time1 = time.time() - start

start = time.time()
r2 = matrix_multiply_jit(a, b)
time2 = time.time() - start

print(f"标准Python: {time1:.2f}秒")
print(f"JIT加速: {time2:.2f}秒")
print(f"加速比: {time1/time2:.1f}x")
```

执行结果如下, 可以看到带有 JIT 优化后的矩阵乘法仅仅耗时为纯 python 解释器执行的 1/338. 由此可以窥见编译型语言和解释型语言的性能差异在这种计算密集的场景下有多大.

![](20251005132000.png)

以下是对于性能更加详细的解释:
### 1. CPython 解释器的工作方式

```python
def matrix_multiply(a, b):
    m, n = a.shape
    n, p = b.shape
    result = np.zeros((m, p))
    
    for i in range(m):          # 循环1
        for j in range(p):      # 循环2  
            for k in range(n):  # 循环3
                result[i, j] += a[i, k] * b[k, j]  # 核心计算
    return result
```


**CPython 的执行过程：**
1. **字节码解释**：每条Python指令都被翻译成多个字节码操作
2. **动态类型检查**：每次操作都要检查数据类型
3. **函数调用开销**：每次`+`、`*`、`[]`都是函数调用
4. **内存分配**：每次创建临时对象

```
# 单行代码: result[i, j] += a[i, k] * b[k, j]
# 在CPython中这行代码实际上执行：

# 1. a[i, k] 的字节码操作：
#   - LOAD_FAST a
#   - LOAD_FAST i
#   - LOAD_FAST k  
#   - BUILD_TUPLE 2
#   - BINARY_SUBSCR (调用 a.__getitem__)
#   - 类型检查: 确认结果是数字

# 2. b[k, j] 的字节码操作：
#   - LOAD_FAST b
#   - LOAD_FAST k
#   - LOAD_FAST j
#   - BUILD_TUPLE 2
#   - BINARY_SUBSCR (调用 b.__getitem__)
#   - 类型检查: 确认结果是数字

# 3. 乘法操作：
#   - BINARY_MULTIPLY (调用 __mul__)
#   - 创建新的Python对象存储结果

# 4. 加法操作：
#   - LOAD_FAST result[i, j]
#   - INPLACE_ADD (调用 __iadd__)
#   - 类型检查

# 5. 存储结果：
#   - STORE_SUBSCR (调用 result.__setitem__)
```

**对于 200×200 矩阵：**

- 外层循环：200 × 200 × 200 = 8,000,000 次迭代
- 每次迭代：~15-20 个字节码操作
- 总操作数：~1.2-1.6 亿次字节码解释

### 1. JIT 编译过程

```python
@jit(nopython=True)
def matrix_multiply_jit(a, b):
    m, n = a.shape
    n, p = b.shape
    result = np.zeros((m, p))
    
    for i in range(m):
        for j in range(p):  
            for k in range(n):
                result[i, j] += a[i, k] * b[k, j]
    return result
```


**JIT 的工作流程：**
1. **类型推断**：分析函数确定所有变量的类型
2. **编译为机器码**：直接将Python代码编译成本地机器指令
3. **优化**：应用各种编译器优化技术
4. **缓存**：编译结果缓存供后续使用

### 2. JIT 的具体优化技术

```c
// JIT编译后生成的伪机器代码类似于：
for (int i = 0; i < m; i++) {
    for (int j = 0; j < p; j++) {
        double sum = 0.0;
        for (int k = 0; k < n; k++) {
            // 直接内存访问，无函数调用
            double a_val = a_data[i * n + k];  // 直接计算内存偏移
            double b_val = b_data[k * p + j];
            sum += a_val * b_val;  // 硬件指令，无对象创建
        }
        result_data[i * p + j] = sum;  // 直接内存写入
    }
}
```
