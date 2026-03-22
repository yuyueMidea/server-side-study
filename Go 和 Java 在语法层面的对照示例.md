下面用**同一类需求，分别给出 Go 和 Java 的写法**，这样你会更容易看出两者在语法和编程模型上的差别。

我主要讲这 5 个部分：

1. 类 / 数据结构
2. 接口
3. 并发
4. 错误处理
5. 泛型

最后我再补一个**整体观感总结**。

---

# 1. 类 / 数据结构对照

Go 没有 `class`，一般用 `struct + 方法`。
Java 是典型的 `class + 字段 + 方法 + 构造器`。

---

## 1.1 定义一个“用户”对象

### Go

```go
package main

import "fmt"

type User struct {
	Name string
	Age  int
}

func (u User) Introduce() string {
	return fmt.Sprintf("I am %s, %d years old", u.Name, u.Age)
}

func main() {
	u := User{Name: "Alice", Age: 20}
	fmt.Println(u.Introduce())
}
```

### Java

```java
public class Main {
    static class User {
        private String name;
        private int age;

        public User(String name, int age) {
            this.name = name;
            this.age = age;
        }

        public String introduce() {
            return "I am " + name + ", " + age + " years old";
        }
    }

    public static void main(String[] args) {
        User u = new User("Alice", 20);
        System.out.println(u.introduce());
    }
}
```

---

## 1.2 核心差别

### Go 的特点

* 没有 `class`
* 没有构造函数语法
* 数据通常直接放在 `struct` 里
* 方法是“绑定在类型上”的
* 字段首字母大写表示可导出，小写表示包内私有

### Java 的特点

* 标准类模型更完整
* 有构造器
* 有封装语义，常用 `private + getter/setter`
* 更符合传统 OOP 习惯

---

## 1.3 Go 的值接收者 vs 指针接收者

这是 Go 很重要的一个语法点，Java 没这个概念。

### Go

```go
package main

import "fmt"

type Counter struct {
	Value int
}

// 值接收者：修改的是副本
func (c Counter) IncWrong() {
	c.Value++
}

// 指针接收者：修改的是原对象
func (c *Counter) Inc() {
	c.Value++
}

func main() {
	c := Counter{Value: 0}
	c.IncWrong()
	fmt.Println(c.Value) // 0

	c.Inc()
	fmt.Println(c.Value) // 1
}
```

### Java

```java
public class Main {
    static class Counter {
        int value = 0;

        void inc() {
            value++;
        }
    }

    public static void main(String[] args) {
        Counter c = new Counter();
        c.inc();
        System.out.println(c.value); // 1
    }
}
```

### 这里的本质差别

* Go 需要明确区分“传值”还是“传指针”
* Java 对象通常通过引用操作，开发者平时不需要显式区分接收者类型

---

# 2. 接口对照

接口是 Go 和 Java 差别最大的地方之一。

---

## 2.1 定义并实现接口

### Go

```go
package main

import "fmt"

type Speaker interface {
	Speak() string
}

type Dog struct {
	Name string
}

func (d Dog) Speak() string {
	return "Woof! I am " + d.Name
}

func SaySomething(s Speaker) {
	fmt.Println(s.Speak())
}

func main() {
	d := Dog{Name: "Buddy"}
	SaySomething(d)
}
```

### Java

```java
interface Speaker {
    String speak();
}

class Dog implements Speaker {
    private String name;

    public Dog(String name) {
        this.name = name;
    }

    @Override
    public String speak() {
        return "Woof! I am " + name;
    }
}

public class Main {
    static void saySomething(Speaker s) {
        System.out.println(s.speak());
    }

    public static void main(String[] args) {
        Dog d = new Dog("Buddy");
        saySomething(d);
    }
}
```

---

## 2.2 最大区别：Go 是隐式实现，Java 是显式实现

### Go

只要一个类型实现了接口要求的方法，它就**自动**满足这个接口。

你不需要写：

```go
// Go 里没有这种 implements 语法
```

### Java

必须显式声明：

```java
class Dog implements Speaker
```

---

## 2.3 这会带来什么影响

### Go

优点：

* 解耦更自然
* 接口更轻量
* 适合“面向行为编程”

缺点：

* 类型关系不像 Java 那样一眼明确
* 初学者有时不容易立刻看出谁实现了哪个接口

### Java

优点：

* 类型层次清晰
* 结构明确
* IDE 和大型项目里可读性强

缺点：

* 有时显得更重
* 容易产生很多“为了设计而设计”的接口

---

## 2.4 小接口风格

Go 很强调“小接口”，比如标准库里常见这种：

```go
type Reader interface {
	Read(p []byte) (n int, err error)
}
```

一个接口只描述一种很小的能力。

Java 里当然也能这么设计，但很多项目里会更常见到偏大的接口或层次更多的接口体系。

---

# 3. 并发对照

