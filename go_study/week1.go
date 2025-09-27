package main

import "fmt"

func sumN(n int) int {
	res := 0
	for i := 0; i <= n; i += 1 {
		res += i
		fmt.Println("i: ", i)
	}
	return res
}
func main() {
	// 变量声明的几种方式
	var name string = "张三"
	msg := "hello, go!"
	var height float32 = 121.4
	height += 2
	const pi = 3.14
	res1 := sumN(3)
	fmt.Println("name: ", name, "msg: ", msg, ", rs1: ", res1, "height: ", height, ", pi : ", pi, "======\n=====")

	// 基本数据类型
	var b bool = true
	var i int = 21
	var f float64 = 3.14
	var s string = "str123"
	// 数组---切片
	var arr [3]int = [3]int{1, 2, 3}
	var slice = []string{"apple", "orange", "banana"}
	// 映射
	m := make(map[string]int)
	m["go"] = 2009
	m["java"] = 1995

	fmt.Printf("布尔: %v, 整数: %v, 浮点: %v, 字符串: %v\n", b, i, f, s)
	fmt.Printf("数组: %v, 切片: %v, 映射: %v\n", arr, slice, m)

}
