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
	fmt.Println("name: ", name, "msg: ", msg, ", rs1: ", res1, "height: ", height, ", pi : ", pi)
}