这是 Go 最有辨识度的部分。

---

## 3.1 启动一个并发任务

### Go

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	go func() {
		fmt.Println("hello from goroutine")
	}()

	time.Sleep(100 * time.Millisecond)
}
```

### Java

```java
public class Main {
    public static void main(String[] args) throws InterruptedException {
        Thread t = new Thread(() -> {
            System.out.println("hello from thread");
        });

        t.start();
        t.join();
    }
}
```

---

## 3.2 直观差别

### Go

只需要一个 `go` 关键字：

```go
go doWork()
```

### Java

通常要：

* 创建 `Thread`
* 或使用线程池
* 或使用 `CompletableFuture`

所以 Go 的并发启动语法明显更轻。

---

## 3.3 多任务并发后收集结果

### Go：用 channel

```go
package main

import "fmt"

func worker(id int, ch chan string) {
	ch <- fmt.Sprintf("worker %d done", id)
}

func main() {
	ch := make(chan string)

	go worker(1, ch)
	go worker(2, ch)

	fmt.Println(<-ch)
	fmt.Println(<-ch)
}
```

### Java：用 `ExecutorService + Future`

```java
import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);

        Future<String> f1 = pool.submit(() -> "worker 1 done");
        Future<String> f2 = pool.submit(() -> "worker 2 done");

        System.out.println(f1.get());
        System.out.println(f2.get());

        pool.shutdown();
    }
}
```

---

## 3.4 Go 的 channel 是核心语法体验之一

Go 鼓励你这样想：

* 启多个 goroutine 做事
* 用 channel 传递结果
* 用 `select` 等待多个事件

Java 当然也能写并发，但思路通常更偏：

* 线程
* 线程池
* 锁
* Future
* 异步回调或组合式 API

---

## 3.5 超时控制对比

### Go

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	ch := make(chan string)

	go func() {
		time.Sleep(2 * time.Second)
		ch <- "done"
	}()

	select {
	case result := <-ch:
		fmt.Println(result)
	case <-time.After(1 * time.Second):
		fmt.Println("timeout")
	}
}
```

### Java

```java
import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) {
        ExecutorService pool = Executors.newSingleThreadExecutor();

        Future<String> future = pool.submit(() -> {
            Thread.sleep(2000);
            return "done";
        });

        try {
            System.out.println(future.get(1, TimeUnit.SECONDS));
        } catch (TimeoutException e) {
            System.out.println("timeout");
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            pool.shutdown();
        }
    }
}
```

### 感受差别

* Go 的 `select + channel + time.After` 很统一
* Java 的能力不弱，但 API 组合更厚重

---

# 4. 错误处理对照

这个差别非常典型：
**Go 用返回值处理错误，Java 用异常机制。**

---

## 4.1 普通错误返回

### Go

```go
package main

import (
	"errors"
	"fmt"
)

func divide(a, b int) (int, error) {
	if b == 0 {
		return 0, errors.New("division by zero")
	}
	return a / b, nil
}

func main() {
	result, err := divide(10, 0)
	if err != nil {
		fmt.Println("error:", err)
		return
	}
	fmt.Println(result)
}
```

### Java

```java
public class Main {
    static int divide(int a, int b) {
        if (b == 0) {
            throw new IllegalArgumentException("division by zero");
        }
        return a / b;
    }

    public static void main(String[] args) {
        try {
            int result = divide(10, 0);
            System.out.println(result);
        } catch (IllegalArgumentException e) {
            System.out.println("error: " + e.getMessage());
        }
    }
}
```

---

## 4.2 本质区别

### Go

函数签名就能看出是否可能失败：

```go
func xxx() (T, error)
```

调用方必须显式处理：

```go
v, err := xxx()
if err != nil {
    ...
}
```

### Java

函数可能通过异常失败，主流程更干净，但控制流不总是显式写在函数返回值里。

---

## 4.3 连续调用时的风格差异

### Go

```go
data, err := readFile()
if err != nil {
	return err
}

user, err := parseUser(data)
if err != nil {
	return err
}

err = saveUser(user)
if err != nil {
	return err
}
```

### Java

```java
try {
    String data = readFile();
    User user = parseUser(data);
    saveUser(user);
} catch (Exception e) {
    return;
}
```

---

## 4.4 观感差别

### Go

* 哪里会出错，一眼可见
* 但 `if err != nil` 会很多

### Java

* 主流程更紧凑
* 但错误可能跨层抛出，阅读时要结合方法定义和异常体系理解

---

## 4.5 Go 的 `defer` vs Java 的 `try-with-resources`

资源释放也能看出两者风格。

### Go

```go
package main

import (
	"os"
)

func main() {
	f, err := os.Open("test.txt")
	if err != nil {
		return
	}
	defer f.Close()

	// 使用 f
}
```

### Java

