package main

import (
	"fmt"
	"strings"
	"time"
)

// 1. 条件语句
func checkScore(n int) string {
	if n > 90 {
		return "excellent"
	} else if n >= 60 {
		return "good"
	} else {
		return "bad"
	}
}

// 2. 循环
func sumNumbers(n int) int {
	sum := 0
	for i := 0; i <= n; i++ {
		sum += i
	}
	return sum
}

// 3. 数组和切片
func collectionDemo() {
	// 数组（固定长度）
	arr := [3]int{1, 2, 66}
	// 切片（动态数组）
	slice := []string{"z", "xc", "q1", "w3"}
	slice = append(slice, "q2")
	slice = append(slice, "a1", "a2")
	fmt.Println("arr: ", arr, " slice: ", slice)
	for idx, val := range arr {
		fmt.Println("idx: ", idx, "val: ", val)
	}
}

// 练习1：FizzBuzz
func fizzBuzz(n int) {
	for i := 0; i < n; i++ {
		switch {
		case i%15 == 0:
			fmt.Println("FizzBuzz", i)
		case i%3 == 0:
			fmt.Println("Fizz", i)
		case i%5 == 0:
			fmt.Println("Buzz", i)
		default:
			fmt.Println("i: ", i)
		}
	}
}

// 练习2：统计单词频率
func letterFrequency(text string) map[string]int {
	words := strings.Split(text, "")
	fmt.Println("words: ", words)
	fre := make(map[string]int)
	for _, val := range words {
		fre[val] += 1
	}
	return fre
}

// 1. goroutine基础
func printNumber() {
	for i := 1; i <= 5; i++ {
		fmt.Println("i: ", i)
		time.Sleep(time.Microsecond * 100)
	}
}

func main() {
	var name string = "zhangsna"
	var age int = 98
	isActive := true
	// 3. 基本数据类型
	var (
		score   int     = 66
		price   float64 = 5.99
		isReady bool    = false
	)
	check1 := checkScore(score)
	sum1 := sumNumbers(5)
	fmt.Println("=========check_Score is : ", check1, " sum_number is: ", sum1)
	fmt.Println(score, price, isReady, "==============", name, age, isActive)
	collectionDemo()
	freq := letterFrequency("zhangsan")
	fmt.Println("frequencys: ", freq)
	// fizzBuzz(17)
	// 启动goroutine
	go printNumber()
	go printNumber()
	time.Sleep(time.Microsecond * 1)
	/**
	实际执行流程：
		主程序启动第一个goroutine
		主程序立即启动第二个goroutine
		主程序开始睡眠1秒
		两个goroutine几乎同时开始执行
		每个goroutine打印第一个数字1
		主程序1秒后结束，强制终止所有goroutine
		结果：只看到两个1
	*/

}