```java
import java.io.*;

public class Main {
    public static void main(String[] args) {
        try (BufferedReader br = new BufferedReader(new FileReader("test.txt"))) {
            // 使用 br
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
```

### 差别

* Go 常用 `defer` 做延迟清理
* Java 常用 `try-with-resources` 做自动关闭

---

# 5. 泛型对照

Java 的泛型更成熟，Go 的泛型更克制。

---

## 5.1 写一个泛型函数：返回两个值中的较大者

### Go

```go
package main

import "fmt"

type Ordered interface {
	~int | ~int64 | ~float64 | ~string
}

func Max[T Ordered](a, b T) T {
	if a > b {
		return a
	}
	return b
}

func main() {
	fmt.Println(Max(3, 5))
	fmt.Println(Max("a", "z"))
}
```

### Java

```java
public class Main {
    public static <T extends Comparable<T>> T max(T a, T b) {
        return a.compareTo(b) > 0 ? a : b;
    }

    public static void main(String[] args) {
        System.out.println(max(3, 5));
        System.out.println(max("a", "z"));
    }
}
```

---

## 5.2 泛型容器对照

### Go

```go
package main

import "fmt"

type Box[T any] struct {
	Value T
}

func main() {
	intBox := Box[int]{Value: 123}
	strBox := Box[string]{Value: "hello"}

	fmt.Println(intBox.Value)
	fmt.Println(strBox.Value)
}
```

### Java

```java
public class Main {
    static class Box<T> {
        T value;

        Box(T value) {
            this.value = value;
        }
    }

    public static void main(String[] args) {
        Box<Integer> intBox = new Box<>(123);
        Box<String> strBox = new Box<>("hello");

        System.out.println(intBox.value);
        System.out.println(strBox.value);
    }
}
```

---

## 5.3 泛型设计风格差别

### Java

泛型已经用了很多年，所以：

* 集合体系非常成熟
* 泛型接口、泛型类、泛型方法都很常见
* 复杂边界、通配符也很常见，比如 `? extends T`

### Go

Go 的泛型更像是：

* 补上常见通用代码复用能力
* 但不鼓励写很复杂的类型系统花活

所以你会感觉：

* Java 泛型“更强、更完整”
* Go 泛型“够用、但刻意克制”

---

# 6. 再补两个很直观的小对照

---

## 6.1 继承 vs 组合

### Java：继承

```java
class Animal {
    void speak() {
        System.out.println("some sound");
    }
}

class Dog extends Animal {
    @Override
    void speak() {
        System.out.println("woof");
    }
}
```

### Go：没有继承，常用组合

```go
package main

import "fmt"

type Animal struct{}

func (a Animal) Speak() {
	fmt.Println("some sound")
}

type Dog struct {
	Animal
}

func (d Dog) Speak() {
	fmt.Println("woof")
}

func main() {
	d := Dog{}
	d.Speak()
}
```

### 差别

Go 里 `Dog` 不是 `Animal` 的子类，而是“组合了一个 Animal”。

---

## 6.2 空值处理：`nil` vs `null`

### Go

```go
var p *int = nil
var s []int = nil
var m map[string]int = nil
```

### Java

```java
String s = null;
Integer x = null;
MyObject obj = null;
```

### 差别

* Go 里很多引用类类型都有 `nil`
* 但 Go 的类型系统更明确，比如切片、map、channel、指针、接口都能是 `nil`
* Java 的 `null` 更统一，但也更容易产生空指针异常

---

# 7. 一眼看懂：Go 和 Java 语法观感差别

如果把两者写代码时的感觉总结一下：

## Go 更像

* 少语法
* 少层级
* 少修饰
* 显式处理错误
* 显式并发通信
* `struct + interface + goroutine + channel`

代码经常看起来像这样：

```go
u := User{Name: "Alice"}
result, err := service.Do(u)
if err != nil {
	return err
}
go worker(ch)
```

很直接，很扁平。

---

## Java 更像

* 类和对象体系更完整
* 封装和层次更多
* 注解和框架配合更常见
* 异常机制更深入
* 泛型和抽象能力更强

代码经常看起来像这样：

```java
User user = new User("Alice");
try {
    Result result = service.doSomething(user);
} catch (Exception e) {
    ...
}
executor.submit(() -> doWork());
```

更体系化，也更“企业工程化”。

---

# 8. 最后给你一个务实结论

如果你从 **Java 转 Go**，最需要适应的是：

* 没有 class/inheritance 那套正统 OOP
* 接口是隐式实现
* 错误处理不用异常主导，而是 `error`
* 并发从“线程/线程池思维”转向“goroutine/channel 思维”
* 代码风格会明显更朴素、更直接

如果你从 **Go 转 Java**，最需要适应的是：

* 类层次、封装、继承更多
* 异常体系更重要
* 并发 API 更丰富但更重
* 泛型和框架抽象更复杂
* 项目整体工程体系更厚

---
